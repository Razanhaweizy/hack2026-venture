/**
 * PathDetectionWizard Component
 * Helps users identify their PMF path through guided questions
 */

import { useState, useCallback } from 'react';
import type { PmfPath } from '../../types/graph';
import { PMF_PATH_CONFIGS } from '../../types/graph';

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
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface PathDetectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPathSelected: (path: PmfPath, confidence: number) => void;
}

interface DetectionQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    label: string;
    scores: Record<PmfPath, number>;
  }[];
}

// =============================================================================
// DETECTION QUESTIONS
// =============================================================================

const DETECTION_QUESTIONS: DetectionQuestion[] = [
  {
    id: 'searching',
    question: 'When you talk to potential customers, are they already looking for solutions?',
    options: [
      {
        id: 'yes_actively',
        label: 'Yes, they\'re actively Googling, asking peers, or comparing products',
        scores: { hair_on_fire: 3, hard_fact: 0, future_vision: 0 },
      },
      {
        id: 'sort_of',
        label: 'Sort of - they know it\'s a problem but aren\'t actively looking',
        scores: { hair_on_fire: 1, hard_fact: 2, future_vision: 0 },
      },
      {
        id: 'no',
        label: 'No, I have to explain why this is even a problem',
        scores: { hair_on_fire: 0, hard_fact: 1, future_vision: 3 },
      },
    ],
  },
  {
    id: 'comparison',
    question: 'Do they compare you to existing products, or do you have to explain the category?',
    options: [
      {
        id: 'compare',
        label: 'They compare us to specific competitors or existing tools',
        scores: { hair_on_fire: 3, hard_fact: 1, future_vision: 0 },
      },
      {
        id: 'compare_workarounds',
        label: 'They compare us to their current workaround (spreadsheets, manual process)',
        scores: { hair_on_fire: 0, hard_fact: 3, future_vision: 0 },
      },
      {
        id: 'explain',
        label: 'I have to explain what category we\'re even in',
        scores: { hair_on_fire: 0, hard_fact: 0, future_vision: 3 },
      },
    ],
  },
  {
    id: 'belief',
    question: 'Do they believe this problem can be solved?',
    options: [
      {
        id: 'yes_looking',
        label: 'Yes, and they\'re actively looking for the best solution',
        scores: { hair_on_fire: 3, hard_fact: 0, future_vision: 0 },
      },
      {
        id: 'accept',
        label: 'They\'ve accepted it as "just how things are"',
        scores: { hair_on_fire: 0, hard_fact: 3, future_vision: 0 },
      },
      {
        id: 'skeptical',
        label: 'They\'re skeptical - "that\'s impossible" or "we don\'t need that"',
        scores: { hair_on_fire: 0, hard_fact: 0, future_vision: 3 },
      },
    ],
  },
  {
    id: 'timeline',
    question: 'If you pitched a perfect solution, how would they react?',
    options: [
      {
        id: 'buy_now',
        label: '"Show me a demo, let\'s talk pricing"',
        scores: { hair_on_fire: 3, hard_fact: 0, future_vision: 0 },
      },
      {
        id: 'interested',
        label: '"Interesting, but we\'d need to see it work first"',
        scores: { hair_on_fire: 1, hard_fact: 3, future_vision: 0 },
      },
      {
        id: 'doubt',
        label: '"Yeah right" or polite skepticism',
        scores: { hair_on_fire: 0, hard_fact: 0, future_vision: 3 },
      },
    ],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function PathDetectionWizard({
  isOpen,
  onClose,
  onPathSelected,
}: PathDetectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<PmfPath, number>>({
    hair_on_fire: 0,
    hard_fact: 0,
    future_vision: 0,
  });
  const [showResult, setShowResult] = useState(false);
  
  const currentQuestion = DETECTION_QUESTIONS[currentStep];
  const progress = ((currentStep) / DETECTION_QUESTIONS.length) * 100;
  
  const handleOptionSelect = useCallback((optionId: string) => {
    const option = currentQuestion.options.find(o => o.id === optionId);
    if (!option) return;
    
    // Update answers
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));
    
    // Update scores
    setScores(prev => ({
      hair_on_fire: prev.hair_on_fire + option.scores.hair_on_fire,
      hard_fact: prev.hard_fact + option.scores.hard_fact,
      future_vision: prev.future_vision + option.scores.future_vision,
    }));
    
    // Move to next question or show result
    if (currentStep < DETECTION_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  }, [currentQuestion, currentStep]);
  
  const handleBack = () => {
    if (showResult) {
      setShowResult(false);
      return;
    }
    if (currentStep > 0) {
      // Remove the score from the previous answer
      const prevAnswer = answers[currentQuestion.id];
      if (prevAnswer) {
        const option = currentQuestion.options.find(o => o.id === prevAnswer);
        if (option) {
          setScores(prev => ({
            hair_on_fire: prev.hair_on_fire - option.scores.hair_on_fire,
            hard_fact: prev.hard_fact - option.scores.hard_fact,
            future_vision: prev.future_vision - option.scores.future_vision,
          }));
        }
      }
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const getResult = () => {
    const maxScore = Math.max(scores.hair_on_fire, scores.hard_fact, scores.future_vision);
    const totalScore = scores.hair_on_fire + scores.hard_fact + scores.future_vision;
    
    let detectedPath: PmfPath;
    if (scores.hair_on_fire >= scores.hard_fact && scores.hair_on_fire >= scores.future_vision) {
      detectedPath = 'hair_on_fire';
    } else if (scores.hard_fact >= scores.future_vision) {
      detectedPath = 'hard_fact';
    } else {
      detectedPath = 'future_vision';
    }
    
    // Calculate confidence (0-100)
    const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) : 50;
    
    return { path: detectedPath, confidence };
  };
  
  const handleConfirm = () => {
    const result = getResult();
    onPathSelected(result.path, result.confidence);
    onClose();
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
        background: 'rgba(27, 25, 22, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        fontFamily: S.fonts.sans,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: S.colors.bg,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(27, 25, 22, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${S.colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: S.fonts.serif,
                fontSize: '20px',
                fontWeight: 400,
                color: S.colors.text,
                margin: 0,
              }}
            >
              {showResult ? 'Your Path' : 'Find Your Path'}
            </h2>
            {!showResult && (
              <p style={{ fontSize: '12px', color: S.colors.textTertiary, margin: '4px 0 0' }}>
                Question {currentStep + 1} of {DETECTION_QUESTIONS.length}
              </p>
            )}
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
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {/* Progress */}
        {!showResult && (
          <div style={{ height: '3px', background: S.colors.borderSubtle }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: S.colors.accent,
                transition: 'width 300ms ease',
              }}
            />
          </div>
        )}
        
        {/* Content */}
        <div style={{ padding: '24px' }}>
          {!showResult ? (
            <>
              <h3
                style={{
                  fontFamily: S.fonts.serif,
                  fontSize: '18px',
                  fontWeight: 400,
                  color: S.colors.text,
                  margin: '0 0 20px',
                  lineHeight: 1.4,
                }}
              >
                {currentQuestion.question}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      textAlign: 'left',
                      background: answers[currentQuestion.id] === option.id ? S.colors.accentLight : S.colors.bgCard,
                      border: `1px solid ${answers[currentQuestion.id] === option.id ? S.colors.accent : S.colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: S.colors.text,
                      lineHeight: 1.4,
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (answers[currentQuestion.id] !== option.id) {
                        e.currentTarget.style.borderColor = S.colors.accent + '60';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (answers[currentQuestion.id] !== option.id) {
                        e.currentTarget.style.borderColor = S.colors.border;
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            // Result
            <>
              {(() => {
                const result = getResult();
                const config = PMF_PATH_CONFIGS[result.path];
                
                return (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
                      {config.icon}
                    </span>
                    <h3
                      style={{
                        fontFamily: S.fonts.serif,
                        fontSize: '24px',
                        fontWeight: 400,
                        color: S.colors.text,
                        margin: '0 0 8px',
                      }}
                    >
                      {config.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        color: S.colors.textSecondary,
                        margin: '0 0 16px',
                        lineHeight: 1.5,
                      }}
                    >
                      {config.shortDescription}
                    </p>
                    
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: S.colors.accentLight,
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: S.colors.accent,
                        fontWeight: 500,
                        marginBottom: '24px',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      {(() => {
                        const n = result.confidence / 100;
                        if (n >= 0.75) return 'High confidence';
                        if (n >= 0.55) return 'Good confidence';
                        if (n >= 0.35) return 'Moderate confidence';
                        return 'Low confidence';
                      })()}
                    </div>
                    
                    {/* Score breakdown */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center',
                        marginBottom: '24px',
                      }}
                    >
                      {(['hair_on_fire', 'hard_fact', 'future_vision'] as PmfPath[]).map((p) => {
                        const pathConfig = PMF_PATH_CONFIGS[p];
                        const isSelected = result.path === p;
                        return (
                          <div
                            key={p}
                            style={{
                              padding: '10px 14px',
                              background: isSelected ? S.colors.accentLight : S.colors.bgCard,
                              border: `1px solid ${isSelected ? S.colors.accent : S.colors.borderSubtle}`,
                              borderRadius: '6px',
                              textAlign: 'center',
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>{pathConfig.icon}</span>
                            <p style={{ fontSize: '10px', color: S.colors.textTertiary, margin: '4px 0 0' }}>
                              {scores[p]} pts
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    
                    <p style={{ fontSize: '12px', color: S.colors.textTertiary, margin: '0 0 4px' }}>
                      You can always change this later in settings.
                    </p>
                  </div>
                );
              })()}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${S.colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {(currentStep > 0 || showResult) ? (
            <button
              onClick={handleBack}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 500,
                color: S.colors.textSecondary,
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          ) : (
            <div />
          )}
          
          {showResult && (
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: S.colors.accent,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Confirm & Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PathDetectionWizard;
