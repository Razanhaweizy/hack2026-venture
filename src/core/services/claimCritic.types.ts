/**
 * Claim Critic Types
 * Types for the AI agent that critiques user claims against the Sequoia product framework.
 */

export interface ClaimCriticInput {
  title: string;
  content: string;
  /** Optional framework node ID this claim is attached to (e.g. framework:problem:pain) */
  frameworkContextId?: string;
  /** Optional framework node title for context */
  frameworkContextTitle?: string;
}

export interface ClaimCriticResult {
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  /** Best-fit framework category (e.g. market, problem, solution) */
  frameworkCategory: string;
  /** Overall assessment: weak / moderate / strong */
  assessment: 'weak' | 'moderate' | 'strong';
}

export interface ClaimCriticError {
  message: string;
  code?: string;
}
