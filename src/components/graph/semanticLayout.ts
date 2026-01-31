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
  yRoot: 12,
  yCategory: 8,
  yFrameworkLeaf: 4,
  yUserContent: 2,  // Raised above grid
  yEvidence: 0,
  
  baseSpread: 15,
  minDistance: 2,
  
  iterations: 30,            // Fewer iterations
  repulsionStrength: 15,     // Much lower repulsion
  attractionStrength: 0.3,   // Stronger attraction
  similarityWeight: 0.3,
  edgeWeight: 1.0,           // Much stronger edge attraction
  damping: 0.7,              // More damping
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
// Y-LEVEL ASSIGNMENT
// =============================================================================

/**
 * Get the Y position for a node based on its type and hierarchy
 */
function getNodeYLevel(node: GraphNode, config: LayoutConfig): number {
  if (node.type === 'framework') {
    const fw = node as FrameworkNode;
    
    if (fw.frameworkCategory === 'root') {
      return config.yRoot;
    }
    
    if (fw.position?.level === 1) {
      return config.yCategory;
    }
    
    if (fw.position?.level === 2) {
      return config.yFrameworkLeaf;
    }
    
    return config.yFrameworkLeaf;
  }
  
  if (node.type === 'evidence') {
    return config.yEvidence;
  }
  
  // Claims and Facts
  return config.yUserContent;
}

// =============================================================================
// FORCE-DIRECTED LAYOUT
// =============================================================================

interface NodeState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  y: number; // Fixed based on hierarchy
  node: GraphNode;
}

/**
 * Initialize node positions - spread based on category for framework nodes
 * User content nodes are placed near their connected framework nodes
 */
function initializePositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig
): Map<string, NodeState> {
  const states = new Map<string, NodeState>();
  
  // Category X positions (spread across X axis)
  const categoryX: Record<string, number> = {
    root: 0,
    market: -14,
    problem: -10,
    solution: -6,
    timing: -2,
    founder: 2,
    competition: 6,
    business_model: 10,
    gtm: 14,
  };
  
  // Build edge lookup for finding connected nodes
  const nodeConnections = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!nodeConnections.has(edge.from)) nodeConnections.set(edge.from, []);
    if (!nodeConnections.has(edge.to)) nodeConnections.set(edge.to, []);
    nodeConnections.get(edge.from)!.push(edge.to);
    nodeConnections.get(edge.to)!.push(edge.from);
  });
  
  // Create a map for quick node lookup
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));
  
  // Group nodes by category for initial spread
  const nodesByCategory = new Map<string, GraphNode[]>();
  
  nodes.forEach(node => {
    let category = 'other';
    if (node.type === 'framework') {
      const fw = node as FrameworkNode;
      category = fw.frameworkCategory || 'other';
    }
    
    if (!nodesByCategory.has(category)) {
      nodesByCategory.set(category, []);
    }
    nodesByCategory.get(category)!.push(node);
  });
  
  // First pass: Initialize framework nodes
  nodes.forEach(node => {
    if (node.type !== 'framework') return;
    
    const y = getNodeYLevel(node, config);
    let x = 0;
    let z = 0;
    
    const fw = node as FrameworkNode;
    const cat = fw.frameworkCategory || 'other';
    const baseX = categoryX[cat] ?? 0;
    
    // Root node at center
    if (cat === 'root') {
      x = 0;
      z = 0;
    } else {
      // Get index within category
      const catNodes = nodesByCategory.get(cat) || [];
      const idx = catNodes.indexOf(node);
      const count = catNodes.length;
      
      // Spread within category
      x = baseX + (idx - count / 2) * 1.5;
      z = (idx % 3 - 1) * 3;
    }
    
    states.set(node.id, {
      x,
      z,
      vx: 0,
      vz: 0,
      y,
      node,
    });
  });
  
  // Second pass: Initialize user content nodes near their connected framework nodes
  nodes.forEach(node => {
    if (node.type === 'framework') return;
    
    const y = getNodeYLevel(node, config);
    let x = 0;
    let z = 0;
    
    // Find connected framework nodes
    const connections = nodeConnections.get(node.id) || [];
    const connectedFrameworks: NodeState[] = [];
    
    connections.forEach(connId => {
      const connNode = nodeMap.get(connId);
      if (connNode && connNode.type === 'framework' && states.has(connId)) {
        connectedFrameworks.push(states.get(connId)!);
      }
    });
    
    if (connectedFrameworks.length > 0) {
      // Position near the centroid of connected framework nodes
      const avgX = connectedFrameworks.reduce((sum, s) => sum + s.x, 0) / connectedFrameworks.length;
      const avgZ = connectedFrameworks.reduce((sum, s) => sum + s.z, 0) / connectedFrameworks.length;
      
      // Add small random offset to prevent overlap
      x = avgX + (Math.random() - 0.5) * 4;
      z = avgZ + (Math.random() - 0.5) * 4;
    } else {
      // No connections - place randomly but more centered
      x = (Math.random() - 0.5) * 10;
      z = (Math.random() - 0.5) * 10;
    }
    
    states.set(node.id, {
      x,
      z,
      vx: 0,
      vz: 0,
      y,
      node,
    });
  });
  
  return states;
}

/**
 * Apply forces and update positions
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
  
  // Calculate forces for each node pair
  nodeIds.forEach(idA => {
    const stateA = states.get(idA)!;
    const isUserNodeA = stateA.node.type !== 'framework';
    let fx = 0;
    let fz = 0;
    
    nodeIds.forEach(idB => {
      if (idA === idB) return;
      
      const stateB = states.get(idB)!;
      const isUserNodeB = stateB.node.type !== 'framework';
      
      // Distance between nodes (on X-Z plane)
      const dx = stateB.x - stateA.x;
      const dz = stateB.z - stateA.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 0.1;
      
      // Normalize direction
      const nx = dx / dist;
      const nz = dz / dist;
      
      // Get similarity
      const similarity = similarities.get(idA)?.get(idB) || 0;
      
      // Check if connected by edge
      const isConnected = edgeMap.get(idA)?.has(idB) || false;
      
      // 1. Repulsion force - only between same-type nodes or very close nodes
      // Don't let framework nodes push user content nodes far away
      if ((isUserNodeA && isUserNodeB) || (!isUserNodeA && !isUserNodeB) || dist < 3) {
        const repulsion = config.repulsionStrength / (dist * dist);
        fx -= nx * repulsion;
        fz -= nz * repulsion;
      }
      
      // 2. Similarity attraction (similar nodes attract)
      if (similarity > 0.1 && isUserNodeA === isUserNodeB) {
        const simAttraction = similarity * config.similarityWeight * config.attractionStrength;
        fx += nx * simAttraction * dist;
        fz += nz * simAttraction * dist;
      }
      
      // 3. Edge attraction (connected nodes attract STRONGLY)
      if (isConnected) {
        const edgeAttraction = config.edgeWeight * config.attractionStrength;
        const idealDist = 3; // Closer ideal distance for connected nodes
        const edgeForce = (dist - idealDist) * edgeAttraction;
        
        // User nodes are strongly attracted to their connected framework nodes
        if (isUserNodeA && !isUserNodeB) {
          fx += nx * edgeForce * 3; // Triple attraction to framework
          fz += nz * edgeForce * 3;
        } else {
          fx += nx * edgeForce;
          fz += nz * edgeForce;
        }
      }
    });
    
    // Update velocity with damping - user nodes move slower
    const dampingFactor = isUserNodeA ? config.damping * 0.5 : config.damping;
    stateA.vx = (stateA.vx + fx) * dampingFactor;
    stateA.vz = (stateA.vz + fz) * dampingFactor;
    
    // Limit velocity - lower for user nodes
    const maxVel = isUserNodeA ? 1 : 2;
    const vel = Math.sqrt(stateA.vx * stateA.vx + stateA.vz * stateA.vz);
    if (vel > maxVel) {
      stateA.vx = (stateA.vx / vel) * maxVel;
      stateA.vz = (stateA.vz / vel) * maxVel;
    }
  });
  
  // Update positions
  nodeIds.forEach(id => {
    const state = states.get(id)!;
    
    // Framework nodes at level 0 and 1 have fixed X positions
    if (state.node.type === 'framework') {
      const fw = state.node as FrameworkNode;
      if (fw.frameworkCategory === 'root' || fw.position?.level === 1) {
        // Keep fixed, only allow Z movement
        state.z += state.vz * 0.5;
        // Bound Z
        state.z = Math.max(-15, Math.min(15, state.z));
        return;
      }
    }
    
    state.x += state.vx;
    state.z += state.vz;
    
    // Bound all nodes to visible area
    state.x = Math.max(-20, Math.min(20, state.x));
    state.z = Math.max(-20, Math.min(20, state.z));
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
  // Initialize positions - pass edges so user nodes can be placed near connected framework nodes
  const states = initializePositions(nodes, edges, config);
  
  // Run iterations
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
