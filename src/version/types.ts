/**
 * Version History Types
 * Data structures for tracking graph changes and time travel
 */

import type { NodeType, EdgeType } from '../types/graph';

// =============================================================================
// NODE VERSION
// =============================================================================

/**
 * Snapshot of a node's state at a specific version
 */
export interface NodeSnapshot {
  title: string;
  content: string;
  type: NodeType;
  confidence: number;
  metadata: Record<string, unknown>;
}

/**
 * A single field diff
 */
export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Type of change that created this version
 */
export type ChangeType = 
  | 'created'
  | 'updated'
  | 'confidence_changed'
  | 'merged_from'
  | 'split_from'
  | 'restored';

/**
 * Individual node version - represents the state of a node at a point in time
 */
export interface NodeVersion {
  versionId: string;
  nodeId: string;
  versionNumber: number;
  timestamp: Date;
  
  // Snapshot of node state at this version
  snapshot: NodeSnapshot;
  
  // What changed
  changeType: ChangeType;
  changeSummary: string;
  changeSource: string;
  
  // Diff from previous version
  diff?: FieldDiff[];
}

// =============================================================================
// EDGE VERSION
// =============================================================================

/**
 * Edge change record
 */
export interface EdgeChange {
  edgeId: string;
  timestamp: Date;
  changeType: 'created' | 'deleted';
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  changeSource: string;
}

// =============================================================================
// GRAPH SNAPSHOT
// =============================================================================

/**
 * Serializable node state for snapshots
 */
export interface SerializedNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  confidence: number;
  position: { x: number; y: number; z: number };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serializable edge state for snapshots
 */
export interface SerializedEdge {
  id: string;
  type: EdgeType;
  from: string;
  to: string;
  weight?: number;
  note?: string;
}

/**
 * Complete graph state at a point in time
 */
export interface GraphSnapshot {
  snapshotId: string;
  timestamp: Date;
  
  // Complete graph state (serialized for storage)
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  
  // Metadata
  triggerInput?: string;
  changeCount: number;
  description?: string;
}

// =============================================================================
// TIMELINE
// =============================================================================

/**
 * Type of timeline event
 */
export type TimelineEventType = 
  | 'node_created'
  | 'node_updated'
  | 'node_deleted'
  | 'edge_created'
  | 'edge_deleted'
  | 'bulk_change'
  | 'snapshot_created'
  | 'restored';

/**
 * Timeline event for visualization
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: TimelineEventType;
  nodeIds: string[];
  edgeIds: string[];
  summary: string;
  snapshotId?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// COMPARISON
// =============================================================================

/**
 * Diff between two node versions
 */
export interface NodeDiff {
  nodeId: string;
  fromVersion: number;
  toVersion: number;
  fromTimestamp: Date;
  toTimestamp: Date;
  changes: FieldDiff[];
  intermediateVersions: number[];
}

/**
 * Diff between two graph snapshots
 */
export interface GraphDiff {
  fromSnapshotId: string;
  toSnapshotId: string;
  fromTimestamp: Date;
  toTimestamp: Date;
  
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesModified: Array<{ nodeId: string; changes: FieldDiff[] }>;
  
  edgesAdded: string[];
  edgesRemoved: string[];
}

// =============================================================================
// STORE STATE
// =============================================================================

/**
 * Version store state
 */
export interface VersionState {
  // Node version history
  nodeVersions: Record<string, NodeVersion[]>;
  
  // Edge changes
  edgeChanges: EdgeChange[];
  
  // Graph snapshots
  snapshots: GraphSnapshot[];
  
  // Timeline events
  timeline: TimelineEvent[];
  
  // Time travel state
  currentSnapshotId: string | null;
  isTimeTraveling: boolean;
  
  // Change tracking
  changesSinceLastSnapshot: number;
}

/**
 * Version store actions
 */
export interface VersionActions {
  // Recording
  recordNodeChange: (
    nodeId: string,
    change: Omit<NodeVersion, 'versionId' | 'nodeId' | 'timestamp'>
  ) => void;
  recordEdgeChange: (
    edgeId: string,
    changeType: 'created' | 'deleted',
    sourceId: string,
    targetId: string,
    edgeType: EdgeType,
    changeSource: string
  ) => void;
  createSnapshot: (description?: string, triggerInput?: string) => GraphSnapshot;
  
  // Queries
  getNodeHistory: (nodeId: string) => NodeVersion[];
  getNodeAtVersion: (nodeId: string, versionNumber: number) => NodeVersion | null;
  getNodeAtTime: (nodeId: string, timestamp: Date) => NodeVersion | null;
  getLatestSnapshot: () => GraphSnapshot | null;
  
  // Time travel
  travelToSnapshot: (snapshotId: string) => void;
  travelToTime: (timestamp: Date) => void;
  returnToPresent: () => void;
  
  // Comparison
  compareNodeVersions: (nodeId: string, v1: number, v2: number) => NodeDiff | null;
  compareSnapshots: (s1: string, s2: string) => GraphDiff | null;
  
  // Reset
  reset: () => void;
}

/**
 * Combined version store type
 */
export type VersionStore = VersionState & VersionActions;

// =============================================================================
// UI STATE
// =============================================================================

/**
 * UI state for version history components
 */
export interface VersionHistoryUIState {
  selectedNodeForHistory: string | null;
  comparingVersions: { nodeId: string; v1: number; v2: number } | null;
  timelineVisible: boolean;
  historyPanelOpen: boolean;
}

/**
 * UI actions for version history components
 */
export interface VersionHistoryUIActions {
  showNodeHistory: (nodeId: string) => void;
  hideNodeHistory: () => void;
  startCompare: (nodeId: string, v1: number, v2: number) => void;
  stopCompare: () => void;
  toggleTimeline: () => void;
  setTimelineVisible: (visible: boolean) => void;
}
