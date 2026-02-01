/**
 * Follow-up Questions Types
 * Types for the follow-up question system that extracts complete information
 */

import type { ParsedInput } from '../pipeline/types';
import type { ProposedChange } from '../pipeline/types';
import type { GraphNode } from '../types/graph';

// =============================================================================
// QUESTION CATEGORIES
// =============================================================================

export type QuestionCategory =
  | 'identity'        // Who is this person? What's their role?
  | 'context'         // How big? What type? What segment?
  | 'quantification'  // How much? How often? What percentage?
  | 'behavior'        // How do they solve it today? What have they tried?
  | 'intent'          // Would they pay? Would they switch?
  | 'source'          // How did you find them? Can you find more?
  | 'confidence'      // How sure are you? Is this representative?
  | 'contradiction'   // This conflicts with X. Which is correct?
  | 'exploration';    // Tell me more about X.

// =============================================================================
// FOLLOW-UP QUESTION
// =============================================================================

export interface FollowUpQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  priority: 'high' | 'medium' | 'low';
  targetNodeId?: string;           // Which node this question relates to
  targetFrameworkId?: string;      // Which framework question this helps answer
  inputType: 'text' | 'number' | 'select' | 'multiselect' | 'scale';
  options?: string[];              // For select/multiselect
  scaleRange?: [number, number];   // For scale (e.g., [1, 10])
  scaleLabels?: [string, string];  // Labels for scale endpoints
  placeholder?: string;
  skippable: boolean;
  reason: string;                  // Why we're asking this
}

// =============================================================================
// QUESTION TEMPLATE
// =============================================================================

export interface QuestionTemplate {
  trigger: string;
  template: string;
  inputType: 'text' | 'number' | 'select' | 'multiselect' | 'scale';
  options?: string[];
  scaleRange?: [number, number];
  scaleLabels?: [string, string];
  placeholder?: string;
  defaultPriority?: 'high' | 'medium' | 'low';
  reason?: string;
}

// =============================================================================
// QUESTION GENERATOR INPUT/OUTPUT
// =============================================================================

export interface QuestionGeneratorInput {
  parsedInput: Partial<ParsedInput>;  // From Phase 4 (may be partial from local parsing)
  proposedChanges: ProposedChange[];  // From Phase 4
  nodes: GraphNode[];                 // Current graph nodes
  frameworkNodes: GraphNode[];        // Framework nodes only
}

export interface GeneratedQuestions {
  questions: FollowUpQuestion[];
  groupedByPriority: {
    high: FollowUpQuestion[];
    medium: FollowUpQuestion[];
    low: FollowUpQuestion[];
  };
  totalCount: number;
}

// =============================================================================
// ANSWER STATE
// =============================================================================

export interface QuestionAnswer {
  questionId: string;
  value: string | number | string[];
  answeredAt: Date;
}

export interface FollowUpState {
  questions: FollowUpQuestion[];
  answers: Record<string, string | number | string[]>;
  skipped: Set<string>;
  submitted: boolean;
  isOpen: boolean;
  
  // Computed
  answeredCount: number;
  totalCount: number;
  progress: number; // 0-100
}

// =============================================================================
// CATEGORY DISPLAY INFO
// =============================================================================

export const CATEGORY_INFO: Record<QuestionCategory, { label: string; icon: string; color: string }> = {
  identity: { label: 'Identity', icon: '👤', color: '#6366F1' },
  context: { label: 'Context', icon: '📍', color: '#8B5CF6' },
  quantification: { label: 'Numbers', icon: '📊', color: '#EC4899' },
  behavior: { label: 'Behavior', icon: '🔄', color: '#F59E0B' },
  intent: { label: 'Intent', icon: '💰', color: '#10B981' },
  source: { label: 'Source', icon: '🔗', color: '#3B82F6' },
  confidence: { label: 'Confidence', icon: '🎯', color: '#6B7280' },
  contradiction: { label: 'Conflict', icon: '⚠️', color: '#EF4444' },
  exploration: { label: 'Explore', icon: '🔍', color: '#14B8A6' },
};

// =============================================================================
// PRIORITY DISPLAY INFO
// =============================================================================

export const PRIORITY_INFO: Record<'high' | 'medium' | 'low', { label: string; color: string; bgColor: string }> = {
  high: { label: 'High', color: '#DC2626', bgColor: '#FEE2E2' },
  medium: { label: 'Medium', color: '#D97706', bgColor: '#FEF3C7' },
  low: { label: 'Low', color: '#6B7280', bgColor: '#F3F4F6' },
};
