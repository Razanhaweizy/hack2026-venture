/**
 * useVersionActions Hook
 * 
 * React hook that provides version history actions to UI components.
 * Bridges the VersionService to React with proper state management.
 */

import { useState, useCallback, useMemo } from 'react';
import { useVersionStore } from '../../version/versionStore';
import { VersionService } from '../../core/services';
import type { NodeVersion, GraphSnapshot } from '../../version/types';

// =============================================================================
// HOOK
// =============================================================================

export function useVersionActions() {
  // UI state for panels/modals
  const [showNodeHistory, setShowNodeHistory] = useState(false);
  const [selectedNodeForHistory, setSelectedNodeForHistory] = useState<string | null>(null);
  const [comparingVersions, setComparingVersions] = useState<{
    nodeId: string;
    v1: number;
    v2: number;
  } | null>(null);
  
  // Version store state (reactive)
  const isTimeTraveling = useVersionStore(state => state.isTimeTraveling);
  const currentSnapshotId = useVersionStore(state => state.currentSnapshotId);
  const snapshots = useVersionStore(state => state.snapshots);
  const timeline = useVersionStore(state => state.timeline);
  
  // Current snapshot (when time traveling)
  const currentSnapshot = useMemo(() => {
    if (!currentSnapshotId) return null;
    return snapshots.find(s => s.snapshotId === currentSnapshotId) || null;
  }, [currentSnapshotId, snapshots]);
  
  // Create a snapshot
  const createSnapshot = useCallback((description?: string) => {
    return VersionService.createSnapshot(description);
  }, []);
  
  // Show node history panel
  const showHistory = useCallback((nodeId: string) => {
    setSelectedNodeForHistory(nodeId);
    setShowNodeHistory(true);
  }, []);
  
  // Hide node history panel
  const hideHistory = useCallback(() => {
    setShowNodeHistory(false);
    setSelectedNodeForHistory(null);
  }, []);
  
  // Get node history
  const getNodeHistory = useCallback((nodeId: string): NodeVersion[] => {
    return VersionService.getNodeHistory(nodeId);
  }, []);
  
  // Restore a node version
  const restoreVersion = useCallback((nodeId: string, versionNumber: number) => {
    const result = VersionService.restoreNodeVersion(nodeId, versionNumber);
    return result;
  }, []);
  
  // Start comparing versions
  const startCompare = useCallback((nodeId: string, v1: number, v2: number) => {
    setComparingVersions({ nodeId, v1, v2 });
  }, []);
  
  // Stop comparing versions
  const stopCompare = useCallback(() => {
    setComparingVersions(null);
  }, []);
  
  // Compare two versions
  const compareVersions = useCallback((nodeId: string, v1: number, v2: number) => {
    return VersionService.compareNodeVersions(nodeId, v1, v2);
  }, []);
  
  // Time travel to a snapshot
  const travelTo = useCallback((snapshotId: string) => {
    VersionService.travelToSnapshot(snapshotId);
  }, []);
  
  // Return to present
  const returnToPresent = useCallback(() => {
    VersionService.returnToPresent();
  }, []);
  
  // Navigate to previous snapshot
  const goToPrevious = useCallback(() => {
    return VersionService.goToPreviousSnapshot();
  }, []);
  
  // Navigate to next snapshot
  const goToNext = useCallback(() => {
    return VersionService.goToNextSnapshot();
  }, []);
  
  // Navigate to first snapshot
  const goToFirst = useCallback(() => {
    return VersionService.goToFirstSnapshot();
  }, []);
  
  // Get change count since snapshot
  const getChangeCount = useCallback((snapshotId: string) => {
    return VersionService.getChangeCountSinceSnapshot(snapshotId);
  }, []);
  
  return {
    // State
    isTimeTraveling,
    currentSnapshotId,
    currentSnapshot,
    snapshots,
    timeline,
    showNodeHistory,
    selectedNodeForHistory,
    comparingVersions,
    
    // Actions
    createSnapshot,
    showHistory,
    hideHistory,
    getNodeHistory,
    restoreVersion,
    startCompare,
    stopCompare,
    compareVersions,
    travelTo,
    returnToPresent,
    goToPrevious,
    goToNext,
    goToFirst,
    getChangeCount,
  };
}

export default useVersionActions;
