/**
 * QuestionCard Component
 * Renders a single follow-up question with various input types
 */

import { useState, useEffect } from 'react';
import type { FollowUpQuestion } from '../../followup/types';
import { CATEGORY_INFO, PRIORITY_INFO } from '../../followup/types';

interface QuestionCardProps {
  question: FollowUpQuestion;
  answer?: string | number | string[];
  isSkipped: boolean;
  onAnswer: (questionId: string, answer: string | number | string[]) => void;
  onSkip: (questionId: string) => void;
  isFocused?: boolean;
}

export function QuestionCard({
  question,
  answer,
  isSkipped,
  onAnswer,
  onSkip,
  isFocused = false,
}: QuestionCardProps) {
  const [localValue, setLocalValue] = useState<string | number | string[]>(answer ?? '');
  const [isSaved, setIsSaved] = useState(false);
  
  const categoryInfo = CATEGORY_INFO[question.category];
  const priorityInfo = PRIORITY_INFO[question.priority];
  
  useEffect(() => {
    if (answer !== undefined) {
      setLocalValue(answer);
    }
  }, [answer]);
  
  const handleSave = () => {
    if (localValue !== '' && localValue !== undefined) {
      onAnswer(question.id, localValue);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    }
  };
  
  const handleSkip = () => {
    onSkip(question.id);
  };
  
  const renderInput = () => {
    switch (question.inputType) {
      case 'text':
        return (
          <textarea
            value={localValue as string}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={question.placeholder}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '1px solid #D1CFC0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#007354'}
            onBlur={(e) => e.target.style.borderColor = '#D1CFC0'}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={localValue as number}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            placeholder={question.placeholder}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #D1CFC0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        );
        
      case 'select':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options?.map((option) => (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: '1px solid',
                  borderColor: localValue === option ? '#007354' : '#E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: localValue === option ? '#F0FDF4' : 'white',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={localValue === option}
                  onChange={() => setLocalValue(option)}
                  style={{ accentColor: '#007354' }}
                />
                <span style={{ fontSize: '14px' }}>{option}</span>
              </label>
            ))}
          </div>
        );
        
      case 'multiselect':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options?.map((option) => {
              const selected = Array.isArray(localValue) && localValue.includes(option);
              return (
                <label
                  key={option}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid',
                    borderColor: selected ? '#007354' : '#E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selected ? '#F0FDF4' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const arr = Array.isArray(localValue) ? [...localValue] : [];
                      if (selected) {
                        setLocalValue(arr.filter(v => v !== option));
                      } else {
                        setLocalValue([...arr, option]);
                      }
                    }}
                    style={{ accentColor: '#007354' }}
                  />
                  <span style={{ fontSize: '14px' }}>{option}</span>
                </label>
              );
            })}
          </div>
        );
        
      case 'scale':
        const [min, max] = question.scaleRange || [1, 10];
        const [minLabel, maxLabel] = question.scaleLabels || ['Low', 'High'];
        const scaleValue = typeof localValue === 'number' ? localValue : min;
        
        return (
          <div style={{ padding: '8px 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '12px',
              color: '#6B7280',
            }}>
              <span>{min} - {minLabel}</span>
              <span>{max} - {maxLabel}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={scaleValue}
              onChange={(e) => setLocalValue(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                accentColor: '#007354',
                cursor: 'pointer',
              }}
            />
            <div style={{
              textAlign: 'center',
              marginTop: '8px',
              fontSize: '20px',
              fontWeight: 600,
              color: '#007354',
            }}>
              {scaleValue}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (isSkipped) {
    return (
      <div
        style={{
          padding: '16px',
          background: '#F9FAFB',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          opacity: 0.6,
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'line-through' }}>
            {question.question}
          </span>
          <button
            onClick={() => onAnswer(question.id, '')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              color: '#007354',
              background: 'transparent',
              border: '1px solid #007354',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Answer
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        border: isFocused ? '2px solid #007354' : '1px solid #D1CFC0',
        boxShadow: isFocused ? '0 0 0 3px rgba(0, 115, 84, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: '#1B1916', lineHeight: 1.4 }}>
            {question.question}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
          <span
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              background: '#F5F4F0',
              color: '#6B7280',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {categoryInfo.icon} {categoryInfo.label}
          </span>
          <span
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              background: priorityInfo.bgColor,
              color: priorityInfo.color,
              borderRadius: '12px',
            }}
          >
            {priorityInfo.label}
          </span>
        </div>
      </div>
      
      {/* Input */}
      <div style={{ marginBottom: '16px' }}>
        {renderInput()}
      </div>
      
      {/* Reason */}
      <div style={{
        fontSize: '12px',
        color: '#6B7280',
        fontStyle: 'italic',
        marginBottom: '16px',
        padding: '8px 12px',
        background: '#F9FAFB',
        borderRadius: '6px',
      }}>
        💡 {question.reason}
      </div>
      
      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
      }}>
        {question.skippable && (
          <button
            onClick={handleSkip}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#6B7280',
              background: 'transparent',
              border: '1px solid #D1CFC0',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Skip
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={localValue === '' || localValue === undefined}
          style={{
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'white',
            background: localValue !== '' && localValue !== undefined ? '#007354' : '#D1D5DB',
            border: 'none',
            borderRadius: '6px',
            cursor: localValue !== '' && localValue !== undefined ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isSaved ? '✓ Saved' : 'Save Answer'}
        </button>
      </div>
    </div>
  );
}
