/**
 * Ideograph - Dependency Graph for Startup Idea Evaluation
 * Core Type Definitions
 */

// =============================================================================
// NODE TYPES
// =============================================================================

/**
 * The five fundamental node types in the evaluation graph
 */
export type NodeType = 'framework' | 'claim' | 'fact' | 'evidence' | 'startup_meta';

/**
 * The three PMF paths that determine startup strategy
 */
export type PmfPath = 'hair_on_fire' | 'hard_fact' | 'future_vision';

/**
 * Configuration for each PMF path
 */
export interface PmfPathConfig {
  id: PmfPath;
  name: string;
  icon: string;
  shortDescription: string;
  enemy: string;
  job: string;
  speedMatters: string;
  benchmark: string;
}

// =============================================================================
// CONFIDENCE BANDS
// =============================================================================

/**
 * Confidence band levels - honest uncertainty instead of false precision
 */
export type ConfidenceBandLevel = 'high' | 'medium' | 'low' | 'assumption';

export interface ConfidenceBand {
  level: ConfidenceBandLevel;
  label: string;
  description: string;
  color: string;
}

export const CONFIDENCE_BANDS: Record<ConfidenceBandLevel, ConfidenceBand> = {
  high: {
    level: 'high',
    label: 'Strong evidence',
    description: 'Multiple credible sources agree. Still could be wrong.',
    color: '#007354', // Sequoia green
  },
  medium: {
    level: 'medium',
    label: 'Some evidence',
    description: 'Reasonable basis but needs more validation.',
    color: '#E5A826', // Warning yellow
  },
  low: {
    level: 'low',
    label: 'Weak evidence',
    description: 'Limited data. Treat as hypothesis to test.',
    color: '#FB923C', // Orange
  },
  assumption: {
    level: 'assumption',
    label: 'Assumption',
    description: 'No real evidence. Needs validation before building on it.',
    color: '#D4442E', // Red
  },
};

/**
 * Get confidence band from internal score
 * Internal scores are used for calculation only - never shown to users
 */
export function getConfidenceBandFromScore(score: number): ConfidenceBand {
  const normalized = score / 100;
  if (normalized >= 0.75) return CONFIDENCE_BANDS.high;
  if (normalized >= 0.55) return CONFIDENCE_BANDS.medium;
  if (normalized >= 0.35) return CONFIDENCE_BANDS.low;
  return CONFIDENCE_BANDS.assumption;
}

/**
 * Get edge color based on confidence band
 */
export function getEdgeColorFromConfidence(confidence: number): string {
  return getConfidenceBandFromScore(confidence).color;
}

export const PMF_PATH_CONFIGS: Record<PmfPath, PmfPathConfig> = {
  hair_on_fire: {
    id: 'hair_on_fire',
    name: 'Hair on Fire',
    icon: '🔥',
    shortDescription: 'Customer is actively searching for solutions RIGHT NOW',
    enemy: 'Competitors',
    job: 'Outexecute',
    speedMatters: 'Everything',
    benchmark: 'Wiz ($0→$100M in 18mo)',
  },
  hard_fact: {
    id: 'hard_fact',
    name: 'Hard Fact',
    icon: '📊',
    shortDescription: 'Customer has accepted the problem as "just how things are"',
    enemy: 'Inertia',
    job: 'Educate',
    speedMatters: 'Less critical',
    benchmark: 'HubSpot (coined "inbound")',
  },
  future_vision: {
    id: 'future_vision',
    name: 'Future Vision',
    icon: '🔮',
    shortDescription: "Customer doesn't know they have the problem",
    enemy: 'Disbelief',
    job: 'Survive',
    speedMatters: 'Decades',
    benchmark: 'Nvidia (25 years to AI)',
  },
};

/**
 * Evidence can be either supporting (validates) or contradicting (invalidates)
 */
export type EvidenceValence = 'supporting' | 'contradicting';

/**
 * Visual configuration for each node type
 */
export interface NodeVisualConfig {
  color: string;
  shape: 'square' | 'circle';
}

export const NODE_VISUALS: Record<NodeType, NodeVisualConfig> = {
  framework: { color: '#808080', shape: 'square' },  // Gray, square
  claim: { color: '#F5C542', shape: 'circle' },      // Yellow, circle
  fact: { color: '#4A90D9', shape: 'circle' },       // Blue, circle
  evidence: { color: '#22C55E', shape: 'circle' },   // Default green (can be red if contradicting)
  startup_meta: { color: '#007354', shape: 'square' }, // Sequoia green, square (hidden node)
};

export const EVIDENCE_COLORS: Record<EvidenceValence, string> = {
  supporting: '#22C55E',    // Green
  contradicting: '#EF4444', // Red
};

// =============================================================================
// VERSION HISTORY
// =============================================================================

/**
 * A single version entry tracking content changes
 */
export interface NodeVersion {
  id: string;
  content: string;
  timestamp: Date;
  changeNote?: string;
}

// =============================================================================
// BASE NODE & SPECIALIZED NODES
// =============================================================================

/**
 * Base properties shared by all nodes
 */
export interface BaseNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  confidence: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  versions: NodeVersion[];
  metadata?: Record<string, unknown>;
}

/**
 * Position hint for visual layout
 */
export interface PositionHint {
  x: number;
  y: number;
  level: number; // 0 = root, 1 = category, 2 = leaf
}

/**
 * Framework node - fixed structure from evaluation skeleton
 * Represents structural elements that organize the evaluation
 * These nodes are IMMUTABLE - users cannot delete or rename them
 */
export interface FrameworkNode extends BaseNode {
  type: 'framework';
  /** Framework nodes are part of a predefined structure */
  frameworkCategory?: FrameworkCategory;
  /** Description explaining what this node is asking the founder to address */
  description: string;
  /** Position hint for visual layout */
  position?: PositionHint;
  /** Whether this is a skeleton node (immutable) */
  isSkeleton: boolean;
  /** Parent framework node ID (for skeleton hierarchy) */
  parentId?: string;
}

/**
 * The 8 framework categories
 */
export type FrameworkCategory = 
  | 'root'
  | 'market'
  | 'problem'
  | 'solution'
  | 'timing'
  | 'founder'
  | 'competition'
  | 'business_model'
  | 'gtm';

/**
 * Claim node - something the founder believes, unvalidated
 * These need to be tested against evidence
 */
export interface ClaimNode extends BaseNode {
  type: 'claim';
  /** Who made this claim */
  source?: string;
  /** Has this claim been tested yet? */
  tested: boolean;
}

/**
 * Fact node - objectively true information
 * These are verified truths that inform the evaluation
 */
export interface FactNode extends BaseNode {
  type: 'fact';
  /** Source of this fact (research, data, etc.) */
  source?: string;
  /** URL or reference to verification */
  verificationUrl?: string;
}

/**
 * Evidence node - proof from real world
 * Can either support or contradict other nodes
 */
export interface EvidenceNode extends BaseNode {
  type: 'evidence';
  /** Supporting evidence validates, contradicting evidence invalidates */
  valence: EvidenceValence;
  /** Where this evidence came from */
  source: string;
  /** Date when this evidence was gathered */
  gatheredAt?: Date;
}

/**
 * Startup Meta node - stores startup-wide metadata
 * Only one should exist per graph
 */
export interface StartupMetaNode extends BaseNode {
  type: 'startup_meta';
  /** The detected PMF path */
  pmfPath?: PmfPath;
  /** Confidence in the path detection (0-100) */
  pmfPathConfidence: number;
  /** When the path was detected/set */
  pmfPathDetectedAt?: Date;
  /** Optional startup name */
  startupName?: string;
}

/**
 * Union type of all possible nodes
 */
export type GraphNode = FrameworkNode | ClaimNode | FactNode | EvidenceNode | StartupMetaNode;

// =============================================================================
// EDGE TYPES
// =============================================================================

/**
 * The relationship types between nodes
 */
export type EdgeType = 
  | 'requires'     // Parent needs child to be true
  | 'supports'     // Child makes parent more likely
  | 'contradicts'  // Child makes parent less likely
  | 'depends_on'   // If child fails, parent fails
  | 'informs'      // Child provides context for parent
  | 'blocks';      // Child prevents parent

/**
 * Visual and semantic configuration for edge types
 */
export interface EdgeTypeConfig {
  color: string;
  label: string;
  description: string;
  /** Does this edge type imply a negative relationship? */
  isNegative: boolean;
}

export const EDGE_CONFIGS: Record<EdgeType, EdgeTypeConfig> = {
  requires: {
    color: '#6B7280',
    label: 'requires',
    description: 'Parent needs child to be true',
    isNegative: false,
  },
  supports: {
    color: '#22C55E',
    label: 'supports',
    description: 'Child makes parent more likely',
    isNegative: false,
  },
  contradicts: {
    color: '#EF4444',
    label: 'contradicts',
    description: 'Child makes parent less likely',
    isNegative: true,
  },
  depends_on: {
    color: '#F59E0B',
    label: 'depends on',
    description: 'If child fails, parent fails',
    isNegative: false,
  },
  informs: {
    color: '#3B82F6',
    label: 'informs',
    description: 'Child provides context for parent',
    isNegative: false,
  },
  blocks: {
    color: '#DC2626',
    label: 'blocks',
    description: 'Child prevents parent',
    isNegative: true,
  },
};

// =============================================================================
// EDGE DEFINITION
// =============================================================================

/**
 * An edge connecting two nodes in the graph
 * Direction: from (child/source) -> to (parent/target)
 */
export interface GraphEdge {
  id: string;
  type: EdgeType;
  from: string; // Source node ID (child)
  to: string;   // Target node ID (parent)
  /** Optional weight/strength of the relationship (0-100) */
  weight?: number;
  /** Optional note explaining this relationship */
  note?: string;
  createdAt: Date;
}

// =============================================================================
// GRAPH STRUCTURE
// =============================================================================

/**
 * The complete graph state
 */
export interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  /** Index for fast lookup of edges by node */
  nodeEdgeIndex: {
    outgoing: Map<string, Set<string>>; // nodeId -> set of edge IDs going out
    incoming: Map<string, Set<string>>; // nodeId -> set of edge IDs coming in
  };
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Input type for creating a new node (without auto-generated fields)
 */
export type CreateNodeInput<T extends GraphNode = GraphNode> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'versions'
> & {
  id?: string; // Optional custom ID
};

/**
 * Input type for creating a new edge
 */
export type CreateEdgeInput = Omit<GraphEdge, 'id' | 'createdAt'> & {
  id?: string;
};

/**
 * Input type for updating a node
 */
export type UpdateNodeInput = Partial<Omit<GraphNode, 'id' | 'type' | 'createdAt' | 'versions'>> & {
  changeNote?: string;
};

/**
 * Query result for connected nodes
 */
export interface ConnectedNodesResult {
  node: GraphNode;
  edge: GraphEdge;
  direction: 'parent' | 'child';
}
