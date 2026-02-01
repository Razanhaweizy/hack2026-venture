/**
 * NodeHistoryPanel Component
 * Shows version history for a selected node
 */

import { useMemo, useState } from 'react';
import { useVersionStore } from '../../version/versionStore';
import { useGraphStore } from '../../store';
import type { NodeVersion } from '../../version/types';

interface NodeHistoryPanelProps {
  nodeId: string;
  onClose: () => void;
  onRestore: (nodeId: string, versionNumber: number) => void;
  onCompare: (nodeId: string, v1: number, v2: number) => void;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days < 7) {
    return `${days} days ago, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Get change type badge color
 */
function getChangeTypeBadge(changeType: NodeVersion['changeType']): { bg: string; text: string; label: string } {
  switch (changeType) {
    case 'created':
      return { bg: '#DCFCE7', text: '#166534', label: 'Created' };
    case 'updated':
      return { bg: '#DBEAFE', text: '#1E40AF', label: 'Updated' };
    case 'confidence_changed':
      return { bg: '#FEF3C7', text: '#92400E', label: 'Confidence' };
    case 'merged_from':
      return { bg: '#F3E8FF', text: '#7C3AED', label: 'Merged' };
    case 'split_from':
      return { bg: '#FCE7F3', text: '#BE185D', label: 'Split' };
    case 'restored':
      return { bg: '#E0E7FF', text: '#4338CA', label: 'Restored' };
    default:
      return { bg: '#F3F4F6', text: '#374151', label: 'Changed' };
  }
}

/**
 * Single version item in the history list
 */
function VersionItem({
  version,
  isLatest,
  isSelected,
  onSelect,
  onRestore,
  onCompare,
}: {
  version: NodeVersion;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onCompare: () => void;
}) {
  const badge = getChangeTypeBadge(version.changeType);
  
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        cursor: 'pointer',
        background: isSelected ? '#F9FAFB' : 'white',
        transition: 'background 0.15s',
      }}
    >
      {/* Version header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isLatest ? '#007354' : '#D1D5DB',
          flexShrink: 0,
        }} />
        
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
          v{version.versionNumber} {isLatest && '(current)'}
        </span>
        
        <span style={{
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: badge.bg,
          color: badge.text,
          fontWeight: 500,
        }}>
          {badge.label}
        </span>
        
        <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: 'auto' }}>
          {formatTimestamp(version.timestamp)}
        </span>
      </div>
      
      {/* Snapshot preview */}
      <div style={{ marginLeft: '16px' }}>
        <div style={{ 
          fontSize: '13px', 
          color: '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '300px',
        }}>
          "{version.snapshot.content.slice(0, 60)}{version.snapshot.content.length > 60 ? '...' : ''}"
        </div>
        
        <div style={{ 
          fontSize: '12px', 
          color: '#6B7280',
          marginTop: '4px',
        }}>
          Evidence: {(() => {
            const n = version.snapshot.confidence / 100;
            if (n >= 0.75) return 'Strong';
            if (n >= 0.55) return 'Some';
            if (n >= 0.35) return 'Weak';
            return 'Assumption';
          })()}
        </div>
        
        {/* Change summary */}
        {version.changeSummary && version.changeType !== 'created' && (
          <div style={{ 
            fontSize: '12px', 
            color: '#9CA3AF',
            marginTop: '4px',
            fontStyle: 'italic',
          }}>
            {version.changeSummary}
          </div>
        )}
        
        {/* Source */}
        {version.changeSource && (
          <div style={{ 
            fontSize: '11px', 
            color: '#9CA3AF',
            marginTop: '4px',
          }}>
            Source: {version.changeSource.slice(0, 50)}
            {version.changeSource.length > 50 ? '...' : ''}
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginTop: '8px', 
        marginLeft: '16px',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onCompare(); }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            background: 'white',
            border: '1px solid #D1CFC0',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151',
          }}
        >
          Compare
        </button>
        
        {!isLatest && (
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: '#007354',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Main NodeHistoryPanel component
 */
export function NodeHistoryPanel({ nodeId, onClose, onRestore, onCompare }: NodeHistoryPanelProps) {
  const history = useVersionStore(state => state.getNodeHistory(nodeId));
  const node = useGraphStore(state => state.getNode(nodeId));
  
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);
  
  // Sort versions newest first for display
  const sortedHistory = useMemo(() => {
    return [...history].reverse();
  }, [history]);
  
  const handleCompare = (versionNumber: number) => {
    if (compareFrom === null) {
      setCompareFrom(versionNumber);
    } else {
      // Trigger comparison
      const v1 = Math.min(compareFrom, versionNumber);
      const v2 = Math.max(compareFrom, versionNumber);
      onCompare(nodeId, v1, v2);
      setCompareFrom(null);
    }
  };
  
  if (!node) {
    return (
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        width: '400px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        padding: '20px',
      }}>
        <p>Node not found</p>
      </div>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      width: '400px',
      maxHeight: 'calc(100vh - 120px)',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>
            History: "{node.title.slice(0, 25)}{node.title.length > 25 ? '...' : ''}"
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
            {history.length} version{history.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#6B7280',
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>
      
      {/* Compare mode indicator */}
      {compareFrom !== null && (
        <div style={{
          padding: '8px 16px',
          background: '#FEF3C7',
          borderBottom: '1px solid #FCD34D',
          fontSize: '13px',
          color: '#92400E',
        }}>
          Comparing from v{compareFrom}. Click another version to compare.
          <button
            onClick={() => setCompareFrom(null)}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: '#B45309',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Version list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        {sortedHistory.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
            No history recorded yet
          </div>
        ) : (
          sortedHistory.map((version, index) => (
            <VersionItem
              key={version.versionId}
              version={version}
              isLatest={index === 0}
              isSelected={selectedVersion === version.versionNumber}
              onSelect={() => setSelectedVersion(version.versionNumber)}
              onRestore={() => onRestore(nodeId, version.versionNumber)}
              onCompare={() => handleCompare(version.versionNumber)}
            />
          ))
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #E5E7EB',
        background: '#F9FAFB',
        fontSize: '11px',
        color: '#6B7280',
      }}>
        Click "Compare" on two versions to see differences
      </div>
    </div>
  );
}

export default NodeHistoryPanel;
