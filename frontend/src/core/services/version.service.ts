/**
 * Version Service
 * 
 * Business logic for version history and time travel.
 * This service is framework-agnostic (no React dependencies).
 */

import { useVersionStore } from '../../version/versionStore';
import { 
  restoreNodeVersion as restoreNodeVersionFn,
  createSnapshotAfterChanges,
} from '../../version/versionedGraph';
import type { 
  NodeVersion, 
  GraphSnapshot, 
  TimelineEvent,
} from '../../version/types';

// =============================================================================
// VERSION SERVICE
// =============================================================================

export class VersionService {
  /**
   * Create a manual snapshot of the current graph state
   */
  static createSnapshot(description: string = 'Manual checkpoint'): GraphSnapshot {
    return createSnapshotAfterChanges(description, 'manual');
  }

  /**
   * Get version history for a specific node
   */
  static getNodeHistory(nodeId: string): NodeVersion[] {
    const store = useVersionStore.getState();
    return store.getNodeHistory(nodeId);
  }

  /**
   * Get a specific version of a node
   */
  static getNodeAtVersion(nodeId: string, versionNumber: number): NodeVersion | null {
    const store = useVersionStore.getState();
    return store.getNodeAtVersion(nodeId, versionNumber);
  }

  /**
   * Get a node's state at a specific point in time
   */
  static getNodeAtTime(nodeId: string, timestamp: Date): NodeVersion | null {
    const store = useVersionStore.getState();
    return store.getNodeAtTime(nodeId, timestamp);
  }

  /**
   * Restore a node to a previous version
   * Creates a NEW version with the old content (doesn't delete history)
   */
  static restoreNodeVersion(nodeId: string, versionNumber: number) {
    return restoreNodeVersionFn(nodeId, versionNumber);
  }

  /**
   * Compare two versions of a node
   */
  static compareNodeVersions(
    nodeId: string, 
    version1: number, 
    version2: number
  ) {
    const store = useVersionStore.getState();
    return store.compareNodeVersions(nodeId, version1, version2);
  }

  /**
   * Get all snapshots
   */
  static getSnapshots(): GraphSnapshot[] {
    return useVersionStore.getState().snapshots;
  }

  /**
   * Get the timeline of events
   */
  static getTimeline(): TimelineEvent[] {
    return useVersionStore.getState().timeline;
  }

  /**
   * Get the latest snapshot
   */
  static getLatestSnapshot(): GraphSnapshot | null {
    const store = useVersionStore.getState();
    return store.getLatestSnapshot();
  }

  /**
   * Travel to a specific snapshot
   */
  static travelToSnapshot(snapshotId: string): void {
    const store = useVersionStore.getState();
    store.travelToSnapshot(snapshotId);
  }

  /**
   * Travel to a specific point in time
   */
  static travelToTime(timestamp: Date): void {
    const store = useVersionStore.getState();
    store.travelToTime(timestamp);
  }

  /**
   * Return to the present (exit time travel mode)
   */
  static returnToPresent(): void {
    const store = useVersionStore.getState();
    store.returnToPresent();
  }

  /**
   * Check if currently in time travel mode
   */
  static isTimeTraveling(): boolean {
    return useVersionStore.getState().isTimeTraveling;
  }

  /**
   * Get the current snapshot ID (if time traveling)
   */
  static getCurrentSnapshotId(): string | null {
    return useVersionStore.getState().currentSnapshotId;
  }

  /**
   * Navigate to the previous snapshot
   */
  static goToPreviousSnapshot(): boolean {
    const store = useVersionStore.getState();
    const snapshots = store.snapshots;
    const currentId = store.currentSnapshotId;
    
    if (!currentId) {
      // If at present, go to latest snapshot
      if (snapshots.length > 0) {
        store.travelToSnapshot(snapshots[snapshots.length - 1].snapshotId);
        return true;
      }
      return false;
    }
    
    const currentIndex = snapshots.findIndex(s => s.snapshotId === currentId);
    if (currentIndex > 0) {
      store.travelToSnapshot(snapshots[currentIndex - 1].snapshotId);
      return true;
    }
    
    return false;
  }

  /**
   * Navigate to the next snapshot
   */
  static goToNextSnapshot(): boolean {
    const store = useVersionStore.getState();
    const snapshots = store.snapshots;
    const currentId = store.currentSnapshotId;
    
    if (!currentId) return false;
    
    const currentIndex = snapshots.findIndex(s => s.snapshotId === currentId);
    if (currentIndex < snapshots.length - 1) {
      store.travelToSnapshot(snapshots[currentIndex + 1].snapshotId);
      return true;
    } else {
      // At the last snapshot, return to present
      store.returnToPresent();
      return true;
    }
  }

  /**
   * Navigate to the first snapshot
   */
  static goToFirstSnapshot(): boolean {
    const store = useVersionStore.getState();
    const snapshots = store.snapshots;
    
    if (snapshots.length > 0) {
      store.travelToSnapshot(snapshots[0].snapshotId);
      return true;
    }
    
    return false;
  }

  /**
   * Compare two snapshots
   */
  static compareSnapshots(snapshot1Id: string, snapshot2Id: string) {
    const store = useVersionStore.getState();
    return store.compareSnapshots(snapshot1Id, snapshot2Id);
  }

  /**
   * Get the count of changes since a snapshot
   */
  static getChangeCountSinceSnapshot(snapshotId: string): number {
    const store = useVersionStore.getState();
    const snapshot = store.snapshots.find(s => s.snapshotId === snapshotId);
    if (!snapshot) return 0;
    
    // Count timeline events after this snapshot
    const snapshotTime = snapshot.timestamp.getTime();
    return store.timeline.filter(e => e.timestamp.getTime() > snapshotTime).length;
  }

  /**
   * Reset all version history
   */
  static reset(): void {
    useVersionStore.getState().reset();
  }
}

export default VersionService;
