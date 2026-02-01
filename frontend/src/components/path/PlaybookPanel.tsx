/**
 * PlaybookPanel Component
 * Full playbook display with rules, metrics, warnings, and actions
 */

import { useState } from 'react';
import type { PmfPath } from '../../types/graph';
import { PMF_PATH_CONFIGS } from '../../types/graph';
import type { PlaybookSummary, PlaybookRule } from '../../store/pathStore';

// =============================================================================
// SEQUOIA STYLES
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
    danger: '#D4442E',
    dangerLight: '#FDEEED',
    warning: '#E5A826',
    warningLight: '#FDF8E8',
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface PlaybookPanelProps {
  path: PmfPath;
  playbook: PlaybookSummary | null;
  blockers?: PlaybookRule[];
  warnings?: PlaybookRule[];
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PlaybookPanel({
  path,
  playbook,
  blockers = [],
  warnings = [],
  isOpen,
  onClose,
}: PlaybookPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'warnings'>('overview');
  
  if (!isOpen) return null;
  
  const config = PMF_PATH_CONFIGS[path];
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '480px',
        background: S.colors.bg,
        borderLeft: `1px solid ${S.colors.borderSubtle}`,
        boxShadow: '-8px 0 32px rgba(27, 25, 22, 0.08)',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: S.fonts.sans,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px',
          borderBottom: `1px solid ${S.colors.borderSubtle}`,
          background: S.colors.bgCard,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{config.icon}</span>
              <div>
                <h2
                  style={{
                    fontFamily: S.fonts.serif,
                    fontSize: '22px',
                    fontWeight: 400,
                    color: S.colors.text,
                    margin: 0,
                    letterSpacing: '0.01em',
                  }}
                >
                  {config.name}
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: S.colors.accent,
                  }}
                >
                  Your Playbook
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: S.colors.textSecondary,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {playbook?.tagline || config.shortDescription}
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: S.colors.textTertiary,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = S.colors.bgAlt;
              e.currentTarget.style.color = S.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = S.colors.textTertiary;
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {/* Key Info Row */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${S.colors.borderSubtle}`,
          }}
        >
          <div>
            <span style={{ fontSize: '10px', color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Enemy
            </span>
            <p style={{ fontSize: '13px', color: S.colors.text, margin: '4px 0 0', fontWeight: 500 }}>
              {playbook?.enemy || config.enemy}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your Job
            </span>
            <p style={{ fontSize: '13px', color: S.colors.text, margin: '4px 0 0', fontWeight: 500 }}>
              {playbook?.job || config.job}
            </p>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: S.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Speed
            </span>
            <p style={{ fontSize: '13px', color: S.colors.text, margin: '4px 0 0', fontWeight: 500 }}>
              {playbook?.speed_matters || config.speedMatters}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${S.colors.borderSubtle}`,
          background: S.colors.bgCard,
        }}
      >
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'rules' as const, label: `Issues (${blockers.length + warnings.length})` },
          { id: 'warnings' as const, label: 'Watch Out' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? S.colors.accent : S.colors.textTertiary,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${S.colors.accent}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'overview' && (
          <>
            {/* This Week Actions */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: S.colors.textTertiary,
                  margin: '0 0 12px',
                }}
              >
                This Week
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(playbook?.this_week_actions || []).map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      background: S.colors.bgCard,
                      borderRadius: '8px',
                      border: `1px solid ${S.colors.borderSubtle}`,
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `2px solid ${S.colors.border}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '13px', color: S.colors.text, lineHeight: 1.4 }}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Benchmark */}
            <div
              style={{
                padding: '16px',
                background: S.colors.accentLight,
                borderRadius: '8px',
                border: `1px solid ${S.colors.accent}20`,
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600, color: S.colors.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Benchmark
              </span>
              <p style={{ fontSize: '15px', fontWeight: 600, color: S.colors.text, margin: '8px 0 4px' }}>
                {playbook?.benchmark?.company || config.benchmark.split(' (')[0]}
              </p>
              <p style={{ fontSize: '12px', color: S.colors.textSecondary, margin: 0 }}>
                {playbook?.benchmark?.description || config.benchmark}
              </p>
            </div>
          </>
        )}
        
        {activeTab === 'rules' && (
          <>
            {blockers.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: S.colors.danger,
                    margin: '0 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={S.colors.danger} stroke="none">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-7v-6h2v6h-2zm0 2v2h2v-2h-2z" />
                  </svg>
                  Blockers ({blockers.length})
                </h3>
                {blockers.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} isBlocker />
                ))}
              </div>
            )}
            
            {warnings.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: S.colors.warning,
                    margin: '0 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={S.colors.warning} stroke="none">
                    <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                  </svg>
                  Warnings ({warnings.length})
                </h3>
                {warnings.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} />
                ))}
              </div>
            )}
            
            {blockers.length === 0 && warnings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: S.colors.accentLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p style={{ fontSize: '14px', color: S.colors.text, fontWeight: 500, margin: '0 0 4px' }}>
                  You're on track!
                </p>
                <p style={{ fontSize: '12px', color: S.colors.textTertiary, margin: 0 }}>
                  No blockers or warnings for your {config.name} strategy.
                </p>
              </div>
            )}
          </>
        )}
        
        {activeTab === 'warnings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {path === 'hair_on_fire' && (
              <>
                <WarningCard
                  title="'We need to educate the market'"
                  description="No you don't. They're already looking. Stop educating and start selling."
                />
                <WarningCard
                  title="Building features no one asked for"
                  description="Talk to active searchers. Build what they need to switch."
                />
                <WarningCard
                  title="Slow iteration cycles"
                  description="Your competitor shipped while you planned. Speed wins."
                />
              </>
            )}
            {path === 'hard_fact' && (
              <>
                <WarningCard
                  title="Expecting fast sales"
                  description="Behavior change is slow. Plan for longer cycles than you think."
                />
                <WarningCard
                  title="Competing on features"
                  description="They're not comparing options yet. You need to educate first."
                />
                <WarningCard
                  title="Skipping education"
                  description="They don't know they need you yet. Content and education come first."
                />
              </>
            )}
            {path === 'future_vision' && (
              <>
                <WarningCard
                  title="Running out of money"
                  description="Don't run out of money before the market catches up. Revenue now."
                />
                <WarningCard
                  title="Building vision before stepping stone"
                  description="The stepping stone funds the vision. Build it first."
                />
                <WarningCard
                  title="Hiring too fast"
                  description="You need believers, not mercenaries. Hire slow."
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function RuleCard({ rule, isBlocker = false }: { rule: PlaybookRule; isBlocker?: boolean }) {
  return (
    <div
      style={{
        padding: '14px',
        background: isBlocker ? S.colors.dangerLight : S.colors.warningLight,
        borderRadius: '8px',
        marginBottom: '10px',
        border: `1px solid ${isBlocker ? S.colors.danger : S.colors.warning}20`,
      }}
    >
      <h4
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: S.colors.text,
          margin: '0 0 6px',
        }}
      >
        {rule.title}
      </h4>
      <p
        style={{
          fontSize: '12px',
          color: S.colors.textSecondary,
          margin: '0 0 10px',
          lineHeight: 1.4,
        }}
      >
        {rule.message}
      </p>
      <button
        style={{
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: isBlocker ? S.colors.danger : S.colors.warning,
          background: 'transparent',
          border: `1px solid ${isBlocker ? S.colors.danger : S.colors.warning}`,
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
      >
        {rule.action_label}
      </button>
    </div>
  );
}

function WarningCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        padding: '14px',
        background: S.colors.bgCard,
        borderRadius: '8px',
        borderLeft: `3px solid ${S.colors.warning}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={S.colors.warning}
          strokeWidth="2"
          style={{ marginTop: '2px', flexShrink: 0 }}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: S.colors.text, margin: '0 0 4px' }}>
            {title}
          </h4>
          <p style={{ fontSize: '12px', color: S.colors.textSecondary, margin: 0, lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PlaybookPanel;
