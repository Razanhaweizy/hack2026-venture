/**
 * Path Store
 * Manages PMF path state for the application
 */

import { create } from 'zustand';
import type { PmfPath } from '../types/graph';
import { PMF_PATH_CONFIGS } from '../types/graph';

// =============================================================================
// TYPES
// =============================================================================

export interface PlaybookSummary {
  path: string;
  name: string;
  icon: string;
  tagline: string;
  enemy: string;
  job: string;
  speed_matters: string;
  benchmark: {
    company: string;
    description: string;
  };
  this_week_actions: string[];
  warning_count: number;
  rule_count: number;
}

export interface PlaybookRule {
  id: string;
  path: string;
  title: string;
  message: string;
  severity: 'blocker' | 'warning' | 'info';
  action_label: string;
  action_type: string;
  condition_description: string;
  triggered?: boolean;
}

export interface PathStatus {
  path: string | null;
  playbook: PlaybookSummary | null;
  status: 'no_path' | 'blockers_present' | 'warnings_present' | 'on_track';
  message: string;
  blockers: PlaybookRule[];
  warnings: PlaybookRule[];
  triggered_rules: PlaybookRule[];
  total_rules: number;
  triggered_count: number;
}

export interface PathState {
  // State
  pmfPath: PmfPath | null;
  pathConfidence: number;
  detectedAt: Date | null;
  isLoading: boolean;
  error: string | null;
  
  // Playbook data
  playbook: PlaybookSummary | null;
  pathStatus: PathStatus | null;
  
  // Actions
  setPath: (path: PmfPath, confidence?: number) => void;
  clearPath: () => void;
  setPlaybook: (playbook: PlaybookSummary | null) => void;
  setPathStatus: (status: PathStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getPathConfig: () => typeof PMF_PATH_CONFIGS[PmfPath] | null;
  hasPath: () => boolean;
  hasBlockers: () => boolean;
  hasWarnings: () => boolean;
}

// =============================================================================
// STORE
// =============================================================================

export const usePathStore = create<PathState>((set, get) => ({
  // Initial state
  pmfPath: null,
  pathConfidence: 0,
  detectedAt: null,
  isLoading: false,
  error: null,
  playbook: null,
  pathStatus: null,
  
  // Actions
  setPath: (path: PmfPath, confidence: number = 100) => {
    set({
      pmfPath: path,
      pathConfidence: confidence,
      detectedAt: new Date(),
      error: null,
    });
  },
  
  clearPath: () => {
    set({
      pmfPath: null,
      pathConfidence: 0,
      detectedAt: null,
      playbook: null,
      pathStatus: null,
    });
  },
  
  setPlaybook: (playbook: PlaybookSummary | null) => {
    set({ playbook });
  },
  
  setPathStatus: (status: PathStatus | null) => {
    set({ pathStatus: status });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },
  
  // Computed
  getPathConfig: () => {
    const { pmfPath } = get();
    if (!pmfPath) return null;
    return PMF_PATH_CONFIGS[pmfPath];
  },
  
  hasPath: () => {
    return get().pmfPath !== null;
  },
  
  hasBlockers: () => {
    const { pathStatus } = get();
    return (pathStatus?.blockers?.length ?? 0) > 0;
  },
  
  hasWarnings: () => {
    const { pathStatus } = get();
    return (pathStatus?.warnings?.length ?? 0) > 0;
  },
}));

// =============================================================================
// HOOKS
// =============================================================================

export function usePmfPath() {
  return usePathStore((state) => state.pmfPath);
}

export function usePathPlaybook() {
  return usePathStore((state) => state.playbook);
}

export function usePathStatus() {
  return usePathStore((state) => state.pathStatus);
}

export function usePathBlockers() {
  return usePathStore((state) => state.pathStatus?.blockers ?? []);
}

export function usePathWarnings() {
  return usePathStore((state) => state.pathStatus?.warnings ?? []);
}
