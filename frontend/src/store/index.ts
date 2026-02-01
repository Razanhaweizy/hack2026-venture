/**
 * Ideograph Store Exports
 */

export { 
  useGraphStore, 
  useNode, 
  useEdge, 
  useNodeCount, 
  useEdgeCount,
  useSkeletonProgress,
  useUnansweredCount,
  createFreshGraph,
  isSkeletonInitialized,
} from './graphStore';

export type { FrameworkNodeStatus } from './graphStore';

// API-backed store (uses backend)
export {
  useApiGraphStore,
  useApiSkeletonProgress,
} from './apiGraphStore';

export {
  useDiffStore,
  useDiffPanelOpen,
  useDiffChanges,
  useDiffCounts,
  useHighlightedNodes,
} from './diffStore';

export type { ChangeStatus, HighlightType, ApplyResult } from './diffStore';

// CSV Persistence (local - kept for backwards compatibility)
export {
  initializeFromCSV,
  saveToStorage,
  enableAutoSave,
  disableAutoSave,
  exportToCSVFiles,
  importFromCSVFiles,
  resetToDefaultCSV,
  clearAllData,
  isCSVInitialized,
  getLastModified,
  getGraphStats,
} from './csvPersistence';

// PMF Path Store
export {
  usePathStore,
  usePmfPath,
  usePathPlaybook,
  usePathStatus,
  usePathBlockers,
  usePathWarnings,
} from './pathStore';

export type {
  PlaybookSummary,
  PlaybookRule,
  PathStatus,
  PathState,
} from './pathStore';
