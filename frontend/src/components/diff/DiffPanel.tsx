/**
 * DiffPanel Component - Sequoia Styled
 * Displays proposed changes and allows accept/reject/edit actions
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { DiffCard } from './DiffCard';
import { useDiffStore, useDiffCounts } from '../../store/diffStore';
import type { ChangeType, ProposedChange } from '../../pipeline/types';

// =============================================================================
// SEQUOIA DESIGN SYSTEM
// =============================================================================

const S = {
  fonts: {
    serif: '"Georgia", "Times New Roman", serif',
    sans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
  },
  colors: {
    bg: '#FBF7F0',
    bgAlt: '#F5F1E8',
    bgCard: '#FFFFFF',
    text: '#1B1916',
    textSecondary: '#4A4640',
    textTertiary: '#8A857A',
    accent: '#007354',
    accentHover: '#005C43',
    accentLight: '#E6F2EE',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
    warning: '#E5A826',
    danger: '#D4442E',
  },
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
    answerQuestion,
    markUnsure,
  } = useDiffStore();
  
  const counts = useDiffCounts();
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
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
  
  const handleApply = useCallback(() => {
    const result = applyAccepted();
    if (result.failed.length > 0) {
      console.error('Some changes failed to apply:', result.failed);
    }
    console.log(`Applied ${result.applied.length} changes`);
  }, [applyAccepted]);
  
  if (!isOpen) return null;
  
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
        background: S.colors.bg,
        borderLeft: `1px solid ${S.colors.borderSubtle}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '-8px 0 32px rgba(27, 25, 22, 0.08)',
        fontFamily: S.fonts.sans,
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
          padding: '20px 24px',
        }}
      >
        {groupedChanges.map(([type, changes]) => (
          <div key={type} style={{ marginBottom: '24px' }}>
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
                onAnswerQuestion={(answer) => answerQuestion(change.id, answer)}
                onMarkUnsure={() => markUnsure(change.id)}
              />
            ))}
          </div>
        ))}
        
        {proposedChanges.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            color: S.colors.textTertiary,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <p style={{ fontSize: '14px', margin: 0 }}>No changes proposed</p>
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
        padding: '24px',
        borderBottom: `1px solid ${S.colors.borderSubtle}`,
        background: S.colors.bgCard,
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontFamily: S.fonts.serif,
            fontSize: '20px', 
            fontWeight: 400,
            letterSpacing: '0.01em',
            color: S.colors.text,
          }}>
            Review Changes
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: S.colors.textTertiary,
          }}>
            {counts.total} proposed
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${S.colors.border}`,
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: S.colors.textSecondary,
            transition: 'all 150ms ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      {/* Input preview */}
      <div
        style={{
          padding: '12px 14px',
          background: S.colors.bg,
          borderRadius: '8px',
          border: `1px solid ${S.colors.borderSubtle}`,
          fontSize: '12px',
          color: S.colors.textSecondary,
          marginBottom: '16px',
          maxHeight: '60px',
          overflow: 'hidden',
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontWeight: 500, color: S.colors.textTertiary }}>Source:</span>{' '}
        "{originalInput.length > 120 ? originalInput.substring(0, 120) + '...' : originalInput}"
      </div>
      
      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onAcceptAll}
          disabled={counts.pending === 0}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            background: counts.pending > 0 ? S.colors.accent : S.colors.borderSubtle,
            color: counts.pending > 0 ? '#FFFFFF' : S.colors.textTertiary,
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: counts.pending > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 150ms ease',
          }}
        >
          Accept All ({counts.pending})
        </button>
        <button
          onClick={onRejectAll}
          disabled={counts.pending === 0}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: `1px solid ${S.colors.border}`,
            background: 'transparent',
            color: counts.pending > 0 ? S.colors.text : S.colors.textTertiary,
            fontSize: '12px',
            fontWeight: 500,
            cursor: counts.pending > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 150ms ease',
          }}
        >
          Reject All
        </button>
        {(counts.accepted > 0 || counts.rejected > 0) && (
          <button
            onClick={onResetAll}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: `1px solid ${S.colors.border}`,
              background: 'transparent',
              color: S.colors.textTertiary,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            Reset
          </button>
        )}
      </div>
      
      {/* Keyboard hints */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginTop: '14px', 
        fontSize: '10px', 
        color: S.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span><kbd style={kbdStyle}>a</kbd> accept</span>
        <span><kbd style={kbdStyle}>r</kbd> reject</span>
        <span><kbd style={kbdStyle}>e</kbd> edit</span>
        <span><kbd style={kbdStyle}>Tab</kbd> next</span>
        <span><kbd style={kbdStyle}>⌘↵</kbd> apply</span>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: '3px 6px',
  background: S.colors.bgAlt,
  borderRadius: '4px',
  fontFamily: S.fonts.sans,
  fontSize: '9px',
  fontWeight: 600,
  border: `1px solid ${S.colors.borderSubtle}`,
  marginRight: '4px',
};

// =============================================================================
// TYPE GROUP HEADER
// =============================================================================

function TypeGroupHeader({ type, count }: { type: ChangeType; count: number }) {
  const typeLabels: Record<ChangeType, { label: string; color: string }> = {
    CONTRADICT: { label: 'Conflicts', color: S.colors.danger },
    UPDATE: { label: 'Updates', color: '#3B82F6' },
    ADD: { label: 'New Nodes', color: S.colors.accent },
    CONNECT: { label: 'New Connections', color: '#8B5CF6' },
    STRENGTHEN: { label: 'Strengthened', color: S.colors.accent },
    WEAKEN: { label: 'Weakened', color: S.colors.warning },
    MERGE: { label: 'Merge Suggestions', color: '#6366F1' },
    SPLIT: { label: 'Split Suggestions', color: '#EC4899' },
    SUGGEST: { label: 'Questions', color: S.colors.warning },
  };
  
  const config = typeLabels[type];
  
  return (
    <div
      style={{
        fontSize: '10px',
        fontWeight: 600,
        color: S.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: config.color,
      }} />
      {config.label}
      <span
        style={{
          background: S.colors.bgAlt,
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 600,
          color: S.colors.textSecondary,
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
        padding: '20px 24px',
        borderTop: `1px solid ${S.colors.borderSubtle}`,
        background: S.colors.bgCard,
      }}
    >
      {/* Summary */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginBottom: '16px',
          fontSize: '12px',
        }}
      >
        <span style={{ color: S.colors.accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <strong>{counts.accepted}</strong> accepted
        </span>
        <span style={{ color: S.colors.danger, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <strong>{counts.rejected}</strong> rejected
        </span>
        <span style={{ color: S.colors.warning, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <strong>{counts.pending}</strong> pending
        </span>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '8px',
            border: `1px solid ${S.colors.border}`,
            background: 'transparent',
            color: S.colors.text,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={counts.accepted === 0}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            background: counts.accepted > 0 ? S.colors.accent : S.colors.borderSubtle,
            color: counts.accepted > 0 ? '#FFFFFF' : S.colors.textTertiary,
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: counts.accepted > 0 ? 'pointer' : 'not-allowed',
            boxShadow: counts.accepted > 0 ? '0 2px 8px rgba(0,115,84,0.2)' : 'none',
            transition: 'all 150ms ease',
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
  
  return typeOrder
    .filter(type => groups.has(type))
    .map(type => [type, groups.get(type)!]);
}

export default DiffPanel;
