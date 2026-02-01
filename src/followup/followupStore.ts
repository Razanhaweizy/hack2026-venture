/**
 * Follow-up Questions Store
 * Zustand store for managing follow-up question state
 */

import { create } from 'zustand';
import type { FollowUpQuestion, FollowUpState } from './types';

interface FollowUpActions {
  // Open/close
  openFollowUp: (questions: FollowUpQuestion[]) => void;
  closeFollowUp: () => void;
  
  // Answer management
  answerQuestion: (questionId: string, answer: string | number | string[]) => void;
  skipQuestion: (questionId: string) => void;
  skipAll: () => void;
  
  // Reset
  reset: () => void;
  
  // Submit
  setSubmitted: (submitted: boolean) => void;
}

type FollowUpStore = FollowUpState & FollowUpActions;

const initialState: FollowUpState = {
  questions: [],
  answers: {},
  skipped: new Set<string>(),
  submitted: false,
  isOpen: false,
  answeredCount: 0,
  totalCount: 0,
  progress: 0,
};

export const useFollowUpStore = create<FollowUpStore>((set, get) => ({
  ...initialState,
  
  openFollowUp: (questions: FollowUpQuestion[]) => {
    set({
      questions,
      answers: {},
      skipped: new Set<string>(),
      submitted: false,
      isOpen: true,
      answeredCount: 0,
      totalCount: questions.length,
      progress: 0,
    });
  },
  
  closeFollowUp: () => {
    set({ isOpen: false });
  },
  
  answerQuestion: (questionId: string, answer: string | number | string[]) => {
    const state = get();
    const newAnswers = { ...state.answers, [questionId]: answer };
    const newSkipped = new Set(state.skipped);
    newSkipped.delete(questionId); // Remove from skipped if was skipped
    
    const answeredCount = Object.keys(newAnswers).filter(
      id => newAnswers[id] !== '' && newAnswers[id] !== undefined
    ).length;
    
    const totalCount = state.questions.length;
    const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
    
    set({
      answers: newAnswers,
      skipped: newSkipped,
      answeredCount,
      progress,
    });
  },
  
  skipQuestion: (questionId: string) => {
    const state = get();
    const newSkipped = new Set(state.skipped);
    newSkipped.add(questionId);
    
    // Remove from answers if was answered
    const newAnswers = { ...state.answers };
    delete newAnswers[questionId];
    
    const answeredCount = Object.keys(newAnswers).filter(
      id => newAnswers[id] !== '' && newAnswers[id] !== undefined
    ).length;
    
    const totalCount = state.questions.length;
    const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
    
    set({
      skipped: newSkipped,
      answers: newAnswers,
      answeredCount,
      progress,
    });
  },
  
  skipAll: () => {
    const state = get();
    const newSkipped = new Set(state.questions.map(q => q.id));
    
    set({
      skipped: newSkipped,
      answers: {},
      answeredCount: 0,
      progress: 0,
    });
  },
  
  reset: () => {
    set(initialState);
  },
  
  setSubmitted: (submitted: boolean) => {
    set({ submitted });
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const useFollowUpOpen = () => useFollowUpStore(state => state.isOpen);
export const useFollowUpQuestions = () => useFollowUpStore(state => state.questions);
export const useFollowUpAnswers = () => useFollowUpStore(state => state.answers);
export const useFollowUpSkipped = () => useFollowUpStore(state => state.skipped);
export const useFollowUpProgress = () => useFollowUpStore(state => ({
  answered: state.answeredCount,
  total: state.totalCount,
  progress: state.progress,
}));

// Check if there are any answers to submit
export const useHasAnswers = () => useFollowUpStore(state => {
  const answers = state.answers;
  return Object.values(answers).some(v => v !== '' && v !== undefined);
});
