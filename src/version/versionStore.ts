/**
 * Version Store
 * Zustand store for managing version history and time travel
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  VersionStore,
  VersionState,
  NodeVersion,
  EdgeChange,
  GraphSnapshot,
  TimelineEvent,
  SerializedNode,
  SerializedEdge,
  FieldDiff,
} from './types';
import { useGraphStore } from '../store';

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: VersionState = {
  nodeVersions: {},
  edgeChanges: [],
  snapshots: [],
  timeline: [],
  currentSnapshotId: null,
  isTimeTraveling: false,
  changesSinceLastSnapshot: 0,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get position from node, providing defaults if not present
 */
function getNodePosition(node: ReturnType<typeof useGraphStore.getState>['getAllNodes'] extends () => (infer T)[] ? T : never): { x: number; y: number; z: number } {
  if ('position' in node && node.position) {
    return { x: node.position.x, y: node.position.y, z: 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

/**
 * Serialize the current graph state for a snapshot
 */
function serializeCurrentGraph(): { nodes: SerializedNode[]; edges: SerializedEdge[] } {
  const graphStore = useGraphStore.getState();
  const allNodes = graphStore.getAllNodes();
  const allEdges = graphStore.getAllEdges();
  
  const serializedNodes: SerializedNode[] = allNodes.map(node => ({
    id: node.id,
    type: node.type,
    title: node.title,
    content: node.content,
    confidence: node.confidence,
    position: getNodePosition(node),
    metadata: node.metadata || {},
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  }));
  
  const serializedEdges: SerializedEdge[] = allEdges.map(edge => ({
    id: edge.id,
    type: edge.type,
    from: edge.from,
    to: edge.to,
    weight: edge.weight,
    note: edge.note,
  }));
  
  return { nodes: serializedNodes, edges: serializedEdges };
}

/**
 * Check if we should create a snapshot based on conditions
 */
function shouldCreateSnapshot(
  lastSnapshot: GraphSnapshot | null,
  changesSinceSnapshot: number,
  changeType?: string
): boolean {
  // Always snapshot after applying diffs
  if (changeType === 'diff_applied') return true;
  
  // Snapshot every 10 changes
  if (changesSinceSnapshot >= 10) return true;
  
  // Snapshot before destructive operations
  if (changeType && ['merge', 'split', 'bulk_delete', 'restore'].includes(changeType)) return true;
  
  // Time-based: snapshot if >1 hour since last
  if (lastSnapshot && Date.now() - lastSnapshot.timestamp.getTime() > 3600000) return true;
  
  return false;
}

// =============================================================================
// VERSION STORE
// =============================================================================

export const useVersionStore = create<VersionStore>((set, get) => ({
  ...initialState,
  
  // ==========================================================================
  // RECORDING
  // ==========================================================================
  
  recordNodeChange: (nodeId, change) => {
    const versionId = uuid();
    const timestamp = new Date();
    
    const newVersion: NodeVersion = {
      versionId,
      nodeId,
      timestamp,
      ...change,
    };
    
    set(state => {
      const existingVersions = state.nodeVersions[nodeId] || [];
      const newVersions = [...existingVersions, newVersion];
      
      // Create timeline event
      const timelineEvent: TimelineEvent = {
        id: uuid(),
        timestamp,
        type: change.changeType === 'created' ? 'node_created' : 'node_updated',
        nodeIds: [nodeId],
        edgeIds: [],
        summary: change.changeSummary,
      };
      
      const newChangeCount = state.changesSinceLastSnapshot + 1;
      
      return {
        nodeVersions: {
          ...state.nodeVersions,
          [nodeId]: newVersions,
        },
        timeline: [...state.timeline, timelineEvent],
        changesSinceLastSnapshot: newChangeCount,
      };
    });
    
    // Check if we should auto-create a snapshot
    const state = get();
    const lastSnapshot = state.snapshots[state.snapshots.length - 1] || null;
    if (shouldCreateSnapshot(lastSnapshot, state.changesSinceLastSnapshot)) {
      get().createSnapshot('Auto-snapshot');
    }
  },
  
  recordEdgeChange: (edgeId, changeType, sourceId, targetId, edgeType, changeSource) => {
    const timestamp = new Date();
    
    const edgeChange: EdgeChange = {
      edgeId,
      timestamp,
      changeType,
      sourceId,
      targetId,
      edgeType,
      changeSource,
    };
    
    set(state => {
      // Create timeline event
      const timelineEvent: TimelineEvent = {
        id: uuid(),
        timestamp,
        type: changeType === 'created' ? 'edge_created' : 'edge_deleted',
        nodeIds: [sourceId, targetId],
        edgeIds: [edgeId],
        summary: `Edge ${changeType}: ${sourceId} → ${targetId}`,
      };
      
      return {
        edgeChanges: [...state.edgeChanges, edgeChange],
        timeline: [...state.timeline, timelineEvent],
        changesSinceLastSnapshot: state.changesSinceLastSnapshot + 1,
      };
    });
  },
  
  createSnapshot: (description, triggerInput) => {
    const snapshotId = uuid();
    const timestamp = new Date();
    const { nodes, edges } = serializeCurrentGraph();
    
    const snapshot: GraphSnapshot = {
      snapshotId,
      timestamp,
      nodes,
      edges,
      changeCount: get().changesSinceLastSnapshot,
      description,
      triggerInput,
    };
    
    // Create timeline event for snapshot
    const timelineEvent: TimelineEvent = {
      id: uuid(),
      timestamp,
      type: 'snapshot_created',
      nodeIds: [],
      edgeIds: [],
      summary: description || 'Snapshot created',
      snapshotId,
    };
    
    set(state => ({
      snapshots: [...state.snapshots, snapshot],
      timeline: [...state.timeline, timelineEvent],
      changesSinceLastSnapshot: 0,
    }));
    
    console.log(`Snapshot created: ${snapshotId} with ${nodes.length} nodes, ${edges.length} edges`);
    
    return snapshot;
  },
  
  // ==========================================================================
  // QUERIES
  // ==========================================================================
  
  getNodeHistory: (nodeId) => {
    return get().nodeVersions[nodeId] || [];
  },
  
  getNodeAtVersion: (nodeId, versionNumber) => {
    const versions = get().nodeVersions[nodeId] || [];
    return versions.find(v => v.versionNumber === versionNumber) || null;
  },
  
  getNodeAtTime: (nodeId, timestamp) => {
    const versions = get().nodeVersions[nodeId] || [];
    // Find the version that was active at the given time
    const relevantVersions = versions.filter(v => v.timestamp <= timestamp);
    return relevantVersions[relevantVersions.length - 1] || null;
  },
  
  getLatestSnapshot: () => {
    const snapshots = get().snapshots;
    return snapshots[snapshots.length - 1] || null;
  },
  
  // ==========================================================================
  // TIME TRAVEL
  // ==========================================================================
  
  travelToSnapshot: (snapshotId) => {
    const snapshot = get().snapshots.find(s => s.snapshotId === snapshotId);
    if (!snapshot) {
      console.error(`Snapshot not found: ${snapshotId}`);
      return;
    }
    
    set({
      currentSnapshotId: snapshotId,
      isTimeTraveling: true,
    });
    
    console.log(`Time traveled to: ${snapshot.timestamp.toLocaleString()}`);
  },
  
  travelToTime: (timestamp) => {
    const snapshots = get().snapshots;
    // Find the snapshot closest to but not after the given time
    const relevantSnapshots = snapshots.filter(s => s.timestamp <= timestamp);
    const closestSnapshot = relevantSnapshots[relevantSnapshots.length - 1];
    
    if (closestSnapshot) {
      get().travelToSnapshot(closestSnapshot.snapshotId);
    } else {
      console.warn('No snapshot found for the given time');
    }
  },
  
  returnToPresent: () => {
    set({
      currentSnapshotId: null,
      isTimeTraveling: false,
    });
    
    console.log('Returned to present');
  },
  
  // ==========================================================================
  // COMPARISON
  // ==========================================================================
  
  compareNodeVersions: (nodeId, v1, v2) => {
    const versions = get().nodeVersions[nodeId] || [];
    const version1 = versions.find(v => v.versionNumber === v1);
    const version2 = versions.find(v => v.versionNumber === v2);
    
    if (!version1 || !version2) return null;
    
    const changes: FieldDiff[] = [];
    
    // Compare snapshots
    const s1 = version1.snapshot;
    const s2 = version2.snapshot;
    
    if (s1.title !== s2.title) {
      changes.push({ field: 'title', oldValue: s1.title, newValue: s2.title });
    }
    if (s1.content !== s2.content) {
      changes.push({ field: 'content', oldValue: s1.content, newValue: s2.content });
    }
    if (s1.confidence !== s2.confidence) {
      changes.push({ field: 'confidence', oldValue: s1.confidence, newValue: s2.confidence });
    }
    if (s1.type !== s2.type) {
      changes.push({ field: 'type', oldValue: s1.type, newValue: s2.type });
    }
    
    // Find intermediate versions
    const minV = Math.min(v1, v2);
    const maxV = Math.max(v1, v2);
    const intermediateVersions = versions
      .filter(v => v.versionNumber > minV && v.versionNumber < maxV)
      .map(v => v.versionNumber);
    
    return {
      nodeId,
      fromVersion: v1,
      toVersion: v2,
      fromTimestamp: version1.timestamp,
      toTimestamp: version2.timestamp,
      changes,
      intermediateVersions,
    };
  },
  
  compareSnapshots: (s1, s2) => {
    const snapshot1 = get().snapshots.find(s => s.snapshotId === s1);
    const snapshot2 = get().snapshots.find(s => s.snapshotId === s2);
    
    if (!snapshot1 || !snapshot2) return null;
    
    const nodes1Ids = new Set(snapshot1.nodes.map(n => n.id));
    const nodes2Ids = new Set(snapshot2.nodes.map(n => n.id));
    
    const nodesAdded = snapshot2.nodes
      .filter(n => !nodes1Ids.has(n.id))
      .map(n => n.id);
    
    const nodesRemoved = snapshot1.nodes
      .filter(n => !nodes2Ids.has(n.id))
      .map(n => n.id);
    
    const nodesModified: Array<{ nodeId: string; changes: FieldDiff[] }> = [];
    
    // Check for modified nodes
    for (const node2 of snapshot2.nodes) {
      if (nodes1Ids.has(node2.id)) {
        const node1 = snapshot1.nodes.find(n => n.id === node2.id)!;
        const changes: FieldDiff[] = [];
        
        if (node1.title !== node2.title) {
          changes.push({ field: 'title', oldValue: node1.title, newValue: node2.title });
        }
        if (node1.content !== node2.content) {
          changes.push({ field: 'content', oldValue: node1.content, newValue: node2.content });
        }
        if (node1.confidence !== node2.confidence) {
          changes.push({ field: 'confidence', oldValue: node1.confidence, newValue: node2.confidence });
        }
        
        if (changes.length > 0) {
          nodesModified.push({ nodeId: node2.id, changes });
        }
      }
    }
    
    // Compare edges
    const edges1Ids = new Set(snapshot1.edges.map(e => e.id));
    const edges2Ids = new Set(snapshot2.edges.map(e => e.id));
    
    const edgesAdded = snapshot2.edges
      .filter(e => !edges1Ids.has(e.id))
      .map(e => e.id);
    
    const edgesRemoved = snapshot1.edges
      .filter(e => !edges2Ids.has(e.id))
      .map(e => e.id);
    
    return {
      fromSnapshotId: s1,
      toSnapshotId: s2,
      fromTimestamp: snapshot1.timestamp,
      toTimestamp: snapshot2.timestamp,
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded,
      edgesRemoved,
    };
  },
  
  // ==========================================================================
  // RESET
  // ==========================================================================
  
  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Get the current snapshot if time traveling
 */
export function useCurrentSnapshot(): GraphSnapshot | null {
  const { isTimeTraveling, currentSnapshotId, snapshots } = useVersionStore();
  
  if (!isTimeTraveling || !currentSnapshotId) return null;
  
  return snapshots.find(s => s.snapshotId === currentSnapshotId) || null;
}

/**
 * Get timeline events for visualization
 */
export function useTimeline(): TimelineEvent[] {
  return useVersionStore(state => state.timeline);
}

/**
 * Get snapshots for timeline
 */
export function useSnapshots(): GraphSnapshot[] {
  return useVersionStore(state => state.snapshots);
}

/**
 * Check if currently time traveling
 */
export function useIsTimeTraveling(): boolean {
  return useVersionStore(state => state.isTimeTraveling);
}
