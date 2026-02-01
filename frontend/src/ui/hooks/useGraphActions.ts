/**
 * useGraphActions Hook
 * 
 * React hook that provides graph actions to UI components.
 * Bridges the GraphService to React with proper state updates.
 */

import { useCallback } from 'react';
import { useGraphStore, useSkeletonProgress } from '../../store';
import { GraphService } from '../../core/services';
import type { GraphNode, CreateEdgeInput } from '../../types/graph';

// =============================================================================
// HOOK
// =============================================================================

export function useGraphActions() {
  // Subscribe to store for reactivity
  const nodesMap = useGraphStore((state) => state.nodes);
  const edgesMap = useGraphStore((state) => state.edges);
  const progress = useSkeletonProgress();
  
  // Initialize graph
  const initialize = useCallback(() => {
    GraphService.initialize();
  }, []);
  
  // Reset graph
  const reset = useCallback(() => {
    GraphService.reset();
  }, []);
  
  // Add a claim
  const addClaim = useCallback((
    title: string,
    content: string,
    confidence?: number,
    connectToFrameworkId?: string
  ) => {
    return GraphService.addClaim(title, content, confidence, connectToFrameworkId);
  }, []);
  
  // Add a fact
  const addFact = useCallback((
    title: string,
    content: string,
    source: string,
    confidence?: number,
    connectToNodeId?: string
  ) => {
    return GraphService.addFact(title, content, source, confidence, connectToNodeId);
  }, []);
  
  // Add evidence
  const addEvidence = useCallback((
    title: string,
    content: string,
    valence: 'supporting' | 'contradicting' | 'neutral',
    source: string,
    confidence?: number,
    connectToNodeId?: string
  ) => {
    return GraphService.addEvidence(
      title, content, valence, source, confidence, connectToNodeId
    );
  }, []);
  
  // Update a node
  const updateNode = useCallback((
    nodeId: string,
    updates: Partial<Pick<GraphNode, 'title' | 'content' | 'confidence'>>
  ) => {
    return GraphService.updateNode(nodeId, updates);
  }, []);
  
  // Remove a node
  const removeNode = useCallback((nodeId: string) => {
    return GraphService.removeNode(nodeId);
  }, []);
  
  // Connect nodes
  const connectNodes = useCallback((
    fromId: string,
    toId: string,
    edgeType: CreateEdgeInput['type'],
    note?: string
  ) => {
    return GraphService.connectNodes(fromId, toId, edgeType, note);
  }, []);
  
  // Get a node
  const getNode = useCallback((nodeId: string) => {
    return GraphService.getNode(nodeId);
  }, []);
  
  // Get connected nodes
  const getConnectedNodes = useCallback((nodeId: string) => {
    return GraphService.getConnectedNodes(nodeId);
  }, []);
  
  // Find framework node
  const findFrameworkNode = useCallback((
    category: string,
    questionPattern?: string
  ) => {
    return GraphService.findFrameworkNode(category, questionPattern);
  }, []);
  
  return {
    // State
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    progress,
    
    // Actions
    initialize,
    reset,
    addClaim,
    addFact,
    addEvidence,
    updateNode,
    removeNode,
    connectNodes,
    getNode,
    getConnectedNodes,
    findFrameworkNode,
  };
}

export default useGraphActions;
