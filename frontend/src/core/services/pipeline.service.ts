/**
 * Pipeline Service
 * 
 * Business logic for processing user input and detecting changes.
 * This service is framework-agnostic (no React dependencies).
 */

import { 
  processUserInputLocal,
  quickParseLocal,
  detectFrameworkRelevanceLocal,
} from '../../pipeline';
import type { 
  ProposedChange, 
  ParsedInput,
  FrameworkRelevance,
} from '../../pipeline/types';
import type { FrameworkNode } from '../../types/graph';
import { GraphService } from './graph.service';

// =============================================================================
// TYPES
// =============================================================================

export interface PipelineResult {
  success: boolean;
  changes: ProposedChange[];
  processingTimeMs: number;
  parsedInput?: Partial<ParsedInput>;
  frameworkRelevance?: FrameworkRelevance[];
}

export interface ProcessInputOptions {
  detectFrameworkRelevance?: boolean;
  returnParsedInput?: boolean;
}

// =============================================================================
// PIPELINE SERVICE
// =============================================================================

export class PipelineService {
  /**
   * Process user input and generate proposed changes
   */
  static processInput(
    input: string,
    options: ProcessInputOptions = {}
  ): PipelineResult {
    const startTime = performance.now();
    
    const allNodes = GraphService.getAllNodes();
    const frameworkNodes = GraphService.getFrameworkNodes();
    
    // Process through the pipeline
    const result = processUserInputLocal(input, allNodes, frameworkNodes);
    
    // Optionally parse input for follow-up questions
    let parsedInput: Partial<ParsedInput> | undefined;
    if (options.returnParsedInput) {
      parsedInput = PipelineService.parseInput(input);
    }
    
    // Optionally detect framework relevance
    let frameworkRelevance: Array<{ frameworkId: string; relevance: number }> | undefined;
    if (options.detectFrameworkRelevance) {
      frameworkRelevance = PipelineService.detectFrameworkRelevance(input, frameworkNodes);
    }
    
    const processingTimeMs = performance.now() - startTime;
    
    return {
      ...result,
      processingTimeMs,
      parsedInput,
      frameworkRelevance,
    };
  }

  /**
   * Parse user input without generating changes
   * Useful for extracting statements and entities
   */
  static parseInput(input: string): Partial<ParsedInput> {
    return quickParseLocal(input);
  }

  /**
   * Detect which framework questions the input addresses
   */
  static detectFrameworkRelevance(
    input: string,
    frameworkNodes?: FrameworkNode[]
  ): Array<{ frameworkId: string; relevance: number }> {
    const frameworks = frameworkNodes || GraphService.getFrameworkNodes();
    return detectFrameworkRelevanceLocal(input, frameworks);
  }

  /**
   * Validate proposed changes before applying
   */
  static validateChanges(changes: ProposedChange[]): {
    valid: ProposedChange[];
    invalid: Array<{ change: ProposedChange; reason: string }>;
  } {
    const valid: ProposedChange[] = [];
    const invalid: Array<{ change: ProposedChange; reason: string }> = [];
    
    for (const change of changes) {
      const validation = PipelineService.validateSingleChange(change);
      if (validation.isValid) {
        valid.push(change);
      } else {
        invalid.push({ change, reason: validation.reason || 'Unknown error' });
      }
    }
    
    return { valid, invalid };
  }

  /**
   * Validate a single proposed change
   */
  private static validateSingleChange(change: ProposedChange): {
    isValid: boolean;
    reason?: string;
  } {
    // Check for required fields based on change type
    switch (change.type) {
      case 'ADD':
        if (!change.newNode) {
          return { isValid: false, reason: 'ADD change requires newNode' };
        }
        if (!change.newNode.title || !change.newNode.content) {
          return { isValid: false, reason: 'Node must have title and content' };
        }
        break;
        
      case 'UPDATE':
        if (!change.targetNodeId) {
          return { isValid: false, reason: 'UPDATE change requires targetNodeId' };
        }
        const targetNode = GraphService.getNode(change.targetNodeId);
        if (!targetNode) {
          return { isValid: false, reason: `Target node ${change.targetNodeId} not found` };
        }
        break;
        
      case 'CONNECT':
        if (!change.targetNodeId || !change.sourceNodeId) {
          return { isValid: false, reason: 'CONNECT change requires targetNodeId and sourceNodeId' };
        }
        break;
        
      case 'CONTRADICT':
        if (!change.nodeAId || !change.nodeBId) {
          return { isValid: false, reason: 'CONTRADICT change requires nodeAId and nodeBId' };
        }
        break;
    }
    
    return { isValid: true };
  }

  /**
   * Create a summary of proposed changes
   */
  static summarizeChanges(changes: ProposedChange[]): string {
    if (changes.length === 0) {
      return 'No changes proposed.';
    }
    
    const byType = new Map<string, number>();
    for (const change of changes) {
      byType.set(change.type, (byType.get(change.type) || 0) + 1);
    }
    
    const parts: string[] = [];
    byType.forEach((count, type) => {
      parts.push(`${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`);
    });
    
    return `Proposed: ${parts.join(', ')}`;
  }

  /**
   * Get high-priority changes (for quick review)
   */
  static getHighPriorityChanges(changes: ProposedChange[]): ProposedChange[] {
    return changes.filter(c => c.priority === 'high');
  }

  /**
   * Sort changes by priority
   */
  static sortByPriority(changes: ProposedChange[]): ProposedChange[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...changes].sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }
}

export default PipelineService;
