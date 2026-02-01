/**
 * GraphTimeline Component
 * Horizontal timeline visualization for graph history
 */

import { useMemo, useRef, useState } from 'react';
import { useVersionStore, useSnapshots, useTimeline } from '../../version/versionStore';
import type { TimelineEvent } from '../../version/types';

interface GraphTimelineProps {
  onNavigate: (snapshotId: string | null) => void;
}

/**
 * Get marker color based on event type
 */
function getEventColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'node_created':
      return '#22C55E'; // green
    case 'node_updated':
      return '#3B82F6'; // blue
    case 'node_deleted':
      return '#EF4444'; // red
    case 'edge_created':
      return '#8B5CF6'; // purple
    case 'edge_deleted':
      return '#F59E0B'; // amber
    case 'bulk_change':
      return '#EC4899'; // pink
    case 'snapshot_created':
      return '#007354'; // sequoia green
    case 'restored':
      return '#6366F1'; // indigo
    default:
      return '#6B7280'; // gray
  }
}

/**
 * Format a date for display in timeline
 */
function formatTimelineDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format time for tooltip
 */
function formatFullTime(date: Date): string {
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Individual timeline marker
 */
function TimelineMarker({
  event,
  position,
  isActive,
  isHovered,
  onClick,
  onHover,
}: {
  event: TimelineEvent;
  position: number;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const color = getEventColor(event.type);
  const isSnapshot = event.type === 'snapshot_created';
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: isHovered || isActive ? 10 : 1,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Marker dot */}
      <div
        style={{
          width: isSnapshot ? '14px' : '10px',
          height: isSnapshot ? '14px' : '10px',
          borderRadius: '50%',
          background: color,
          border: isActive ? '2px solid #111827' : isHovered ? '2px solid #6B7280' : 'none',
          boxShadow: isActive 
            ? '0 0 0 4px rgba(0,115,84,0.2)' 
            : isHovered 
              ? '0 2px 4px rgba(0,0,0,0.2)' 
              : 'none',
          transition: 'all 0.15s',
        }}
      />
      
      {/* Tooltip */}
      {(isHovered || isActive) && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: '#111827',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
            {formatFullTime(event.timestamp)}
          </div>
          <div style={{ color: '#9CA3AF' }}>
            {event.summary.slice(0, 40)}{event.summary.length > 40 ? '...' : ''}
          </div>
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #111827',
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Main GraphTimeline component
 */
export function GraphTimeline({ onNavigate }: GraphTimelineProps) {
  const snapshots = useSnapshots();
  const timeline = useTimeline();
  const { currentSnapshotId, isTimeTraveling, returnToPresent } = useVersionStore();
  
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Calculate timeline range
  const timeRange = useMemo(() => {
    if (timeline.length === 0) {
      const now = new Date();
      return { start: now, end: now, total: 1 };
    }
    
    const timestamps = timeline.map(e => e.timestamp.getTime());
    const start = new Date(Math.min(...timestamps));
    const end = new Date();
    const total = end.getTime() - start.getTime() || 1;
    
    return { start, end, total };
  }, [timeline]);
  
  // Position events on timeline
  const positionedEvents = useMemo(() => {
    return timeline.map(event => ({
      ...event,
      position: ((event.timestamp.getTime() - timeRange.start.getTime()) / timeRange.total) * 100,
    }));
  }, [timeline, timeRange]);
  
  // Get current position for cursor
  const currentPosition = useMemo(() => {
    if (!isTimeTraveling || !currentSnapshotId) return 100;
    
    const snapshot = snapshots.find(s => s.snapshotId === currentSnapshotId);
    if (!snapshot) return 100;
    
    return ((snapshot.timestamp.getTime() - timeRange.start.getTime()) / timeRange.total) * 100;
  }, [isTimeTraveling, currentSnapshotId, snapshots, timeRange]);
  
  // Navigation helpers
  const goToPrevious = () => {
    if (snapshots.length === 0) return;
    
    if (!isTimeTraveling) {
      // Go to last snapshot
      onNavigate(snapshots[snapshots.length - 1].snapshotId);
    } else {
      // Find previous snapshot
      const currentIndex = snapshots.findIndex(s => s.snapshotId === currentSnapshotId);
      if (currentIndex > 0) {
        onNavigate(snapshots[currentIndex - 1].snapshotId);
      }
    }
  };
  
  const goToNext = () => {
    if (snapshots.length === 0) return;
    
    if (!isTimeTraveling) return;
    
    const currentIndex = snapshots.findIndex(s => s.snapshotId === currentSnapshotId);
    if (currentIndex < snapshots.length - 1) {
      onNavigate(snapshots[currentIndex + 1].snapshotId);
    } else {
      // Return to present
      returnToPresent();
      onNavigate(null);
    }
  };
  
  const goToFirst = () => {
    if (snapshots.length > 0) {
      onNavigate(snapshots[0].snapshotId);
    }
  };
  
  const goToLive = () => {
    returnToPresent();
    onNavigate(null);
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      background: 'white',
      borderTop: '1px solid #E5E7EB',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Timeline track */}
      <div style={{
        flex: 1,
        padding: '0 80px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div
          ref={trackRef}
          style={{
            flex: 1,
            height: '4px',
            background: '#D1CFC0',
            borderRadius: '2px',
            position: 'relative',
          }}
        >
          {/* Events */}
          {positionedEvents.map(event => (
            <TimelineMarker
              key={event.id}
              event={event}
              position={event.position}
              isActive={event.snapshotId === currentSnapshotId}
              isHovered={hoveredEvent === event.id}
              onClick={() => event.snapshotId && onNavigate(event.snapshotId)}
              onHover={(h) => setHoveredEvent(h ? event.id : null)}
            />
          ))}
          
          {/* Current position cursor (for live) */}
          <div
            style={{
              position: 'absolute',
              left: `${currentPosition}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isTimeTraveling ? '4px' : '16px',
              height: isTimeTraveling ? '16px' : '16px',
              borderRadius: isTimeTraveling ? '2px' : '50%',
              background: isTimeTraveling ? '#F59E0B' : '#007354',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 15,
              transition: 'left 0.3s ease',
            }}
          />
          
          {/* Date labels */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              marginTop: '8px',
              fontSize: '10px',
              color: '#6B7280',
            }}
          >
            {formatTimelineDate(timeRange.start)}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              fontSize: '10px',
              color: '#6B7280',
            }}
          >
            Now
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div style={{
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderTop: '1px solid #E5E7EB',
        background: '#F9FAFB',
      }}>
        <button
          onClick={goToFirst}
          disabled={snapshots.length === 0}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'white',
            border: '1px solid #D1CFC0',
            borderRadius: '4px',
            cursor: snapshots.length === 0 ? 'not-allowed' : 'pointer',
            color: snapshots.length === 0 ? '#9CA3AF' : '#374151',
          }}
        >
          |◀ First
        </button>
        
        <button
          onClick={goToPrevious}
          disabled={snapshots.length === 0}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'white',
            border: '1px solid #D1CFC0',
            borderRadius: '4px',
            cursor: snapshots.length === 0 ? 'not-allowed' : 'pointer',
            color: snapshots.length === 0 ? '#9CA3AF' : '#374151',
          }}
        >
          ◀ Prev
        </button>
        
        <div style={{
          minWidth: '180px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#374151',
        }}>
          {isTimeTraveling && currentSnapshotId ? (
            (() => {
              const snapshot = snapshots.find(s => s.snapshotId === currentSnapshotId);
              return snapshot ? formatFullTime(snapshot.timestamp) : 'Unknown';
            })()
          ) : (
            <span style={{ color: '#007354', fontWeight: 500 }}>● Live</span>
          )}
        </div>
        
        <button
          onClick={goToNext}
          disabled={!isTimeTraveling}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'white',
            border: '1px solid #D1CFC0',
            borderRadius: '4px',
            cursor: !isTimeTraveling ? 'not-allowed' : 'pointer',
            color: !isTimeTraveling ? '#9CA3AF' : '#374151',
          }}
        >
          Next ▶
        </button>
        
        <button
          onClick={goToLive}
          disabled={!isTimeTraveling}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: isTimeTraveling ? '#007354' : 'white',
            border: isTimeTraveling ? 'none' : '1px solid #D1CFC0',
            borderRadius: '4px',
            cursor: !isTimeTraveling ? 'not-allowed' : 'pointer',
            color: isTimeTraveling ? 'white' : '#9CA3AF',
          }}
        >
          Live ▶|
        </button>
      </div>
    </div>
  );
}

export default GraphTimeline;
