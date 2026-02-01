/**
 * Graph Service
 * 
 * Business logic for graph operations.
 * This service is framework-agnostic (no React dependencies).
 */

import { useGraphStore, createFreshGraph, isSkeletonInitialized } from '../../store';
import type { 
  GraphNode, 
  ClaimNode, 
  FactNode, 
  EvidenceNode,
  CreateEdgeInput,
} from '../../types/graph';

// =============================================================================
// GRAPH SERVICE
// =============================================================================

export class GraphService {
  /**
   * Initialize the graph with the skeleton framework
   */
  static initialize(): void {
    if (!isSkeletonInitialized()) {
      createFreshGraph();
    }
  }

  /**
   * Reset the graph to a fresh state
   */
  static reset(): void {
    createFreshGraph();
  }

  /**
   * Add a claim node to the graph
   */
  static addClaim(
    title: string,
    content: string,
    confidence: number = 50,
    connectToFrameworkId?: string
  ): ClaimNode | null {
    const store = useGraphStore.getState();
    
    const node = store.addNode({
      type: 'claim',
      title,
      content,
      confidence,
      tested: false,
    } as Omit<ClaimNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>);
    
    if (!node) return null;
    
    // Connect to framework if specified
    if (connectToFrameworkId) {
      store.addEdge({
        type: 'supports',
        from: node.id,
        to: connectToFrameworkId,
      });
    }
    
    return node as ClaimNode;
  }

  /**
   * Add a fact node to the graph
   */
  static addFact(
    title: string,
    content: string,
    source: string,
    confidence: number = 70,
    connectToNodeId?: string
  ): FactNode | null {
    const store = useGraphStore.getState();
    
    const node = store.addNode({
      type: 'fact',
      title,
      content,
      confidence,
      source,
      verified: false,
    } as Omit<FactNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>);
    
    if (!node) return null;
    
    // Connect to another node if specified
    if (connectToNodeId) {
      store.addEdge({
        type: 'supports',
        from: node.id,
        to: connectToNodeId,
      });
    }
    
    return node as FactNode;
  }

  /**
   * Add an evidence node to the graph
   */
  static addEvidence(
    title: string,
    content: string,
    valence: 'supporting' | 'contradicting' | 'neutral',
    source: string,
    confidence: number = 80,
    connectToNodeId?: string
  ): EvidenceNode | null {
    const store = useGraphStore.getState();
    
    const node = store.addNode({
      type: 'evidence',
      title,
      content,
      confidence,
      valence: valence === 'neutral' ? 'supporting' : valence, // Map neutral to supporting
      source,
    } as Omit<EvidenceNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>);
    
    if (!node) return null;
    
    // Connect to another node if specified
    if (connectToNodeId) {
      const edgeType = valence === 'contradicting' ? 'contradicts' : 'supports';
      store.addEdge({
        type: edgeType,
        from: node.id,
        to: connectToNodeId,
      });
    }
    
    return node as EvidenceNode;
  }

  /**
   * Update a node's properties
   */
  static updateNode(
    nodeId: string,
    updates: Partial<Pick<GraphNode, 'title' | 'content' | 'confidence'>>
  ): GraphNode | null {
    const store = useGraphStore.getState();
    return store.updateNode(nodeId, updates) ?? null;
  }

  /**
   * Remove a node from the graph
   */
  static removeNode(nodeId: string): boolean {
    const store = useGraphStore.getState();
    return store.removeNode(nodeId);
  }

  /**
   * Connect two nodes with an edge
   */
  static connectNodes(
    fromId: string,
    toId: string,
    edgeType: CreateEdgeInput['type'],
    note?: string
  ): boolean {
    const store = useGraphStore.getState();
    const edge = store.addEdge({
      type: edgeType,
      from: fromId,
      to: toId,
      note,
    });
    return edge !== null;
  }

  /**
   * Get a node by ID
   */
  static getNode(nodeId: string): GraphNode | null {
    const store = useGraphStore.getState();
    return store.getNode(nodeId) ?? null;
  }

  /**
   * Get all nodes of a specific type
   */
  static getNodesByType(type: GraphNode['type']): GraphNode[] {
    const store = useGraphStore.getState();
    return store.getAllNodes().filter(n => n.type === type);
  }

  /**
   * Get framework nodes
   */
  static getFrameworkNodes() {
    const store = useGraphStore.getState();
    return store.getFrameworkNodes();
  }

  /**
   * Get all nodes
   */
  static getAllNodes(): GraphNode[] {
    const store = useGraphStore.getState();
    return store.getAllNodes();
  }

  /**
   * Get connected nodes
   */
  static getConnectedNodes(nodeId: string) {
    const store = useGraphStore.getState();
    return store.getConnectedNodes(nodeId);
  }

  /**
   * Find framework node by category and question
   */
  static findFrameworkNode(category: string, questionPattern?: string) {
    const store = useGraphStore.getState();
    const frameworks = store.getFrameworkNodes();
    
    return frameworks.find(fw => {
      const matchesCategory = fw.frameworkCategory?.toLowerCase() === category.toLowerCase();
      if (!questionPattern) return matchesCategory;
      
      const matchesQuestion = fw.title.toLowerCase().includes(questionPattern.toLowerCase());
      return matchesCategory && matchesQuestion;
    });
  }

  /**
   * Get skeleton progress
   */
  static getProgress(): { answered: number; total: number; percentage: number } {
    const store = useGraphStore.getState();
    const frameworks = store.getFrameworkNodes();
    const leafFrameworks = frameworks.filter(fw => fw.position?.level === 2);
    
    let answered = 0;
    leafFrameworks.forEach(fw => {
      const connected = store.getConnectedNodes(fw.id);
      const hasUserContent = connected.some(({ node }) => 
        node.type !== 'framework'
      );
      if (hasUserContent) answered++;
    });
    
    const total = leafFrameworks.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
    
    return { answered, total, percentage };
  }
}

export default GraphService;
