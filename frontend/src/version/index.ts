/**
 * Version History Module
 * Central export for all version history functionality
 */

// Types
export type {
  NodeVersion,
  NodeSnapshot,
  FieldDiff,
  ChangeType,
  EdgeChange,
  SerializedNode,
  SerializedEdge,
  GraphSnapshot,
  TimelineEvent,
  TimelineEventType,
  NodeDiff,
  GraphDiff,
  VersionState,
  VersionActions,
  VersionStore,
  VersionHistoryUIState,
  VersionHistoryUIActions,
} from './types';

// Store
export {
  useVersionStore,
  useCurrentSnapshot,
  useTimeline,
  useSnapshots,
  useIsTimeTraveling,
} from './versionStore';

// Versioned operations
export {
  calculateDiffs,
  generateChangeSummary,
  determineChangeType,
  addNodeWithVersion,
  updateNodeWithVersion,
  addEdgeWithVersion,
  deleteEdgeWithVersion,
  restoreNodeVersion,
  createSnapshotAfterChanges,
  applyBatchChanges,
  useVersionedGraph,
} from './versionedGraph';

// Time travel graph hook
export { useTimeTravelGraph } from './timeTravelGraph';
