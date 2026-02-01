/**
 * Time Travel Graph Hook
 * Provides either live or snapshot graph data based on time travel state
 */

import { useMemo } from 'react';
import { useGraphStore } from '../store';
import { useVersionStore, useCurrentSnapshot } from './versionStore';
import type { GraphNode, GraphEdge } from '../types/graph';
import type { SerializedNode, SerializedEdge } from './types';

/**
 * Convert serialized node to GraphNode (basic version for display)
 * Note: This creates a simplified node suitable for display; full type information
 * is preserved in the serialized type field
 */
function deserializeNode(serialized: SerializedNode): GraphNode {
  // Create base node properties
  const baseProps = {
    id: serialized.id,
    type: serialized.type,
    title: serialized.title,
    content: serialized.content,
    confidence: serialized.confidence,
    metadata: serialized.metadata,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
    versions: [],
  };
  
  // Return type-specific node based on serialized type
  switch (serialized.type) {
    case 'framework':
      return {
        ...baseProps,
        type: 'framework',
        description: (serialized.metadata?.description as string) || '',
        isSkeleton: (serialized.metadata?.isSkeleton as boolean) || false,
        position: serialized.position ? { 
          x: serialized.position.x, 
          y: serialized.position.y, 
          level: (serialized.metadata?.level as number) || 0 
        } : undefined,
      } as GraphNode;
    case 'claim':
      return {
        ...baseProps,
        type: 'claim',
        tested: (serialized.metadata?.tested as boolean) || false,
      } as GraphNode;
    case 'fact':
      return {
        ...baseProps,
        type: 'fact',
      } as GraphNode;
    case 'evidence':
      return {
        ...baseProps,
        type: 'evidence',
        valence: (serialized.metadata?.valence as 'supporting' | 'contradicting') || 'supporting',
        source: (serialized.metadata?.source as string) || '',
      } as GraphNode;
    default:
      return baseProps as GraphNode;
  }
}

/**
 * Convert serialized edge to GraphEdge
 */
function deserializeEdge(serialized: SerializedEdge): GraphEdge {
  return {
    id: serialized.id,
    type: serialized.type,
    from: serialized.from,
    to: serialized.to,
    weight: serialized.weight,
    note: serialized.note,
    createdAt: new Date(),
  };
}

/**
 * Hook that returns either live graph or snapshot data based on time travel state
 */
export function useTimeTravelGraph() {
  const liveNodes = useGraphStore(state => state.getAllNodes());
  const liveEdges = useGraphStore(state => state.getAllEdges());
  const isTimeTraveling = useVersionStore(state => state.isTimeTraveling);
  const currentSnapshot = useCurrentSnapshot();
  
  // Build display data
  const displayData = useMemo(() => {
    if (isTimeTraveling && currentSnapshot) {
      // Return snapshot data
      return {
        nodes: currentSnapshot.nodes.map(deserializeNode),
        edges: currentSnapshot.edges.map(deserializeEdge),
        isTimeTraveling: true,
        isReadOnly: true,
        snapshotTimestamp: currentSnapshot.timestamp,
        snapshotDescription: currentSnapshot.description,
      };
    }
    
    // Return live data
    return {
      nodes: liveNodes,
      edges: liveEdges,
      isTimeTraveling: false,
      isReadOnly: false,
      snapshotTimestamp: null,
      snapshotDescription: null,
    };
  }, [isTimeTraveling, currentSnapshot, liveNodes, liveEdges]);
  
  // Calculate future nodes (nodes that exist in live but not in snapshot)
  const futureNodeIds = useMemo(() => {
    if (!isTimeTraveling || !currentSnapshot) return new Set<string>();
    
    const snapshotNodeIds = new Set(currentSnapshot.nodes.map(n => n.id));
    return new Set(
      liveNodes
        .filter(n => !snapshotNodeIds.has(n.id))
        .map(n => n.id)
    );
  }, [isTimeTraveling, currentSnapshot, liveNodes]);
  
  // Calculate nodes that will be modified
  const modifiedNodeIds = useMemo(() => {
    if (!isTimeTraveling || !currentSnapshot) return new Set<string>();
    
    const modified = new Set<string>();
    const snapshotNodeMap = new Map(currentSnapshot.nodes.map(n => [n.id, n]));
    
    for (const liveNode of liveNodes) {
      const snapshotNode = snapshotNodeMap.get(liveNode.id);
      if (snapshotNode) {
        // Check if node content differs
        if (
          snapshotNode.title !== liveNode.title ||
          snapshotNode.content !== liveNode.content ||
          snapshotNode.confidence !== liveNode.confidence
        ) {
          modified.add(liveNode.id);
        }
      }
    }
    
    return modified;
  }, [isTimeTraveling, currentSnapshot, liveNodes]);
  
  return {
    ...displayData,
    futureNodeIds,
    modifiedNodeIds,
    liveNodes, // For showing ghost previews of future nodes
    liveEdges,
  };
}

/**
 * Hook for checking if a specific node existed at the current snapshot time
 */
export function useNodeExistedAtSnapshot(nodeId: string): boolean {
  const currentSnapshot = useCurrentSnapshot();
  const isTimeTraveling = useVersionStore(state => state.isTimeTraveling);
  
  return useMemo(() => {
    if (!isTimeTraveling || !currentSnapshot) return true;
    return currentSnapshot.nodes.some(n => n.id === nodeId);
  }, [isTimeTraveling, currentSnapshot, nodeId]);
}

/**
 * Hook for getting the state of a node at the current snapshot
 */
export function useNodeAtSnapshot(nodeId: string): GraphNode | null {
  const currentSnapshot = useCurrentSnapshot();
  const isTimeTraveling = useVersionStore(state => state.isTimeTraveling);
  const liveNode = useGraphStore(state => state.getNode(nodeId));
  
  return useMemo(() => {
    if (!isTimeTraveling || !currentSnapshot) {
      return liveNode ?? null;
    }
    
    const snapshotNode = currentSnapshot.nodes.find(n => n.id === nodeId);
    return snapshotNode ? deserializeNode(snapshotNode) : null;
  }, [isTimeTraveling, currentSnapshot, nodeId, liveNode]);
}
