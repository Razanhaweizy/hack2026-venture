/**
 * VersionCompareModal Component
 * Shows side-by-side comparison of two node versions
 */

import { useMemo } from 'react';
import { useVersionStore } from '../../version/versionStore';
import type { FieldDiff } from '../../version/types';

interface VersionCompareModalProps {
  nodeId: string;
  version1: number;
  version2: number;
  onClose: () => void;
  onRestore: (nodeId: string, versionNumber: number) => void;
}

/**
 * Format a timestamp nicely
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Render a single field diff
 */
function FieldDiffView({ diff }: { diff: FieldDiff }) {
  const isConfidence = diff.field === 'confidence';
  const oldVal = isConfidence ? `${diff.oldValue}%` : String(diff.oldValue || '');
  const newVal = isConfidence ? `${diff.newValue}%` : String(diff.newValue || '');
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151',
        marginBottom: '8px',
        textTransform: 'capitalize',
      }}>
        {diff.field}:
      </div>
      
      {isConfidence ? (
        // Confidence bar visualization
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#EF4444', width: '40px' }}>
              - {oldVal}
            </span>
            <div style={{
              flex: 1,
              height: '8px',
              background: '#FEE2E2',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${diff.oldValue}%`,
                height: '100%',
                background: '#EF4444',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#22C55E', width: '40px' }}>
              + {newVal}
            </span>
            <div style={{
              flex: 1,
              height: '8px',
              background: '#DCFCE7',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${diff.newValue}%`,
                height: '100%',
                background: '#22C55E',
              }} />
            </div>
          </div>
          {typeof diff.oldValue === 'number' && typeof diff.newValue === 'number' && (
            <div style={{
              fontSize: '12px',
              color: diff.newValue > diff.oldValue ? '#22C55E' : '#EF4444',
              marginTop: '4px',
            }}>
              {diff.newValue > diff.oldValue ? '+' : ''}{diff.newValue - diff.oldValue}%
            </div>
          )}
        </div>
      ) : (
        // Text diff visualization
        <div>
          <div style={{
            padding: '8px 12px',
            background: '#FEE2E2',
            borderRadius: '4px 4px 0 0',
            fontSize: '13px',
            color: '#991B1B',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            <span style={{ color: '#EF4444', fontWeight: 600 }}>- </span>
            {oldVal || '(empty)'}
          </div>
          <div style={{
            padding: '8px 12px',
            background: '#DCFCE7',
            borderRadius: '0 0 4px 4px',
            fontSize: '13px',
            color: '#166534',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            <span style={{ color: '#22C55E', fontWeight: 600 }}>+ </span>
            {newVal || '(empty)'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main VersionCompareModal component
 */
export function VersionCompareModal({
  nodeId,
  version1,
  version2,
  onClose,
  onRestore,
}: VersionCompareModalProps) {
  const compareNodeVersions = useVersionStore(state => state.compareNodeVersions);
  const getNodeAtVersion = useVersionStore(state => state.getNodeAtVersion);
  
  const comparison = useMemo(() => {
    return compareNodeVersions(nodeId, version1, version2);
  }, [nodeId, version1, version2, compareNodeVersions]);
  
  const v1Data = useMemo(() => getNodeAtVersion(nodeId, version1), [nodeId, version1, getNodeAtVersion]);
  const v2Data = useMemo(() => getNodeAtVersion(nodeId, version2), [nodeId, version2, getNodeAtVersion]);
  
  if (!comparison || !v1Data || !v2Data) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <p>Unable to load version comparison</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
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
              Compare: v{version1} → v{version2}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
              {formatDate(comparison.fromTimestamp)} → {formatDate(comparison.toTimestamp)}
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
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}>
          {/* Title check */}
          {v1Data.snapshot.title === v2Data.snapshot.title ? (
            <div style={{
              fontSize: '14px',
              color: '#374151',
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#F3F4F6',
              borderRadius: '6px',
            }}>
              <strong>Title:</strong> "{v1Data.snapshot.title}" (unchanged)
            </div>
          ) : null}
          
          {/* Changes */}
          {comparison.changes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6B7280',
            }}>
              No differences found between these versions
            </div>
          ) : (
            comparison.changes.map((diff, i) => (
              <FieldDiffView key={i} diff={diff} />
            ))
          )}
          
          {/* Intermediate versions */}
          {comparison.intermediateVersions.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#374151' }}>
                Changes between versions:
              </h4>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                fontSize: '12px',
                color: '#6B7280',
              }}>
                {comparison.intermediateVersions.map(v => (
                  <li key={v}>
                    v{v - 1} → v{v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          background: '#F9FAFB',
        }}>
          <button
            onClick={() => onRestore(nodeId, version1)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: 'white',
              border: '1px solid #D1CFC0',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            Restore v{version1}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: '#007354',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VersionCompareModal;
