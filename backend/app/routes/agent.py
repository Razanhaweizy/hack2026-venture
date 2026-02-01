"""
Agent API Routes
REST API endpoints for LLM-powered agent interactions
"""

import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from ..services.openrouter_service import get_openrouter_service, OpenRouterModel
from ..services.graph_service import GraphService
from ..services.extraction_service import (
    extract_from_text,
    extract_with_followup,
    generate_followup_questions,
    apply_operations_to_graph,
    EXTRACTION_SYSTEM_PROMPT,
    FOLLOWUP_SYSTEM_PROMPT
)
from ..services.gap_detection_service import (
    analyze_gaps,
    get_gap_summary,
    get_category_gaps,
    get_path_specific_gaps,
    FRAMEWORK_QUESTIONS,
    PATH_SPECIFIC_QUESTIONS
)
from ..services.playbook_service import (
    get_playbook,
    get_playbook_summary,
    get_playbook_status,
    evaluate_playbook_rules,
    PLAYBOOKS
)
from ..models.graph import (
    GapResponse,
    GapSummary,
    GapAnalysisResponse,
    CategoryGapsResponse,
    PriorityAction
)

router = APIRouter(prefix="/api/agent", tags=["agent"])

# Get services
def get_graph_service() -> GraphService:
    from ..routes.graph import get_graph_service as get_gs
    return get_gs()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class AnalyzeInputRequest(BaseModel):
    user_input: str = Field(..., description="User's startup idea input to analyze")
    model: Optional[str] = Field(None, description="OpenRouter model to use")


class ExtractionRequest(BaseModel):
    text: str = Field(..., description="Founder's input text to extract from")
    apply_to_graph: bool = Field(default=False, description="Whether to apply operations to graph")
    model: Optional[str] = Field(None, description="OpenRouter model to use")


class FollowUpQuestion(BaseModel):
    question: str
    type: str  # validation, quantitative, customer, risk
    context: str
    targets_node: Optional[str] = None
    framework_category: Optional[str] = None


class GapSummaryBrief(BaseModel):
    """Brief gap summary included in extraction response"""
    total_gaps: int
    killer_gaps: int
    high_gaps: int
    overall_readiness: str
    completion_percentage: float


class TopGap(BaseModel):
    """A top priority gap"""
    framework_id: str
    question: str
    criticality: str
    coverage_score: float
    probing_questions: List[str]


class GapAnalysisBrief(BaseModel):
    """Gap analysis included after extraction"""
    summary: GapSummaryBrief
    top_gaps: List[TopGap]
    priority_actions: List[Dict[str, str]]


class ExtractionResponse(BaseModel):
    operations: List[Dict[str, Any]]
    reasoning: str
    raw_nodes: List[Dict[str, Any]]
    followup_questions: Optional[List[FollowUpQuestion]] = None
    followup_summary: Optional[str] = None
    applied: Optional[Dict[str, Any]] = None
    gap_analysis: Optional[GapAnalysisBrief] = None


class FollowUpRequest(BaseModel):
    context: str = Field(..., description="Context for generating follow-up questions")
    category: Optional[str] = Field(None, description="Framework category to focus on")


class EvaluateClaimRequest(BaseModel):
    claim: str = Field(..., description="The claim to evaluate")
    supporting_evidence: List[str] = Field(default=[], description="Evidence supporting the claim")
    contradicting_evidence: List[str] = Field(default=[], description="Evidence contradicting the claim")


class SuggestConnectionsRequest(BaseModel):
    node_type: str = Field(..., description="Type of the new node")
    title: str = Field(..., description="Title of the new node")
    content: str = Field(..., description="Content of the new node")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_history: List[Dict[str, str]] = Field(default=[], description="Previous messages")
    model: Optional[str] = Field(None, description="OpenRouter model to use")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/analyze")
async def analyze_startup_input(request: AnalyzeInputRequest):
    """
    Analyze user input about their startup idea.
    Extracts claims, facts, evidence and generates follow-up questions.
    """
    try:
        service = get_openrouter_service()
        result = await service.analyze_startup_input(request.user_input)
        return {
            "success": True,
            "analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract", response_model=ExtractionResponse)
async def extract_from_input(request: ExtractionRequest):
    """
    Extract knowledge graph nodes and edges from founder's input.
    
    This is the main extraction pipeline that:
    1. Parses founder input into structured nodes (claims, facts, evidence)
    2. Connects nodes to framework categories
    3. Generates follow-up questions based on extracted content
    4. Optionally applies the operations to the graph
    
    Returns operations and follow-up questions that can be previewed before applying.
    """
    try:
        graph = get_graph_service()
        
        # Get current graph state
        graph_state = graph.get_graph_state()
        
        # Run combined extraction with follow-up questions
        result = await extract_with_followup(
            user_text=request.text,
            graph_state=graph_state,
            model=request.model
        )
        
        # Convert follow-up questions to pydantic models
        followup_questions = [
            FollowUpQuestion(
                question=q.get("question", ""),
                type=q.get("type", "validation"),
                context=q.get("context", ""),
                targets_node=q.get("targets_node"),
                framework_category=q.get("framework_category")
            )
            for q in result.get("followup_questions", [])
        ]
        
        # Process gap analysis
        gap_analysis = None
        if "gap_analysis" in result:
            ga = result["gap_analysis"]
            gap_analysis = GapAnalysisBrief(
                summary=GapSummaryBrief(
                    total_gaps=ga["summary"]["total_gaps"],
                    killer_gaps=ga["summary"]["killer_gaps"],
                    high_gaps=ga["summary"]["high_gaps"],
                    overall_readiness=ga["summary"]["overall_readiness"],
                    completion_percentage=ga["summary"]["completion_percentage"]
                ),
                top_gaps=[
                    TopGap(
                        framework_id=g["framework_id"],
                        question=g["question"],
                        criticality=g["criticality"],
                        coverage_score=g["coverage_score"],
                        probing_questions=g["probing_questions"]
                    )
                    for g in ga["top_gaps"]
                ],
                priority_actions=ga["priority_actions"]
            )
        
        response = ExtractionResponse(
            operations=result["operations"],
            reasoning=result["reasoning"],
            raw_nodes=result["raw_nodes"],
            followup_questions=followup_questions,
            followup_summary=result.get("followup_summary", ""),
            gap_analysis=gap_analysis
        )
        
        # Optionally apply to graph
        if request.apply_to_graph:
            applied = apply_operations_to_graph(result["operations"], graph)
            response.applied = applied
        
        return response
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/apply")
async def apply_extraction_operations(operations: List[Dict[str, Any]]):
    """
    Apply previously extracted operations to the graph.
    Use this after previewing operations from /extract endpoint.
    """
    try:
        graph = get_graph_service()
        result = apply_operations_to_graph(operations, graph)
        
        return {
            "success": True,
            "applied": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/extract/prompt")
async def get_extraction_prompt():
    """
    Get the current extraction system prompt for debugging/transparency.
    """
    return {
        "system_prompt": EXTRACTION_SYSTEM_PROMPT
    }


@router.post("/follow-up-questions")
async def generate_follow_up_questions(request: FollowUpRequest):
    """
    Generate follow-up questions based on context and existing knowledge.
    """
    try:
        service = get_openrouter_service()
        graph = get_graph_service()
        
        # Get existing nodes for context
        existing_nodes = graph.get_all_nodes()
        
        questions = await service.generate_follow_up_questions(
            context=request.context,
            existing_nodes=existing_nodes,
            category=request.category
        )
        
        return {
            "success": True,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-claim")
async def evaluate_claim(request: EvaluateClaimRequest):
    """
    Evaluate a claim based on supporting and contradicting evidence.
    """
    try:
        service = get_openrouter_service()
        
        result = await service.evaluate_claim(
            claim=request.claim,
            supporting_evidence=request.supporting_evidence,
            contradicting_evidence=request.contradicting_evidence
        )
        
        return {
            "success": True,
            "evaluation": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-connections")
async def suggest_connections(request: SuggestConnectionsRequest):
    """
    Suggest connections between a new node and existing nodes in the graph.
    """
    try:
        service = get_openrouter_service()
        graph = get_graph_service()
        
        new_node = {
            "type": request.node_type,
            "title": request.title,
            "content": request.content
        }
        
        existing_nodes = graph.get_all_nodes()
        
        suggestions = await service.suggest_connections(
            new_node=new_node,
            existing_nodes=existing_nodes
        )
        
        return {
            "success": True,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_agent(request: ChatRequest):
    """
    Have a conversation with the AI agent about your startup.
    """
    try:
        from ..services.openrouter_service import Message, OpenRouterModel
        
        service = get_openrouter_service()
        graph = get_graph_service()
        
        # Get current graph state for context
        nodes = graph.get_all_nodes()
        non_framework_nodes = [n for n in nodes if n.get('type') != 'framework']
        
        # Build context from graph
        graph_context = ""
        if non_framework_nodes:
            graph_context = "\n\nCurrent knowledge about the startup:\n" + "\n".join([
                f"- [{n.get('type')}] {n.get('title')}: {n.get('content', '')[:100]}..."
                for n in non_framework_nodes[:10]
            ])
        
        system_message = f"""You are an expert startup advisor helping founders evaluate and refine their business ideas.
You have access to a knowledge graph that tracks claims, facts, and evidence about the startup.
{graph_context}

Help the user by:
1. Answering questions about startup validation
2. Challenging assumptions and identifying risks
3. Suggesting areas that need more research
4. Providing actionable advice

Be direct, insightful, and constructive. Focus on helping them build a stronger business case."""

        # Build messages
        messages = [Message(role="system", content=system_message)]
        
        # Add conversation history
        for msg in request.conversation_history:
            messages.append(Message(role=msg.get("role", "user"), content=msg.get("content", "")))
        
        # Add current message
        messages.append(Message(role="user", content=request.message))
        
        # Get model
        model = None
        if request.model:
            try:
                model = OpenRouterModel(request.model)
            except ValueError:
                model = request.model  # Use as string if not in enum
        
        response = await service.chat(messages, model=model, temperature=0.7)
        
        return {
            "success": True,
            "response": response.content,
            "model": response.model,
            "usage": response.usage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# GAP ANALYSIS ENDPOINTS
# =============================================================================

class GapAnalysisRequest(BaseModel):
    threshold: float = Field(default=0.5, ge=0.0, le=1.0, description="Coverage threshold below which a question is considered a gap")
    categories: Optional[List[str]] = Field(None, description="Optional list of categories to filter by (e.g., ['problem', 'market'])")


@router.post("/analyze-gaps", response_model=GapAnalysisResponse)
async def analyze_knowledge_gaps(request: Optional[GapAnalysisRequest] = None):
    """
    Analyze the knowledge graph for gaps in framework coverage.
    
    This endpoint identifies unanswered or underaddressed framework questions,
    prioritizing them by criticality (killer > high > medium > low) and coverage score.
    
    Use this after extractions to see what information is still missing.
    
    Returns:
    - summary: High-level overview with counts and priority actions
    - gaps: Detailed list of all gaps with probing questions
    - category_breakdown: Coverage by category (market, problem, solution, etc.)
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        # Get analysis parameters
        threshold = 0.5
        categories = None
        if request:
            threshold = request.threshold
            categories = request.categories
        
        # Run gap analysis
        gaps = analyze_gaps(graph_state, threshold=threshold, categories=categories)
        summary_data = get_gap_summary(gaps)
        
        # Convert to response models
        gap_responses = [
            GapResponse(
                framework_id=g.framework_id,
                question=g.question,
                why_it_matters=g.why_it_matters,
                criticality=g.criticality,
                founder_trap=g.founder_trap,
                probing_questions=g.probing_questions,
                coverage_score=g.coverage_score,
                connected_nodes_count=len(g.connected_nodes)
            )
            for g in gaps
        ]
        
        # Build category breakdown
        all_categories = ["market", "problem", "solution", "timing", "founder", "competition", "business_model", "gtm"]
        category_breakdown = {}
        for cat in all_categories:
            cat_data = get_category_gaps(graph_state, cat)
            category_breakdown[cat] = {
                "total_questions": cat_data["total_questions"],
                "gaps_count": cat_data["gaps_count"],
                "completion_percentage": cat_data["completion_percentage"]
            }
        
        # Build summary
        priority_actions = [
            PriorityAction(
                framework_id=pa["framework_id"],
                action=pa["action"],
                criticality=pa["criticality"],
                why=pa["why"]
            )
            for pa in summary_data["priority_actions"]
        ]
        
        most_critical = None
        if summary_data["most_critical"]:
            mc = summary_data["most_critical"]
            most_critical = GapResponse(
                framework_id=mc["framework_id"],
                question=mc["question"],
                why_it_matters=mc["why_it_matters"],
                criticality=mc["criticality"],
                founder_trap=mc["founder_trap"],
                probing_questions=mc["probing_questions"],
                coverage_score=mc["coverage_score"],
                connected_nodes_count=mc["connected_nodes_count"]
            )
        
        summary = GapSummary(
            total_gaps=summary_data["total_gaps"],
            killer_gaps=summary_data["killer_gaps"],
            high_gaps=summary_data["high_gaps"],
            medium_gaps=summary_data["medium_gaps"],
            low_gaps=summary_data["low_gaps"],
            most_critical=most_critical,
            priority_actions=priority_actions,
            overall_readiness=summary_data["overall_readiness"],
            completion_percentage=summary_data["completion_percentage"]
        )
        
        return GapAnalysisResponse(
            success=True,
            summary=summary,
            gaps=gap_responses,
            category_breakdown=category_breakdown
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze-gaps/{category}", response_model=CategoryGapsResponse)
async def analyze_category_gaps(category: str, threshold: float = 0.5):
    """
    Analyze gaps for a specific framework category.
    
    Categories: market, problem, solution, timing, founder, competition, business_model, gtm
    """
    valid_categories = ["market", "problem", "solution", "timing", "founder", "competition", "business_model", "gtm"]
    
    if category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )
    
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        cat_data = get_category_gaps(graph_state, category)
        
        return CategoryGapsResponse(
            category=cat_data["category"],
            total_questions=cat_data["total_questions"],
            gaps_count=cat_data["gaps_count"],
            completion_percentage=cat_data["completion_percentage"],
            gaps=[
                GapResponse(
                    framework_id=g["framework_id"],
                    question=g["question"],
                    why_it_matters=g["why_it_matters"],
                    criticality=g["criticality"],
                    founder_trap=g["founder_trap"],
                    probing_questions=g["probing_questions"],
                    coverage_score=g["coverage_score"],
                    connected_nodes_count=g["connected_nodes_count"]
                )
                for g in cat_data["gaps"]
            ]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/framework-questions")
async def list_framework_questions():
    """
    List all framework questions with their metadata.
    
    Useful for understanding what information the system is looking for.
    """
    return {
        "total_questions": len(FRAMEWORK_QUESTIONS),
        "questions": [
            {
                "id": fq.id,
                "question": fq.question,
                "why_it_matters": fq.why_it_matters,
                "criticality": fq.criticality.value,
                "founder_trap": fq.founder_trap,
                "probing_questions": fq.probing_questions
            }
            for fq in FRAMEWORK_QUESTIONS.values()
        ]
    }


@router.get("/models")
async def list_available_models():
    """
    List available OpenRouter models.
    """
    return {
        "models": [
            {"id": m.value, "name": m.name} 
            for m in OpenRouterModel
        ]
    }


# =============================================================================
# PMF PATH ENDPOINTS
# =============================================================================

class SetPathRequest(BaseModel):
    path: str = Field(..., description="PMF path: 'hair_on_fire', 'hard_fact', or 'future_vision'")
    confidence: int = Field(default=100, ge=0, le=100, description="Confidence in the path selection")


class PathStatusResponse(BaseModel):
    path: Optional[str]
    playbook: Optional[Dict[str, Any]]
    status: str
    message: str
    blockers: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    triggered_rules: List[Dict[str, Any]]
    total_rules: int
    triggered_count: int


@router.post("/path/set")
async def set_pmf_path(request: SetPathRequest):
    """
    Set the PMF path for the startup.
    
    Creates or updates the startup_meta node with the selected path.
    Valid paths: 'hair_on_fire', 'hard_fact', 'future_vision'
    """
    valid_paths = ["hair_on_fire", "hard_fact", "future_vision"]
    
    if request.path not in valid_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid path. Must be one of: {', '.join(valid_paths)}"
        )
    
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        # Check if startup_meta node already exists
        existing_meta = None
        for node in graph_state.get("nodes", []):
            if node.get("type") == "startup_meta":
                existing_meta = node
                break
        
        from datetime import datetime
        
        if existing_meta:
            # Update existing meta node
            graph.update_node(existing_meta["id"], {
                "content": f"PMF Path: {request.path}",
                "metadata": {
                    "pmf_path": request.path,
                    "pmf_path_confidence": request.confidence,
                    "pmf_path_detected_at": datetime.now().isoformat(),
                }
            })
            meta_id = existing_meta["id"]
        else:
            # Create new startup_meta node
            import uuid
            meta_id = f"startup_meta_{str(uuid.uuid4())[:8]}"
            
            new_node = {
                "id": meta_id,
                "type": "startup_meta",
                "title": "Startup Configuration",
                "content": f"PMF Path: {request.path}",
                "confidence": 100,
                "pmf_path": request.path,
                "pmf_path_confidence": request.confidence,
                "pmf_path_detected_at": datetime.now().isoformat(),
            }
            graph.add_node(new_node)
        
        # Get the playbook summary for the response
        playbook_summary = get_playbook_summary(request.path)
        
        return {
            "success": True,
            "path": request.path,
            "confidence": request.confidence,
            "meta_node_id": meta_id,
            "playbook": playbook_summary,
            "message": f"PMF path set to '{request.path}'. Your playbook is ready."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/path/status")
async def get_path_status_endpoint():
    """
    Get the current PMF path status, including triggered playbook rules.
    
    Returns the current path, playbook summary, and any blockers/warnings.
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        # Find the startup_meta node
        current_path = None
        for node in graph_state.get("nodes", []):
            if node.get("type") == "startup_meta":
                current_path = node.get("pmf_path") or node.get("metadata", {}).get("pmf_path")
                break
        
        if not current_path:
            return {
                "path": None,
                "playbook": None,
                "status": "no_path",
                "message": "No PMF path selected. Complete onboarding to get your playbook.",
                "blockers": [],
                "warnings": [],
                "triggered_rules": [],
                "total_rules": 0,
                "triggered_count": 0,
            }
        
        # Get playbook status with evaluated rules
        status = get_playbook_status(current_path, graph_state)
        return status
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/path/playbook/{path}")
async def get_playbook_endpoint(path: str):
    """
    Get the full playbook for a specific PMF path.
    
    Returns all rules, metrics, warnings, and actions for the path.
    """
    valid_paths = ["hair_on_fire", "hard_fact", "future_vision"]
    
    if path not in valid_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid path. Must be one of: {', '.join(valid_paths)}"
        )
    
    playbook = get_playbook(path)
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    return playbook.to_dict()


@router.get("/path/playbooks")
async def list_all_playbooks():
    """
    List all available PMF path playbooks with summaries.
    """
    return {
        "paths": [
            {
                "id": path_id,
                "summary": get_playbook_summary(path_id)
            }
            for path_id in PLAYBOOKS.keys()
        ]
    }


@router.post("/path/detect")
async def detect_path_from_graph():
    """
    Auto-detect the likely PMF path based on the current graph content.
    
    Analyzes the graph for keywords and patterns that indicate each path type.
    Returns a suggested path with confidence score.
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        nodes = graph_state.get("nodes", [])
        all_text = " ".join([
            f"{n.get('title', '')} {n.get('content', '')}"
            for n in nodes
            if n.get("type") != "startup_meta"
        ]).lower()
        
        # Score each path based on keyword presence
        path_scores = {
            "hair_on_fire": 0,
            "hard_fact": 0,
            "future_vision": 0,
        }
        
        # Hair on Fire indicators
        hof_keywords = [
            ("actively searching", 3),
            ("competitor", 2),
            ("comparing", 2),
            ("googling", 3),
            ("looking for", 1),
            ("win rate", 2),
            ("sales cycle", 1),
            ("ready to buy", 3),
        ]
        for keyword, weight in hof_keywords:
            if keyword in all_text:
                path_scores["hair_on_fire"] += weight
        
        # Hard Fact indicators
        hf_keywords = [
            ("spreadsheet", 3),
            ("manual", 2),
            ("workaround", 3),
            ("just how things are", 3),
            ("always done", 2),
            ("educate", 2),
            ("trigger", 2),
            ("accepted", 2),
        ]
        for keyword, weight in hf_keywords:
            if keyword in all_text:
                path_scores["hard_fact"] += weight
        
        # Future Vision indicators
        fv_keywords = [
            ("impossible", 3),
            ("years away", 3),
            ("don't believe", 3),
            ("stepping stone", 3),
            ("runway", 2),
            ("vision", 2),
            ("paradigm", 3),
            ("believer", 2),
            ("skeptical", 2),
        ]
        for keyword, weight in fv_keywords:
            if keyword in all_text:
                path_scores["future_vision"] += weight
        
        # Find the highest scoring path
        max_score = max(path_scores.values())
        
        if max_score == 0:
            return {
                "detected_path": None,
                "confidence": 0,
                "scores": path_scores,
                "message": "Not enough information to detect PMF path. Please complete onboarding."
            }
        
        detected_path = max(path_scores, key=path_scores.get)
        
        # Calculate confidence (0-100) based on score difference
        sorted_scores = sorted(path_scores.values(), reverse=True)
        if len(sorted_scores) > 1 and sorted_scores[0] > 0:
            score_gap = sorted_scores[0] - sorted_scores[1]
            confidence = min(100, int(50 + (score_gap * 10)))
        else:
            confidence = 50
        
        return {
            "detected_path": detected_path,
            "confidence": confidence,
            "scores": path_scores,
            "playbook_summary": get_playbook_summary(detected_path),
            "message": f"Based on your graph content, you appear to be on the '{detected_path}' path."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/path/gaps/{path}")
async def get_path_specific_gaps_endpoint(path: str, threshold: float = 0.5):
    """
    Get gaps specific to a PMF path.
    
    Returns only the path-specific questions and their coverage status.
    """
    valid_paths = ["hair_on_fire", "hard_fact", "future_vision"]
    
    if path not in valid_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid path. Must be one of: {', '.join(valid_paths)}"
        )
    
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        gaps = get_path_specific_gaps(graph_state, path, threshold)
        
        return {
            "path": path,
            "total_path_questions": len(PATH_SPECIFIC_QUESTIONS.get(path, {})),
            "gaps_count": len(gaps),
            "gaps": [g.to_dict() for g in gaps]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CONFIDENCE ASSESSMENT ENDPOINTS
# =============================================================================

from ..services.confidence_service import (
    assess_node_confidence,
    assess_all_nodes_confidence,
    get_confidence_summary,
    get_band_from_score,
    CONFIDENCE_BANDS
)


@router.get("/confidence/node/{node_id}")
async def assess_node_confidence_endpoint(node_id: str):
    """
    Assess confidence for a specific node based on connected evidence.
    
    Returns:
    - score: 10-85 integer (honest bounds)
    - band: confidence band (high/medium/low/assumption) with label and color
    - factors: breakdown of individual factor scores
    - limiting_factor: weakest factor (what needs improvement)
    - to_increase: actionable suggestion to improve confidence
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        # Find the node
        node = None
        for n in graph_state.get("nodes", []):
            if n.get("id") == node_id:
                node = n
                break
        
        if not node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
        
        result = assess_node_confidence(node, graph_state)
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/confidence/all")
async def assess_all_confidence():
    """
    Assess confidence for all non-framework nodes in the graph.
    
    Returns dict mapping node_id -> confidence assessment.
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        results = assess_all_nodes_confidence(graph_state)
        return {
            "assessments": results,
            "count": len(results),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/confidence/summary")
async def get_confidence_summary_endpoint():
    """
    Get summary of confidence across the entire graph.
    
    Returns:
    - band_distribution: count of nodes in each band
    - top_limiting_factors: most common limiting factors
    - overall_health: assessment of graph's evidence quality
    """
    try:
        graph = get_graph_service()
        graph_state = graph.get_graph_state()
        
        summary = get_confidence_summary(graph_state)
        return summary
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/confidence/bands")
async def get_confidence_bands():
    """
    Get the confidence band definitions.
    
    Returns the band levels, labels, descriptions, and colors
    used for honest uncertainty communication.
    """
    return {
        "bands": CONFIDENCE_BANDS,
        "description": "Confidence bands represent honest uncertainty. High confidence = well-evidenced, not necessarily correct. Low confidence = needs validation, not necessarily wrong."
    }
