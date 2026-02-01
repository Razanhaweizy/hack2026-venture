"""
Debate API Routes
Two-agent debate system for stress-testing startup ideas.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from ..services.debate_service import (
    get_debate_engine,
    DebateMode,
)

router = APIRouter(prefix="/debate", tags=["debate"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreateDebateRequest(BaseModel):
    claim: str
    mode: str                          # "watch", "defend", "attack"
    context: Optional[dict] = None
    max_rounds: int = 3


class CreateDebateResponse(BaseModel):
    session_id: str
    mode: str
    attacker: str
    defender: str
    claim: str


class NextTurnResponse(BaseModel):
    status: str                        # "agent_responded", "awaiting_founder", "complete"
    speaker: Optional[str] = None
    turn_type: Optional[str] = None
    content: Optional[str] = None
    prompt: Optional[str] = None       # For founder's turn
    round: Optional[int] = None
    is_complete: bool = False
    summary: Optional[dict] = None


class FounderTurnRequest(BaseModel):
    content: str


class AgentInfo(BaseModel):
    id: str
    name: str
    emoji: str
    tagline: str
    personality: str
    signature_moves: List[str]


class AgentsResponse(BaseModel):
    skeptic: AgentInfo
    advocate: AgentInfo


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/agents")
async def get_agents():
    """Get information about available debate agents."""
    engine = get_debate_engine()
    return engine.get_agents_info()


@router.post("/create", response_model=CreateDebateResponse)
async def create_debate(request: CreateDebateRequest):
    """Create a new debate session."""
    
    try:
        mode = DebateMode(request.mode)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Must be one of: watch, defend, attack"
        )
    
    engine = get_debate_engine()
    
    session = engine.create_session(
        claim=request.claim,
        mode=mode,
        context=request.context or {},
        max_rounds=request.max_rounds
    )
    
    return CreateDebateResponse(
        session_id=session.id,
        mode=session.mode.value,
        attacker=session.attacker,
        defender=session.defender,
        claim=session.claim
    )


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get the current state of a debate session."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session.to_dict()


@router.get("/{session_id}/next", response_model=NextTurnResponse)
async def get_next_turn(session_id: str):
    """Get the next turn in the debate."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        result = await engine.get_next_turn(session_id)
        return NextTurnResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/respond", response_model=NextTurnResponse)
async def submit_founder_response(session_id: str, request: FounderTurnRequest):
    """Submit the founder's turn in the debate."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        result = await engine.submit_founder_turn(session_id, request.content)
        return NextTurnResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/transcript")
async def get_transcript(session_id: str):
    """Get the full debate transcript."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "claim": session.claim,
        "mode": session.mode.value,
        "current_round": session.current_round,
        "max_rounds": session.max_rounds,
        "is_complete": session.is_complete,
        "transcript": [t.to_dict() for t in session.transcript]
    }


@router.get("/{session_id}/evaluate")
async def evaluate_debate(session_id: str):
    """Get evaluation of a completed debate."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.is_complete:
        raise HTTPException(status_code=400, detail="Debate not complete")
    
    try:
        evaluation = await engine.generate_evaluation(session_id)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/run")
async def run_full_debate(session_id: str):
    """Run a full debate without intervention (Watch mode only)."""
    
    engine = get_debate_engine()
    session = engine.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.mode != DebateMode.WATCH:
        raise HTTPException(
            status_code=400, 
            detail="Can only auto-run debates in Watch mode"
        )
    
    try:
        summary = await engine.run_full_debate(session_id)
        evaluation = await engine.generate_evaluation(session_id)
        
        return {
            "summary": summary,
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
