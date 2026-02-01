/**
 * GapAnalysisPanel Component
 * Displays gap analysis with summary and detailed gaps
 * 
 * Sequoia Capital Brand-Aligned Design
 */

import { useState, useEffect, useCallback } from 'react';
import { api, GapAnalysisResponse, Gap } from '../../api/client';
import { GapCard } from './GapCard';

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
    accentHover: '#005C43',
    accentLight: '#E6F2EE',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
  },
};

interface GapAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'market', label: 'Market' },
  { id: 'business_model', label: 'Business' },
  { id: 'gtm', label: 'GTM' },
  { id: 'competition', label: 'Competition' },
  { id: 'founder', label: 'Founder' },
  { id: 'timing', label: 'Timing' },
];

const READINESS_CONFIG: Record<string, { label: string }> = {
  critical_gaps: { label: 'Critical Gaps' },
  needs_work: { label: 'Needs Work' },
  in_progress: { label: 'In Progress' },
  good: { label: 'Good Shape' },
  complete: { label: 'Complete' },
};

export function GapAnalysisPanel({ isOpen, onClose }: GapAnalysisPanelProps) {
  const [data, setData] = useState<GapAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState<string | null>(null);

  const loadGaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const categories = selectedCategory === 'all' ? undefined : [selectedCategory];
      const response = await api.analyzeGaps(0.5, categories);

      if (response.error) {
        throw new Error(response.error);
      }

      setData(response.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gaps');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isOpen) {
      loadGaps();
    }
  }, [isOpen, loadGaps]);

  if (!isOpen) return null;

  const filteredGaps = data?.gaps.filter(
    (g) => !criticalityFilter || g.criticality === criticalityFilter
  ) || [];

  const readiness = data?.summary.overall_readiness || 'in_progress';
  const readinessConfig = READINESS_CONFIG[readiness] || READINESS_CONFIG.in_progress;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(27, 25, 22, 0.4)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        fontFamily: S.fontSans,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '760px',
          maxHeight: '90vh',
          background: S.colors.bg,
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(27, 25, 22, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '28px 32px 24px',
            borderBottom: `1px solid ${S.colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2 style={{ 
              fontFamily: S.fontSerif,
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '0.01em',
              margin: 0, 
              color: S.colors.text,
            }}>
              Gap Analysis
            </h2>
            <p style={{ 
              margin: '6px 0 0', 
              fontSize: '13px', 
              color: S.colors.textTertiary,
            }}>
              Identify what's missing from your startup thesis
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              opacity: 0.4,
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={S.colors.text} strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ 
                fontSize: '13px',
                color: S.colors.textTertiary,
                letterSpacing: '0.02em',
              }}>
                Analyzing your knowledge graph...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                background: S.colors.bgCard,
                borderRadius: '8px',
                border: `1px solid ${S.colors.borderSubtle}`,
              }}
            >
              <p style={{ color: '#B54248', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={loadGaps}
                style={{
                  padding: '10px 20px',
                  background: S.colors.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              {/* Summary Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  marginBottom: '32px',
                  paddingBottom: '32px',
                  borderBottom: `1px solid ${S.colors.borderSubtle}`,
                }}
              >
                {/* Completion */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: S.colors.textTertiary,
                    marginBottom: '8px',
                  }}>
                    Completion
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontFamily: S.fontSerif,
                    fontWeight: 400,
                    color: S.colors.text,
                    lineHeight: 1,
                  }}>
                    {data.summary.completion_percentage}%
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: S.colors.textTertiary,
                    marginTop: '4px',
                  }}>
                    {readinessConfig.label}
                  </div>
                </div>

                {/* Gap Counts */}
                <div style={{ 
                  display: 'flex', 
                  gap: '16px',
                  alignItems: 'flex-end',
                }}>
                  {[
                    { key: 'killer', count: data.summary.killer_gaps, color: '#B54248' },
                    { key: 'high', count: data.summary.high_gaps, color: '#C4841D' },
                    { key: 'medium', count: data.summary.medium_gaps, color: S.colors.textSecondary },
                    { key: 'low', count: data.summary.low_gaps, color: S.colors.textTertiary },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() =>
                        setCriticalityFilter(criticalityFilter === item.key ? null : item.key)
                      }
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: criticalityFilter === item.key ? S.colors.bgCard : 'transparent',
                        border: criticalityFilter === item.key 
                          ? `1px solid ${S.colors.border}` 
                          : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <span style={{
                        fontSize: '20px',
                        fontFamily: S.fontSerif,
                        fontWeight: 400,
                        color: item.color,
                      }}>
                        {item.count}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: S.colors.textTertiary,
                        marginTop: '2px',
                      }}>
                        {item.key}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Actions */}
              {data.summary.priority_actions.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: S.colors.textTertiary,
                    marginBottom: '12px',
                  }}>
                    Priority Actions
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                  }}>
                    {data.summary.priority_actions.map((action, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          padding: '12px 16px',
                          background: S.colors.bgCard,
                          border: `1px solid ${S.colors.borderSubtle}`,
                          borderRadius: '6px',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: S.colors.accent,
                            color: 'white',
                            borderRadius: '50%',
                            fontSize: '11px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ 
                          fontSize: '13px', 
                          lineHeight: 1.5,
                          color: S.colors.text,
                        }}>
                          {action.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: selectedCategory === cat.id 
                        ? `1px solid ${S.colors.accent}`
                        : `1px solid ${S.colors.border}`,
                      background: selectedCategory === cat.id 
                        ? S.colors.accentLight 
                        : 'transparent',
                      color: selectedCategory === cat.id 
                        ? S.colors.accent 
                        : S.colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Gaps List */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ 
                    fontSize: '12px', 
                    color: S.colors.textTertiary,
                  }}>
                    {filteredGaps.length} gap{filteredGaps.length !== 1 ? 's' : ''} found
                    {criticalityFilter && ` (${criticalityFilter} only)`}
                  </span>
                  {criticalityFilter && (
                    <button
                      onClick={() => setCriticalityFilter(null)}
                      style={{
                        fontSize: '12px',
                        background: 'none',
                        border: 'none',
                        color: S.colors.accent,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {filteredGaps.length > 0 ? (
                  filteredGaps.map((gap) => <GapCard key={gap.framework_id} gap={gap} />)
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      background: S.colors.accentLight,
                      borderRadius: '8px',
                    }}
                  >
                    <p style={{ 
                      color: S.colors.accent, 
                      fontWeight: 500,
                      fontSize: '14px',
                    }}>
                      {selectedCategory === 'all'
                        ? 'No gaps found. Your thesis is well-covered.'
                        : `No gaps in ${selectedCategory}. This area is well-covered.`}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 32px',
            borderTop: `1px solid ${S.colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ 
            margin: 0, 
            fontSize: '11px', 
            color: S.colors.textTertiary,
          }}>
            Based on framework coverage and evidence quality
          </p>
          <button
            onClick={loadGaps}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: S.colors.textSecondary,
              border: `1px solid ${S.colors.border}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = S.colors.accent;
              e.currentTarget.style.color = S.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = S.colors.border;
              e.currentTarget.style.color = S.colors.textSecondary;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 4v6h6"/>
              <path d="M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default GapAnalysisPanel;
