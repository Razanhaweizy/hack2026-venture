/**
 * Ideograph - Graph State Management with Zustand
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  GraphNode,
  GraphEdge,
  GraphState,
  CreateNodeInput,
  CreateEdgeInput,
  UpdateNodeInput,
  ConnectedNodesResult,
  NodeType,
  NodeVersion,
  FrameworkNode,
} from '../types/graph';
import {
  getSkeletonNodeInputs,
  getSkeletonEdgeInputs,
  getSkeletonLeafNodes,
} from '../data/skeleton';

// =============================================================================
// STORE INTERFACE
// =============================================================================

/**
 * Status of a framework node - whether it has user content attached
 */
export interface FrameworkNodeStatus {
  node: FrameworkNode;
  isAnswered: boolean;
  attachedNodes: GraphNode[];
  attachedCount: number;
}

interface GraphStore extends GraphState {
  // Node Operations
  addNode: <T extends GraphNode>(input: CreateNodeInput<T>) => T;
  getNode: (id: string) => GraphNode | undefined;
  updateNode: (id: string, updates: UpdateNodeInput) => GraphNode | undefined;
  removeNode: (id: string) => boolean;
  getNodesByType: (type: NodeType) => GraphNode[];
  getAllNodes: () => GraphNode[];

  // Edge Operations
  addEdge: (input: CreateEdgeInput) => GraphEdge;
  getEdge: (id: string) => GraphEdge | undefined;
  removeEdge: (id: string) => boolean;
  getEdgesBetween: (nodeA: string, nodeB: string) => GraphEdge[];
  getAllEdges: () => GraphEdge[];

  // Graph Traversal
  getConnectedNodes: (nodeId: string) => ConnectedNodesResult[];
  getParents: (nodeId: string) => ConnectedNodesResult[];
  getChildren: (nodeId: string) => ConnectedNodesResult[];
  getAncestors: (nodeId: string, maxDepth?: number) => GraphNode[];
  getDescendants: (nodeId: string, maxDepth?: number) => GraphNode[];

  // Skeleton & Framework Operations
  initializeSkeleton: () => void;
  getFrameworkNodes: () => FrameworkNode[];
  getFrameworkNodeStatus: (nodeId: string) => FrameworkNodeStatus | undefined;
  getUnansweredFrameworkNodes: () => FrameworkNode[];
  getAnsweredFrameworkNodes: () => FrameworkNode[];
  getSkeletonProgress: () => { answered: number; total: number; percentage: number };
  attachToFramework: (frameworkNodeId: string, userNodeId: string, edgeType?: 'supports' | 'informs') => GraphEdge;

  // Utility
  clear: () => void;
  exportGraph: () => { nodes: GraphNode[]; edges: GraphEdge[] };
  importGraph: (data: { nodes: GraphNode[]; edges: GraphEdge[] }) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: GraphState = {
  nodes: new Map(),
  edges: new Map(),
  nodeEdgeIndex: {
    outgoing: new Map(),
    incoming: new Map(),
  },
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useGraphStore = create<GraphStore>()(
  // Note: We're not using immer here to keep Maps working properly
  // Zustand handles immutability through the set function
  (set, get) => ({
    ...initialState,

    // =========================================================================
    // NODE OPERATIONS
    // =========================================================================

    addNode: <T extends GraphNode>(input: CreateNodeInput<T>): T => {
      const now = new Date();
      const id = input.id || uuidv4();

      const initialVersion: NodeVersion = {
        id: uuidv4(),
        content: input.content,
        timestamp: now,
        changeNote: 'Initial creation',
      };

      const node = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
        versions: [initialVersion],
      } as T;

      set((state) => {
        const newNodes = new Map(state.nodes);
        newNodes.set(id, node);

        const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
        const newIncoming = new Map(state.nodeEdgeIndex.incoming);
        newOutgoing.set(id, new Set());
        newIncoming.set(id, new Set());

        return {
          nodes: newNodes,
          nodeEdgeIndex: {
            outgoing: newOutgoing,
            incoming: newIncoming,
          },
        };
      });

      return node;
    },

    getNode: (id: string): GraphNode | undefined => {
      return get().nodes.get(id);
    },

    updateNode: (id: string, updates: UpdateNodeInput): GraphNode | undefined => {
      const state = get();
      const existingNode = state.nodes.get(id);

      if (!existingNode) {
        console.warn(`Node ${id} not found`);
        return undefined;
      }

      // Protect skeleton nodes from title changes
      if (existingNode.type === 'framework' && (existingNode as FrameworkNode).isSkeleton) {
        if (updates.title && updates.title !== existingNode.title) {
          console.warn(`Cannot rename skeleton node: ${id}`);
          delete updates.title;
        }
      }

      const now = new Date();
      const newVersions = [...existingNode.versions];

      // If content changed, create a new version
      if (updates.content && updates.content !== existingNode.content) {
        newVersions.push({
          id: uuidv4(),
          content: updates.content,
          timestamp: now,
          changeNote: updates.changeNote,
        });
      }

      const updatedNode: GraphNode = {
        ...existingNode,
        ...updates,
        updatedAt: now,
        versions: newVersions,
      } as GraphNode;

      set((state) => {
        const newNodes = new Map(state.nodes);
        newNodes.set(id, updatedNode);
        return { nodes: newNodes };
      });

      return updatedNode;
    },

    removeNode: (id: string): boolean => {
      const state = get();
      if (!state.nodes.has(id)) {
        return false;
      }

      // Protect skeleton nodes from deletion
      const node = state.nodes.get(id);
      if (node?.type === 'framework' && (node as FrameworkNode).isSkeleton) {
        console.warn(`Cannot delete skeleton node: ${id}`);
        return false;
      }

      // Remove all edges connected to this node
      const outgoingEdges = state.nodeEdgeIndex.outgoing.get(id) || new Set();
      const incomingEdges = state.nodeEdgeIndex.incoming.get(id) || new Set();
      const allEdgesToRemove = new Set([...outgoingEdges, ...incomingEdges]);

      set((state) => {
        const newNodes = new Map(state.nodes);
        const newEdges = new Map(state.edges);
        const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
        const newIncoming = new Map(state.nodeEdgeIndex.incoming);

        // Remove node
        newNodes.delete(id);

        // Remove all connected edges
        allEdgesToRemove.forEach((edgeId) => {
          const edge = newEdges.get(edgeId);
          if (edge) {
            // Clean up index entries for the other node
            if (edge.from !== id) {
              const fromOutgoing = newOutgoing.get(edge.from);
              fromOutgoing?.delete(edgeId);
            }
            if (edge.to !== id) {
              const toIncoming = newIncoming.get(edge.to);
              toIncoming?.delete(edgeId);
            }
            newEdges.delete(edgeId);
          }
        });

        // Remove index entries for this node
        newOutgoing.delete(id);
        newIncoming.delete(id);

        return {
          nodes: newNodes,
          edges: newEdges,
          nodeEdgeIndex: {
            outgoing: newOutgoing,
            incoming: newIncoming,
          },
        };
      });

      return true;
    },

    getNodesByType: (type: NodeType): GraphNode[] => {
      const nodes: GraphNode[] = [];
      get().nodes.forEach((node) => {
        if (node.type === type) {
          nodes.push(node);
        }
      });
      return nodes;
    },

    getAllNodes: (): GraphNode[] => {
      return Array.from(get().nodes.values());
    },

    // =========================================================================
    // EDGE OPERATIONS
    // =========================================================================

    addEdge: (input: CreateEdgeInput): GraphEdge => {
      const state = get();
      const id = input.id || uuidv4();

      // Validate that both nodes exist
      if (!state.nodes.has(input.from)) {
        throw new Error(`Source node ${input.from} does not exist`);
      }
      if (!state.nodes.has(input.to)) {
        throw new Error(`Target node ${input.to} does not exist`);
      }

      const edge: GraphEdge = {
        ...input,
        id,
        createdAt: new Date(),
      };

      set((state) => {
        const newEdges = new Map(state.edges);
        newEdges.set(id, edge);

        const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
        const newIncoming = new Map(state.nodeEdgeIndex.incoming);

        // Update outgoing index for source node
        const fromOutgoing = new Set(newOutgoing.get(input.from) || []);
        fromOutgoing.add(id);
        newOutgoing.set(input.from, fromOutgoing);

        // Update incoming index for target node
        const toIncoming = new Set(newIncoming.get(input.to) || []);
        toIncoming.add(id);
        newIncoming.set(input.to, toIncoming);

        return {
          edges: newEdges,
          nodeEdgeIndex: {
            outgoing: newOutgoing,
            incoming: newIncoming,
          },
        };
      });

      return edge;
    },

    getEdge: (id: string): GraphEdge | undefined => {
      return get().edges.get(id);
    },

    removeEdge: (id: string): boolean => {
      const state = get();
      const edge = state.edges.get(id);

      if (!edge) {
        return false;
      }

      set((state) => {
        const newEdges = new Map(state.edges);
        const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
        const newIncoming = new Map(state.nodeEdgeIndex.incoming);

        newEdges.delete(id);

        // Update outgoing index
        const fromOutgoing = newOutgoing.get(edge.from);
        fromOutgoing?.delete(id);

        // Update incoming index
        const toIncoming = newIncoming.get(edge.to);
        toIncoming?.delete(id);

        return {
          edges: newEdges,
          nodeEdgeIndex: {
            outgoing: newOutgoing,
            incoming: newIncoming,
          },
        };
      });

      return true;
    },

    getEdgesBetween: (nodeA: string, nodeB: string): GraphEdge[] => {
      const state = get();
      const edges: GraphEdge[] = [];

      // Check edges from A to B
      const aOutgoing = state.nodeEdgeIndex.outgoing.get(nodeA);
      aOutgoing?.forEach((edgeId) => {
        const edge = state.edges.get(edgeId);
        if (edge && edge.to === nodeB) {
          edges.push(edge);
        }
      });

      // Check edges from B to A
      const bOutgoing = state.nodeEdgeIndex.outgoing.get(nodeB);
      bOutgoing?.forEach((edgeId) => {
        const edge = state.edges.get(edgeId);
        if (edge && edge.to === nodeA) {
          edges.push(edge);
        }
      });

      return edges;
    },

    getAllEdges: (): GraphEdge[] => {
      return Array.from(get().edges.values());
    },

    // =========================================================================
    // GRAPH TRAVERSAL
    // =========================================================================

    getConnectedNodes: (nodeId: string): ConnectedNodesResult[] => {
      const parents = get().getParents(nodeId);
      const children = get().getChildren(nodeId);
      return [...parents, ...children];
    },

    getParents: (nodeId: string): ConnectedNodesResult[] => {
      const state = get();
      const results: ConnectedNodesResult[] = [];

      // Parents are nodes that this node points TO (via outgoing edges)
      // Actually, let's reconsider: in our edge definition, `from` is child, `to` is parent
      // So to get parents, we look at outgoing edges from this node
      const outgoingEdges = state.nodeEdgeIndex.outgoing.get(nodeId);

      outgoingEdges?.forEach((edgeId) => {
        const edge = state.edges.get(edgeId);
        if (edge) {
          const parentNode = state.nodes.get(edge.to);
          if (parentNode) {
            results.push({
              node: parentNode,
              edge,
              direction: 'parent',
            });
          }
        }
      });

      return results;
    },

    getChildren: (nodeId: string): ConnectedNodesResult[] => {
      const state = get();
      const results: ConnectedNodesResult[] = [];

      // Children are nodes that point TO this node (via incoming edges)
      const incomingEdges = state.nodeEdgeIndex.incoming.get(nodeId);

      incomingEdges?.forEach((edgeId) => {
        const edge = state.edges.get(edgeId);
        if (edge) {
          const childNode = state.nodes.get(edge.from);
          if (childNode) {
            results.push({
              node: childNode,
              edge,
              direction: 'child',
            });
          }
        }
      });

      return results;
    },

    getAncestors: (nodeId: string, maxDepth: number = Infinity): GraphNode[] => {
      const state = get();
      const ancestors: GraphNode[] = [];
      const visited = new Set<string>();

      const traverse = (currentId: string, depth: number) => {
        if (depth > maxDepth || visited.has(currentId)) return;
        visited.add(currentId);

        const parents = state.nodeEdgeIndex.outgoing.get(currentId);
        parents?.forEach((edgeId) => {
          const edge = state.edges.get(edgeId);
          if (edge) {
            const parent = state.nodes.get(edge.to);
            if (parent && !visited.has(parent.id)) {
              ancestors.push(parent);
              traverse(parent.id, depth + 1);
            }
          }
        });
      };

      traverse(nodeId, 0);
      return ancestors;
    },

    getDescendants: (nodeId: string, maxDepth: number = Infinity): GraphNode[] => {
      const state = get();
      const descendants: GraphNode[] = [];
      const visited = new Set<string>();

      const traverse = (currentId: string, depth: number) => {
        if (depth > maxDepth || visited.has(currentId)) return;
        visited.add(currentId);

        const children = state.nodeEdgeIndex.incoming.get(currentId);
        children?.forEach((edgeId) => {
          const edge = state.edges.get(edgeId);
          if (edge) {
            const child = state.nodes.get(edge.from);
            if (child && !visited.has(child.id)) {
              descendants.push(child);
              traverse(child.id, depth + 1);
            }
          }
        });
      };

      traverse(nodeId, 0);
      return descendants;
    },

    // =========================================================================
    // SKELETON & FRAMEWORK OPERATIONS
    // =========================================================================

    initializeSkeleton: () => {
      const state = get();
      
      // Don't reinitialize if skeleton already exists
      if (state.nodes.has('framework:root')) {
        console.warn('Skeleton already initialized');
        return;
      }

      // Add all skeleton nodes
      const nodeInputs = getSkeletonNodeInputs();
      nodeInputs.forEach((input) => {
        get().addNode(input);
      });

      // Add all skeleton edges
      const edgeInputs = getSkeletonEdgeInputs();
      edgeInputs.forEach((input) => {
        get().addEdge(input);
      });

      console.log(`Skeleton initialized: ${nodeInputs.length} nodes, ${edgeInputs.length} edges`);
    },

    getFrameworkNodes: (): FrameworkNode[] => {
      const nodes: FrameworkNode[] = [];
      get().nodes.forEach((node) => {
        if (node.type === 'framework') {
          nodes.push(node as FrameworkNode);
        }
      });
      return nodes;
    },

    getFrameworkNodeStatus: (nodeId: string): FrameworkNodeStatus | undefined => {
      const state = get();
      const node = state.nodes.get(nodeId);
      
      if (!node || node.type !== 'framework') {
        return undefined;
      }

      const frameworkNode = node as FrameworkNode;
      
      // Get all non-framework nodes that connect TO this framework node
      // (i.e., user content that supports/informs this framework item)
      const incomingEdges = state.nodeEdgeIndex.incoming.get(nodeId) || new Set();
      const attachedNodes: GraphNode[] = [];

      incomingEdges.forEach((edgeId) => {
        const edge = state.edges.get(edgeId);
        if (edge) {
          const sourceNode = state.nodes.get(edge.from);
          // Only count non-framework nodes as "attached content"
          if (sourceNode && sourceNode.type !== 'framework') {
            attachedNodes.push(sourceNode);
          }
        }
      });

      return {
        node: frameworkNode,
        isAnswered: attachedNodes.length > 0,
        attachedNodes,
        attachedCount: attachedNodes.length,
      };
    },

    getUnansweredFrameworkNodes: (): FrameworkNode[] => {
      const state = get();
      const unanswered: FrameworkNode[] = [];
      
      // Only check leaf framework nodes (level 2) - these are what founders need to address
      const leafNodeDefs = getSkeletonLeafNodes();
      
      leafNodeDefs.forEach((def) => {
        const status = state.getFrameworkNodeStatus(def.id);
        if (status && !status.isAnswered) {
          unanswered.push(status.node);
        }
      });

      return unanswered;
    },

    getAnsweredFrameworkNodes: (): FrameworkNode[] => {
      const state = get();
      const answered: FrameworkNode[] = [];
      
      const leafNodeDefs = getSkeletonLeafNodes();
      
      leafNodeDefs.forEach((def) => {
        const status = state.getFrameworkNodeStatus(def.id);
        if (status && status.isAnswered) {
          answered.push(status.node);
        }
      });

      return answered;
    },

    getSkeletonProgress: () => {
      const state = get();
      const leafNodeDefs = getSkeletonLeafNodes();
      const total = leafNodeDefs.length;
      
      let answered = 0;
      leafNodeDefs.forEach((def) => {
        const status = state.getFrameworkNodeStatus(def.id);
        if (status?.isAnswered) {
          answered++;
        }
      });

      return {
        answered,
        total,
        percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
      };
    },

    attachToFramework: (
      frameworkNodeId: string, 
      userNodeId: string, 
      edgeType: 'supports' | 'informs' = 'supports'
    ): GraphEdge => {
      const state = get();
      
      // Validate framework node exists and is a framework type
      const frameworkNode = state.nodes.get(frameworkNodeId);
      if (!frameworkNode || frameworkNode.type !== 'framework') {
        throw new Error(`Framework node ${frameworkNodeId} not found or not a framework type`);
      }

      // Validate user node exists and is NOT a framework type
      const userNode = state.nodes.get(userNodeId);
      if (!userNode) {
        throw new Error(`User node ${userNodeId} not found`);
      }
      if (userNode.type === 'framework') {
        throw new Error(`Cannot attach framework node to another framework node`);
      }

      // Create edge from user node to framework node
      return get().addEdge({
        type: edgeType,
        from: userNodeId,
        to: frameworkNodeId,
      });
    },

    // =========================================================================
    // UTILITY
    // =========================================================================

    clear: () => {
      set(initialState);
    },

    exportGraph: () => {
      const state = get();
      return {
        nodes: Array.from(state.nodes.values()),
        edges: Array.from(state.edges.values()),
      };
    },

    importGraph: (data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
      // Clear existing state
      get().clear();

      // Add nodes first
      data.nodes.forEach((node) => {
        set((state) => {
          const newNodes = new Map(state.nodes);
          newNodes.set(node.id, node);

          const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
          const newIncoming = new Map(state.nodeEdgeIndex.incoming);
          newOutgoing.set(node.id, new Set());
          newIncoming.set(node.id, new Set());

          return {
            nodes: newNodes,
            nodeEdgeIndex: {
              outgoing: newOutgoing,
              incoming: newIncoming,
            },
          };
        });
      });

      // Then add edges
      data.edges.forEach((edge) => {
        set((state) => {
          const newEdges = new Map(state.edges);
          newEdges.set(edge.id, edge);

          const newOutgoing = new Map(state.nodeEdgeIndex.outgoing);
          const newIncoming = new Map(state.nodeEdgeIndex.incoming);

          const fromOutgoing = new Set(newOutgoing.get(edge.from) || []);
          fromOutgoing.add(edge.id);
          newOutgoing.set(edge.from, fromOutgoing);

          const toIncoming = new Set(newIncoming.get(edge.to) || []);
          toIncoming.add(edge.id);
          newIncoming.set(edge.to, toIncoming);

          return {
            edges: newEdges,
            nodeEdgeIndex: {
              outgoing: newOutgoing,
              incoming: newIncoming,
            },
          };
        });
      });
    },
  })
);

// =============================================================================
// SELECTOR HOOKS (for performance optimization)
// =============================================================================

export const useNode = (id: string) => useGraphStore((state) => state.nodes.get(id));
export const useEdge = (id: string) => useGraphStore((state) => state.edges.get(id));
export const useNodeCount = () => useGraphStore((state) => state.nodes.size);
export const useEdgeCount = () => useGraphStore((state) => state.edges.size);

// Progress hook - uses edge count as trigger since edges change when content is attached
export function useSkeletonProgress() {
  // Subscribe to edge map changes (edges change when content is attached)
  const edgeCount = useGraphStore((state) => state.edges.size);
  
  // Compute progress - this runs when edgeCount changes
  const store = useGraphStore.getState();
  const leafNodeDefs = getSkeletonLeafNodes();
  const total = leafNodeDefs.length;
  
  let answered = 0;
  leafNodeDefs.forEach((def) => {
    const status = store.getFrameworkNodeStatus(def.id);
    if (status?.isAnswered) {
      answered++;
    }
  });
  
  // Use edgeCount to make TypeScript happy (it's used as a dependency)
  void edgeCount;
  
  return {
    answered,
    total,
    percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
  };
}

export function useUnansweredCount() {
  const edgeCount = useGraphStore((state) => state.edges.size);
  void edgeCount;
  return useGraphStore.getState().getUnansweredFrameworkNodes().length;
}

// =============================================================================
// INITIALIZATION HELPERS
// =============================================================================

/**
 * Create a fresh graph with the evaluation skeleton initialized
 * Call this when starting a new evaluation
 */
export function createFreshGraph(): void {
  const store = useGraphStore.getState();
  store.clear();
  store.initializeSkeleton();
}

/**
 * Check if the skeleton is initialized
 */
export function isSkeletonInitialized(): boolean {
  return useGraphStore.getState().nodes.has('framework:root');
}
