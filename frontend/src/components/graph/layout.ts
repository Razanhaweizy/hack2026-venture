/**
 * Ideograph 3D Layout Algorithm
 * Maps graph nodes to 3D positions
 */

import type { GraphNode, FrameworkNode } from '../../types/graph';
import { LAYOUT, NODE_SIZE } from './constants';

// =============================================================================
// POSITION CALCULATION
// =============================================================================

export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate 3D position for a node based on its type and properties
 */
export function calculateNodePosition(
  node: GraphNode,
  nodeIndex: number,
  siblingCount: number,
  parentPosition?: NodePosition
): NodePosition {
  // Framework nodes use their predefined positions
  if (node.type === 'framework') {
    return calculateFrameworkPosition(node as FrameworkNode, nodeIndex, siblingCount);
  }
  
  // User content nodes (Claim, Fact, Evidence)
  return calculateUserNodePosition(node, nodeIndex, siblingCount, parentPosition);
}

/**
 * Calculate position for Framework nodes
 */
function calculateFrameworkPosition(
  node: FrameworkNode,
  nodeIndex: number,
  siblingCount: number
): NodePosition {
  // If node has a predefined position from skeleton, use it (scaled)
  if (node.position) {
    return {
      x: node.position.x / 45, // Scale down from skeleton coordinates
      y: getYForLevel(node.position.level),
      z: (nodeIndex - siblingCount / 2) * LAYOUT.Z_SPREAD * 0.3,
    };
  }
  
  const category = node.frameworkCategory;
  
  // Root node (THE IDEA)
  if (category === 'root') {
    return { x: 0, y: LAYOUT.Y_ROOT, z: 0 };
  }
  
  // Category nodes
  if (category && LAYOUT.CATEGORY_X[category] !== undefined) {
    // Check if this is a category node or a leaf
    const isCategory = node.id === `framework:${category}`;
    
    if (isCategory) {
      return {
        x: LAYOUT.CATEGORY_X[category],
        y: LAYOUT.Y_CATEGORY,
        z: 0,
      };
    }
    
    // Leaf framework nodes (children of categories)
    return {
      x: LAYOUT.CATEGORY_X[category] + (nodeIndex - siblingCount / 2) * LAYOUT.CHILD_SPREAD,
      y: LAYOUT.Y_FRAMEWORK_LEAF,
      z: (nodeIndex % 3 - 1) * LAYOUT.Z_SPREAD,
    };
  }
  
  // Fallback
  return { x: nodeIndex * 2, y: LAYOUT.Y_CATEGORY, z: 0 };
}

/**
 * Calculate position for user content nodes (Claims, Facts, Evidence)
 */
function calculateUserNodePosition(
  node: GraphNode,
  nodeIndex: number,
  siblingCount: number,
  parentPosition?: NodePosition
): NodePosition {
  const baseX = parentPosition?.x ?? 0;
  const baseZ = parentPosition?.z ?? 0;
  
  // Spread nodes horizontally and in depth
  const spreadX = (nodeIndex - siblingCount / 2) * LAYOUT.CHILD_SPREAD;
  const spreadZ = ((nodeIndex % 5) - 2) * LAYOUT.Z_SPREAD;
  
  switch (node.type) {
    case 'claim':
    case 'fact':
      return {
        x: baseX + spreadX,
        y: LAYOUT.Y_CLAIM_FACT + (Math.random() * 1 - 0.5), // Slight variation
        z: baseZ + spreadZ,
      };
    
    case 'evidence':
      return {
        x: baseX + spreadX,
        y: LAYOUT.Y_EVIDENCE + (Math.random() * 0.5),
        z: baseZ + spreadZ,
      };
    
    default:
      return {
        x: baseX + spreadX,
        y: LAYOUT.Y_CLAIM_FACT,
        z: baseZ + spreadZ,
      };
  }
}

/**
 * Get Y position for skeleton level
 */
function getYForLevel(level: number): number {
  switch (level) {
    case 0: return LAYOUT.Y_ROOT;
    case 1: return LAYOUT.Y_CATEGORY;
    case 2: return LAYOUT.Y_FRAMEWORK_LEAF;
    default: return LAYOUT.Y_CLAIM_FACT;
  }
}

// =============================================================================
// NODE SIZE CALCULATION
// =============================================================================

/**
 * Calculate node size based on type and number of dependents
 */
export function calculateNodeSize(
  node: GraphNode,
  dependentCount: number
): number {
  // Root node (THE IDEA) is largest
  if (node.type === 'framework' && (node as FrameworkNode).frameworkCategory === 'root') {
    return NODE_SIZE.ROOT_SIZE;
  }
  
  // Category framework nodes
  if (node.type === 'framework') {
    const fwNode = node as FrameworkNode;
    if (fwNode.position?.level === 1) {
      return NODE_SIZE.CATEGORY_SIZE;
    }
  }
  
  // Calculate size based on dependents
  let size = NODE_SIZE.BASE + (dependentCount * NODE_SIZE.INCREMENT_PER_DEPENDENT);
  size = Math.min(size, NODE_SIZE.MAX);
  
  // Framework nodes are slightly larger
  if (node.type === 'framework') {
    size *= NODE_SIZE.FRAMEWORK_MULTIPLIER;
  }
  
  return size;
}

// =============================================================================
// LAYOUT MANAGER
// =============================================================================

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  sizes: Map<string, number>;
}

/**
 * Calculate positions and sizes for all nodes in the graph
 */
export function calculateLayout(
  nodes: GraphNode[],
  getChildCount: (nodeId: string) => number,
  getParentId?: (nodeId: string) => string | undefined
): LayoutResult {
  const positions = new Map<string, NodePosition>();
  const sizes = new Map<string, number>();
  
  // Group nodes by their parent/category for sibling counting
  const nodesByParent = new Map<string, GraphNode[]>();
  
  nodes.forEach(node => {
    let parentKey = 'root';
    
    if (node.type === 'framework') {
      const fwNode = node as FrameworkNode;
      parentKey = fwNode.parentId || fwNode.frameworkCategory || 'root';
    } else if (getParentId) {
      parentKey = getParentId(node.id) || 'unconnected';
    }
    
    if (!nodesByParent.has(parentKey)) {
      nodesByParent.set(parentKey, []);
    }
    nodesByParent.get(parentKey)!.push(node);
  });
  
  // Calculate positions for each node
  nodes.forEach(node => {
    // Find siblings
    let parentKey = 'root';
    if (node.type === 'framework') {
      const fwNode = node as FrameworkNode;
      parentKey = fwNode.parentId || fwNode.frameworkCategory || 'root';
    } else if (getParentId) {
      parentKey = getParentId(node.id) || 'unconnected';
    }
    
    const siblings = nodesByParent.get(parentKey) || [node];
    const nodeIndex = siblings.indexOf(node);
    
    // Get parent position if available
    let parentPosition: NodePosition | undefined;
    if (node.type === 'framework') {
      const fwNode = node as FrameworkNode;
      if (fwNode.parentId && positions.has(fwNode.parentId)) {
        parentPosition = positions.get(fwNode.parentId);
      }
    }
    
    // Calculate position
    const position = calculateNodePosition(node, nodeIndex, siblings.length, parentPosition);
    positions.set(node.id, position);
    
    // Calculate size
    const childCount = getChildCount(node.id);
    const size = calculateNodeSize(node, childCount);
    sizes.set(node.id, size);
  });
  
  return { positions, sizes };
}
