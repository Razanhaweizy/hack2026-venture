/**
 * Debate Arena Component
 * Two-agent debate system for stress-testing startup ideas
 * Premium Sequoia-styled design
 */

import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
// SEQUOIA DESIGN SYSTEM - REFINED
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
    bgDark: '#1B1916',
    text: '#1B1916',
    textSecondary: '#4A4640',
    textTertiary: '#8A857A',
    textInverse: '#FBF7F0',
    accent: '#007354',
    accentHover: '#005C43',
    accentLight: '#E6F2EE',
    accentSubtle: '#F0F7F5',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
    borderStrong: '#B8B5A8',
    skeptic: '#9B2C2C',
    skepticBg: '#FDF6F5',
    skepticBorder: '#E8D4D2',
    advocate: '#276749',
    advocateBg: '#F0F7F4',
    advocateBorder: '#C6E3D3',
    founder: '#2B6CB0',
    founderBg: '#EBF4FF',
    founderBorder: '#BEE3F8',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.06)',
    md: '0 4px 16px rgba(0,0,0,0.08)',
    lg: '0 12px 48px rgba(0,0,0,0.12)',
    xl: '0 24px 80px rgba(0,0,0,0.18)',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
};

// =============================================================================
// TYPES
// =============================================================================

type DebateMode = 'watch' | 'defend' | 'attack';

interface DebateTurn {
  turn_number: number;
  speaker: 'skeptic' | 'advocate' | 'founder';
  turn_type: 'attack' | 'defend';
  content: string;
  timestamp: string;
}

interface DebateSession {
  id: string;
  claim: string;
  mode: DebateMode;
  attacker: string;
  defender: string;
  max_rounds: number;
  current_round: number;
  is_complete: boolean;
  transcript: DebateTurn[];
}

interface NextTurnResponse {
  status: 'agent_responded' | 'awaiting_founder' | 'complete';
  speaker?: string;
  turn_type?: string;
  content?: string;
  prompt?: string;
  round?: number;
  is_complete?: boolean;
  summary?: any;
}

interface DebateEvaluation {
  unresolved_risks: Array<{ point: string; severity: string; why_unresolved: string }>;
  validated_points: Array<{ point: string; how_addressed: string }>;
  key_tensions: Array<{ point: string; skeptic_view: string; advocate_view: string }>;
  recommended_actions: string[];
  confidence_impact: number;
  overall_assessment: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialClaim?: string;
  graphContext?: any;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

const API_BASE = 'http://localhost:8000';

async function createDebate(claim: string, mode: DebateMode, context: any, maxRounds: number) {
  const response = await fetch(`${API_BASE}/debate/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim, mode, context, max_rounds: maxRounds }),
  });
  return response.json();
}

async function getNextTurn(sessionId: string): Promise<NextTurnResponse> {
  const response = await fetch(`${API_BASE}/debate/${sessionId}/next`);
  return response.json();
}

async function submitFounderResponse(sessionId: string, content: string): Promise<NextTurnResponse> {
  const response = await fetch(`${API_BASE}/debate/${sessionId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return response.json();
}

async function runFullDebate(sessionId: string) {
  const response = await fetch(`${API_BASE}/debate/${sessionId}/run`, { method: 'POST' });
  return response.json();
}

async function evaluateDebate(sessionId: string): Promise<DebateEvaluation> {
  const response = await fetch(`${API_BASE}/debate/${sessionId}/evaluate`);
  return response.json();
}

async function getSession(sessionId: string): Promise<DebateSession> {
  const response = await fetch(`${API_BASE}/debate/${sessionId}`);
  return response.json();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DebateArena({ isOpen, onClose, initialClaim = '', graphContext }: Props) {
  const [view, setView] = useState<'setup' | 'debate' | 'evaluation'>('setup');
  const [claim, setClaim] = useState(initialClaim);
  const [mode, setMode] = useState<DebateMode>('watch');
  const [maxRounds, setMaxRounds] = useState(3);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [transcript, setTranscript] = useState<DebateTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [founderInput, setFounderInput] = useState('');
  const [awaitingFounder, setAwaitingFounder] = useState(false);
  const [founderPrompt, setFounderPrompt] = useState('');
  const [evaluation, setEvaluation] = useState<DebateEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);
  
  const handleStartDebate = async () => {
    if (!claim.trim()) {
      setError('Please enter a claim to debate');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await createDebate(claim, mode, graphContext || {}, maxRounds);
      setSession(result);
      setView('debate');
      setTranscript([]);
      
      if (mode === 'watch') {
        await runWatchModeDebate(result.session_id);
      } else {
        await advanceDebate(result.session_id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start debate');
    } finally {
      setIsLoading(false);
    }
  };
  
  const runWatchModeDebate = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const result = await runFullDebate(sessionId);
      const sessionData = await getSession(sessionId);
      setTranscript(sessionData.transcript);
      setSession(sessionData);
      if (result.evaluation) {
        setEvaluation(result.evaluation);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to run debate');
    } finally {
      setIsLoading(false);
    }
  };
  
  const advanceDebate = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const result = await getNextTurn(sessionId);
      
      if (result.status === 'agent_responded') {
        const newTurn: DebateTurn = {
          turn_number: transcript.length + 1,
          speaker: result.speaker as any,
          turn_type: result.turn_type as any,
          content: result.content || '',
          timestamp: new Date().toISOString(),
        };
        setTranscript(prev => [...prev, newTurn]);
        
        if (!result.is_complete) {
          await advanceDebate(sessionId);
        } else {
          const evalResult = await evaluateDebate(sessionId);
          setEvaluation(evalResult);
        }
      } else if (result.status === 'awaiting_founder') {
        setAwaitingFounder(true);
        setFounderPrompt(result.prompt || '');
      } else if (result.status === 'complete') {
        const evalResult = await evaluateDebate(sessionId);
        setEvaluation(evalResult);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to advance debate');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFounderSubmit = async () => {
    if (!founderInput.trim() || !session) return;
    
    setIsLoading(true);
    setAwaitingFounder(false);
    
    const founderTurn: DebateTurn = {
      turn_number: transcript.length + 1,
      speaker: 'founder',
      turn_type: mode === 'attack' ? 'attack' : 'defend',
      content: founderInput,
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, founderTurn]);
    setFounderInput('');
    
    try {
      const result = await submitFounderResponse(session.id, founderInput);
      
      if (result.status === 'agent_responded') {
        const agentTurn: DebateTurn = {
          turn_number: transcript.length + 2,
          speaker: result.speaker as any,
          turn_type: result.turn_type as any,
          content: result.content || '',
          timestamp: new Date().toISOString(),
        };
        setTranscript(prev => [...prev, agentTurn]);
        
        if (!result.is_complete) {
          await advanceDebate(session.id);
        } else {
          const evalResult = await evaluateDebate(session.id);
          setEvaluation(evalResult);
        }
      } else if (result.status === 'awaiting_founder') {
        setAwaitingFounder(true);
        setFounderPrompt(result.prompt || '');
      } else if (result.status === 'complete') {
        const evalResult = await evaluateDebate(session.id);
        setEvaluation(evalResult);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to submit response');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
    setView('setup');
    setSession(null);
    setTranscript([]);
    setEvaluation(null);
    setAwaitingFounder(false);
    setFounderInput('');
    setFounderPrompt('');
    setError(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(27, 25, 22, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '880px',
          maxHeight: '90vh',
          background: S.colors.bg,
          borderRadius: S.radius.xl,
          boxShadow: S.shadows.xl,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Elegant Header */}
        <div
          style={{
            padding: '28px 32px 24px',
            borderBottom: `1px solid ${S.colors.borderSubtle}`,
            background: S.colors.bgCard,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${S.colors.skeptic} 0%, ${S.colors.advocate} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                }}>
                  ⚔
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: '22px',
                  fontFamily: S.fonts.serif,
                  fontWeight: 400,
                  color: S.colors.text,
                  letterSpacing: '-0.01em',
                }}>
                  Debate Arena
                </h2>
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: S.colors.textTertiary,
                fontFamily: S.fonts.sans,
              }}>
                Stress-test your assumptions through structured argument
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {view !== 'setup' && (
                <button
                  onClick={handleReset}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    border: `1px solid ${S.colors.border}`,
                    borderRadius: S.radius.md,
                    fontSize: '13px',
                    fontFamily: S.fonts.sans,
                    color: S.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = S.colors.bgAlt;
                    e.currentTarget.style.borderColor = S.colors.borderStrong;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = S.colors.border;
                  }}
                >
                  New Debate
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: S.radius.md,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: S.colors.textTertiary,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = S.colors.bgAlt;
                  e.currentTarget.style.color = S.colors.text;
                }}
                onMouseLeave={e => {
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
          </div>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          {error && (
            <div style={{
              padding: '14px 18px',
              background: S.colors.skepticBg,
              border: `1px solid ${S.colors.skepticBorder}`,
              borderRadius: S.radius.md,
              marginBottom: '24px',
              fontSize: '14px',
              color: S.colors.skeptic,
              fontFamily: S.fonts.sans,
            }}>
              {error}
            </div>
          )}
          
          {view === 'setup' && (
            <SetupView
              claim={claim}
              setClaim={setClaim}
              mode={mode}
              setMode={setMode}
              maxRounds={maxRounds}
              setMaxRounds={setMaxRounds}
              onStart={handleStartDebate}
              isLoading={isLoading}
            />
          )}
          
          {view === 'debate' && (
            <DebateView
              session={session}
              transcript={transcript}
              isLoading={isLoading}
              awaitingFounder={awaitingFounder}
              founderPrompt={founderPrompt}
              founderInput={founderInput}
              setFounderInput={setFounderInput}
              onFounderSubmit={handleFounderSubmit}
              evaluation={evaluation}
              transcriptEndRef={transcriptEndRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SETUP VIEW - REFINED
// =============================================================================

function SetupView({
  claim,
  setClaim,
  mode,
  setMode,
  maxRounds,
  setMaxRounds,
  onStart,
  isLoading,
}: {
  claim: string;
  setClaim: (v: string) => void;
  mode: DebateMode;
  setMode: (v: DebateMode) => void;
  maxRounds: number;
  setMaxRounds: (v: number) => void;
  onStart: () => void;
  isLoading: boolean;
}) {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Agents Section */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: S.colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '16px',
          fontFamily: S.fonts.sans,
        }}>
          The Debaters
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
        }}>
          <AgentCard
            type="skeptic"
            name="The Skeptic"
            tagline="The VC Who's Seen It All"
            description="Attacks assumptions. Finds weaknesses. Demands evidence."
          />
          <AgentCard
            type="advocate"
            name="The Advocate"
            tagline="The Experienced Founder"
            description="Defends the vision. Provides counter-arguments. Finds paths forward."
          />
        </div>
      </div>
      
      {/* Claim Input */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: S.colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
          fontFamily: S.fonts.sans,
        }}>
          Claim to Debate
        </label>
        <textarea
          value={claim}
          onChange={e => setClaim(e.target.value)}
          placeholder="e.g., Restaurant owners will pay $75/month for AI-powered waste tracking"
          style={{
            width: '100%',
            height: '100px',
            padding: '16px 18px',
            fontSize: '15px',
            fontFamily: S.fonts.serif,
            fontStyle: 'italic',
            lineHeight: 1.6,
            border: `1px solid ${S.colors.border}`,
            borderRadius: S.radius.lg,
            background: S.colors.bgCard,
            resize: 'none',
            outline: 'none',
            color: S.colors.text,
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = S.colors.accent;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${S.colors.accentLight}`;
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = S.colors.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
      
      {/* Mode Selection */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: S.colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '12px',
          fontFamily: S.fonts.sans,
        }}>
          Choose Your Role
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ModeOption
            selected={mode === 'watch'}
            onClick={() => setMode('watch')}
            title="Observer"
            subtitle="Watch the debate unfold"
            description="Skeptic attacks, Advocate defends. See the strongest arguments from both sides."
            iconType="watch"
          />
          <ModeOption
            selected={mode === 'defend'}
            onClick={() => setMode('defend')}
            title="Defender"
            subtitle="Practice your pitch"
            description="The Skeptic attacks your claim. You defend it."
            iconType="defend"
          />
          <ModeOption
            selected={mode === 'attack'}
            onClick={() => setMode('attack')}
            title="Challenger"
            subtitle="Play devil's advocate"
            description="You attack the claim. The Advocate defends it."
            iconType="attack"
          />
        </div>
      </div>
      
      {/* Rounds Selector */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '12px',
        }}>
          <label style={{
            fontSize: '11px',
            fontWeight: 600,
            color: S.colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: S.fonts.sans,
          }}>
            Debate Depth
          </label>
          <span style={{
            fontSize: '14px',
            fontFamily: S.fonts.serif,
            color: S.colors.text,
          }}>
            {maxRounds} {maxRounds === 1 ? 'round' : 'rounds'}
          </span>
        </div>
        <div style={{
          background: S.colors.bgCard,
          border: `1px solid ${S.colors.borderSubtle}`,
          borderRadius: S.radius.lg,
          padding: '20px 24px',
        }}>
          <input
            type="range"
            min="1"
            max="5"
            value={maxRounds}
            onChange={e => setMaxRounds(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              appearance: 'none',
              background: `linear-gradient(to right, ${S.colors.accent} 0%, ${S.colors.accent} ${(maxRounds - 1) * 25}%, ${S.colors.borderSubtle} ${(maxRounds - 1) * 25}%, ${S.colors.borderSubtle} 100%)`,
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: S.colors.textTertiary,
            marginTop: '12px',
            fontFamily: S.fonts.sans,
          }}>
            <span>Quick scan</span>
            <span>Deep dive</span>
          </div>
        </div>
      </div>
      
      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={isLoading || !claim.trim()}
        style={{
          width: '100%',
          padding: '16px 24px',
          background: isLoading || !claim.trim() 
            ? S.colors.borderSubtle 
            : S.colors.accent,
          color: isLoading || !claim.trim() 
            ? S.colors.textTertiary 
            : 'white',
          border: 'none',
          borderRadius: S.radius.lg,
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: S.fonts.sans,
          cursor: isLoading || !claim.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 200ms ease',
          boxShadow: isLoading || !claim.trim() 
            ? 'none' 
            : `0 4px 14px ${S.colors.accent}40`,
        }}
        onMouseEnter={e => {
          if (!isLoading && claim.trim()) {
            e.currentTarget.style.background = S.colors.accentHover;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 6px 20px ${S.colors.accent}50`;
          }
        }}
        onMouseLeave={e => {
          if (!isLoading && claim.trim()) {
            e.currentTarget.style.background = S.colors.accent;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 14px ${S.colors.accent}40`;
          }
        }}
      >
        {isLoading ? 'Preparing debate...' : 'Begin Debate'}
      </button>
    </div>
  );
}

// =============================================================================
// AGENT CARD - REFINED
// =============================================================================

function AgentCard({
  type,
  name,
  tagline,
  description,
}: {
  type: 'skeptic' | 'advocate';
  name: string;
  tagline: string;
  description: string;
}) {
  const isSkeptic = type === 'skeptic';
  const colors = {
    bg: isSkeptic ? S.colors.skepticBg : S.colors.advocateBg,
    border: isSkeptic ? S.colors.skepticBorder : S.colors.advocateBorder,
    accent: isSkeptic ? S.colors.skeptic : S.colors.advocate,
  };
  
  return (
    <div style={{
      padding: '24px',
      background: colors.bg,
      borderRadius: S.radius.lg,
      border: `1px solid ${colors.border}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: colors.accent,
      }} />
      
      {/* Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${colors.accent}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
          {isSkeptic ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </>
          )}
        </svg>
      </div>
      
      <h3 style={{
        margin: '0 0 4px 0',
        fontSize: '16px',
        fontFamily: S.fonts.serif,
        fontWeight: 500,
        color: S.colors.text,
      }}>
        {name}
      </h3>
      <p style={{
        margin: '0 0 12px 0',
        fontSize: '12px',
        color: colors.accent,
        fontFamily: S.fonts.sans,
        fontWeight: 500,
      }}>
        {tagline}
      </p>
      <p style={{
        margin: 0,
        fontSize: '13px',
        color: S.colors.textSecondary,
        lineHeight: 1.5,
        fontFamily: S.fonts.sans,
      }}>
        {description}
      </p>
    </div>
  );
}

// =============================================================================
// MODE OPTION - REFINED
// =============================================================================

function ModeOption({
  selected,
  onClick,
  title,
  subtitle,
  description,
  iconType,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  description: string;
  iconType: 'watch' | 'defend' | 'attack';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '18px 20px',
        background: selected ? S.colors.bgCard : 'transparent',
        border: `1px solid ${selected ? S.colors.accent : S.colors.borderSubtle}`,
        borderRadius: S.radius.lg,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 150ms ease',
        boxShadow: selected ? S.shadows.sm : 'none',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.background = S.colors.bgCard;
          e.currentTarget.style.borderColor = S.colors.border;
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = S.colors.borderSubtle;
        }
      }}
    >
      {/* Icon */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: selected ? S.colors.accentLight : S.colors.bgAlt,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 150ms ease',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selected ? S.colors.accent : S.colors.textTertiary} strokeWidth="2">
          {iconType === 'watch' && (
            <>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
          {iconType === 'defend' && (
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          )}
          {iconType === 'attack' && (
            <>
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
            </>
          )}
        </svg>
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            color: selected ? S.colors.accent : S.colors.text,
            fontFamily: S.fonts.sans,
          }}>
            {title}
          </span>
          <span style={{
            fontSize: '12px',
            color: S.colors.textTertiary,
            fontFamily: S.fonts.sans,
          }}>
            {subtitle}
          </span>
        </div>
        <div style={{
          fontSize: '13px',
          color: S.colors.textSecondary,
          lineHeight: 1.4,
          fontFamily: S.fonts.sans,
        }}>
          {description}
        </div>
      </div>
      
      {/* Selected indicator */}
      {selected && (
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: S.colors.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// DEBATE VIEW - REFINED
// =============================================================================

function DebateView({
  session,
  transcript,
  isLoading,
  awaitingFounder,
  founderPrompt,
  founderInput,
  setFounderInput,
  onFounderSubmit,
  evaluation,
  transcriptEndRef,
}: {
  session: DebateSession | null;
  transcript: DebateTurn[];
  isLoading: boolean;
  awaitingFounder: boolean;
  founderPrompt: string;
  founderInput: string;
  setFounderInput: (v: string) => void;
  onFounderSubmit: () => void;
  evaluation: DebateEvaluation | null;
  transcriptEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      {/* Claim Banner */}
      {session && (
        <div style={{
          padding: '20px 24px',
          background: S.colors.bgCard,
          borderRadius: S.radius.lg,
          border: `1px solid ${S.colors.borderSubtle}`,
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: S.colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            fontFamily: S.fonts.sans,
          }}>
            Claim Under Debate
          </div>
          <div style={{
            fontSize: '17px',
            fontFamily: S.fonts.serif,
            fontStyle: 'italic',
            color: S.colors.text,
            lineHeight: 1.5,
          }}>
            "{session.claim}"
          </div>
          <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: S.colors.textTertiary,
            fontFamily: S.fonts.sans,
          }}>
            <span>Mode: <strong style={{ color: S.colors.textSecondary }}>{session.mode}</strong></span>
            <span>•</span>
            <span>Round {session.current_round} of {session.max_rounds}</span>
          </div>
        </div>
      )}
      
      {/* Transcript */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {transcript.map((turn, i) => (
          <TurnCard key={i} turn={turn} />
        ))}
        
        {isLoading && (
          <div style={{
            padding: '20px 24px',
            background: S.colors.bgCard,
            borderRadius: S.radius.lg,
            border: `1px solid ${S.colors.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              display: 'flex',
              gap: '6px',
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: S.colors.accent,
                    opacity: 0.4,
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '14px', color: S.colors.textSecondary, fontFamily: S.fonts.sans }}>
              Formulating response...
            </span>
          </div>
        )}
        
        <div ref={transcriptEndRef} />
      </div>
      
      {/* Founder Input */}
      {awaitingFounder && (
        <div style={{
          padding: '24px',
          background: S.colors.founderBg,
          borderRadius: S.radius.lg,
          border: `1px solid ${S.colors.founderBorder}`,
        }}>
          <div style={{
            fontSize: '13px',
            color: S.colors.textSecondary,
            marginBottom: '16px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontFamily: S.fonts.sans,
          }}>
            {founderPrompt}
          </div>
          <textarea
            value={founderInput}
            onChange={e => setFounderInput(e.target.value)}
            placeholder="Type your response..."
            style={{
              width: '100%',
              height: '100px',
              padding: '14px 16px',
              fontSize: '14px',
              fontFamily: S.fonts.sans,
              border: `1px solid ${S.colors.founderBorder}`,
              borderRadius: S.radius.md,
              background: S.colors.bgCard,
              resize: 'none',
              outline: 'none',
              marginBottom: '16px',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = S.colors.founder;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${S.colors.founderBg}`;
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = S.colors.founderBorder;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={onFounderSubmit}
            disabled={!founderInput.trim()}
            style={{
              padding: '12px 20px',
              background: founderInput.trim() ? S.colors.founder : S.colors.borderSubtle,
              color: founderInput.trim() ? 'white' : S.colors.textTertiary,
              border: 'none',
              borderRadius: S.radius.md,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: S.fonts.sans,
              cursor: founderInput.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 150ms ease',
            }}
          >
            Submit Response
          </button>
        </div>
      )}
      
      {/* Evaluation */}
      {evaluation && <EvaluationPanel evaluation={evaluation} />}
    </div>
  );
}

// =============================================================================
// TURN CARD - REFINED
// =============================================================================

function TurnCard({ turn }: { turn: DebateTurn }) {
  const getSpeakerInfo = (speaker: string) => {
    switch (speaker) {
      case 'skeptic':
        return {
          name: 'The Skeptic',
          color: S.colors.skeptic,
          bg: S.colors.skepticBg,
          border: S.colors.skepticBorder,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ),
        };
      case 'advocate':
        return {
          name: 'The Advocate',
          color: S.colors.advocate,
          bg: S.colors.advocateBg,
          border: S.colors.advocateBorder,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          ),
        };
      default:
        return {
          name: 'You',
          color: S.colors.founder,
          bg: S.colors.founderBg,
          border: S.colors.founderBorder,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ),
        };
    }
  };
  
  const info = getSpeakerInfo(turn.speaker);
  
  return (
    <div style={{
      padding: '20px 24px',
      background: info.bg,
      borderRadius: S.radius.lg,
      borderLeft: `4px solid ${info.color}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
      }}>
        <div style={{ color: info.color }}>
          {info.icon}
        </div>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: info.color,
          fontFamily: S.fonts.sans,
        }}>
          {info.name}
        </span>
        <span style={{
          fontSize: '11px',
          color: S.colors.textTertiary,
          padding: '3px 8px',
          background: S.colors.bgCard,
          borderRadius: S.radius.sm,
          fontFamily: S.fonts.sans,
        }}>
          {turn.turn_type === 'attack' ? 'Attacking' : 'Defending'}
        </span>
      </div>
      <div style={{
        fontSize: '15px',
        lineHeight: 1.7,
        color: S.colors.text,
        whiteSpace: 'pre-wrap',
        fontFamily: S.fonts.sans,
      }}>
        {turn.content}
      </div>
    </div>
  );
}

// =============================================================================
// EVALUATION PANEL - REFINED
// =============================================================================

function EvaluationPanel({ evaluation }: { evaluation: DebateEvaluation }) {
  const [expanded, setExpanded] = useState(true);
  
  const impactColor = evaluation.confidence_impact > 0 
    ? S.colors.advocate 
    : evaluation.confidence_impact < 0 
    ? S.colors.skeptic 
    : S.colors.textTertiary;
  
  return (
    <div style={{
      background: S.colors.bgCard,
      borderRadius: S.radius.lg,
      border: `1px solid ${S.colors.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '20px 24px',
          background: S.colors.bgAlt,
          border: 'none',
          borderBottom: expanded ? `1px solid ${S.colors.borderSubtle}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: S.colors.accentLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            color: S.colors.text,
            fontFamily: S.fonts.sans,
          }}>
            Debate Analysis
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '6px 12px',
            background: `${impactColor}15`,
            borderRadius: S.radius.md,
            fontSize: '13px',
            fontWeight: 600,
            color: impactColor,
            fontFamily: S.fonts.sans,
          }}>
            {evaluation.confidence_impact > 0 ? '+' : ''}{evaluation.confidence_impact} confidence
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={S.colors.textTertiary}
            strokeWidth="2"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div style={{ padding: '24px' }}>
          {/* Overall Assessment */}
          <div style={{
            padding: '20px',
            background: S.colors.bgAlt,
            borderRadius: S.radius.md,
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: S.colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
              fontFamily: S.fonts.sans,
            }}>
              Summary
            </div>
            <div style={{
              fontSize: '15px',
              lineHeight: 1.7,
              color: S.colors.text,
              fontFamily: S.fonts.sans,
            }}>
              {evaluation.overall_assessment}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Unresolved Risks */}
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: S.colors.skeptic,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                fontFamily: S.fonts.sans,
              }}>
                Unresolved Risks
              </div>
              {evaluation.unresolved_risks.length > 0 ? (
                evaluation.unresolved_risks.map((risk, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    background: S.colors.skepticBg,
                    borderRadius: S.radius.md,
                    marginBottom: '10px',
                    borderLeft: `3px solid ${S.colors.skeptic}`,
                  }}>
                    <div style={{
                      fontWeight: 500,
                      color: S.colors.text,
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontFamily: S.fonts.sans,
                    }}>
                      {risk.point}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: S.colors.textTertiary,
                      fontFamily: S.fonts.sans,
                    }}>
                      {risk.why_unresolved}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  fontSize: '14px',
                  color: S.colors.textTertiary,
                  fontStyle: 'italic',
                  fontFamily: S.fonts.sans,
                }}>
                  All major risks were addressed
                </div>
              )}
            </div>
            
            {/* Validated Points */}
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: S.colors.advocate,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                fontFamily: S.fonts.sans,
              }}>
                Validated Points
              </div>
              {evaluation.validated_points.length > 0 ? (
                evaluation.validated_points.map((point, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    background: S.colors.advocateBg,
                    borderRadius: S.radius.md,
                    marginBottom: '10px',
                    borderLeft: `3px solid ${S.colors.advocate}`,
                  }}>
                    <div style={{
                      fontWeight: 500,
                      color: S.colors.text,
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontFamily: S.fonts.sans,
                    }}>
                      {point.point}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: S.colors.textTertiary,
                      fontFamily: S.fonts.sans,
                    }}>
                      {point.how_addressed}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  fontSize: '14px',
                  color: S.colors.textTertiary,
                  fontStyle: 'italic',
                  fontFamily: S.fonts.sans,
                }}>
                  No points fully validated
                </div>
              )}
            </div>
          </div>
          
          {/* Recommended Actions */}
          {evaluation.recommended_actions.length > 0 && (
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: S.colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                fontFamily: S.fonts.sans,
              }}>
                Next Steps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evaluation.recommended_actions.map((action, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    background: S.colors.accentSubtle,
                    borderRadius: S.radius.md,
                    fontSize: '14px',
                    color: S.colors.text,
                    fontFamily: S.fonts.sans,
                  }}>
                    <span style={{ color: S.colors.accent, fontWeight: 600 }}>→</span>
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }
`;
if (!document.getElementById('debate-arena-styles')) {
  style.id = 'debate-arena-styles';
  document.head.appendChild(style);
}

export default DebateArena;
