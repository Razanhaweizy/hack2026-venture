/**
 * GapCard Component
 * Displays a single gap with its details and probing questions
 * 
 * Sequoia Capital Brand-Aligned Design
 */

import { useState } from 'react';
import type { Gap } from '../../api/client';

// Sequoia Brand Styles
const S = {
  fontSerif: '"Georgia", "Times New Roman", serif',
  fontSans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
  colors: {
    bg: '#FBF7F0',
    bgCard: '#FFFFFF',
    text: '#1B1916',
    textSecondary: '#4A4640',
    textTertiary: '#8A857A',
    accent: '#007354',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
  },
};

interface GapCardProps {
  gap: Gap;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const CRITICALITY_COLORS: Record<string, string> = {
  killer: '#B54248',
  high: '#C4841D',
  medium: '#4A4640',
  low: '#8A857A',
};

export function GapCard({ gap, isExpanded = false, onToggle }: GapCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  const criticalityColor = CRITICALITY_COLORS[gap.criticality] || S.colors.textSecondary;

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  // Extract category from framework_id (e.g., "framework:problem:pain" -> "problem")
  const category = gap.framework_id.split(':')[1] || 'unknown';

  return (
    <div
      style={{
        background: S.colors.bgCard,
        border: `1px solid ${S.colors.borderSubtle}`,
        borderRadius: '8px',
        marginBottom: '12px',
        overflow: 'hidden',
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = S.colors.border}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = S.colors.borderSubtle}
    >
      {/* Header - Always visible */}
      <div
        onClick={handleToggle}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Expand/Collapse indicator */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={S.colors.textTertiary}
          strokeWidth="2"
          style={{
            marginTop: '4px',
            flexShrink: 0,
            transition: 'transform 200ms ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>

        <div style={{ flex: 1 }}>
          {/* Badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: criticalityColor,
              }}
            >
              {gap.criticality}
            </span>
            <span style={{ 
              color: S.colors.borderSubtle, 
              fontSize: '10px',
            }}>
              •
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: S.colors.textTertiary,
              }}
            >
              {category}
            </span>
          </div>

          {/* Question */}
          <p
            style={{
              fontFamily: S.fontSerif,
              fontSize: '15px',
              fontWeight: 400,
              color: S.colors.text,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {gap.question}
          </p>

          {/* Coverage indicator */}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                flex: 1,
                maxWidth: '80px',
                height: '3px',
                background: S.colors.borderSubtle,
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${gap.coverage_score * 100}%`,
                  height: '100%',
                  background: S.colors.accent,
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <span style={{ 
              fontSize: '11px', 
              color: S.colors.textTertiary,
            }}>
              {Math.round(gap.coverage_score * 100)}% covered
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            padding: '0 20px 20px 44px',
            borderTop: `1px solid ${S.colors.borderSubtle}`,
          }}
        >
          {/* Why it matters */}
          <div style={{ marginTop: '16px' }}>
            <h4
              style={{
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: S.colors.textTertiary,
                marginBottom: '6px',
              }}
            >
              Why it matters
            </h4>
            <p style={{ 
              fontSize: '13px', 
              lineHeight: 1.6, 
              margin: 0, 
              color: S.colors.textSecondary,
            }}>
              {gap.why_it_matters}
            </p>
          </div>

          {/* Founder trap */}
          <div style={{ marginTop: '16px' }}>
            <h4
              style={{
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: S.colors.textTertiary,
                marginBottom: '6px',
              }}
            >
              Common Mistake
            </h4>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                margin: 0,
                color: S.colors.textSecondary,
                fontStyle: 'italic',
                padding: '10px 14px',
                background: S.colors.bg,
                borderRadius: '4px',
                borderLeft: `2px solid ${CRITICALITY_COLORS[gap.criticality] || S.colors.border}`,
              }}
            >
              {gap.founder_trap}
            </p>
          </div>

          {/* Probing questions */}
          <div style={{ marginTop: '16px' }}>
            <h4
              style={{
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: S.colors.textTertiary,
                marginBottom: '10px',
              }}
            >
              Ask Yourself
            </h4>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
              }}
            >
              {gap.probing_questions.map((q, i) => (
                <li 
                  key={i} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '8px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: S.colors.text,
                  }}
                >
                  <span style={{ 
                    color: S.colors.accent,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    →
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default GapCard;
