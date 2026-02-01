/**
 * DiffCard Component - Sequoia Styled
 * Displays a single proposed change with accept/reject/edit actions
 */

import React, { useState } from 'react';
import type { ProposedChange, ChangeType, ChangePriority } from '../../pipeline/types';
import type { ChangeStatus } from '../../store/diffStore';

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
    warningLight: '#FEF7E6',
    danger: '#D4442E',
    dangerLight: '#FEF2F0',
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface DiffCardProps {
  change: ProposedChange;
  status: ChangeStatus;
  isFocused: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (edited: ProposedChange) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onReset: () => void;
  onAnswerQuestion?: (answer: string) => void;
  onMarkUnsure?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DiffCard({
  change,
  status,
  isFocused,
  onAccept,
  onReject,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onReset,
  onAnswerQuestion,
  onMarkUnsure,
}: DiffCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState('');
  
  const cardStyle: React.CSSProperties = {
    background: status === 'accepted' ? S.colors.accentLight
      : status === 'rejected' ? S.colors.dangerLight
      : S.colors.bgCard,
    border: `1px solid ${isFocused ? S.colors.accent : S.colors.borderSubtle}`,
    borderRadius: '10px',
    marginBottom: '12px',
    overflow: 'hidden',
    boxShadow: isFocused 
      ? `0 0 0 3px ${S.colors.accent}20, 0 2px 8px rgba(0,0,0,0.04)` 
      : '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'all 200ms ease',
    fontFamily: S.fonts.sans,
  };
  
  return (
    <div style={cardStyle}>
      <CardHeader 
        change={change} 
        status={status}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      <CardBody 
        change={change} 
        isExpanded={isExpanded}
        status={status}
        questionAnswer={questionAnswer}
        onAnswerChange={setQuestionAnswer}
      />
      
      {status === 'editing' ? (
        <EditMode 
          change={change}
          onSave={onEdit}
          onCancel={onCancelEdit}
        />
      ) : (
        <CardActions
          status={status}
          changeType={change.type}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onStartEdit}
          onReset={onReset}
          hasAnswer={questionAnswer.trim().length > 0}
          onSubmitAnswer={() => onAnswerQuestion?.(questionAnswer)}
          onMarkUnsure={onMarkUnsure}
        />
      )}
    </div>
  );
}

// =============================================================================
// CARD HEADER
// =============================================================================

interface CardHeaderProps {
  change: ProposedChange;
  status: ChangeStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function CardHeader({ change, status, isExpanded, onToggleExpand }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${S.colors.borderSubtle}`,
        cursor: 'pointer',
        background: status === 'accepted' ? `${S.colors.accent}08`
          : status === 'rejected' ? `${S.colors.danger}08`
          : 'transparent',
      }}
      onClick={onToggleExpand}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TypeBadge type={change.type} />
        <PriorityDot priority={change.priority} />
        <StatusIndicator status={status} />
      </div>
      
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={S.colors.textTertiary} 
        strokeWidth="2"
        style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 200ms ease',
        }}
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

function TypeBadge({ type }: { type: ChangeType }) {
  const typeConfig: Record<ChangeType, { label: string; color: string; bgColor: string }> = {
    UPDATE: { label: 'Update', color: '#3B82F6', bgColor: '#EFF6FF' },
    ADD: { label: 'Add', color: S.colors.accent, bgColor: S.colors.accentLight },
    CONNECT: { label: 'Connect', color: '#8B5CF6', bgColor: '#F5F3FF' },
    STRENGTHEN: { label: 'Strengthen', color: S.colors.accent, bgColor: S.colors.accentLight },
    WEAKEN: { label: 'Weaken', color: S.colors.warning, bgColor: S.colors.warningLight },
    CONTRADICT: { label: 'Conflict', color: S.colors.danger, bgColor: S.colors.dangerLight },
    MERGE: { label: 'Merge', color: '#6366F1', bgColor: '#EEF2FF' },
    SPLIT: { label: 'Split', color: '#EC4899', bgColor: '#FDF2F8' },
    SUGGEST: { label: 'Question', color: S.colors.warning, bgColor: S.colors.warningLight },
  };
  
  const config = typeConfig[type];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 10px',
        background: config.bgColor,
        color: config.color,
        borderRadius: '5px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: config.color,
      }} />
      {config.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: ChangePriority }) {
  const colors = {
    high: S.colors.danger,
    medium: S.colors.warning,
    low: S.colors.textTertiary,
  };
  
  return (
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: colors[priority],
        display: 'inline-block',
      }}
      title={`${priority} priority`}
    />
  );
}

function StatusIndicator({ status }: { status: ChangeStatus }) {
  if (status === 'pending' || status === 'editing') return null;
  
  const isAccepted = status === 'accepted';
  
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 600,
        color: isAccepted ? S.colors.accent : S.colors.danger,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {isAccepted ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {isAccepted ? 'Accepted' : 'Rejected'}
    </span>
  );
}

// =============================================================================
// CARD BODY
// =============================================================================

interface CardBodyProps {
  change: ProposedChange;
  isExpanded: boolean;
  status: ChangeStatus;
  questionAnswer: string;
  onAnswerChange: (answer: string) => void;
}

function CardBody({ change, isExpanded, status, questionAnswer, onAnswerChange }: CardBodyProps) {
  return (
    <div style={{ padding: '16px 18px' }}>
      <ChangeVisualization 
        change={change}
        status={status}
        questionAnswer={questionAnswer}
        onAnswerChange={onAnswerChange}
      />
      
      {isExpanded && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: `1px dashed ${S.colors.borderSubtle}`,
          }}
        >
          <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginBottom: '8px', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source:</span>{' '}
            "{change.sourceText}"
          </div>
          
          {change.rationale && (
            <div style={{ fontSize: '11px', color: S.colors.textTertiary, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rationale:</span>{' '}
              {change.rationale}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChangeVisualizationProps {
  change: ProposedChange;
  status?: ChangeStatus;
  questionAnswer?: string;
  onAnswerChange?: (answer: string) => void;
}

function ChangeVisualization({ change, status, questionAnswer, onAnswerChange }: ChangeVisualizationProps) {
  switch (change.type) {
    case 'ADD':
      return <AddVisualization change={change} />;
    case 'UPDATE':
      return <UpdateVisualization change={change} />;
    case 'CONNECT':
      return <ConnectVisualization change={change} />;
    case 'STRENGTHEN':
    case 'WEAKEN':
      return <ConfidenceVisualization change={change} />;
    case 'CONTRADICT':
      return <ContradictVisualization change={change} />;
    case 'SUGGEST':
      return (
        <SuggestVisualization 
          change={change} 
          answer={questionAnswer || ''} 
          onAnswerChange={onAnswerChange || (() => {})}
          status={status || 'pending'}
        />
      );
    case 'MERGE':
      return <MergeVisualization change={change} />;
    case 'SPLIT':
      return <SplitVisualization change={change} />;
    default:
      return <div style={{ fontSize: '13px', color: S.colors.textSecondary }}>{change.explanation}</div>;
  }
}

// ADD Visualization
function AddVisualization({ change }: { change: ProposedChange }) {
  if (!change.newNode) return null;
  
  return (
    <div>
      <div
        style={{
          background: S.colors.accentLight,
          padding: '14px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${S.colors.accent}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ 
            color: S.colors.accent, 
            fontWeight: 600, 
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            + New {change.newNode.type}
          </span>
        </div>
        
        <div style={{ 
          fontFamily: S.fonts.serif,
          fontWeight: 400,
          fontSize: '15px',
          marginBottom: '6px',
          color: S.colors.text,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto',
        }}>
          {change.newNode.title}
        </div>
        
        <div style={{ 
          fontSize: '12px', 
          color: S.colors.textSecondary, 
          marginBottom: '10px', 
          lineHeight: 1.5,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}>
          {change.newNode.content}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: S.colors.textTertiary }}>
          <span>Type: <strong style={{ color: S.colors.textSecondary }}>{change.newNode.type}</strong></span>
          <span>Evidence: {(() => {
            const band = getConfidenceBandLabel(change.newNode.confidence);
            return <strong style={{ color: band.color }}>{band.label}</strong>;
          })()}</span>
        </div>
        
        {change.connectTo && change.connectTo.length > 0 && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${S.colors.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Connects to
            </div>
            {change.connectTo.map((conn, i) => (
              <div
                key={i}
                style={{
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  color: S.colors.textSecondary,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{conn.nodeId}</span>
                <span style={{ color: S.colors.textTertiary }}>({conn.edgeType})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '12px', lineHeight: 1.5 }}>
        {change.explanation}
      </div>
    </div>
  );
}

// UPDATE Visualization
function UpdateVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginBottom: '10px' }}>
        Node: <strong style={{ color: S.colors.textSecondary }}>{change.targetNodeId}</strong>
      </div>
      
      {change.oldContent && (
        <div
          style={{
            background: S.colors.dangerLight,
            padding: '12px 14px',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '12px',
            textDecoration: 'line-through',
            color: S.colors.danger,
            borderLeft: `3px solid ${S.colors.danger}`,
          }}
        >
          {change.oldContent}
        </div>
      )}
      
      {change.newContent && (
        <div
          style={{
            background: S.colors.accentLight,
            padding: '12px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            color: S.colors.accent,
            borderLeft: `3px solid ${S.colors.accent}`,
          }}
        >
          {change.newContent}
        </div>
      )}
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '12px', lineHeight: 1.5 }}>
        {change.explanation}
      </div>
    </div>
  );
}

// CONNECT Visualization
function ConnectVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 600, color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        New Connection
      </div>
      
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '16px',
          background: S.colors.bg,
          borderRadius: '8px',
          border: `1px solid ${S.colors.borderSubtle}`,
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            background: S.colors.bgCard,
            border: `1px solid ${S.colors.border}`,
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: S.colors.textSecondary,
          }}
        >
          {change.sourceNodeId?.split(':').pop()}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{change.edgeType}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        
        <div
          style={{
            padding: '10px 14px',
            background: S.colors.bgCard,
            border: `1px solid ${S.colors.border}`,
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: S.colors.textSecondary,
          }}
        >
          {change.targetNodeId?.split(':').pop()}
        </div>
      </div>
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '12px', lineHeight: 1.5 }}>
        {change.explanation}
      </div>
    </div>
  );
}

// Confidence band helper
function getConfidenceBandLabel(score: number): { label: string; color: string } {
  const normalized = score / 100;
  if (normalized >= 0.75) return { label: 'Strong evidence', color: '#007354' };
  if (normalized >= 0.55) return { label: 'Some evidence', color: '#E5A826' };
  if (normalized >= 0.35) return { label: 'Weak evidence', color: '#FB923C' };
  return { label: 'Assumption', color: '#D4442E' };
}

// STRENGTHEN/WEAKEN Visualization
function ConfidenceVisualization({ change }: { change: ProposedChange }) {
  const isStrengthen = change.type === 'STRENGTHEN';
  const delta = change.confidenceDelta || 0;
  const oldConfidence = 50;
  const newConfidence = Math.max(0, Math.min(100, oldConfidence + delta));
  
  const oldBand = getConfidenceBandLabel(oldConfidence);
  const newBand = getConfidenceBandLabel(newConfidence);
  
  return (
    <div>
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginBottom: '12px' }}>
        Node: <strong style={{ color: S.colors.textSecondary }}>{change.nodeId}</strong>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: S.colors.text }}>
            Evidence:{' '}
            <span style={{ 
              color: oldBand.color,
              padding: '2px 8px',
              background: `${oldBand.color}15`,
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {oldBand.label}
            </span>
            {' '}→{' '}
            <strong style={{ 
              color: newBand.color,
              padding: '2px 8px',
              background: `${newBand.color}20`,
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {newBand.label}
            </strong>
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '11px',
          color: isStrengthen ? S.colors.accent : S.colors.warning,
        }}>
          {isStrengthen ? '↑ Evidence strengthened' : '↓ Evidence weakened'}
        </div>
      </div>
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, lineHeight: 1.5 }}>
        {change.reason || change.explanation}
      </div>
    </div>
  );
}

// CONTRADICT Visualization
function ContradictVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div
        style={{
          background: S.colors.dangerLight,
          padding: '14px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${S.colors.danger}`,
        }}
      >
        <div style={{ fontWeight: 600, color: S.colors.danger, marginBottom: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Conflict Detected
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: S.colors.textSecondary }}>
            <span style={{ color: S.colors.textTertiary }}>Existing:</span>{' '}
            <strong>{change.nodeAId}</strong>
          </div>
          <div style={{ fontSize: '12px', color: S.colors.textSecondary }}>
            <span style={{ color: S.colors.textTertiary }}>New:</span>{' '}
            <strong>{change.nodeBId}</strong>
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '12px', lineHeight: 1.5 }}>
        {change.explanation}
      </div>
    </div>
  );
}

// SUGGEST Visualization
interface SuggestVisualizationProps {
  change: ProposedChange;
  answer: string;
  onAnswerChange: (answer: string) => void;
  status: ChangeStatus;
}

function SuggestVisualization({ change, answer, onAnswerChange, status }: SuggestVisualizationProps) {
  const isResolved = status === 'accepted' || status === 'rejected';
  
  return (
    <div>
      <div
        style={{
          background: S.colors.warningLight,
          padding: '16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${S.colors.warning}`,
        }}
      >
        <div style={{ 
          fontFamily: S.fonts.serif,
          fontSize: '14px', 
          fontWeight: 400, 
          color: S.colors.text,
          lineHeight: 1.5,
        }}>
          {change.suggestion}
        </div>
        
        {change.rationale && (
          <div style={{ 
            fontSize: '11px', 
            color: S.colors.textTertiary, 
            marginTop: '10px',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}>
            {change.rationale.replace(/^\[.*?\]\s*/, '')}
          </div>
        )}
      </div>
      
      {!isResolved && (
        <div style={{ marginTop: '12px' }}>
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer..."
            style={{
              width: '100%',
              minHeight: '70px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: `1px solid ${S.colors.border}`,
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
              fontFamily: S.fonts.sans,
              boxSizing: 'border-box',
              background: S.colors.bgCard,
              color: S.colors.text,
              outline: 'none',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = S.colors.accent;
              e.target.style.boxShadow = `0 0 0 3px ${S.colors.accent}15`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = S.colors.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}

// MERGE Visualization
function MergeVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginBottom: '10px' }}>
        These nodes appear to be the same:
      </div>
      
      {change.nodeIds?.map((id, i) => (
        <div
          key={id}
          style={{
            padding: '10px 12px',
            background: S.colors.bg,
            borderRadius: '6px',
            marginBottom: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: S.colors.textSecondary,
            border: `1px solid ${S.colors.borderSubtle}`,
          }}
        >
          Node {i + 1}: {id}
        </div>
      ))}
      
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Merge into
        </div>
        <div
          style={{
            background: S.colors.accentLight,
            padding: '12px 14px',
            borderRadius: '6px',
            borderLeft: `3px solid ${S.colors.accent}`,
          }}
        >
          <strong style={{ fontSize: '13px', color: S.colors.text }}>{change.mergedTitle}</strong>
          <div style={{ fontSize: '12px', marginTop: '6px', color: S.colors.textSecondary, lineHeight: 1.5 }}>
            {change.mergedContent}
          </div>
        </div>
      </div>
    </div>
  );
}

// SPLIT Visualization
function SplitVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginBottom: '10px' }}>
        Split <strong style={{ color: S.colors.textSecondary }}>{change.originalNodeId}</strong> into:
      </div>
      
      {change.splitInto?.map((spec, i) => (
        <div
          key={i}
          style={{
            background: S.colors.accentLight,
            padding: '12px 14px',
            borderRadius: '6px',
            marginBottom: '8px',
            borderLeft: `3px solid ${S.colors.accent}`,
          }}
        >
          <strong style={{ fontSize: '13px', color: S.colors.text }}>{spec.title}</strong>
          <div style={{ fontSize: '12px', marginTop: '6px', color: S.colors.textSecondary, lineHeight: 1.5 }}>
            {spec.content}
          </div>
        </div>
      ))}
      
      <div style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '12px', lineHeight: 1.5 }}>
        {change.explanation}
      </div>
    </div>
  );
}

// =============================================================================
// CARD ACTIONS
// =============================================================================

interface CardActionsProps {
  status: ChangeStatus;
  changeType: ChangeType;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
  onReset: () => void;
  hasAnswer?: boolean;
  onSubmitAnswer?: () => void;
  onMarkUnsure?: () => void;
}

function CardActions({ 
  status, 
  changeType, 
  onAccept, 
  onReject, 
  onEdit, 
  onReset,
  hasAnswer,
  onSubmitAnswer,
  onMarkUnsure,
}: CardActionsProps) {
  const isResolved = status === 'accepted' || status === 'rejected';
  const isSuggest = changeType === 'SUGGEST';
  
  const baseButton: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    letterSpacing: '0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        padding: '14px 18px',
        borderTop: `1px solid ${S.colors.borderSubtle}`,
        background: S.colors.bg,
      }}
    >
      {isResolved ? (
        <button 
          style={{ ...baseButton, border: `1px solid ${S.colors.border}`, background: 'transparent', color: S.colors.textSecondary }} 
          onClick={onReset}
        >
          Reset
        </button>
      ) : isSuggest ? (
        <>
          <button 
            style={{ ...baseButton, border: `1px solid ${S.colors.border}`, background: 'transparent', color: S.colors.textSecondary }} 
            onClick={onReject}
          >
            Dismiss
          </button>
          <button 
            style={{ ...baseButton, border: 'none', background: S.colors.warning, color: '#FFFFFF' }} 
            onClick={onMarkUnsure}
            title="Mark as blocker"
          >
            Not Sure
          </button>
          <button 
            style={{ 
              ...baseButton, 
              border: 'none', 
              background: hasAnswer ? S.colors.accent : S.colors.borderSubtle, 
              color: hasAnswer ? '#FFFFFF' : S.colors.textTertiary,
              cursor: hasAnswer ? 'pointer' : 'not-allowed',
            }} 
            onClick={onSubmitAnswer}
            disabled={!hasAnswer}
          >
            Submit
          </button>
        </>
      ) : (
        <>
          <button 
            style={{ ...baseButton, border: `1px solid ${S.colors.border}`, background: 'transparent', color: S.colors.textSecondary }} 
            onClick={onEdit}
          >
            Edit
          </button>
          <button 
            style={{ ...baseButton, border: `1px solid ${S.colors.border}`, background: 'transparent', color: S.colors.textSecondary }} 
            onClick={onReject}
          >
            Reject
          </button>
          <button 
            style={{ ...baseButton, border: 'none', background: S.colors.accent, color: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,115,84,0.2)' }} 
            onClick={onAccept}
          >
            Accept
          </button>
        </>
      )}
    </div>
  );
}

// =============================================================================
// EDIT MODE
// =============================================================================

interface EditModeProps {
  change: ProposedChange;
  onSave: (edited: ProposedChange) => void;
  onCancel: () => void;
}

function EditMode({ change, onSave, onCancel }: EditModeProps) {
  const [editedChange, setEditedChange] = useState<ProposedChange>({ ...change });
  
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${S.colors.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '12px',
    fontFamily: S.fonts.sans,
    color: S.colors.text,
    background: S.colors.bgCard,
    boxSizing: 'border-box',
    outline: 'none',
  };
  
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 600,
    color: S.colors.textTertiary,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };
  
  return (
    <div style={{ padding: '18px', borderTop: `1px solid ${S.colors.borderSubtle}`, background: S.colors.bg }}>
      {change.type === 'ADD' && change.newNode && (
        <>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            style={inputStyle}
            value={editedChange.newNode?.title || ''}
            onChange={(e) => setEditedChange({
              ...editedChange,
              newNode: { ...editedChange.newNode!, title: e.target.value }
            })}
          />
          
          <label style={labelStyle}>Content</label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={editedChange.newNode?.content || ''}
            onChange={(e) => setEditedChange({
              ...editedChange,
              newNode: { ...editedChange.newNode!, content: e.target.value }
            })}
          />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Type</label>
              <select
                style={inputStyle}
                value={editedChange.newNode?.type || 'evidence'}
                onChange={(e) => setEditedChange({
                  ...editedChange,
                  newNode: { 
                    ...editedChange.newNode!, 
                    type: e.target.value as 'claim' | 'fact' | 'evidence' 
                  }
                })}
              >
                <option value="claim">Claim</option>
                <option value="fact">Fact</option>
                <option value="evidence">Evidence</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Evidence: {(() => {
                const band = getConfidenceBandLabel(editedChange.newNode?.confidence || 50);
                return <span style={{ color: band.color }}>{band.label}</span>;
              })()}</label>
              <input
                type="range"
                min="0"
                max="100"
                style={{ width: '100%', marginTop: '8px' }}
                value={editedChange.newNode?.confidence || 50}
                onChange={(e) => setEditedChange({
                  ...editedChange,
                  newNode: { ...editedChange.newNode!, confidence: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>
        </>
      )}
      
      {change.type === 'UPDATE' && (
        <>
          <label style={labelStyle}>New Content</label>
          <textarea
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            value={editedChange.newContent || ''}
            onChange={(e) => setEditedChange({ ...editedChange, newContent: e.target.value })}
          />
        </>
      )}
      
      {change.type === 'SUGGEST' && (
        <>
          <label style={labelStyle}>Suggestion</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={editedChange.suggestion || ''}
            onChange={(e) => setEditedChange({ ...editedChange, suggestion: e.target.value })}
          />
        </>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
        <button
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: `1px solid ${S.colors.border}`,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            color: S.colors.textSecondary,
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            background: S.colors.accent,
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,115,84,0.2)',
          }}
          onClick={() => onSave(editedChange)}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default DiffCard;
