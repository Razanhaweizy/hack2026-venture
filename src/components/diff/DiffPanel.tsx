/**
 * DiffPanel Component - Main container for the diff UI
 * Displays proposed changes and allows accept/reject/edit actions
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { DiffCard } from './DiffCard';
import { useDiffStore, useDiffCounts } from '../../store/diffStore';
import type { ChangeType, ProposedChange } from '../../pipeline/types';

// =============================================================================
// COLORS
// =============================================================================

const COLORS = {
  background: '#FBF7F0',
  surface: '#FFFFFF',
  border: '#D1CFC0',
  text: '#1B1916',
  textMuted: '#6B6B6B',
  accepted: '#007354',
  rejected: '#DC2626',
  pending: '#F59E0B',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DiffPanel() {
  const {
    isOpen,
    originalInput,
    proposedChanges,
    changeStatuses,
    editedChanges,
    focusedChangeId,
    acceptChange,
    rejectChange,
    resetChange,
    editChange,
    startEditing,
    cancelEditing,
    acceptAll,
    rejectAll,
    resetAll,
    applyAccepted,
    closeDiff,
    focusNext,
    focusPrevious,
  } = useDiffStore();
  
  const counts = useDiffCounts();
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'a':
          if (focusedChangeId) acceptChange(focusedChangeId);
          break;
        case 'r':
          if (focusedChangeId) rejectChange(focusedChangeId);
          break;
        case 'e':
          if (focusedChangeId) startEditing(focusedChangeId);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            focusPrevious();
          } else {
            focusNext();
          }
          break;
        case 'Enter':
          if (e.metaKey || e.ctrlKey) {
            applyAccepted();
          }
          break;
        case 'Escape':
          closeDiff();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedChangeId, acceptChange, rejectChange, startEditing, focusNext, focusPrevious, applyAccepted, closeDiff]);
  
  // Handle apply
  const handleApply = useCallback(() => {
    const result = applyAccepted();
    if (result.failed.length > 0) {
      console.error('Some changes failed to apply:', result.failed);
    }
    console.log(`Applied ${result.applied.length} changes`);
  }, [applyAccepted]);
  
  if (!isOpen) return null;
  
  // Group changes by type for better organization
  const groupedChanges = groupChangesByType(proposedChanges);
  
  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '480px',
        height: '100vh',
        background: COLORS.background,
        borderLeft: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <DiffHeader
        originalInput={originalInput}
        counts={counts}
        onAcceptAll={acceptAll}
        onRejectAll={rejectAll}
        onResetAll={resetAll}
        onClose={closeDiff}
      />
      
      {/* Change List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {groupedChanges.map(([type, changes]) => (
          <div key={type} style={{ marginBottom: '20px' }}>
            <TypeGroupHeader type={type} count={changes.length} />
            
            {changes.map(change => (
              <DiffCard
                key={change.id}
                change={editedChanges[change.id] || change}
                status={changeStatuses[change.id]}
                isFocused={change.id === focusedChangeId}
                onAccept={() => acceptChange(change.id)}
                onReject={() => rejectChange(change.id)}
                onEdit={(edited) => editChange(change.id, edited)}
                onStartEdit={() => startEditing(change.id)}
                onCancelEdit={() => cancelEditing(change.id)}
                onReset={() => resetChange(change.id)}
              />
            ))}
          </div>
        ))}
        
        {proposedChanges.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
            No changes proposed
          </div>
        )}
      </div>
      
      {/* Footer */}
      <DiffFooter
        counts={counts}
        onApply={handleApply}
        onClose={closeDiff}
      />
    </div>
  );
}

// =============================================================================
// HEADER
// =============================================================================

interface DiffHeaderProps {
  originalInput: string;
  counts: { pending: number; accepted: number; rejected: number; total: number };
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onResetAll: () => void;
  onClose: () => void;
}

function DiffHeader({ originalInput, counts, onAcceptAll, onRejectAll, onResetAll, onClose }: DiffHeaderProps) {
  return (
    <div
      style={{
        padding: '16px',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: COLORS.text }}>
          Review Changes
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: COLORS.textMuted,
            padding: '4px',
          }}
        >
          ×
        </button>
      </div>
      
      {/* Input preview */}
      <div
        style={{
          padding: '10px 12px',
          background: '#F9FAFB',
          borderRadius: '6px',
          fontSize: '13px',
          color: COLORS.textMuted,
          marginBottom: '12px',
          maxHeight: '60px',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontWeight: 500 }}>Input:</span> "{originalInput.length > 150 ? originalInput.substring(0, 150) + '...' : originalInput}"
      </div>
      
      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onAcceptAll}
          disabled={counts.pending === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: counts.pending > 0 ? COLORS.accepted : '#E5E7EB',
            color: counts.pending > 0 ? '#FFFFFF' : '#9CA3AF',
            fontSize: '13px',
            fontWeight: 500,
            cursor: counts.pending > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Accept All ({counts.pending})
        </button>
        <button
          onClick={onRejectAll}
          disabled={counts.pending === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            color: counts.pending > 0 ? COLORS.text : '#9CA3AF',
            fontSize: '13px',
            fontWeight: 500,
            cursor: counts.pending > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Reject All
        </button>
        {(counts.accepted > 0 || counts.rejected > 0) && (
          <button
            onClick={onResetAll}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${COLORS.border}`,
              background: 'transparent',
              color: COLORS.textMuted,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>
      
      {/* Keyboard hints */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '10px', 
        fontSize: '11px', 
        color: COLORS.textMuted 
      }}>
        <span><kbd style={kbdStyle}>a</kbd> accept</span>
        <span><kbd style={kbdStyle}>r</kbd> reject</span>
        <span><kbd style={kbdStyle}>e</kbd> edit</span>
        <span><kbd style={kbdStyle}>Tab</kbd> navigate</span>
        <span><kbd style={kbdStyle}>⌘↵</kbd> apply</span>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: '2px 5px',
  background: '#E5E7EB',
  borderRadius: '3px',
  fontFamily: 'monospace',
  fontSize: '10px',
};

// =============================================================================
// TYPE GROUP HEADER
// =============================================================================

function TypeGroupHeader({ type, count }: { type: ChangeType; count: number }) {
  const typeLabels: Record<ChangeType, string> = {
    CONTRADICT: 'Conflicts',
    UPDATE: 'Updates',
    ADD: 'New Nodes',
    CONNECT: 'New Connections',
    STRENGTHEN: 'Strengthened',
    WEAKEN: 'Weakened',
    MERGE: 'Merge Suggestions',
    SPLIT: 'Split Suggestions',
    SUGGEST: 'Suggestions',
  };
  
  return (
    <div
      style={{
        fontSize: '12px',
        fontWeight: 600,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {typeLabels[type]} 
      <span
        style={{
          background: '#E5E7EB',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '11px',
        }}
      >
        {count}
      </span>
    </div>
  );
}

// =============================================================================
// FOOTER
// =============================================================================

interface DiffFooterProps {
  counts: { pending: number; accepted: number; rejected: number; total: number };
  onApply: () => void;
  onClose: () => void;
}

function DiffFooter({ counts, onApply, onClose }: DiffFooterProps) {
  return (
    <div
      style={{
        padding: '16px',
        borderTop: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
      }}
    >
      {/* Summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '12px',
          fontSize: '13px',
        }}
      >
        <span style={{ color: COLORS.accepted }}>
          <strong>{counts.accepted}</strong> accepted
        </span>
        <span style={{ color: COLORS.rejected }}>
          <strong>{counts.rejected}</strong> rejected
        </span>
        <span style={{ color: COLORS.pending }}>
          <strong>{counts.pending}</strong> pending
        </span>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            color: COLORS.text,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={counts.accepted === 0}
          style={{
            flex: 2,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: counts.accepted > 0 ? COLORS.accepted : '#E5E7EB',
            color: counts.accepted > 0 ? '#FFFFFF' : '#9CA3AF',
            fontSize: '14px',
            fontWeight: 600,
            cursor: counts.accepted > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          Apply {counts.accepted} Change{counts.accepted !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function groupChangesByType(changes: ProposedChange[]): [ChangeType, ProposedChange[]][] {
  // Priority order for displaying types
  const typeOrder: ChangeType[] = [
    'CONTRADICT',
    'UPDATE', 
    'ADD',
    'CONNECT',
    'STRENGTHEN',
    'WEAKEN',
    'MERGE',
    'SPLIT',
    'SUGGEST',
  ];
  
  const groups = new Map<ChangeType, typeof changes>();
  
  for (const change of changes) {
    const existing = groups.get(change.type) || [];
    groups.set(change.type, [...existing, change]);
  }
  
  // Return in priority order, filtering out empty groups
  return typeOrder
    .filter(type => groups.has(type))
    .map(type => [type, groups.get(type)!]);
}

export default DiffPanel;
