/**
 * PitchTraining Component
 * Elevator pitch training with timer and LLM evaluation
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../../api';
import { useApiGraphStore } from '../../store';

// =============================================================================
// SEQUOIA BRAND STYLES
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
// TYPES
// =============================================================================

interface PitchTrainingProps {
  isOpen: boolean;
  onClose: () => void;
}

type TimerState = 'select' | 'running' | 'finished' | 'evaluating' | 'results';

interface EvaluationResult {
  score: number;
  inaccuracies: string[];
  missingEssentials: string[];
  strengths: string[];
  suggestions: string[];
  overallFeedback: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PitchTraining({ isOpen, onClose }: PitchTrainingProps) {
  const [timerState, setTimerState] = useState<TimerState>('select');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(2);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [pitchText, setPitchText] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const apiGraphStore = useApiGraphStore();
  const nodes = useMemo(() => Array.from(apiGraphStore.nodes.values()), [apiGraphStore.nodes]);
  const edges = useMemo(() => Array.from(apiGraphStore.edges.values()), [apiGraphStore.edges]);

  // Timer logic
  useEffect(() => {
    if (timerState !== 'running') return;
    
    if (timeRemaining <= 0) {
      setTimerState('finished');
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, timeRemaining]);

  // Auto-focus textarea when timer starts
  useEffect(() => {
    if (timerState === 'running' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [timerState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (timeRemaining <= 10) return S.colors.danger;
    if (timeRemaining <= 30) return S.colors.warning;
    return S.colors.accent;
  };

  const startTimer = () => {
    setTimeRemaining(selectedMinutes * 60);
    setPitchText('');
    setEvaluation(null);
    setTimerState('running');
  };

  const evaluatePitch = useCallback(async () => {
    setIsEvaluating(true);
    setTimerState('evaluating');

    try {
      // Build graph context for the LLM
      const graphContext = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          content: n.content,
          confidence: n.confidence,
        })),
        edges: edges.map(e => ({
          from: e.from,
          to: e.to,
          type: e.type,
        })),
      };

      // Create prompt for evaluation
      const evaluationPrompt = `You are an expert startup pitch evaluator. Analyze this elevator pitch against the startup's validated information graph.

## Startup Knowledge Graph:
${JSON.stringify(graphContext, null, 2)}

## Elevator Pitch (${selectedMinutes} minute${selectedMinutes > 1 ? 's' : ''}):
"${pitchText}"

## Evaluation Task:
Evaluate this pitch and return a JSON object with:
1. "score": 0-100 overall score
2. "inaccuracies": array of statements in the pitch that contradict or aren't supported by the knowledge graph
3. "missingEssentials": array of important points from the graph that should have been mentioned
4. "strengths": array of things the pitch did well
5. "suggestions": array of specific improvements
6. "overallFeedback": 2-3 sentence summary

Be specific and reference actual content from both the pitch and the graph. Return ONLY valid JSON.`;

      const response = await api.extractFromText(evaluationPrompt, false);
      
      // Parse the LLM response
      if (response.data && !response.error) {
        try {
          // Try to extract JSON from the response
          const responseText = JSON.stringify(response.data);
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setEvaluation({
              score: parsed.score || 50,
              inaccuracies: parsed.inaccuracies || [],
              missingEssentials: parsed.missingEssentials || parsed.missing_essentials || [],
              strengths: parsed.strengths || [],
              suggestions: parsed.suggestions || [],
              overallFeedback: parsed.overallFeedback || parsed.overall_feedback || 'Evaluation complete.',
            });
          } else {
            throw new Error('No JSON found in response');
          }
        } catch {
          // Fallback evaluation
          setEvaluation({
            score: 70,
            inaccuracies: [],
            missingEssentials: ['Unable to parse detailed evaluation'],
            strengths: ['Pitch was submitted successfully'],
            suggestions: ['Try again for a more detailed evaluation'],
            overallFeedback: 'Your pitch has been recorded. The detailed analysis encountered an issue, but your practice is valuable!',
          });
        }
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
      setEvaluation({
        score: 0,
        inaccuracies: [],
        missingEssentials: [],
        strengths: [],
        suggestions: [],
        overallFeedback: 'Evaluation failed. Please try again.',
      });
    } finally {
      setIsEvaluating(false);
      setTimerState('results');
    }
  }, [pitchText, nodes, edges, selectedMinutes]);

  const resetTraining = () => {
    setTimerState('select');
    setPitchText('');
    setEvaluation(null);
    setTimeRemaining(0);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: S.colors.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: S.fonts.sans,
        zIndex: 2000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '24px 40px',
          borderBottom: `1px solid ${S.colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: S.fonts.serif,
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '0.01em',
              color: S.colors.text,
              margin: 0,
            }}
          >
            Pitch Training
          </h1>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: S.colors.textTertiary,
              margin: '4px 0 0',
            }}
          >
            Elevator Pitch Practice
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: S.colors.textSecondary,
            background: 'transparent',
            border: `1px solid ${S.colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Close
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          overflow: 'auto',
        }}
      >
        {/* Timer Selection */}
        {timerState === 'select' && (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: S.colors.accentLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            
            <h2
              style={{
                fontFamily: S.fonts.serif,
                fontSize: '28px',
                fontWeight: 400,
                color: S.colors.text,
                marginBottom: '12px',
              }}
            >
              Ready to practice?
            </h2>
            
            <p
              style={{
                fontSize: '14px',
                color: S.colors.textSecondary,
                marginBottom: '32px',
                lineHeight: 1.6,
              }}
            >
              Write your elevator pitch under time pressure. When time runs out,
              our AI will evaluate it against your startup's knowledge graph.
            </p>

            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: S.colors.textTertiary,
                marginBottom: '16px',
              }}
            >
              Select Duration
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
              {[1, 2, 3, 4, 5].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedMinutes(mins)}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    border: selectedMinutes === mins ? `2px solid ${S.colors.accent}` : `1px solid ${S.colors.border}`,
                    background: selectedMinutes === mins ? S.colors.accentLight : S.colors.bgCard,
                    color: selectedMinutes === mins ? S.colors.accent : S.colors.text,
                    fontSize: '18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <button
              onClick={startTimer}
              style={{
                padding: '16px 48px',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: '#FFFFFF',
                background: S.colors.accent,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,115,84,0.25)',
                transition: 'all 150ms ease',
              }}
            >
              Start Pitch
            </button>
          </div>
        )}

        {/* Running Timer & Text Input */}
        {(timerState === 'running' || timerState === 'finished') && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            {/* Timer Display */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 300,
                  fontFamily: S.fonts.sans,
                  color: getTimerColor(),
                  letterSpacing: '-0.02em',
                  transition: 'color 300ms ease',
                }}
              >
                {formatTime(timeRemaining)}
              </div>
              {timerState === 'running' && (
                <p style={{ fontSize: '12px', color: S.colors.textTertiary, marginTop: '8px' }}>
                  Write your pitch below
                </p>
              )}
              {timerState === 'finished' && (
                <p style={{ fontSize: '12px', color: S.colors.danger, marginTop: '8px', fontWeight: 500 }}>
                  Time's up! Click "Evaluate My Pitch" to get feedback
                </p>
              )}
            </div>

            {/* Pitch Textarea */}
            <textarea
              ref={textareaRef}
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              disabled={timerState === 'finished'}
              placeholder={timerState === 'running' 
                ? "Start typing your elevator pitch... Imagine you just stepped into an elevator with a top VC partner. You have limited time to explain your startup. Go!"
                : "Time's up! Your pitch has been recorded."}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '24px',
                fontSize: '16px',
                lineHeight: 1.8,
                fontFamily: S.fonts.sans,
                color: S.colors.text,
                background: timerState === 'finished' ? S.colors.bgAlt : S.colors.bgCard,
                border: `1px solid ${timerState === 'finished' ? S.colors.borderSubtle : S.colors.border}`,
                borderRadius: '12px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 150ms ease',
                opacity: timerState === 'finished' ? 0.8 : 1,
              }}
            />

            {/* Word Count & Actions */}
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: '12px', color: S.colors.textTertiary }}>
                {pitchText.split(/\s+/).filter(Boolean).length} words
              </span>

              {timerState === 'finished' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={resetTraining}
                    style={{
                      padding: '12px 24px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.textSecondary,
                      background: 'transparent',
                      border: `1px solid ${S.colors.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={evaluatePitch}
                    disabled={!pitchText.trim()}
                    style={{
                      padding: '12px 32px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      background: pitchText.trim() ? S.colors.accent : S.colors.textTertiary,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: pitchText.trim() ? 'pointer' : 'not-allowed',
                      boxShadow: pitchText.trim() ? '0 2px 8px rgba(0,115,84,0.2)' : 'none',
                    }}
                  >
                    Evaluate My Pitch
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evaluating State */}
        {timerState === 'evaluating' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: S.colors.accentLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={S.colors.accent} 
                strokeWidth="1.5"
                style={{ animation: 'spin 2s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: S.fonts.serif,
                fontSize: '24px',
                fontWeight: 400,
                color: S.colors.text,
                marginBottom: '8px',
              }}
            >
              Analyzing your pitch...
            </h2>
            <p style={{ fontSize: '14px', color: S.colors.textSecondary }}>
              Comparing against your startup's knowledge graph
            </p>
          </div>
        )}

        {/* Results */}
        {timerState === 'results' && evaluation && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            {/* Score Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `conic-gradient(${
                    evaluation.score >= 70 ? S.colors.accent : 
                    evaluation.score >= 40 ? S.colors.warning : S.colors.danger
                  } ${evaluation.score * 3.6}deg, ${S.colors.borderSubtle} 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  padding: '8px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: S.colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ 
                    fontSize: '36px', 
                    fontWeight: 600, 
                    color: S.colors.text,
                    lineHeight: 1,
                  }}>
                    {evaluation.score}
                  </span>
                  <span style={{ fontSize: '11px', color: S.colors.textTertiary, marginTop: '2px' }}>
                    / 100
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: '15px',
                  color: S.colors.textSecondary,
                  lineHeight: 1.6,
                  maxWidth: '500px',
                  margin: '0 auto',
                }}
              >
                {evaluation.overallFeedback}
              </p>
            </div>

            {/* Feedback Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              {/* Inaccuracies */}
              {evaluation.inaccuracies.length > 0 && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: `1px solid ${S.colors.danger}30`,
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.colors.danger} strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: S.colors.danger, margin: 0 }}>
                      Inaccuracies
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: S.colors.text, lineHeight: 1.6 }}>
                    {evaluation.inaccuracies.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Essentials */}
              {evaluation.missingEssentials.length > 0 && (
                <div
                  style={{
                    background: '#FFFBEB',
                    border: `1px solid ${S.colors.warning}30`,
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.colors.warning} strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: S.colors.warning, margin: 0 }}>
                      Missing Essentials
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: S.colors.text, lineHeight: 1.6 }}>
                    {evaluation.missingEssentials.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths */}
              {evaluation.strengths.length > 0 && (
                <div
                  style={{
                    background: S.colors.accentLight,
                    border: `1px solid ${S.colors.accent}30`,
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.colors.accent} strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: S.colors.accent, margin: 0 }}>
                      Strengths
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: S.colors.text, lineHeight: 1.6 }}>
                    {evaluation.strengths.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {evaluation.suggestions.length > 0 && (
                <div
                  style={{
                    background: S.colors.bgCard,
                    border: `1px solid ${S.colors.border}`,
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.colors.textSecondary} strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: S.colors.textSecondary, margin: 0 }}>
                      Suggestions
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: S.colors.text, lineHeight: 1.6 }}>
                    {evaluation.suggestions.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={resetTraining}
                style={{
                  padding: '14px 32px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: S.colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,115,84,0.2)',
                }}
              >
                Practice Again
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '14px 32px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: S.colors.textSecondary,
                  background: 'transparent',
                  border: `1px solid ${S.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Back to Graph
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
          }
        `}
      </style>
    </div>
  );
}

export default PitchTraining;
