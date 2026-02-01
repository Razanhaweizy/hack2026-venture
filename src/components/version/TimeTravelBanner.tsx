/**
 * TimeTravelBanner Component
 * Shows a banner when viewing past graph state
 */

import { useMemo } from 'react';
import { useVersionStore, useSnapshots } from '../../version/versionStore';

interface TimeTravelBannerProps {
  onPrevious: () => void;
  onNext: () => void;
  onReturnToPresent: () => void;
}

/**
 * Format a date for banner display
 */
function formatBannerDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate time difference string
 */
function getTimeDiff(pastDate: Date): string {
  const now = new Date();
  const diff = now.getTime() - pastDate.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Main TimeTravelBanner component
 */
export function TimeTravelBanner({
  onPrevious,
  onNext,
  onReturnToPresent,
}: TimeTravelBannerProps) {
  const { isTimeTraveling, currentSnapshotId } = useVersionStore();
  const snapshots = useSnapshots();
  
  // Get current snapshot info
  const currentSnapshot = useMemo(() => {
    if (!currentSnapshotId) return null;
    return snapshots.find(s => s.snapshotId === currentSnapshotId) || null;
  }, [currentSnapshotId, snapshots]);
  
  // Get snapshot index for navigation info
  const snapshotInfo = useMemo(() => {
    if (!currentSnapshotId || snapshots.length === 0) {
      return { index: -1, total: snapshots.length, isFirst: true, isLast: true };
    }
    
    const index = snapshots.findIndex(s => s.snapshotId === currentSnapshotId);
    return {
      index,
      total: snapshots.length,
      isFirst: index === 0,
      isLast: index === snapshots.length - 1,
    };
  }, [currentSnapshotId, snapshots]);
  
  // Calculate changes since this snapshot
  const changesSince = useMemo(() => {
    if (!currentSnapshot) return 0;
    
    // Count timeline events after this snapshot
    const versionStore = useVersionStore.getState();
    return versionStore.timeline.filter(
      e => e.timestamp > currentSnapshot.timestamp
    ).length;
  }, [currentSnapshot]);
  
  if (!isTimeTraveling || !currentSnapshot) {
    return null;
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to right, #FEF3C7, #FFFBEB)',
        borderBottom: '2px solid #F59E0B',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Left: Time info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>⏱️</span>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#92400E',
          }}>
            VIEWING PAST: {formatBannerDate(currentSnapshot.timestamp)}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#B45309',
          }}>
            Graph state from {getTimeDiff(currentSnapshot.timestamp)} • {changesSince} changes since then
            {currentSnapshot.description && (
              <span> • "{currentSnapshot.description}"</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Center: Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          onClick={onPrevious}
          disabled={snapshotInfo.isFirst}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            background: snapshotInfo.isFirst ? '#FEF3C7' : 'white',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            cursor: snapshotInfo.isFirst ? 'not-allowed' : 'pointer',
            color: snapshotInfo.isFirst ? '#D97706' : '#92400E',
            fontWeight: 500,
          }}
        >
          ← Previous
        </button>
        
        <span style={{
          fontSize: '12px',
          color: '#92400E',
          minWidth: '60px',
          textAlign: 'center',
        }}>
          {snapshotInfo.index + 1} / {snapshotInfo.total}
        </span>
        
        <button
          onClick={onNext}
          disabled={snapshotInfo.isLast}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            background: snapshotInfo.isLast ? '#FEF3C7' : 'white',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            cursor: snapshotInfo.isLast ? 'not-allowed' : 'pointer',
            color: snapshotInfo.isLast ? '#D97706' : '#92400E',
            fontWeight: 500,
          }}
        >
          Next →
        </button>
      </div>
      
      {/* Right: Return to present */}
      <button
        onClick={onReturnToPresent}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          background: '#007354',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'white',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>Return to Present</span>
        <span>▶|</span>
      </button>
    </div>
  );
}

export default TimeTravelBanner;
