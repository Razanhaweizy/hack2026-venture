/**
 * Semantic 3D Layout Algorithm
 * Uses cosine similarity on node content to position nodes in 3D space
 * Similar nodes are placed closer together, dissimilar nodes farther apart
 */

import type { GraphNode, FrameworkNode, GraphEdge } from '../../types/graph';

// =============================================================================
// TYPES
// =============================================================================

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

export interface SemanticLayoutResult {
  positions: Map<string, NodePosition>;
  sizes: Map<string, number>;
  similarities: Map<string, Map<string, number>>; // For debugging/visualization
}

export interface LayoutConfig {
  // Y-axis levels
  yRoot: number;
  yCategory: number;
  yFrameworkLeaf: number;
  yUserContent: number;
  yEvidence: number;
  
  // Spacing
  baseSpread: number;
  minDistance: number;
  
  // Force-directed parameters
  iterations: number;
  repulsionStrength: number;
  attractionStrength: number;
  similarityWeight: number;
  edgeWeight: number;
  damping: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  yRoot: 12,          // Only used as initial hint for root
  yCategory: 8,       // Initial hint
  yFrameworkLeaf: 4,  // Initial hint
  yUserContent: 2,    // Initial hint
  yEvidence: 0,       // Initial hint
  
  baseSpread: 20,     // Initial spread radius
  minDistance: 1.5,   // Minimum distance between nodes
  
  iterations: 80,              // More iterations for convergence
  repulsionStrength: 8,        // Base repulsion
  attractionStrength: 0.6,     // Similarity-based attraction
  similarityWeight: 2.0,       // HIGH weight - similarity is primary driver
  edgeWeight: 1.5,             // Edge attraction
  damping: 0.5,                // Allow more movement
};

// =============================================================================
// TEXT VECTORIZATION (Simple TF approach)
// =============================================================================

/**
 * Extract text features from a node
 */
function extractNodeText(node: GraphNode): string {
  const parts: string[] = [
    node.title,
    node.content,
  ];
  
  if (node.type === 'framework') {
    const fw = node as FrameworkNode;
    if (fw.description) parts.push(fw.description);
    if (fw.frameworkCategory) parts.push(fw.frameworkCategory);
  }
  
  return parts.join(' ').toLowerCase();
}

/**
 * Tokenize text into words, removing common stop words
 */
function tokenize(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our',
    'they', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
    'why', 'if', 'then', 'else', 'so', 'as', 'about', 'into', 'through',
  ]);
  
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Create a term frequency vector for text
 */
function createTermVector(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const vector = new Map<string, number>();
  
  tokens.forEach(token => {
    vector.set(token, (vector.get(token) || 0) + 1);
  });
  
  // Normalize by total token count
  const total = tokens.length || 1;
  vector.forEach((count, term) => {
    vector.set(term, count / total);
  });
  
  return vector;
}

/**
 * Calculate cosine similarity between two term vectors
 */
function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  // Get all unique terms
  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);
  
  allTerms.forEach(term => {
    const a = vecA.get(term) || 0;
    const b = vecB.get(term) || 0;
    
    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  });
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// =============================================================================
// SIMILARITY MATRIX
// =============================================================================

/**
 * Build a similarity matrix for all nodes
 */
function buildSimilarityMatrix(
  nodes: GraphNode[]
): Map<string, Map<string, number>> {
  // Create term vectors for all nodes
  const vectors = new Map<string, Map<string, number>>();
  
  nodes.forEach(node => {
    const text = extractNodeText(node);
    vectors.set(node.id, createTermVector(text));
  });
  
  // Calculate pairwise similarities
  const similarities = new Map<string, Map<string, number>>();
  
  nodes.forEach(nodeA => {
    const simRow = new Map<string, number>();
    const vecA = vectors.get(nodeA.id)!;
    
    nodes.forEach(nodeB => {
      if (nodeA.id === nodeB.id) {
        simRow.set(nodeB.id, 1);
      } else {
        const vecB = vectors.get(nodeB.id)!;
        simRow.set(nodeB.id, cosineSimilarity(vecA, vecB));
      }
    });
    
    similarities.set(nodeA.id, simRow);
  });
  
  return similarities;
}

// =============================================================================
// Y-LEVEL HINTS (used for initial placement, not fixed)
// =============================================================================

/** Get initial Y hint for a node (used during initialization only) */
function _getNodeYHint(node: GraphNode, config: LayoutConfig): number {
  if (node.type === 'framework') {
    const fw = node as FrameworkNode;
    if (fw.frameworkCategory === 'root') return config.yRoot;
    if (fw.position?.level === 1) return config.yCategory;
    return config.yFrameworkLeaf;
  }
  if (node.type === 'evidence') return config.yEvidence;
  return config.yUserContent;
}

// Keep for potential future use
void _getNodeYHint;

// =============================================================================
// FORCE-DIRECTED LAYOUT
// =============================================================================

interface NodeState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  node: GraphNode;
  isAnchor: boolean; // Only root node is anchored
}

/**
 * Initialize node positions using similarity-aware placement
 * Nodes with high similarity start closer together for faster convergence
 */
function initializePositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  similarities: Map<string, Map<string, number>>,
  config: LayoutConfig
): Map<string, NodeState> {
  const states = new Map<string, NodeState>();
  const n = nodes.length;
  
  // Build edge lookup for initial placement hints
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, new Set());
    if (!edgeMap.has(edge.to)) edgeMap.set(edge.to, new Set());
    edgeMap.get(edge.from)!.add(edge.to);
    edgeMap.get(edge.to)!.add(edge.from);
  });
  
  // Use golden ratio for even spherical distribution
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * goldenRatio;
  
  // Sort nodes: root first, then by average similarity (cluster similar nodes)
  const sortedNodes = [...nodes].sort((a, b) => {
    // Root first
    if (a.type === 'framework' && (a as FrameworkNode).frameworkCategory === 'root') return -1;
    if (b.type === 'framework' && (b as FrameworkNode).frameworkCategory === 'root') return 1;
    
    // Calculate average similarity to other nodes (for clustering)
    const avgSimA = calculateAverageSimilarity(a.id, similarities);
    const avgSimB = calculateAverageSimilarity(b.id, similarities);
    
    return avgSimB - avgSimA; // Higher similarity = earlier in list = more central
  });
  
  // Initialize positions on a sphere
  sortedNodes.forEach((node, i) => {
    const isRoot = node.type === 'framework' && 
                   (node as FrameworkNode).frameworkCategory === 'root';
    
    if (isRoot) {
      // Root at center-top
      states.set(node.id, {
        x: 0, y: 10, z: 0,
        vx: 0, vy: 0, vz: 0,
        node,
        isAnchor: true,
      });
      return;
    }
    
    // Check if we have a similar node already placed
    const placedSimilar = findMostSimilarPlacedNode(node.id, similarities, states);
    
    let x: number, y: number, z: number;
    
    if (placedSimilar && placedSimilar.similarity > 0.4) {
      // Place near similar node with offset
      const similar = states.get(placedSimilar.nodeId)!;
      const offset = 3 + (1 - placedSimilar.similarity) * 5;
      const angle = Math.random() * Math.PI * 2;
      const elevAngle = (Math.random() - 0.5) * Math.PI;
      
      x = similar.x + offset * Math.cos(angle) * Math.cos(elevAngle);
      y = similar.y + offset * Math.sin(elevAngle);
      z = similar.z + offset * Math.sin(angle) * Math.cos(elevAngle);
    } else {
      // Fibonacci sphere distribution
      const t = i / n;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;
      
      // Radius based on node type
      let radius = config.baseSpread;
      if (node.type === 'framework') {
        const fw = node as FrameworkNode;
        radius = fw.position?.level === 1 ? 8 : 12;
      } else if (node.type === 'evidence') {
        radius = config.baseSpread + 3;
      }
      
      // Convert to Cartesian
      x = radius * Math.sin(inclination) * Math.cos(azimuth);
      y = Math.max(1, radius * Math.cos(inclination) * 0.4 + 5);
      z = radius * Math.sin(inclination) * Math.sin(azimuth);
    }
    
    states.set(node.id, {
      x, y, z,
      vx: 0, vy: 0, vz: 0,
      node,
      isAnchor: false,
    });
  });
  
  return states;
}

/** Calculate average similarity of a node to all others */
function calculateAverageSimilarity(
  nodeId: string,
  similarities: Map<string, Map<string, number>>
): number {
  const simRow = similarities.get(nodeId);
  if (!simRow || simRow.size === 0) return 0;
  
  let sum = 0;
  simRow.forEach((sim, otherId) => {
    if (otherId !== nodeId) sum += sim;
  });
  
  return sum / simRow.size;
}

/** Find the most similar node that's already been placed */
function findMostSimilarPlacedNode(
  nodeId: string,
  similarities: Map<string, Map<string, number>>,
  states: Map<string, NodeState>
): { nodeId: string; similarity: number } | null {
  const simRow = similarities.get(nodeId);
  if (!simRow) return null;
  
  let best: { nodeId: string; similarity: number } | null = null;
  
  simRow.forEach((sim, otherId) => {
    if (otherId !== nodeId && states.has(otherId)) {
      if (!best || sim > best.similarity) {
        best = { nodeId: otherId, similarity: sim };
      }
    }
  });
  
  return best;
}

/**
 * Apply similarity-based forces in full 3D
 * 
 * Core principle: similarity determines ideal distance
 * - High similarity (0.8+) → nodes should be close (distance ~2)
 * - Low similarity (0.2-) → nodes can be far (distance ~15)
 * - The force pulls/pushes to achieve ideal distance
 */
function applyForces(
  states: Map<string, NodeState>,
  similarities: Map<string, Map<string, number>>,
  edges: GraphEdge[],
  config: LayoutConfig
): void {
  const nodeIds = Array.from(states.keys());
  
  // Build edge lookup
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, new Set());
    if (!edgeMap.has(edge.to)) edgeMap.set(edge.to, new Set());
    edgeMap.get(edge.from)!.add(edge.to);
    edgeMap.get(edge.to)!.add(edge.from);
  });
  
  // Calculate forces for each node
  nodeIds.forEach(idA => {
    const stateA = states.get(idA)!;
    
    // Skip anchor nodes (root)
    if (stateA.isAnchor) return;
    
    let fx = 0, fy = 0, fz = 0;
    
    nodeIds.forEach(idB => {
      if (idA === idB) return;
      
      const stateB = states.get(idB)!;
      
      // 3D distance
      const dx = stateB.x - stateA.x;
      const dy = stateB.y - stateA.y;
      const dz = stateB.z - stateA.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      
      // Normalized direction
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      
      // Get similarity (symmetric)
      const similarity = similarities.get(idA)?.get(idB) || 
                        similarities.get(idB)?.get(idA) || 0;
      
      // Check if connected by edge
      const isConnected = edgeMap.get(idA)?.has(idB) || false;
      
      // === SIMILARITY-BASED SPRING FORCE ===
      // Ideal distance is inverse of similarity
      // High similarity (1.0) → ideal dist = 2
      // Low similarity (0.0) → ideal dist = 15
      const idealDist = 2 + (1 - similarity) * 13;
      
      // Spring force: pull if too far, push if too close
      const displacement = dist - idealDist;
      const springStrength = config.similarityWeight * config.attractionStrength;
      
      // Force proportional to how far from ideal
      const springForce = displacement * springStrength * (0.3 + similarity * 0.7);
      
      fx += nx * springForce;
      fy += ny * springForce;
      fz += nz * springForce;
      
      // === REPULSION (prevents collapse) ===
      if (dist < config.minDistance * 2) {
        const repulsion = config.repulsionStrength / (dist * dist + 0.1);
        fx -= nx * repulsion;
        fy -= ny * repulsion;
        fz -= nz * repulsion;
      }
      
      // === EDGE ATTRACTION (connected nodes stay close) ===
      if (isConnected) {
        const edgeIdealDist = 3; // Connected nodes should be close
        const edgeDisplacement = dist - edgeIdealDist;
        const edgeForce = edgeDisplacement * config.edgeWeight * config.attractionStrength;
        
        fx += nx * edgeForce;
        fy += ny * edgeForce;
        fz += nz * edgeForce;
      }
    });
    
    // === GRAVITY toward center (prevents drift) ===
    const distFromCenter = Math.sqrt(stateA.x * stateA.x + stateA.z * stateA.z);
    if (distFromCenter > 15) {
      const gravityStrength = 0.1;
      fx -= (stateA.x / distFromCenter) * gravityStrength * (distFromCenter - 15);
      fz -= (stateA.z / distFromCenter) * gravityStrength * (distFromCenter - 15);
    }
    
    // === FLOOR constraint (keep above grid) ===
    if (stateA.y < 0.5) {
      fy += (0.5 - stateA.y) * 2;
    }
    
    // Update velocity with damping
    stateA.vx = (stateA.vx + fx) * config.damping;
    stateA.vy = (stateA.vy + fy) * config.damping;
    stateA.vz = (stateA.vz + fz) * config.damping;
    
    // Limit velocity
    const maxVel = 2;
    const vel = Math.sqrt(stateA.vx * stateA.vx + stateA.vy * stateA.vy + stateA.vz * stateA.vz);
    if (vel > maxVel) {
      const scale = maxVel / vel;
      stateA.vx *= scale;
      stateA.vy *= scale;
      stateA.vz *= scale;
    }
  });
  
  // Update positions
  nodeIds.forEach(id => {
    const state = states.get(id)!;
    
    // Skip anchor nodes
    if (state.isAnchor) return;
    
    state.x += state.vx;
    state.y += state.vy;
    state.z += state.vz;
    
    // Soft bounds
    const bound = 25;
    state.x = Math.max(-bound, Math.min(bound, state.x));
    state.y = Math.max(0.5, Math.min(15, state.y));
    state.z = Math.max(-bound, Math.min(bound, state.z));
  });
}

/**
 * Run the force-directed layout algorithm
 */
function runForceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  similarities: Map<string, Map<string, number>>,
  config: LayoutConfig
): Map<string, NodePosition> {
  // Initialize positions using spherical distribution
  const states = initializePositions(nodes, edges, similarities, config);
  
  // Run force-directed iterations
  // Similarity determines ideal distances, forces converge to that
  for (let i = 0; i < config.iterations; i++) {
    applyForces(states, similarities, edges, config);
  }
  
  // Convert to positions
  const positions = new Map<string, NodePosition>();
  states.forEach((state, id) => {
    positions.set(id, {
      x: state.x,
      y: state.y,
      z: state.z,
    });
  });
  
  return positions;
}

// =============================================================================
// NODE SIZE CALCULATION
// =============================================================================

/**
 * Calculate node size based on type and connections
 */
function calculateNodeSize(
  node: GraphNode,
  connectionCount: number
): number {
  const BASE_SIZE = 0.4;
  const MAX_SIZE = 1.2;
  const SIZE_INCREMENT = 0.08;
  
  if (node.type === 'framework') {
    const fw = node as FrameworkNode;
    
    if (fw.frameworkCategory === 'root') {
      return 1.5; // Root is largest
    }
    
    if (fw.position?.level === 1) {
      return 1.0; // Categories are large
    }
    
    return 0.6; // Framework leaves
  }
  
  // User content nodes - size based on connections
  return Math.min(BASE_SIZE + connectionCount * SIZE_INCREMENT, MAX_SIZE);
}

// =============================================================================
// MAIN LAYOUT FUNCTION
// =============================================================================

/**
 * Calculate semantic 3D layout for all nodes
 * Uses cosine similarity on node content to position similar nodes closer together
 */
export function calculateSemanticLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  getConnectionCount: (nodeId: string) => number,
  config: Partial<LayoutConfig> = {}
): SemanticLayoutResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Build similarity matrix
  const similarities = buildSimilarityMatrix(nodes);
  
  // Run force-directed layout
  const positions = runForceDirectedLayout(nodes, edges, similarities, finalConfig);
  
  // Calculate sizes
  const sizes = new Map<string, number>();
  nodes.forEach(node => {
    const connCount = getConnectionCount(node.id);
    sizes.set(node.id, calculateNodeSize(node, connCount));
  });
  
  return {
    positions,
    sizes,
    similarities,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get top N most similar nodes to a given node
 */
export function getMostSimilarNodes(
  nodeId: string,
  similarities: Map<string, Map<string, number>>,
  topN: number = 5
): Array<{ nodeId: string; similarity: number }> {
  const simRow = similarities.get(nodeId);
  if (!simRow) return [];
  
  const results: Array<{ nodeId: string; similarity: number }> = [];
  
  simRow.forEach((sim, otherId) => {
    if (otherId !== nodeId) {
      results.push({ nodeId: otherId, similarity: sim });
    }
  });
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
