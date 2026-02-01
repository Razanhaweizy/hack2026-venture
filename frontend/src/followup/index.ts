/**
 * Follow-up Questions Module
 * Exports all follow-up question functionality
 */

// Types
export type {
  FollowUpQuestion,
  QuestionCategory,
  QuestionTemplate,
  QuestionGeneratorInput,
  GeneratedQuestions,
  QuestionAnswer,
  FollowUpState,
} from './types';

export { CATEGORY_INFO, PRIORITY_INFO } from './types';

// Templates
export { questionTemplates, getTemplate, interpolateTemplate } from './templates';

// Question Generator
export {
  generateFollowUpQuestionsLocal,
  formatAnswerAsStatement,
  combineAnswersAsInput,
  detectVagueTerms,
  createQuestion,
  getUnansweredFrameworkNodes,
  prioritizeQuestions,
} from './questionGenerator';

// Store
export {
  useFollowUpStore,
  useFollowUpOpen,
  useFollowUpQuestions,
  useFollowUpAnswers,
  useFollowUpSkipped,
  useFollowUpProgress,
  useHasAnswers,
} from './followupStore';
