/**
 * DiffCard Component - Displays a single proposed change
 * Shows different visualizations based on change type
 */

import React, { useState } from 'react';
import type { ProposedChange, ChangeType, ChangePriority } from '../../pipeline/types';
import type { ChangeStatus } from '../../store/diffStore';

// =============================================================================
// COLORS
// =============================================================================

const COLORS = {
  // Base
  background: '#FFFFFF',
  backgroundHover: '#FAFAF8',
  border: '#D1CFC0',
  text: '#1B1916',
  textMuted: '#6B6B6B',
  
  // Status
  accepted: '#007354',
  acceptedBg: 'rgba(0, 115, 84, 0.08)',
  rejected: '#DC2626',
  rejectedBg: 'rgba(220, 38, 38, 0.08)',
  pending: '#D1CFC0',
  
  // Priority
  priorityHigh: '#DC2626',
  priorityMedium: '#F59E0B',
  priorityLow: '#9CA3AF',
  
  // Diff
  addBg: 'rgba(74, 222, 128, 0.15)',
  addText: '#15803D',
  removeBg: 'rgba(248, 113, 113, 0.15)',
  removeText: '#B91C1C',
  
  // Buttons
  acceptBtn: '#007354',
  rejectBtn: '#6B6B6B',
  editBtn: '#6B6B6B',
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
}: DiffCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const cardStyle: React.CSSProperties = {
    background: status === 'accepted' ? COLORS.acceptedBg
      : status === 'rejected' ? COLORS.rejectedBg
      : COLORS.background,
    border: `1px solid ${isFocused ? COLORS.accepted : COLORS.border}`,
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
    boxShadow: isFocused ? `0 0 0 2px ${COLORS.accepted}40` : 'none',
    transition: 'all 0.2s ease',
  };
  
  return (
    <div style={cardStyle}>
      <CardHeader 
        change={change} 
        status={status}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      <CardBody change={change} isExpanded={isExpanded} />
      
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
        padding: '12px 16px',
        borderBottom: `1px solid ${COLORS.border}`,
        cursor: 'pointer',
      }}
      onClick={onToggleExpand}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TypeBadge type={change.type} />
        <PriorityDot priority={change.priority} />
        <StatusIndicator status={status} />
      </div>
      
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          color: COLORS.textMuted,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}
      >
        ▼
      </button>
    </div>
  );
}

function TypeBadge({ type }: { type: ChangeType }) {
  const typeConfig: Record<ChangeType, { label: string; emoji: string; color: string }> = {
    UPDATE: { label: 'UPDATE', emoji: '✏️', color: '#3B82F6' },
    ADD: { label: 'ADD', emoji: '+', color: '#10B981' },
    CONNECT: { label: 'CONNECT', emoji: '🔗', color: '#8B5CF6' },
    STRENGTHEN: { label: 'STRENGTHEN', emoji: '↑', color: '#10B981' },
    WEAKEN: { label: 'WEAKEN', emoji: '↓', color: '#F59E0B' },
    CONTRADICT: { label: 'CONTRADICT', emoji: '⚠️', color: '#DC2626' },
    MERGE: { label: 'MERGE', emoji: '🔀', color: '#6366F1' },
    SPLIT: { label: 'SPLIT', emoji: '✂️', color: '#EC4899' },
    SUGGEST: { label: 'SUGGEST', emoji: '💡', color: '#F59E0B' },
  };
  
  const config = typeConfig[type];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        background: `${config.color}15`,
        color: config.color,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
      }}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: ChangePriority }) {
  const color = priority === 'high' ? COLORS.priorityHigh
    : priority === 'medium' ? COLORS.priorityMedium
    : COLORS.priorityLow;
  
  return (
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
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
        fontSize: '11px',
        fontWeight: 500,
        color: isAccepted ? COLORS.accepted : COLORS.rejected,
        textTransform: 'uppercase',
      }}
    >
      {isAccepted ? '✓ Accepted' : '✗ Rejected'}
    </span>
  );
}

// =============================================================================
// CARD BODY - Different visualizations by type
// =============================================================================

interface CardBodyProps {
  change: ProposedChange;
  isExpanded: boolean;
}

function CardBody({ change, isExpanded }: CardBodyProps) {
  return (
    <div style={{ padding: '16px' }}>
      {/* Main visualization */}
      <ChangeVisualization change={change} />
      
      {/* Expanded details */}
      {isExpanded && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px dashed ${COLORS.border}`,
          }}
        >
          <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
            <strong>Source:</strong> "{change.sourceText}"
          </div>
          
          {change.rationale && (
            <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
              <strong>Rationale:</strong> {change.rationale}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeVisualization({ change }: { change: ProposedChange }) {
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
      return <SuggestVisualization change={change} />;
    case 'MERGE':
      return <MergeVisualization change={change} />;
    case 'SPLIT':
      return <SplitVisualization change={change} />;
    default:
      return <div>{change.explanation}</div>;
  }
}

// ADD Visualization
function AddVisualization({ change }: { change: ProposedChange }) {
  if (!change.newNode) return null;
  
  return (
    <div>
      <div
        style={{
          background: COLORS.addBg,
          padding: '12px',
          borderRadius: '6px',
          borderLeft: `3px solid ${COLORS.addText}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: COLORS.addText, fontWeight: 600 }}>+ New {change.newNode.type} Node</span>
        </div>
        
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>
          "{change.newNode.title}"
        </div>
        
        <div style={{ fontSize: '13px', color: COLORS.textMuted, marginBottom: '8px' }}>
          {change.newNode.content}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: COLORS.textMuted }}>
          <span>Type: <strong>{change.newNode.type}</strong></span>
          <span>Confidence: <strong>{change.newNode.confidence}%</strong></span>
        </div>
        
        {change.connectTo && change.connectTo.length > 0 && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px dashed ${COLORS.border}` }}>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '6px' }}>
              Connects to:
            </div>
            {change.connectTo.map((conn, i) => (
              <div
                key={i}
                style={{
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: COLORS.addText }}>→</span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{conn.nodeId}</span>
                <span style={{ color: COLORS.textMuted }}>({conn.edgeType})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '10px' }}>
        {change.explanation}
      </div>
    </div>
  );
}

// UPDATE Visualization
function UpdateVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
        Node: <strong>{change.targetNodeId}</strong>
      </div>
      
      {change.oldContent && (
        <div
          style={{
            background: COLORS.removeBg,
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '8px',
            fontFamily: 'monospace',
            fontSize: '13px',
            textDecoration: 'line-through',
            color: COLORS.removeText,
          }}
        >
          - {change.oldContent}
        </div>
      )}
      
      {change.newContent && (
        <div
          style={{
            background: COLORS.addBg,
            padding: '10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: COLORS.addText,
          }}
        >
          + {change.newContent}
        </div>
      )}
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '10px' }}>
        {change.explanation}
      </div>
    </div>
  );
}

// CONNECT Visualization
function ConnectVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '12px' }}>
        + New Edge
      </div>
      
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '16px',
          background: '#F9FAFB',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            background: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {change.sourceNodeId?.split(':').pop()}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: COLORS.textMuted }}>{change.edgeType}</span>
          <span style={{ color: COLORS.accepted }}>→</span>
        </div>
        
        <div
          style={{
            padding: '8px 12px',
            background: COLORS.background,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {change.targetNodeId?.split(':').pop()}
        </div>
      </div>
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '10px' }}>
        {change.explanation}
      </div>
    </div>
  );
}

// STRENGTHEN/WEAKEN Visualization
function ConfidenceVisualization({ change }: { change: ProposedChange }) {
  const isStrengthen = change.type === 'STRENGTHEN';
  const delta = change.confidenceDelta || 0;
  // Assume starting confidence for visualization (would need real data)
  const oldConfidence = 50;
  const newConfidence = Math.max(0, Math.min(100, oldConfidence + delta));
  
  return (
    <div>
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
        Node: <strong>{change.nodeId}</strong>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px' }}>
            Confidence: {oldConfidence}% → <strong style={{ color: isStrengthen ? COLORS.addText : COLORS.removeText }}>
              {newConfidence}%
            </strong>
            <span style={{ fontSize: '12px', color: isStrengthen ? COLORS.addText : COLORS.removeText }}>
              {' '}({delta > 0 ? '+' : ''}{delta}%)
            </span>
          </span>
        </div>
        
        {/* Confidence bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div
            style={{
              width: '150px',
              height: '8px',
              background: '#E5E7EB',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${oldConfidence}%`,
                height: '100%',
                background: '#9CA3AF',
              }}
            />
          </div>
          <span style={{ color: COLORS.textMuted }}>→</span>
          <div
            style={{
              width: '150px',
              height: '8px',
              background: '#E5E7EB',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${newConfidence}%`,
                height: '100%',
                background: isStrengthen ? COLORS.addText : COLORS.priorityMedium,
              }}
            />
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
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
          background: COLORS.removeBg,
          padding: '12px',
          borderRadius: '6px',
          borderLeft: `3px solid ${COLORS.rejected}`,
        }}
      >
        <div style={{ fontWeight: 600, color: COLORS.rejected, marginBottom: '12px' }}>
          ⚠️ CONFLICT DETECTED
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: COLORS.textMuted }}>Existing:</span>{' '}
            <strong>{change.nodeAId}</strong>
          </div>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: COLORS.textMuted }}>New:</span>{' '}
            <strong>{change.nodeBId}</strong>
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '10px' }}>
        {change.explanation}
      </div>
    </div>
  );
}

// SUGGEST Visualization
function SuggestVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div
        style={{
          background: '#FEF3C7',
          padding: '12px',
          borderRadius: '6px',
          borderLeft: '3px solid #F59E0B',
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '8px' }}>
          💡 {change.suggestion}
        </div>
        
        {change.rationale && (
          <div style={{ fontSize: '13px', color: COLORS.textMuted }}>
            {change.rationale}
          </div>
        )}
      </div>
    </div>
  );
}

// MERGE Visualization
function MergeVisualization({ change }: { change: ProposedChange }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
        These nodes appear to be the same thing:
      </div>
      
      {change.nodeIds?.map((id, i) => (
        <div
          key={id}
          style={{
            padding: '8px',
            background: '#F9FAFB',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          Node {i + 1}: {id}
        </div>
      ))}
      
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '6px' }}>
          Merge into:
        </div>
        <div
          style={{
            background: COLORS.addBg,
            padding: '10px',
            borderRadius: '6px',
            borderLeft: `3px solid ${COLORS.addText}`,
          }}
        >
          <strong>{change.mergedTitle}</strong>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
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
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
        Split <strong>{change.originalNodeId}</strong> into:
      </div>
      
      {change.splitInto?.map((spec, i) => (
        <div
          key={i}
          style={{
            background: COLORS.addBg,
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '6px',
            borderLeft: `3px solid ${COLORS.addText}`,
          }}
        >
          <strong>{spec.title}</strong>
          <div style={{ fontSize: '13px', marginTop: '4px', color: COLORS.textMuted }}>
            {spec.content}
          </div>
        </div>
      ))}
      
      <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '10px' }}>
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
}

function CardActions({ status, changeType, onAccept, onReject, onEdit, onReset }: CardActionsProps) {
  const isResolved = status === 'accepted' || status === 'rejected';
  const isSuggest = changeType === 'SUGGEST';
  
  const buttonStyle = (type: 'accept' | 'reject' | 'edit' | 'reset'): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: type === 'accept' ? 'none' : `1px solid ${COLORS.border}`,
    background: type === 'accept' ? COLORS.acceptBtn : 'transparent',
    color: type === 'accept' ? '#FFFFFF' : COLORS.rejectBtn,
  });
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        padding: '12px 16px',
        borderTop: `1px solid ${COLORS.border}`,
        background: '#FAFAF8',
      }}
    >
      {isResolved ? (
        <button style={buttonStyle('reset')} onClick={onReset}>
          Reset
        </button>
      ) : (
        <>
          <button style={buttonStyle('edit')} onClick={onEdit}>
            Edit
          </button>
          <button style={buttonStyle('reject')} onClick={onReject}>
            {isSuggest ? 'Dismiss' : 'Reject'}
          </button>
          <button style={buttonStyle('accept')} onClick={onAccept}>
            {isSuggest ? 'Add This' : 'Accept'}
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
    padding: '10px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '10px',
  };
  
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: COLORS.textMuted,
    marginBottom: '4px',
  };
  
  return (
    <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.border}`, background: '#FAFAF8' }}>
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
              <label style={labelStyle}>Confidence: {editedChange.newNode?.confidence}%</label>
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
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            background: 'transparent',
            cursor: 'pointer',
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: COLORS.acceptBtn,
            color: '#FFFFFF',
            cursor: 'pointer',
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
