/**
 * OnboardingForm Component
 * Sequoia-styled onboarding questionnaire for startup validation
 * Includes PMF path detection as the first step
 */

import { useState, useCallback, useMemo } from 'react';
import type { PmfPath } from '../../types/graph';

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
    danger: '#D4442E',
    warning: '#E5A826',
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingFormProps {
  onComplete: (answers: Record<string, string>, pmfPath: PmfPath | null) => void;
  onProcessAnswer: (questionLabel: string, answer: string) => Promise<void>;
  onPathSelected?: (path: PmfPath) => void;
}

interface TextQuestion {
  id: string;
  type: 'text';
  question: string;
  placeholder: string;
  category: string;
}

interface PathChoiceQuestion {
  id: string;
  type: 'path_choice';
  question: string;
  category: string;
}

type Question = TextQuestion | PathChoiceQuestion;

// =============================================================================
// PMF PATH OPTIONS
// =============================================================================

interface PathOption {
  id: PmfPath;
  icon: string;
  title: string;
  description: string;
  examples: string;
}

const PATH_OPTIONS: PathOption[] = [
  {
    id: 'hair_on_fire',
    icon: '🔥',
    title: "They're actively searching for solutions",
    description: 'Looking for tools, comparing options, ready to buy',
    examples: 'They\'re Googling for solutions, asking peers for recommendations',
  },
  {
    id: 'hard_fact',
    icon: '📊',
    title: 'They\'ve accepted it as "just how things are"',
    description: 'Using workarounds, not actively looking for better',
    examples: 'Manual spreadsheets, "that\'s just what we do", accepted friction',
  },
  {
    id: 'future_vision',
    icon: '🔮',
    title: "They don't know they have this problem",
    description: "Would be skeptical, don't believe it can be solved",
    examples: '"That\'s impossible", "We don\'t need that", paradigm shift required',
  },
];

// =============================================================================
// PATH-SPECIFIC FOLLOW-UP QUESTIONS
// =============================================================================

const PATH_FOLLOWUP_QUESTIONS: Record<PmfPath, TextQuestion[]> = {
  hair_on_fire: [
    {
      id: 'hof_competitors',
      type: 'text',
      question: 'What are customers currently Googling to find solutions?',
      placeholder: 'List the search terms, keywords, and phrases they use...',
      category: '🔥 Hair on Fire',
    },
    {
      id: 'hof_evaluation',
      type: 'text',
      question: 'Who are you competing against for these customers?',
      placeholder: 'Name specific competitors they\'re comparing you to...',
      category: '🔥 Hair on Fire',
    },
    {
      id: 'hof_switch',
      type: 'text',
      question: 'How are they evaluating options right now?',
      placeholder: 'What criteria matter most? Price, features, speed, integrations?',
      category: '🔥 Hair on Fire',
    },
  ],
  hard_fact: [
    {
      id: 'hf_workaround',
      type: 'text',
      question: 'What workaround do they currently use?',
      placeholder: 'Spreadsheets? Manual processes? Hiring people? Ignoring it?',
      category: '📊 Hard Fact',
    },
    {
      id: 'hf_trigger',
      type: 'text',
      question: 'What would trigger them to look for a better way?',
      placeholder: 'What event or pain point would make them reconsider?',
      category: '📊 Hard Fact',
    },
    {
      id: 'hf_tried',
      type: 'text',
      question: 'Have they tried to solve this before? What happened?',
      placeholder: 'Past attempts, why they failed, lessons learned...',
      category: '📊 Hard Fact',
    },
  ],
  future_vision: [
    {
      id: 'fv_stepping_stone',
      type: 'text',
      question: 'What\'s your "stepping stone" product that makes money while you build the vision?',
      placeholder: 'The pit stop that generates revenue NOW while the market catches up...',
      category: '🔮 Future Vision',
    },
    {
      id: 'fv_believers',
      type: 'text',
      question: 'Who are the early believers, and why do they believe?',
      placeholder: 'The 10 people who "get it" - what do they see that others don\'t?',
      category: '🔮 Future Vision',
    },
    {
      id: 'fv_possible',
      type: 'text',
      question: 'What needs to happen for people to believe this is possible?',
      placeholder: 'Technology shifts, cultural changes, proof points needed...',
      category: '🔮 Future Vision',
    },
  ],
};

// =============================================================================
// QUESTIONS
// =============================================================================

// Base questions (without path-specific ones)
const BASE_QUESTIONS: Question[] = [
  // First question: Path detection
  {
    id: 'pmf_path',
    type: 'path_choice',
    question: 'How do your customers relate to this problem today?',
    category: 'Strategy',
  },
  // Standard questions
  {
    id: 'problem_who',
    type: 'text',
    question: 'Who has this problem?',
    placeholder: 'Describe your target customer in detail...',
    category: 'Problem',
  },
  {
    id: 'solution_what',
    type: 'text',
    question: 'What do you build?',
    placeholder: 'Describe your product or service concretely...',
    category: 'Solution',
  },
  {
    id: 'solution_different',
    type: 'text',
    question: 'How is it different (not just better)?',
    placeholder: 'What makes it fundamentally different? What\'s the 10x improvement?',
    category: 'Solution',
  },
  {
    id: 'timing_why_now',
    type: 'text',
    question: 'Why now?',
    placeholder: 'What makes now the right time? Why would this not have worked 5 years ago?',
    category: 'Timing',
  },
  {
    id: 'founder_domain',
    type: 'text',
    question: 'Domain expertise',
    placeholder: 'What relevant domain expertise do you have?',
    category: 'Founder',
  },
  {
    id: 'founder_technical',
    type: 'text',
    question: 'Technical ability',
    placeholder: 'Can you build the product yourself? What\'s your technical background?',
    category: 'Founder',
  },
  {
    id: 'competition_direct',
    type: 'text',
    question: 'Direct competitors',
    placeholder: 'Who offers a similar solution to the same problem?',
    category: 'Competition',
  },
  {
    id: 'competition_indirect',
    type: 'text',
    question: 'Indirect competitors',
    placeholder: 'What alternatives do customers use even if not directly competing?',
    category: 'Competition',
  },
  {
    id: 'founder_cofounder',
    type: 'text',
    question: 'Co-founder needs',
    placeholder: 'Do you need a co-founder? What profile would complement you?',
    category: 'Founder',
  },
  {
    id: 'business_model_revenue',
    type: 'text',
    question: 'How do you make money?',
    placeholder: 'Subscription, transaction, advertising, licensing?',
    category: 'Business Model',
  },
];

// Function to get questions based on selected path
function getQuestionsForPath(path: PmfPath | null): Question[] {
  if (!path) {
    return BASE_QUESTIONS;
  }
  
  // Insert path-specific follow-ups after the path choice question
  const pathFollowups = PATH_FOLLOWUP_QUESTIONS[path];
  const result: Question[] = [
    BASE_QUESTIONS[0], // Path choice
    ...pathFollowups,  // Path-specific follow-ups
    ...BASE_QUESTIONS.slice(1), // Rest of standard questions
  ];
  
  return result;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OnboardingForm({ onComplete, onProcessAnswer, onPathSelected }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedPath, setSelectedPath] = useState<PmfPath | null>(null);
  const [processingCount, setProcessingCount] = useState(0);
  const [processedSteps, setProcessedSteps] = useState<Set<number>>(new Set());
  const [submittedSteps, setSubmittedSteps] = useState<Set<number>>(new Set());
  const [showPathHelp, setShowPathHelp] = useState(false);

  // Get questions dynamically based on selected path
  const questions = useMemo(() => getQuestionsForPath(selectedPath), [selectedPath]);
  
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep) / questions.length) * 100;
  const isLastQuestion = currentStep === questions.length - 1;
  const isProcessing = processingCount > 0;
  const isPathQuestion = currentQuestion?.type === 'path_choice';

  // Handle path selection
  const handlePathSelect = useCallback((path: PmfPath) => {
    setSelectedPath(path);
    onPathSelected?.(path);
  }, [onPathSelected]);

  const handleNext = () => {
    if (isPathQuestion) {
      // Path question - just save and move on
      if (selectedPath) {
        const newAnswers = { ...answers, pmf_path: selectedPath };
        setAnswers(newAnswers);
        setCurrentStep(prev => prev + 1);
        setCurrentAnswer(answers[questions[currentStep + 1]?.id] || '');
      }
      return;
    }

    // Text question - save and process
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: currentAnswer,
    };
    setAnswers(newAnswers);

    // Process answer with AI in background (non-blocking)
    if (currentAnswer.trim() && !submittedSteps.has(currentStep)) {
      const stepToProcess = currentStep;
      const questionText = currentQuestion.question;
      const answerText = currentAnswer;
      
      setSubmittedSteps(prev => new Set(prev).add(stepToProcess));
      setProcessingCount(prev => prev + 1);
      
      onProcessAnswer(questionText, answerText)
        .then(() => {
          setProcessedSteps(prev => new Set(prev).add(stepToProcess));
        })
        .catch((err) => {
          console.error('Failed to process answer:', err);
        })
        .finally(() => {
          setProcessingCount(prev => prev - 1);
        });
    }

    if (isLastQuestion) {
      onComplete(newAnswers, selectedPath);
    } else {
      setCurrentStep(prev => prev + 1);
      setCurrentAnswer(answers[questions[currentStep + 1]?.id] || '');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (!isPathQuestion) {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentAnswer,
        }));
      }
      setCurrentStep(prev => prev - 1);
      const prevQuestion = questions[currentStep - 1];
      if (prevQuestion?.type === 'text') {
        setCurrentAnswer(answers[prevQuestion.id] || '');
      }
    }
  };

  const handleSkip = () => {
    if (!isLastQuestion && !isPathQuestion) {
      setCurrentStep(prev => prev + 1);
      setCurrentAnswer(answers[questions[currentStep + 1]?.id] || '');
    }
  };

  // Determine if Continue should be enabled
  const canContinue = isPathQuestion ? selectedPath !== null : true;

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
            Ideograph
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
            Onboarding
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              fontSize: '12px',
              color: S.colors.textTertiary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {currentStep + 1} of {questions.length}
            {/* Background processing indicator */}
            {isProcessing && (
              <span style={{ 
                fontSize: '10px', 
                color: S.colors.accent,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <svg 
                  width="10" 
                  height="10" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                {processingCount} syncing
              </span>
            )}
            {!isProcessing && processedSteps.size > 0 && (
              <span style={{ 
                fontSize: '10px', 
                color: S.colors.accent,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                synced
              </span>
            )}
          </span>
          <div
            style={{
              width: '120px',
              height: '4px',
              background: S.colors.borderSubtle,
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: S.colors.accent,
                borderRadius: '2px',
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: isPathQuestion ? '720px' : '640px',
          }}
        >
          {/* Category Badge */}
          <div
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: S.colors.accent,
              background: S.colors.accentLight,
              padding: '6px 12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {currentQuestion.category}
          </div>

          {/* Question */}
          <h2
            style={{
              fontFamily: S.fonts.serif,
              fontSize: isPathQuestion ? '28px' : '32px',
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: '0.01em',
              color: S.colors.text,
              marginBottom: isPathQuestion ? '12px' : '32px',
            }}
          >
            {currentQuestion.question}
          </h2>

          {/* Path Choice Question */}
          {isPathQuestion && (
            <>
              <p
                style={{
                  fontSize: '14px',
                  color: S.colors.textSecondary,
                  marginBottom: '28px',
                  lineHeight: 1.5,
                }}
              >
                This determines your startup's strategic playbook. Each path requires a fundamentally different approach.
              </p>

              {/* Path Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {PATH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePathSelect(option.id)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      textAlign: 'left',
                      background: selectedPath === option.id ? S.colors.accentLight : S.colors.bgCard,
                      border: `2px solid ${selectedPath === option.id ? S.colors.accent : S.colors.border}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPath !== option.id) {
                        e.currentTarget.style.borderColor = S.colors.accent + '60';
                        e.currentTarget.style.background = S.colors.bgAlt;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPath !== option.id) {
                        e.currentTarget.style.borderColor = S.colors.border;
                        e.currentTarget.style.background = S.colors.bgCard;
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      {/* Icon */}
                      <span style={{ fontSize: '28px', lineHeight: 1 }}>{option.icon}</span>
                      
                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                          <span
                            style={{
                              fontFamily: S.fonts.serif,
                              fontSize: '16px',
                              fontWeight: 400,
                              color: S.colors.text,
                            }}
                          >
                            {option.title}
                          </span>
                          {selectedPath === option.id && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={S.colors.accent} stroke="none">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="8 12 11 15 16 9" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
                            </svg>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: '13px',
                            color: S.colors.textSecondary,
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {option.description}
                        </p>
                        <p
                          style={{
                            fontSize: '11px',
                            color: S.colors.textTertiary,
                            margin: '8px 0 0',
                            fontStyle: 'italic',
                          }}
                        >
                          e.g., {option.examples}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Help link */}
              <button
                onClick={() => setShowPathHelp(!showPathHelp)}
                style={{
                  padding: '8px 0',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: S.colors.accent,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Not sure which one? Here's how to tell
              </button>

              {showPathHelp && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '20px',
                    background: S.colors.bgAlt,
                    borderRadius: '8px',
                    border: `1px solid ${S.colors.borderSubtle}`,
                  }}
                >
                  <h4
                    style={{
                      fontFamily: S.fonts.serif,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: S.colors.text,
                      margin: '0 0 12px',
                    }}
                  >
                    Ask yourself these questions:
                  </h4>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '13px',
                      color: S.colors.textSecondary,
                      lineHeight: 1.7,
                    }}
                  >
                    <li><strong>Are they Googling for solutions?</strong> → Hair on Fire 🔥</li>
                    <li><strong>Do they use workarounds like spreadsheets?</strong> → Hard Fact 📊</li>
                    <li><strong>Would they laugh if you pitched them?</strong> → Future Vision 🔮</li>
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Text Question */}
          {!isPathQuestion && currentQuestion.type === 'text' && (
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={(currentQuestion as TextQuestion).placeholder}
              style={{
                width: '100%',
                minHeight: '160px',
                padding: '20px 24px',
                fontSize: '16px',
                lineHeight: 1.6,
                fontFamily: S.fonts.sans,
                color: S.colors.text,
                background: S.colors.bgCard,
                border: `1px solid ${S.colors.border}`,
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
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
              autoFocus
            />
          )}

          {/* Navigation Buttons */}
          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  style={{
                    padding: '12px 24px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: S.colors.textSecondary,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = S.colors.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = S.colors.textSecondary)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {!isLastQuestion && !isPathQuestion && (
                <button
                  onClick={handleSkip}
                  style={{
                    padding: '12px 24px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: S.colors.textTertiary,
                    background: 'transparent',
                    border: `1px solid ${S.colors.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = S.colors.textTertiary;
                    e.currentTarget.style.color = S.colors.textSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = S.colors.border;
                    e.currentTarget.style.color = S.colors.textTertiary;
                  }}
                >
                  Skip
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={!canContinue}
                style={{
                  padding: '12px 32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: '#FFFFFF',
                  background: canContinue ? S.colors.accent : S.colors.border,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 150ms ease',
                  boxShadow: canContinue ? '0 2px 8px rgba(0,115,84,0.2)' : 'none',
                  opacity: canContinue ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (canContinue) {
                    e.currentTarget.style.background = S.colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,115,84,0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canContinue) {
                    e.currentTarget.style.background = S.colors.accent;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,115,84,0.2)';
                  }
                }}
              >
                {isLastQuestion ? 'Finish' : 'Continue'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '20px 40px',
          borderTop: `1px solid ${S.colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            color: isProcessing ? S.colors.accent : S.colors.textTertiary,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {isProcessing ? (
            <>
              <span style={{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: S.colors.accent,
                animation: 'pulse 1s ease-in-out infinite',
              }} />
              AI building your graph in background • Keep answering
            </>
          ) : (
            'Your answers are synced to your startup validation graph'
          )}
        </p>
      </div>
      
      {/* Keyframe animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  );
}

export default OnboardingForm;
