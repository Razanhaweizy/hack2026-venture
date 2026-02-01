/**
 * usePipelineActions Hook
 * 
 * React hook that provides pipeline actions to UI components.
 * Bridges the PipelineService to React with proper state management.
 */

import { useState, useCallback } from 'react';
import { useDiffStore, useHighlightedNodes } from '../../store';
import { PipelineService, type PipelineResult } from '../../core/services';
import type { ProposedChange } from '../../pipeline/types';

// =============================================================================
// HOOK
// =============================================================================

export function usePipelineActions() {
  // Local state for pipeline results
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Diff store integration
  const { isOpen: isDiffOpen, openDiff, closeDiff } = useDiffStore();
  const highlightedNodes = useHighlightedNodes();
  
  // Process user input
  const processInput = useCallback(async (
    input: string,
    options?: { detectFrameworkRelevance?: boolean; returnParsedInput?: boolean }
  ): Promise<PipelineResult | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = PipelineService.processInput(input, options);
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pipeline processing failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  // Process and open diff panel
  const processAndShowDiff = useCallback(async (
    input: string
  ): Promise<boolean> => {
    const result = await processInput(input, { returnParsedInput: true });
    
    if (result && result.changes.length > 0) {
      openDiff(result.changes);
      return true;
    }
    
    return false;
  }, [processInput, openDiff]);
  
  // Parse input without generating changes
  const parseInput = useCallback((input: string) => {
    return PipelineService.parseInput(input);
  }, []);
  
  // Validate proposed changes
  const validateChanges = useCallback((changes: ProposedChange[]) => {
    return PipelineService.validateChanges(changes);
  }, []);
  
  // Get summary of changes
  const summarizeChanges = useCallback((changes: ProposedChange[]) => {
    return PipelineService.summarizeChanges(changes);
  }, []);
  
  // Get high priority changes
  const getHighPriorityChanges = useCallback((changes: ProposedChange[]) => {
    return PipelineService.getHighPriorityChanges(changes);
  }, []);
  
  // Sort changes by priority
  const sortByPriority = useCallback((changes: ProposedChange[]) => {
    return PipelineService.sortByPriority(changes);
  }, []);
  
  // Clear last result
  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);
  
  return {
    // State
    lastResult,
    isProcessing,
    error,
    isDiffOpen,
    highlightedNodes,
    
    // Actions
    processInput,
    processAndShowDiff,
    parseInput,
    validateChanges,
    summarizeChanges,
    getHighPriorityChanges,
    sortByPriority,
    clearResult,
    openDiff,
    closeDiff,
  };
}

export default usePipelineActions;
