/**
 * FollowUpQuestionsPanel Component
 * Main panel for displaying and managing follow-up questions
 */

import React, { useEffect, useCallback } from 'react';
import { useFollowUpStore } from '../../followup/followupStore';
import { QuestionCard } from './QuestionCard';
import type { FollowUpQuestion } from '../../followup/types';
import { PRIORITY_INFO } from '../../followup/types';

interface FollowUpQuestionsPanelProps {
  onSubmit: (answers: Record<string, string | number | string[]>) => void;
  onClose: () => void;
}

export function FollowUpQuestionsPanel({ onSubmit, onClose }: FollowUpQuestionsPanelProps) {
  const {
    questions,
    answers,
    skipped,
    isOpen,
    answeredCount,
    totalCount,
    progress,
    answerQuestion,
    skipQuestion,
    skipAll,
    closeFollowUp,
  } = useFollowUpStore();
  
  // Check if there are any answers
  const hasAnswers = Object.values(answers).some(v => v !== '' && v !== undefined);
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    if (hasAnswers) {
      onSubmit(answers);
      closeFollowUp();
    }
  }, [hasAnswers, answers, onSubmit, closeFollowUp]);
  
  // Handle close
  const handleClose = useCallback(() => {
    closeFollowUp();
    onClose();
  }, [closeFollowUp, onClose]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSubmit, handleClose]);
  
  if (!isOpen || questions.length === 0) return null;
  
  // Group questions by priority
  const groupedQuestions = {
    high: questions.filter(q => q.priority === 'high'),
    medium: questions.filter(q => q.priority === 'medium'),
    low: questions.filter(q => q.priority === 'low'),
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '480px',
        height: '100vh',
        background: '#FAFAF8',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001, // Above diff panel
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E7EB',
          background: 'white',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#1B1916',
            }}>
              Help us understand better
            </h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#6B7280',
            }}>
              Answer what you can, skip what you don't know
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        
        {/* Progress bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            flex: 1,
            height: '6px',
            background: '#E5E7EB',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: '#007354',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#6B7280',
            whiteSpace: 'nowrap',
          }}>
            {answeredCount} of {totalCount}
          </span>
        </div>
        
        {/* Keyboard hints */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginTop: '12px',
          fontSize: '11px',
          color: '#9CA3AF',
        }}>
          <span>
            <kbd style={kbdStyle}>⌘</kbd>
            <kbd style={kbdStyle}>↵</kbd>
            {' '}submit
          </span>
          <span>
            <kbd style={kbdStyle}>esc</kbd>
            {' '}close
          </span>
        </div>
      </div>
      
      {/* Questions List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
        }}
      >
        {/* High Priority */}
        {groupedQuestions.high.length > 0 && (
          <QuestionGroup
            title="Important"
            priority="high"
            questions={groupedQuestions.high}
            answers={answers}
            skipped={skipped}
            onAnswer={answerQuestion}
            onSkip={skipQuestion}
          />
        )}
        
        {/* Medium Priority */}
        {groupedQuestions.medium.length > 0 && (
          <QuestionGroup
            title="Helpful"
            priority="medium"
            questions={groupedQuestions.medium}
            answers={answers}
            skipped={skipped}
            onAnswer={answerQuestion}
            onSkip={skipQuestion}
          />
        )}
        
        {/* Low Priority */}
        {groupedQuestions.low.length > 0 && (
          <QuestionGroup
            title="Nice to have"
            priority="low"
            questions={groupedQuestions.low}
            answers={answers}
            skipped={skipped}
            onAnswer={answerQuestion}
            onSkip={skipQuestion}
          />
        )}
      </div>
      
      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #E5E7EB',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={skipAll}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#6B7280',
            background: 'transparent',
            border: '1px solid #D1CFC0',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Skip All
        </button>
        
        <button
          onClick={handleSubmit}
          disabled={!hasAnswers}
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            color: hasAnswers ? 'white' : '#9CA3AF',
            background: hasAnswers ? '#007354' : '#E5E7EB',
            border: 'none',
            borderRadius: '8px',
            cursor: hasAnswers ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          Submit {answeredCount > 0 ? `${answeredCount} Answer${answeredCount !== 1 ? 's' : ''}` : 'Answers'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// QUESTION GROUP
// =============================================================================

interface QuestionGroupProps {
  title: string;
  priority: 'high' | 'medium' | 'low';
  questions: FollowUpQuestion[];
  answers: Record<string, string | number | string[]>;
  skipped: Set<string>;
  onAnswer: (questionId: string, answer: string | number | string[]) => void;
  onSkip: (questionId: string) => void;
}

function QuestionGroup({
  title,
  priority,
  questions,
  answers,
  skipped,
  onAnswer,
  onSkip,
}: QuestionGroupProps) {
  const priorityInfo = PRIORITY_INFO[priority];
  
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: priorityInfo.color,
          }}
        />
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: '12px',
          color: '#9CA3AF',
        }}>
          ({questions.length})
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            answer={answers[question.id]}
            isSkipped={skipped.has(question.id)}
            onAnswer={onAnswer}
            onSkip={onSkip}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 5px',
  fontSize: '10px',
  fontFamily: 'monospace',
  background: '#F3F4F6',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  marginRight: '2px',
};
