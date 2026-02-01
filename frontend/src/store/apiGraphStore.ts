/**
 * API-backed Graph Store
 * Zustand store that syncs with the backend API
 */

import { create } from 'zustand';
import { api, GraphNode as ApiGraphNode, GraphEdge as ApiGraphEdge, CreateNodeInput, CreateEdgeInput } from '../api';
import type { GraphNode, GraphEdge, FrameworkNode, ConnectedNodesResult } from '../types/graph';

// =============================================================================
// TYPE CONVERTERS
// =============================================================================

function apiNodeToGraphNode(apiNode: ApiGraphNode): GraphNode {
  const base = {
    id: apiNode.id,
    type: apiNode.type as GraphNode['type'],
    title: apiNode.title,
    content: apiNode.content,
    confidence: apiNode.confidence,
    createdAt: new Date(apiNode.created_at),
    updatedAt: new Date(apiNode.updated_at),
    versions: [],
  };

  if (apiNode.type === 'framework') {
    return {
      ...base,
      type: 'framework',
      frameworkCategory: apiNode.framework_category as FrameworkNode['frameworkCategory'],
      description: apiNode.description || '',
      position: apiNode.position,
      isSkeleton: apiNode.is_skeleton || false,
      parentId: apiNode.parent_id,
    } as FrameworkNode;
  }

  if (apiNode.type === 'claim') {
    return {
      ...base,
      type: 'claim',
      source: apiNode.source,
      tested: apiNode.tested || false,
    } as GraphNode;
  }

  if (apiNode.type === 'fact') {
    return {
      ...base,
      type: 'fact',
      source: apiNode.source,
    } as GraphNode;
  }

  if (apiNode.type === 'evidence') {
    return {
      ...base,
      type: 'evidence',
      valence: (apiNode.valence || 'supporting') as 'supporting' | 'contradicting',
      source: apiNode.source || '',
    } as GraphNode;
  }

  return base as GraphNode;
}

function apiEdgeToGraphEdge(apiEdge: ApiGraphEdge): GraphEdge {
  return {
    id: apiEdge.id,
    type: apiEdge.type as GraphEdge['type'],
    from: apiEdge.from,
    to: apiEdge.to,
    note: apiEdge.note,
    createdAt: new Date(apiEdge.created_at),
  };
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface ApiGraphStore {
  // State
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Initialization
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  // Node Operations
  addNode: (input: CreateNodeInput) => Promise<GraphNode | null>;
  getNode: (id: string) => GraphNode | undefined;
  updateNode: (id: string, updates: { title?: string; content?: string; confidence?: number }) => Promise<GraphNode | null>;
  removeNode: (id: string) => Promise<boolean>;
  getAllNodes: () => GraphNode[];
  getNodesByType: (type: string) => GraphNode[];
  getFrameworkNodes: () => FrameworkNode[];

  // Edge Operations
  addEdge: (input: CreateEdgeInput) => Promise<GraphEdge | null>;
  getEdge: (id: string) => GraphEdge | undefined;
  removeEdge: (id: string) => Promise<boolean>;
  getAllEdges: () => GraphEdge[];

  // Graph Traversal
  getConnectedNodes: (nodeId: string) => ConnectedNodesResult[];

  // Progress
  getSkeletonProgress: () => { answered: number; total: number; percentage: number };

  // Export
  exportCSV: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useApiGraphStore = create<ApiGraphStore>()((set, get) => ({
  // Initial state
  nodes: new Map(),
  edges: new Map(),
  isLoading: false,
  error: null,
  isInitialized: false,

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, error: null });

    try {
      const response = await api.getGraphState();

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const nodesMap = new Map<string, GraphNode>();
        const edgesMap = new Map<string, GraphEdge>();

        response.data.nodes.forEach((apiNode: ApiGraphNode) => {
          const node = apiNodeToGraphNode(apiNode);
          nodesMap.set(node.id, node);
        });

        response.data.edges.forEach((apiEdge: ApiGraphEdge) => {
          const edge = apiEdgeToGraphEdge(apiEdge);
          edgesMap.set(edge.id, edge);
        });

        set({
          nodes: nodesMap,
          edges: edgesMap,
          isLoading: false,
          isInitialized: true,
        });

        console.log(`[API Store] Loaded ${nodesMap.size} nodes and ${edgesMap.size} edges`);
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to initialize',
      });
      console.error('[API Store] Initialization error:', err);
    }
  },

  refresh: async () => {
    set({ isLoading: true });
    
    try {
      const response = await api.getGraphState();

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const nodesMap = new Map<string, GraphNode>();
        const edgesMap = new Map<string, GraphEdge>();

        response.data.nodes.forEach((apiNode: ApiGraphNode) => {
          const node = apiNodeToGraphNode(apiNode);
          nodesMap.set(node.id, node);
        });

        response.data.edges.forEach((apiEdge: ApiGraphEdge) => {
          const edge = apiEdgeToGraphEdge(apiEdge);
          edgesMap.set(edge.id, edge);
        });

        set({
          nodes: nodesMap,
          edges: edgesMap,
          isLoading: false,
        });
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to refresh',
      });
    }
  },

  // ===========================================================================
  // NODE OPERATIONS
  // ===========================================================================

  addNode: async (input: CreateNodeInput): Promise<GraphNode | null> => {
    try {
      const response = await api.createNode(input);

      if (response.error || !response.data?.success || !response.data.node) {
        console.error('Failed to add node:', response.error || response.data?.message);
        return null;
      }

      const node = apiNodeToGraphNode(response.data.node);

      set((state) => {
        const newNodes = new Map(state.nodes);
        newNodes.set(node.id, node);
        return { nodes: newNodes };
      });

      return node;
    } catch (err) {
      console.error('Error adding node:', err);
      return null;
    }
  },

  getNode: (id: string): GraphNode | undefined => {
    return get().nodes.get(id);
  },

  updateNode: async (id: string, updates): Promise<GraphNode | null> => {
    try {
      const response = await api.updateNode(id, updates);

      if (response.error || !response.data?.success || !response.data.node) {
        return null;
      }

      const node = apiNodeToGraphNode(response.data.node);

      set((state) => {
        const newNodes = new Map(state.nodes);
        newNodes.set(node.id, node);
        return { nodes: newNodes };
      });

      return node;
    } catch (err) {
      console.error('Error updating node:', err);
      return null;
    }
  },

  removeNode: async (id: string): Promise<boolean> => {
    try {
      const response = await api.deleteNode(id);

      if (response.error || !response.data?.success) {
        return false;
      }

      set((state) => {
        const newNodes = new Map(state.nodes);
        newNodes.delete(id);
        return { nodes: newNodes };
      });

      return true;
    } catch (err) {
      console.error('Error removing node:', err);
      return false;
    }
  },

  getAllNodes: (): GraphNode[] => {
    return Array.from(get().nodes.values());
  },

  getNodesByType: (type: string): GraphNode[] => {
    return get().getAllNodes().filter((n) => n.type === type);
  },

  getFrameworkNodes: (): FrameworkNode[] => {
    return get().getNodesByType('framework') as FrameworkNode[];
  },

  // ===========================================================================
  // EDGE OPERATIONS
  // ===========================================================================

  addEdge: async (input: CreateEdgeInput): Promise<GraphEdge | null> => {
    try {
      const response = await api.createEdge(input);

      if (response.error || !response.data?.success || !response.data.edge) {
        return null;
      }

      const edge = apiEdgeToGraphEdge(response.data.edge);

      set((state) => {
        const newEdges = new Map(state.edges);
        newEdges.set(edge.id, edge);
        return { edges: newEdges };
      });

      return edge;
    } catch (err) {
      console.error('Error adding edge:', err);
      return null;
    }
  },

  getEdge: (id: string): GraphEdge | undefined => {
    return get().edges.get(id);
  },

  removeEdge: async (id: string): Promise<boolean> => {
    try {
      const response = await api.deleteEdge(id);

      if (response.error || !response.data?.success) {
        return false;
      }

      set((state) => {
        const newEdges = new Map(state.edges);
        newEdges.delete(id);
        return { edges: newEdges };
      });

      return true;
    } catch (err) {
      console.error('Error removing edge:', err);
      return false;
    }
  },

  getAllEdges: (): GraphEdge[] => {
    return Array.from(get().edges.values());
  },

  // ===========================================================================
  // GRAPH TRAVERSAL
  // ===========================================================================

  getConnectedNodes: (nodeId: string): ConnectedNodesResult[] => {
    const state = get();
    const connected: ConnectedNodesResult[] = [];

    state.edges.forEach((edge) => {
      if (edge.from === nodeId) {
        const targetNode = state.nodes.get(edge.to);
        if (targetNode) {
          connected.push({
            node: targetNode,
            edge,
            direction: 'child',
          });
        }
      }
      if (edge.to === nodeId) {
        const sourceNode = state.nodes.get(edge.from);
        if (sourceNode) {
          connected.push({
            node: sourceNode,
            edge,
            direction: 'parent',
          });
        }
      }
    });

    return connected;
  },

  // ===========================================================================
  // PROGRESS
  // ===========================================================================

  getSkeletonProgress: (): { answered: number; total: number; percentage: number } => {
    const state = get();
    const frameworks = state.getFrameworkNodes();
    const leafNodes = frameworks.filter((fw) => fw.position?.level === 2);

    let answered = 0;
    leafNodes.forEach((fw) => {
      const connected = state.getConnectedNodes(fw.id);
      const hasUserContent = connected.some(({ node }) => node.type !== 'framework');
      if (hasUserContent) answered++;
    });

    const total = leafNodes.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percentage };
  },

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  exportCSV: () => {
    api.exportAllCSV();
  },
}));

// Hook for skeleton progress (for compatibility)
export const useApiSkeletonProgress = () => {
  return useApiGraphStore((state) => state.getSkeletonProgress());
};

export default useApiGraphStore;
