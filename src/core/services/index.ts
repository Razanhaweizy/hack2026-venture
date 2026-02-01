/**
 * Core Services
 * 
 * Business logic layer - framework agnostic.
 * These services contain all domain logic and can be used
 * without React (e.g., in tests, CLI tools, or other frameworks).
 */

export { GraphService } from './graph.service';
export { PipelineService } from './pipeline.service';
export { VersionService } from './version.service';
export { FollowUpService } from './followup.service';
export { CSVService } from './csv.service';

// Re-export types
export type { PipelineResult, ProcessInputOptions } from './pipeline.service';
export type { FollowUpResult, ProcessAnswersResult } from './followup.service';
