"""
Extraction Service
Handles knowledge graph extraction from founder input using LLM

Includes automatic gap detection after every extraction to identify
what information is still missing from the knowledge graph.
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from .openrouter_service import get_openrouter_service, Message, OpenRouterModel
from .gap_detection_service import analyze_gaps, get_gap_summary


# =============================================================================
# SYSTEM PROMPT
# =============================================================================

EXTRACTION_SYSTEM_PROMPT = """You are a knowledge graph extraction agent for startup founders.

Your job: Parse founder input → Output structured graph operations as JSON.

## NODE TYPES

- CLAIM: Founder's belief/assumption, unvalidated. "I think X", "We assume Y", "The market should be Z"
- FACT: Objectively true, verifiable. "Competitor raised $5M", "React launched in 2013", "Maria is a restaurant owner"
- EVIDENCE: Real-world data point. Customer quotes, experiment results, research findings.

## EDGE TYPES

- supports: Source provides evidence target is true
- contradicts: Source suggests target might be wrong
- informs: Source adds context to target (doesn't prove/disprove)
- depends_on: If source fails, target fails
- blocks: Source prevents target

## CONFIDENCE SCORING

- 90-100: Direct quote, hard number, verified fact
- 70-89: Clear statement from credible source
- 50-69: Single data point, reasonable inference
- 30-49: Weak evidence, assumption
- 0-29: Speculation, no support

## OUTPUT FORMAT

Return ONLY valid JSON:
```json
{
  "nodes": [
    {
      "type": "claim|fact|evidence",
      "label": "Short label (max 50 chars)",
      "content": "Full description",
      "confidence": 85,
      "source": "Who/what said this (optional)",
      "framework_connections": [
        {
          "framework_id": "problem:pain",
          "edge_type": "supports|contradicts|informs",
          "reason": "Why connected"
        }
      ]
    }
  ],
  "reasoning": "Brief explanation of extraction"
}
```

## RULES

1. One piece of information = one node
2. Every node must connect to at least one framework category
3. People/companies mentioned = FACT nodes
4. Numbers and quotes = high confidence
5. "I think", "probably", "should" = CLAIM with lower confidence
6. Direct customer quotes = EVIDENCE with high confidence
7. Be specific in labels: "Maria: $2,500/mo waste" not "Cost info"
"""


# =============================================================================
# FOLLOW-UP QUESTIONS SYSTEM PROMPT
# =============================================================================

FOLLOWUP_SYSTEM_PROMPT = """You are an expert startup advisor generating follow-up questions.

Based on the founder's input and extracted information, generate 2-4 targeted follow-up questions that will:
1. Dig deeper into claims that need validation
2. Uncover missing information about the customer/market
3. Challenge assumptions
4. Gather quantitative data

## QUESTION TYPES

- VALIDATION: "How did you verify X?" "What evidence supports Y?"
- QUANTITATIVE: "How many customers?" "What's the exact price point?"
- CUSTOMER: "Who specifically is this for?" "What alternatives do they use?"
- RISK: "What happens if X fails?" "What's your biggest concern?"

## OUTPUT FORMAT

Return ONLY valid JSON:
```json
{
  "questions": [
    {
      "question": "The actual question text?",
      "type": "validation|quantitative|customer|risk",
      "context": "Why this question matters",
      "targets_node": "label of the node this relates to (optional)",
      "framework_category": "problem:pain (which framework area this addresses)"
    }
  ],
  "summary": "Brief explanation of why these questions were chosen"
}
```

## RULES

1. Questions should be specific, not generic
2. Reference specific details from the founder's input
3. Prioritize questions that could invalidate assumptions
4. Each question should uncover actionable information
5. Keep questions concise and direct
"""


# =============================================================================
# PRE-PROCESSING
# =============================================================================

def prepare_extraction_context(graph_state: Dict[str, Any]) -> Tuple[List[Dict], List[Dict]]:
    """
    Prepare the context for the extraction prompt.
    Returns (framework_nodes, existing_user_nodes)
    """
    
    framework_nodes = []
    user_nodes = []
    
    for node in graph_state.get("nodes", []):
        if node.get("type") == "framework":
            framework_nodes.append({
                "id": node["id"],
                "label": node.get("title", node.get("label", "")),
                "description": node.get("content", node.get("description", ""))
            })
        else:
            user_nodes.append({
                "id": node["id"],
                "type": node.get("type", "claim"),
                "label": node.get("title", node.get("label", "")),
                "confidence": node.get("confidence", 50),
                "content": node.get("content", "")
            })
    
    return framework_nodes, user_nodes


def build_extraction_prompt(
    user_text: str, 
    framework_nodes: List[Dict], 
    existing_nodes: Optional[List[Dict]] = None
) -> str:
    """Build the user prompt with context"""
    
    framework_section = "## FRAMEWORK CATEGORIES (connect new nodes to these)\n\n"
    for node in framework_nodes:
        framework_section += f"- {node['id']}: {node['label']}\n"
    
    existing_section = ""
    if existing_nodes:
        existing_section = "\n## EXISTING NODES (you can reference or update these)\n\n"
        for node in existing_nodes[:30]:  # Limit to prevent token overflow
            existing_section += f"- [{node['type']}] {node['label']} (id: {node['id']}, confidence: {node['confidence']}%)\n"
    
    return f"""{framework_section}{existing_section}
## FOUNDER'S INPUT

\"\"\"{user_text}\"\"\"

Extract all meaningful information into nodes. Output JSON only."""


# =============================================================================
# POST-PROCESSING
# =============================================================================

def parse_llm_response(response_text: str) -> Dict[str, Any]:
    """Extract JSON from LLM response, handling markdown code blocks"""
    
    text = response_text.strip()
    
    # Handle ```json ... ``` blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    
    return json.loads(text)


def convert_to_graph_operations(
    parsed_response: Dict[str, Any], 
    graph_state: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Convert LLM output to concrete graph operations.
    Returns list of operations ready to apply to graph.
    """
    
    operations = []
    
    for node_data in parsed_response.get("nodes", []):
        node_id = f"{node_data['type']}-{uuid.uuid4().hex[:8]}"
        
        # Create the node
        operations.append({
            "op": "add_node",
            "node": {
                "id": node_id,
                "type": node_data["type"],
                "label": node_data.get("label", ""),
                "title": node_data.get("label", ""),  # Also set title for compatibility
                "content": node_data.get("content", node_data.get("label", "")),
                "confidence": node_data.get("confidence", 50),
                "source": node_data.get("source"),
                "created_at": datetime.utcnow().isoformat(),
                "position": None  # Let frontend compute
            }
        })
        
        # Create edges to framework nodes
        for conn in node_data.get("framework_connections", []):
            framework_id = conn["framework_id"]
            
            # Normalize framework ID (handle "problem:pain" vs "framework:problem:pain")
            if not framework_id.startswith("framework:"):
                framework_id = f"framework:{framework_id}"
            
            # Verify framework node exists
            framework_exists = any(
                n["id"] == framework_id 
                for n in graph_state.get("nodes", [])
            )
            
            if framework_exists:
                operations.append({
                    "op": "add_edge",
                    "edge": {
                        "id": f"edge-{uuid.uuid4().hex[:8]}",
                        "source_id": node_id,
                        "target_id": framework_id,
                        "type": conn["edge_type"],
                        "reason": conn.get("reason", ""),
                        "created_at": datetime.utcnow().isoformat()
                    }
                })
    
    return operations


# =============================================================================
# MAIN EXTRACTION FUNCTION
# =============================================================================

async def extract_from_text(
    user_text: str,
    graph_state: Dict[str, Any],
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main extraction pipeline.
    
    Args:
        user_text: The founder's input
        graph_state: Current graph (nodes + edges)
        model: Optional model override
    
    Returns:
        {
            "operations": [...],  # Graph operations to apply
            "reasoning": "...",   # LLM's explanation
            "raw_nodes": [...]    # Extracted nodes before conversion
        }
    """
    
    # 1. Prepare context
    framework_nodes, existing_nodes = prepare_extraction_context(graph_state)
    
    # 2. Build prompt
    user_prompt = build_extraction_prompt(user_text, framework_nodes, existing_nodes)
    
    # 3. Call LLM
    openrouter = get_openrouter_service()
    
    messages = [
        Message(role="system", content=EXTRACTION_SYSTEM_PROMPT),
        Message(role="user", content=user_prompt)
    ]
    
    # Use specified model or default to Claude Sonnet for best extraction quality
    llm_model = model or OpenRouterModel.CLAUDE_3_5_SONNET
    
    response = await openrouter.chat(
        messages=messages,
        model=llm_model,
        temperature=0.1,  # Low temp for structured output
        max_tokens=4096
    )
    
    response_text = response.content
    
    # 4. Parse response
    parsed = parse_llm_response(response_text)
    
    # 5. Convert to operations
    operations = convert_to_graph_operations(parsed, graph_state)
    
    return {
        "operations": operations,
        "reasoning": parsed.get("reasoning", ""),
        "raw_nodes": parsed.get("nodes", []),
        "model_used": response.model
    }


# =============================================================================
# FOLLOW-UP QUESTIONS GENERATION
# =============================================================================

def build_followup_prompt(
    user_text: str,
    extracted_nodes: List[Dict],
    framework_nodes: List[Dict],
    existing_nodes: Optional[List[Dict]] = None
) -> str:
    """Build prompt for follow-up questions generation"""
    
    # Show extracted nodes
    extracted_section = "## JUST EXTRACTED (from this input)\n\n"
    for node in extracted_nodes:
        extracted_section += f"- [{node['type'].upper()}] {node.get('label', '')}: {node.get('content', '')[:100]}\n"
        extracted_section += f"  Confidence: {node.get('confidence', 50)}%\n"
    
    # Show relevant framework categories
    framework_section = "\n## FRAMEWORK CATEGORIES\n\n"
    for node in framework_nodes[:20]:
        framework_section += f"- {node['id']}: {node['label']}\n"
    
    # Show existing context
    existing_section = ""
    if existing_nodes:
        existing_section = "\n## EXISTING KNOWLEDGE\n\n"
        for node in existing_nodes[:15]:
            existing_section += f"- [{node['type']}] {node['label']} ({node['confidence']}%)\n"
    
    return f"""## FOUNDER'S INPUT

\"\"\"{user_text}\"\"\"

{extracted_section}{framework_section}{existing_section}

Generate follow-up questions to dig deeper and validate the extracted information.
Focus on gaps, assumptions, and areas needing more evidence.
Output JSON only."""


async def generate_followup_questions(
    user_text: str,
    extracted_nodes: List[Dict],
    graph_state: Dict[str, Any],
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate follow-up questions based on the founder's input and extracted nodes.
    
    Returns:
        {
            "questions": [...],
            "summary": "..."
        }
    """
    
    # Prepare context
    framework_nodes, existing_nodes = prepare_extraction_context(graph_state)
    
    # Build prompt
    user_prompt = build_followup_prompt(
        user_text, 
        extracted_nodes, 
        framework_nodes, 
        existing_nodes
    )
    
    # Call LLM
    openrouter = get_openrouter_service()
    
    messages = [
        Message(role="system", content=FOLLOWUP_SYSTEM_PROMPT),
        Message(role="user", content=user_prompt)
    ]
    
    # Use a faster model for follow-up questions
    llm_model = model or OpenRouterModel.GPT_4O_MINI
    
    response = await openrouter.chat(
        messages=messages,
        model=llm_model,
        temperature=0.3,
        max_tokens=2048
    )
    
    # Parse response
    parsed = parse_llm_response(response.content)
    
    return {
        "questions": parsed.get("questions", []),
        "summary": parsed.get("summary", ""),
        "model_used": response.model
    }


async def extract_with_followup(
    user_text: str,
    graph_state: Dict[str, Any],
    model: Optional[str] = None,
    include_gap_analysis: bool = True
) -> Dict[str, Any]:
    """
    Combined extraction pipeline that also generates follow-up questions
    and performs gap analysis.
    
    After every extraction, automatically checks what's missing from
    the knowledge graph and prioritizes gaps by criticality.
    
    Returns:
        {
            "operations": [...],
            "reasoning": "...",
            "raw_nodes": [...],
            "followup_questions": [...],
            "followup_summary": "...",
            "gap_analysis": {
                "summary": {...},
                "top_gaps": [...],
                "priority_actions": [...]
            }
        }
    """
    
    # First, do the extraction
    extraction_result = await extract_from_text(user_text, graph_state, model)
    
    # Then generate follow-up questions based on extracted nodes
    followup_result = await generate_followup_questions(
        user_text=user_text,
        extracted_nodes=extraction_result["raw_nodes"],
        graph_state=graph_state,
        model=model
    )
    
    result = {
        **extraction_result,
        "followup_questions": followup_result["questions"],
        "followup_summary": followup_result["summary"]
    }
    
    # Run gap analysis after extraction
    if include_gap_analysis:
        # Simulate the graph state after applying operations
        # by adding the new nodes to a copy of the graph state
        simulated_state = simulate_graph_after_operations(
            graph_state, 
            extraction_result["operations"]
        )
        
        gap_result = analyze_gaps_after_extraction(simulated_state)
        result["gap_analysis"] = gap_result
    
    return result


def simulate_graph_after_operations(
    graph_state: Dict[str, Any],
    operations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Create a simulated graph state that includes the proposed operations.
    This allows gap analysis to account for newly extracted information.
    """
    # Deep copy to avoid modifying original
    simulated_nodes = list(graph_state.get("nodes", []))
    simulated_edges = list(graph_state.get("edges", []))
    
    for op in operations:
        if op["op"] == "add_node":
            node = op["node"].copy()
            # Ensure node has required fields
            node.setdefault("type", "claim")
            node.setdefault("confidence", 50)
            simulated_nodes.append(node)
            
        elif op["op"] == "add_edge":
            edge = op["edge"].copy()
            # Convert source_id/target_id to from/to format
            edge["from"] = edge.get("source_id", edge.get("from", ""))
            edge["to"] = edge.get("target_id", edge.get("to", ""))
            simulated_edges.append(edge)
    
    return {
        "nodes": simulated_nodes,
        "edges": simulated_edges
    }


def analyze_gaps_after_extraction(graph_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run gap analysis and return a structured result for the extraction response.
    
    Returns the most important gaps and actions needed.
    """
    gaps = analyze_gaps(graph_state, threshold=0.5)
    summary = get_gap_summary(gaps)
    
    # Get top 5 most critical gaps
    top_gaps = [
        {
            "framework_id": g.framework_id,
            "question": g.question,
            "criticality": g.criticality,
            "coverage_score": g.coverage_score,
            "probing_questions": g.probing_questions[:2]  # First 2 probing questions
        }
        for g in gaps[:5]
    ]
    
    return {
        "summary": {
            "total_gaps": summary["total_gaps"],
            "killer_gaps": summary["killer_gaps"],
            "high_gaps": summary["high_gaps"],
            "overall_readiness": summary["overall_readiness"],
            "completion_percentage": summary["completion_percentage"]
        },
        "top_gaps": top_gaps,
        "priority_actions": summary["priority_actions"]
    }


# =============================================================================
# APPLY OPERATIONS TO GRAPH
# =============================================================================

def apply_operations_to_graph(
    operations: List[Dict[str, Any]],
    graph_service
) -> Dict[str, Any]:
    """
    Apply the extracted operations to the graph.
    Returns summary of what was applied.
    """
    from .graph_service import GraphService
    from ..models.graph import CreateNodeInput, CreateEdgeInput, NodeType, EdgeType
    
    results = {
        "nodes_added": [],
        "edges_added": [],
        "errors": []
    }
    
    for op in operations:
        try:
            if op["op"] == "add_node":
                node_data = op["node"]
                
                # Map type string to enum
                node_type_map = {
                    "claim": NodeType.CLAIM,
                    "fact": NodeType.FACT,
                    "evidence": NodeType.EVIDENCE,
                    "framework": NodeType.FRAMEWORK
                }
                
                input_data = CreateNodeInput(
                    id=node_data.get("id"),
                    type=node_type_map.get(node_data["type"], NodeType.CLAIM),
                    title=node_data.get("title", node_data.get("label", "")),
                    content=node_data.get("content", ""),
                    confidence=node_data.get("confidence", 50),
                    source=node_data.get("source")
                )
                
                added_node = graph_service.add_node(input_data)
                results["nodes_added"].append(added_node)
                
            elif op["op"] == "add_edge":
                edge_data = op["edge"]
                
                # Map edge type string to enum
                edge_type_map = {
                    "supports": EdgeType.SUPPORTS,
                    "contradicts": EdgeType.CONTRADICTS,
                    "informs": EdgeType.INFORMS,
                    "depends_on": EdgeType.DEPENDS_ON,
                    "blocks": EdgeType.BLOCKS,
                    "requires": EdgeType.REQUIRES
                }
                
                input_data = CreateEdgeInput(
                    id=edge_data.get("id"),
                    type=edge_type_map.get(edge_data["type"], EdgeType.SUPPORTS),
                    **{"from": edge_data["source_id"]},  # Handle reserved keyword
                    to=edge_data["target_id"],
                    note=edge_data.get("reason", "")
                )
                
                added_edge = graph_service.add_edge(input_data)
                results["edges_added"].append(added_edge)
                
        except Exception as e:
            results["errors"].append({
                "operation": op,
                "error": str(e)
            })
    
    return results
