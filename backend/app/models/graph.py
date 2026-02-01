"""
Graph Data Models
Pydantic models for the Ideograph dependency graph
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Union, List, Dict, Any
from pydantic import BaseModel, Field
import uuid


# =============================================================================
# ENUMS
# =============================================================================

class NodeType(str, Enum):
    FRAMEWORK = "framework"
    CLAIM = "claim"
    FACT = "fact"
    EVIDENCE = "evidence"
    STARTUP_META = "startup_meta"


class PmfPath(str, Enum):
    """The three fundamental PMF paths that determine startup strategy"""
    HAIR_ON_FIRE = "hair_on_fire"      # Customer actively searching for solutions
    HARD_FACT = "hard_fact"            # Customer has accepted the problem as "just how things are"
    FUTURE_VISION = "future_vision"    # Customer doesn't know they have the problem


class EdgeType(str, Enum):
    REQUIRES = "requires"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    DEPENDS_ON = "depends_on"
    INFORMS = "informs"
    BLOCKS = "blocks"


class FrameworkCategory(str, Enum):
    ROOT = "root"
    MARKET = "market"
    PROBLEM = "problem"
    SOLUTION = "solution"
    TIMING = "timing"
    FOUNDER = "founder"
    COMPETITION = "competition"
    BUSINESS_MODEL = "business_model"
    GTM = "gtm"


class EvidenceValence(str, Enum):
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"


# =============================================================================
# POSITION
# =============================================================================

class PositionHint(BaseModel):
    x: float
    y: float
    level: int  # 0 = root, 1 = category, 2 = leaf


# =============================================================================
# BASE NODE
# =============================================================================

class BaseNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: NodeType
    title: str
    content: str = ""
    confidence: int = Field(default=50, ge=0, le=100)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


# =============================================================================
# SPECIALIZED NODES
# =============================================================================

class FrameworkNode(BaseNode):
    type: NodeType = NodeType.FRAMEWORK
    framework_category: Optional[FrameworkCategory] = None
    description: str = ""
    position: Optional[PositionHint] = None
    is_skeleton: bool = True
    parent_id: Optional[str] = None


class ClaimNode(BaseNode):
    type: NodeType = NodeType.CLAIM
    source: Optional[str] = None
    tested: bool = False


class FactNode(BaseNode):
    type: NodeType = NodeType.FACT
    source: Optional[str] = None
    verification_url: Optional[str] = None


class EvidenceNode(BaseNode):
    type: NodeType = NodeType.EVIDENCE
    valence: EvidenceValence = EvidenceValence.SUPPORTING
    source: str = ""
    gathered_at: Optional[datetime] = None


class StartupMetaNode(BaseNode):
    """
    Special node that stores startup-level metadata.
    Only one of these should exist per graph.
    Stores PMF path and other startup-wide settings.
    """
    type: NodeType = NodeType.STARTUP_META
    pmf_path: Optional[PmfPath] = None
    pmf_path_confidence: int = Field(default=100, ge=0, le=100)
    pmf_path_detected_at: Optional[datetime] = None
    startup_name: Optional[str] = None


# Union type for all nodes
GraphNode = Union[FrameworkNode, ClaimNode, FactNode, EvidenceNode, StartupMetaNode]


# =============================================================================
# EDGE
# =============================================================================

class GraphEdge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: EdgeType
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        use_enum_values = True
        populate_by_name = True


# =============================================================================
# INPUT MODELS
# =============================================================================

class CreateNodeInput(BaseModel):
    id: Optional[str] = None
    type: NodeType
    title: str
    content: str = ""
    confidence: int = Field(default=50, ge=0, le=100)
    
    # Framework-specific
    framework_category: Optional[FrameworkCategory] = None
    description: Optional[str] = None
    position: Optional[PositionHint] = None
    is_skeleton: Optional[bool] = None
    parent_id: Optional[str] = None
    
    # Claim-specific
    source: Optional[str] = None
    tested: Optional[bool] = None
    
    # Evidence-specific
    valence: Optional[EvidenceValence] = None

    class Config:
        use_enum_values = True


class CreateEdgeInput(BaseModel):
    id: Optional[str] = None
    type: EdgeType
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    note: Optional[str] = None

    class Config:
        use_enum_values = True
        populate_by_name = True


class UpdateNodeInput(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    confidence: Optional[int] = Field(default=None, ge=0, le=100)
    change_note: Optional[str] = None


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class GraphState(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class NodeResponse(BaseModel):
    success: bool
    node: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class EdgeResponse(BaseModel):
    success: bool
    edge: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class ProgressResponse(BaseModel):
    answered: int
    total: int
    percentage: int


# =============================================================================
# GAP ANALYSIS MODELS
# =============================================================================

class GapResponse(BaseModel):
    """A single gap in framework coverage"""
    framework_id: str
    question: str
    why_it_matters: str
    criticality: str  # killer, high, medium, low
    founder_trap: str
    probing_questions: List[str]
    coverage_score: float
    connected_nodes_count: int


class PriorityAction(BaseModel):
    """A prioritized action to address a gap"""
    framework_id: str
    action: str
    criticality: str
    why: str


class GapSummary(BaseModel):
    """Summary of all gaps in the knowledge graph"""
    total_gaps: int
    killer_gaps: int
    high_gaps: int
    medium_gaps: int
    low_gaps: int
    most_critical: Optional[GapResponse] = None
    priority_actions: List[PriorityAction]
    overall_readiness: str  # critical_gaps, needs_work, in_progress, good, complete
    completion_percentage: float


class GapAnalysisResponse(BaseModel):
    """Full gap analysis response"""
    success: bool
    summary: GapSummary
    gaps: List[GapResponse]
    category_breakdown: Optional[Dict[str, Any]] = None


class CategoryGapsResponse(BaseModel):
    """Gap analysis for a specific category"""
    category: str
    total_questions: int
    gaps_count: int
    completion_percentage: float
    gaps: List[GapResponse]
