/**
 * useFollowUpActions Hook
 * 
 * React hook that provides follow-up question actions to UI components.
 * Bridges the FollowUpService to React with proper state management.
 */

import { useCallback } from 'react';
import { useFollowUpStore } from '../../followup';
import { FollowUpService, PipelineService } from '../../core/services';
import type { FollowUpQuestion, QuestionAnswer } from '../../followup/types';
import type { ParsedInput, ProposedChange } from '../../pipeline/types';

// =============================================================================
// HOOK
// =============================================================================

export function useFollowUpActions() {
  // Follow-up store state (reactive)
  const {
    isOpen,
    questions,
    answers,
    skipped,
    submitted,
    openFollowUp,
    closeFollowUp,
    setAnswer,
    skipQuestion,
    submitAnswers,
    reset: resetStore,
  } = useFollowUpStore();
  
  // Progress calculation
  const progress = {
    answered: answers.length,
    skipped: skipped.length,
    total: questions.length,
    percentage: questions.length > 0 
      ? Math.round(((answers.length + skipped.length) / questions.length) * 100) 
      : 0,
  };
  
  // Generate questions and open panel
  const generateAndShow = useCallback((
    originalInput: string,
    parsedInput: Partial<ParsedInput>,
    maxQuestions: number = 5
  ) => {
    const result = FollowUpService.generateQuestions(
      originalInput,
      parsedInput,
      maxQuestions
    );
    
    if (result.questions.length > 0) {
      openFollowUp(result.questions, originalInput);
    }
    
    return result;
  }, [openFollowUp]);
  
  // Answer a question
  const answerQuestion = useCallback((
    questionId: string,
    answer: string | number | string[]
  ) => {
    setAnswer(questionId, answer);
  }, [setAnswer]);
  
  // Skip a question
  const skip = useCallback((questionId: string) => {
    skipQuestion(questionId);
  }, [skipQuestion]);
  
  // Submit all answers and process through pipeline
  const submitAndProcess = useCallback(async () => {
    submitAnswers();
    
    const store = useFollowUpStore.getState();
    const { originalInput, answers } = store;
    
    if (!originalInput || answers.length === 0) {
      return { combinedInput: '', changes: [] as ProposedChange[] };
    }
    
    // Process answers through the pipeline
    const result = FollowUpService.processAnswers(originalInput, answers);
    
    return {
      combinedInput: result.combinedInput,
      changes: result.pipelineResult.changes,
    };
  }, [submitAnswers]);
  
  // Check if question is answered
  const isAnswered = useCallback((questionId: string) => {
    return FollowUpService.isQuestionAnswered(questionId);
  }, []);
  
  // Check if question is skipped
  const isSkipped = useCallback((questionId: string) => {
    return FollowUpService.isQuestionSkipped(questionId);
  }, []);
  
  // Get questions by priority
  const getByPriority = useCallback((priority: 'high' | 'medium' | 'low') => {
    return FollowUpService.getQuestionsByPriority(questions, priority);
  }, [questions]);
  
  // Sort questions by priority
  const sortedQuestions = FollowUpService.sortByPriority(questions);
  
  // Get session summary
  const getSummary = useCallback(() => {
    return FollowUpService.generateSessionSummary();
  }, []);
  
  // Reset everything
  const reset = useCallback(() => {
    resetStore();
  }, [resetStore]);
  
  // Close panel
  const close = useCallback(() => {
    closeFollowUp();
  }, [closeFollowUp]);
  
  return {
    // State
    isOpen,
    questions,
    sortedQuestions,
    answers,
    skipped,
    submitted,
    progress,
    
    // Actions
    generateAndShow,
    answerQuestion,
    skip,
    submitAndProcess,
    isAnswered,
    isSkipped,
    getByPriority,
    getSummary,
    reset,
    close,
    open: openFollowUp,
  };
}

export default useFollowUpActions;
