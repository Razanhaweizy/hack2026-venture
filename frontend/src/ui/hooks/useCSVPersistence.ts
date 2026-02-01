/**
 * useCSVPersistence Hook
 * 
 * React hook for CSV persistence functionality.
 * Provides loading, saving, import/export capabilities.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  initializeFromCSV,
  enableAutoSave,
  disableAutoSave,
  exportToCSVFiles,
  importFromCSVFiles,
  resetToDefaultCSV,
  isCSVInitialized,
  getGraphStats,
} from '../../store';

// =============================================================================
// TYPES
// =============================================================================

export interface CSVPersistenceState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastLoadResult: {
    nodesLoaded: number;
    edgesLoaded: number;
    source: 'localStorage' | 'csv';
  } | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useCSVPersistence() {
  const [state, setState] = useState<CSVPersistenceState>({
    isLoading: false,
    isInitialized: isCSVInitialized(),
    error: null,
    lastLoadResult: null,
  });
  
  const autoSaveEnabled = useRef(false);
  
  // Initialize from CSV on mount
  const initialize = useCallback(async () => {
    if (state.isLoading) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await initializeFromCSV();
      
      setState({
        isLoading: false,
        isInitialized: true,
        error: null,
        lastLoadResult: result,
      });
      
      console.log(`[CSV] Loaded ${result.nodesLoaded} nodes and ${result.edgesLoaded} edges from ${result.source}`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CSV data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error('[CSV] Load error:', err);
      return null;
    }
  }, [state.isLoading]);
  
  // Enable auto-save
  const startAutoSave = useCallback(() => {
    if (!autoSaveEnabled.current) {
      enableAutoSave();
      autoSaveEnabled.current = true;
      console.log('[CSV] Auto-save enabled');
    }
  }, []);
  
  // Disable auto-save
  const stopAutoSave = useCallback(() => {
    if (autoSaveEnabled.current) {
      disableAutoSave();
      autoSaveEnabled.current = false;
      console.log('[CSV] Auto-save disabled');
    }
  }, []);
  
  // Export to CSV files
  const exportCSV = useCallback(() => {
    try {
      exportToCSVFiles();
      console.log('[CSV] Exported to files');
    } catch (err) {
      console.error('[CSV] Export error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Export failed',
      }));
    }
  }, []);
  
  // Import from CSV files
  const importCSV = useCallback(async (nodesFile: File, edgesFile?: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await importFromCSVFiles(nodesFile, edgesFile);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastLoadResult: {
          ...result,
          source: 'csv' as const,
        },
      }));
      
      console.log(`[CSV] Imported ${result.nodesLoaded} nodes and ${result.edgesLoaded} edges`);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error('[CSV] Import error:', err);
      return null;
    }
  }, []);
  
  // Reset to default
  const reset = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await resetToDefaultCSV();
      const result = await initializeFromCSV();
      
      setState({
        isLoading: false,
        isInitialized: true,
        error: null,
        lastLoadResult: result,
      });
      
      console.log('[CSV] Reset to default');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reset failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);
  
  // Get current stats
  const getStats = useCallback(() => {
    return getGraphStats();
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveEnabled.current) {
        disableAutoSave();
      }
    };
  }, []);
  
  return {
    // State
    ...state,
    
    // Actions
    initialize,
    startAutoSave,
    stopAutoSave,
    exportCSV,
    importCSV,
    reset,
    getStats,
    clearError,
  };
}

export default useCSVPersistence;
