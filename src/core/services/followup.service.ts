/**
 * Follow-up Service
 * 
 * Business logic for generating and processing follow-up questions.
 * This service is framework-agnostic (no React dependencies).
 */

import {
  generateFollowUpQuestionsLocal,
  combineAnswersAsInput,
  useFollowUpStore,
} from '../../followup';
import type { 
  FollowUpQuestion, 
  QuestionGeneratorInput,
  GeneratedQuestions,
} from '../../followup/types';
import type { ParsedInput } from '../../pipeline/types';
import { GraphService } from './graph.service';
import { PipelineService } from './pipeline.service';

// =============================================================================
// TYPES
// =============================================================================

export interface FollowUpResult {
  questions: FollowUpQuestion[];
  totalGenerated: number;
  highPriorityCount: number;
}

export interface ProcessAnswersResult {
  combinedInput: string;
  pipelineResult: ReturnType<typeof PipelineService.processInput>;
}

// =============================================================================
// FOLLOW-UP SERVICE
// =============================================================================

export class FollowUpService {
  /**
   * Generate follow-up questions based on parsed input and graph state
   */
  static generateQuestions(
    parsedInput: Partial<ParsedInput>,
    maxQuestions: number = 5
  ): FollowUpResult {
    const allNodes = GraphService.getAllNodes();
    const frameworkNodes = GraphService.getFrameworkNodes();
    
    const input: QuestionGeneratorInput = {
      parsedInput,
      proposedChanges: [],
      nodes: allNodes,
      frameworkNodes,
    };
    
    const result: GeneratedQuestions = generateFollowUpQuestionsLocal(input);
    
    // Limit to max questions
    const limitedQuestions = result.questions.slice(0, maxQuestions);
    const highPriorityCount = limitedQuestions.filter(q => q.priority === 'high').length;
    
    return {
      questions: limitedQuestions,
      totalGenerated: result.totalCount,
      highPriorityCount,
    };
  }

  /**
   * Process user answers and generate new pipeline input
   */
  static processAnswers(
    originalInput: string,
    answers: Record<string, string | number | string[]>
  ): ProcessAnswersResult {
    // Combine answers into a text input
    const combinedInput = combineAnswersAsInput(originalInput, answers);
    
    // Run through pipeline
    const pipelineResult = PipelineService.processInput(combinedInput, {
      returnParsedInput: true,
      detectFrameworkRelevance: true,
    });
    
    return {
      combinedInput,
      pipelineResult,
    };
  }

  /**
   * Get the current follow-up questions from the store
   */
  static getCurrentQuestions(): FollowUpQuestion[] {
    return useFollowUpStore.getState().questions;
  }

  /**
   * Get current answers from the store
   */
  static getCurrentAnswers(): Record<string, string | number | string[]> {
    return useFollowUpStore.getState().answers;
  }

  /**
   * Get skipped question IDs from the store
   */
  static getSkippedQuestionIds(): Set<string> {
    return useFollowUpStore.getState().skipped;
  }

  /**
   * Check if a question has been answered
   */
  static isQuestionAnswered(questionId: string): boolean {
    const answers = useFollowUpStore.getState().answers;
    return questionId in answers && answers[questionId] !== undefined;
  }

  /**
   * Check if a question has been skipped
   */
  static isQuestionSkipped(questionId: string): boolean {
    const skipped = useFollowUpStore.getState().skipped;
    return skipped.has(questionId);
  }

  /**
   * Get progress information
   */
  static getProgress(): { answered: number; total: number; percentage: number } {
    const store = useFollowUpStore.getState();
    const total = store.questions.length;
    const answered = Object.keys(store.answers).length + store.skipped.size;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
    
    return { answered, total, percentage };
  }

  /**
   * Categorize questions by type
   */
  static categorizeQuestions(questions: FollowUpQuestion[]): Map<string, FollowUpQuestion[]> {
    const byCategory = new Map<string, FollowUpQuestion[]>();
    
    for (const question of questions) {
      const category = question.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(question);
    }
    
    return byCategory;
  }

  /**
   * Get questions by priority
   */
  static getQuestionsByPriority(
    questions: FollowUpQuestion[], 
    priority: 'high' | 'medium' | 'low'
  ): FollowUpQuestion[] {
    return questions.filter(q => q.priority === priority);
  }

  /**
   * Sort questions by priority
   */
  static sortByPriority(questions: FollowUpQuestion[]): FollowUpQuestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...questions].sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Generate a summary of the follow-up session
   */
  static generateSessionSummary(): string {
    const store = useFollowUpStore.getState();
    const { questions, answers, skipped } = store;
    
    if (questions.length === 0) {
      return 'No follow-up questions were generated.';
    }
    
    const answeredCount = Object.keys(answers).length;
    const skippedCount = skipped.size;
    const remainingCount = questions.length - answeredCount - skippedCount;
    
    const parts: string[] = [];
    
    if (answeredCount > 0) {
      parts.push(`${answeredCount} answered`);
    }
    if (skippedCount > 0) {
      parts.push(`${skippedCount} skipped`);
    }
    if (remainingCount > 0) {
      parts.push(`${remainingCount} remaining`);
    }
    
    return `Follow-up: ${parts.join(', ')} (${questions.length} total)`;
  }

  /**
   * Reset the follow-up store
   */
  static reset(): void {
    useFollowUpStore.getState().closeFollowUp();
  }
}

export default FollowUpService;
