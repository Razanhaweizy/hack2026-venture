/**
 * Versioned Graph Operations
 * Wrapper functions that record version history when modifying the graph
 */

import { useGraphStore } from '../store';
import { useVersionStore } from './versionStore';
import type { GraphNode, GraphEdge, EdgeType } from '../types/graph';
import type { FieldDiff, ChangeType } from './types';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate diffs between old and new node states
 */
export function calculateDiffs(
  oldNode: Partial<GraphNode>,
  newNode: Partial<GraphNode>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  
  if (oldNode.title !== newNode.title) {
    diffs.push({ field: 'title', oldValue: oldNode.title, newValue: newNode.title });
  }
  if (oldNode.content !== newNode.content) {
    diffs.push({ field: 'content', oldValue: oldNode.content, newValue: newNode.content });
  }
  if (oldNode.confidence !== newNode.confidence) {
    diffs.push({ field: 'confidence', oldValue: oldNode.confidence, newValue: newNode.confidence });
  }
  if (oldNode.type !== newNode.type) {
    diffs.push({ field: 'type', oldValue: oldNode.type, newValue: newNode.type });
  }
  
  return diffs;
}

/**
 * Generate a human-readable summary of changes
 */
export function generateChangeSummary(diffs: FieldDiff[] | undefined): string {
  if (!diffs || diffs.length === 0) return 'No changes';
  
  const summaries = diffs.map(d => {
    switch (d.field) {
      case 'content': {
        const oldSnippet = typeof d.oldValue === 'string' 
          ? d.oldValue.slice(0, 30) + (d.oldValue.length > 30 ? '...' : '')
          : '';
        const newSnippet = typeof d.newValue === 'string'
          ? d.newValue.slice(0, 30) + (d.newValue.length > 30 ? '...' : '')
          : '';
        return `Content: "${oldSnippet}" → "${newSnippet}"`;
      }
      case 'confidence': {
        const oldVal = typeof d.oldValue === 'number' ? d.oldValue : 0;
        const newVal = typeof d.newValue === 'number' ? d.newValue : 0;
        const delta = newVal - oldVal;
        return `Confidence: ${oldVal}% → ${newVal}% (${delta > 0 ? '+' : ''}${delta}%)`;
      }
      case 'title':
        return `Renamed: "${d.oldValue}" → "${d.newValue}"`;
      case 'type':
        return `Type: ${d.oldValue} → ${d.newValue}`;
      default:
        return `${d.field} changed`;
    }
  });
  
  return summaries.join('; ');
}

/**
 * Determine change type based on what fields changed
 */
export function determineChangeType(diffs: FieldDiff[]): ChangeType {
  if (diffs.length === 0) return 'updated';
  
  // If only confidence changed
  if (diffs.length === 1 && diffs[0].field === 'confidence') {
    return 'confidence_changed';
  }
  
  return 'updated';
}

// =============================================================================
// VERSIONED OPERATIONS
// =============================================================================

/**
 * Add a node with version tracking
 */
export function addNodeWithVersion(
  node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>,
  source: string = 'manual'
): GraphNode | null {
  const graphStore = useGraphStore.getState();
  const versionStore = useVersionStore.getState();
  
  // Add to graph
  const newNode = graphStore.addNode(node);
  if (!newNode) return null;
  
  // Record version
  versionStore.recordNodeChange(newNode.id, {
    versionNumber: 1,
    snapshot: {
      title: newNode.title,
      content: newNode.content,
      type: newNode.type,
      confidence: newNode.confidence,
      metadata: newNode.metadata || {},
    },
    changeType: 'created',
    changeSummary: `Created: "${newNode.title}"`,
    changeSource: source,
  });
  
  return newNode;
}

/**
 * Update a node with version tracking
 */
export function updateNodeWithVersion(
  nodeId: string,
  updates: Partial<GraphNode>,
  source: string = 'manual'
): GraphNode | null {
  const graphStore = useGraphStore.getState();
  const versionStore = useVersionStore.getState();
  
  // Get old node state
  const oldNode = graphStore.getNode(nodeId);
  if (!oldNode) return null;
  
  // Update in graph
  const updatedNode = graphStore.updateNode(nodeId, updates);
  if (!updatedNode) return null;
  
  // Calculate diff
  const diffs = calculateDiffs(oldNode, updatedNode);
  
  // Get current version number
  const history = versionStore.getNodeHistory(nodeId);
  const newVersionNumber = history.length + 1;
  
  // Record version
  versionStore.recordNodeChange(nodeId, {
    versionNumber: newVersionNumber,
    snapshot: {
      title: updatedNode.title,
      content: updatedNode.content,
      type: updatedNode.type,
      confidence: updatedNode.confidence,
      metadata: updatedNode.metadata || {},
    },
    changeType: determineChangeType(diffs),
    changeSummary: generateChangeSummary(diffs),
    changeSource: source,
    diff: diffs,
  });
  
  return updatedNode;
}

/**
 * Add an edge with version tracking
 */
export function addEdgeWithVersion(
  edge: { type: EdgeType; from: string; to: string; weight?: number; note?: string },
  source: string = 'manual'
): GraphEdge | null {
  const graphStore = useGraphStore.getState();
  const versionStore = useVersionStore.getState();
  
  // Add to graph
  const newEdge = graphStore.addEdge(edge);
  if (!newEdge) return null;
  
  // Record edge change
  versionStore.recordEdgeChange(
    newEdge.id,
    'created',
    newEdge.from,
    newEdge.to,
    newEdge.type,
    source
  );
  
  return newEdge;
}

/**
 * Delete an edge with version tracking
 */
export function deleteEdgeWithVersion(
  edgeId: string,
  source: string = 'manual'
): boolean {
  const graphStore = useGraphStore.getState();
  const versionStore = useVersionStore.getState();
  
  // Get edge before deletion
  const edge = graphStore.getEdge(edgeId);
  if (!edge) return false;
  
  // Delete from graph
  graphStore.removeEdge(edgeId);
  
  // Record edge change
  versionStore.recordEdgeChange(
    edgeId,
    'deleted',
    edge.from,
    edge.to,
    edge.type,
    source
  );
  
  return true;
}

/**
 * Restore a node to a previous version
 */
export function restoreNodeVersion(
  nodeId: string,
  versionNumber: number
): GraphNode | null {
  const graphStore = useGraphStore.getState();
  const versionStore = useVersionStore.getState();
  
  // Get the version to restore
  const version = versionStore.getNodeAtVersion(nodeId, versionNumber);
  if (!version) {
    console.error(`Version ${versionNumber} not found for node ${nodeId}`);
    return null;
  }
  
  // Get current version number
  const history = versionStore.getNodeHistory(nodeId);
  const newVersionNumber = history.length + 1;
  
  // Update the node with restored content
  const restoredNode = graphStore.updateNode(nodeId, {
    title: version.snapshot.title,
    content: version.snapshot.content,
    confidence: version.snapshot.confidence,
    metadata: {
      ...version.snapshot.metadata,
      restoredFrom: versionNumber,
      restoredAt: new Date().toISOString(),
    },
  });
  
  if (!restoredNode) return null;
  
  // Record this as a restoration version
  versionStore.recordNodeChange(nodeId, {
    versionNumber: newVersionNumber,
    snapshot: {
      title: restoredNode.title,
      content: restoredNode.content,
      type: restoredNode.type,
      confidence: restoredNode.confidence,
      metadata: restoredNode.metadata || {},
    },
    changeType: 'restored',
    changeSummary: `Restored from version ${versionNumber}`,
    changeSource: `restore:v${versionNumber}`,
  });
  
  return restoredNode;
}

/**
 * Create a snapshot after applying changes
 */
export function createSnapshotAfterChanges(
  description: string,
  triggerInput?: string
): void {
  const versionStore = useVersionStore.getState();
  versionStore.createSnapshot(description, triggerInput);
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Apply multiple changes and create a single snapshot
 */
export function applyBatchChanges(
  operations: Array<{
    type: 'add_node' | 'update_node' | 'add_edge' | 'delete_edge';
    payload: unknown;
  }>,
  source: string = 'batch'
): { success: boolean; results: unknown[] } {
  const results: unknown[] = [];
  
  for (const op of operations) {
    switch (op.type) {
      case 'add_node': {
        const result = addNodeWithVersion(op.payload as Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt' | 'version'>, source);
        results.push(result);
        break;
      }
      case 'update_node': {
        const { nodeId, updates } = op.payload as { nodeId: string; updates: Partial<GraphNode> };
        const result = updateNodeWithVersion(nodeId, updates, source);
        results.push(result);
        break;
      }
      case 'add_edge': {
        const result = addEdgeWithVersion(op.payload as { type: EdgeType; from: string; to: string; weight?: number; note?: string }, source);
        results.push(result);
        break;
      }
      case 'delete_edge': {
        const result = deleteEdgeWithVersion(op.payload as string, source);
        results.push(result);
        break;
      }
    }
  }
  
  // Create snapshot after batch
  createSnapshotAfterChanges(`Batch: ${operations.length} operations`, source);
  
  return {
    success: results.every(r => r !== null && r !== false),
    results,
  };
}

// =============================================================================
// HOOK FOR VERSIONED OPERATIONS
// =============================================================================

/**
 * Hook providing versioned graph operations
 */
export function useVersionedGraph() {
  return {
    addNode: addNodeWithVersion,
    updateNode: updateNodeWithVersion,
    addEdge: addEdgeWithVersion,
    deleteEdge: deleteEdgeWithVersion,
    restoreNodeVersion,
    createSnapshot: createSnapshotAfterChanges,
    applyBatchChanges,
  };
}
