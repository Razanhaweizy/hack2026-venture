/**
 * Pipeline Module Exports
 * Extraction and Change Detection Pipeline for Ideograph
 */

// Types
export type {
  // Parsed Input
  ParsedInput,
  Statement,
  Entity,
  QuantitativeData,
  
  // Related Nodes
  RelatedNode,
  RelatedNodesResult,
  RelationshipHint,
  
  // Changes
  ProposedChange,
  ChangeType,
  ChangePriority,
  NewNodeSpec,
  EdgeConnection,
  SplitSpec,
  
  // Framework
  FrameworkRelevance,
  
  // Configuration
  PipelineConfig,
  PipelineResult,
  LLMProvider,
  
  // LLM
  LLMClient,
  LLMMessage,
  LLMResponse,
} from './types';

export { DEFAULT_CONFIG } from './types';

// LLM Provider
export { 
  createLLMClient,
  parseJSONFromLLM,
  cosineSimilarity,
  RateLimiter,
} from './llmProvider';

// Parser (Stage 1)
export {
  parseUserInput,
  parseUserInputBatch,
  quickParseLocal,
} from './parser';

// Matcher (Stage 2)
export {
  findRelatedNodes,
  findRelatedNodesLocal,
  clearEmbeddingCache,
} from './matcher';

// Change Detector (Stage 3)
export {
  determineChanges,
  determineChangesLocal,
} from './changeDetector';

// Framework Detector (Stage 5)
export {
  detectFrameworkRelevance,
  detectFrameworkRelevanceLocal,
  detectFrameworkRelevanceBatch,
  getMostRelevantFrameworkNode,
  addressesFrameworkQuestion,
} from './frameworkDetector';

// Pipeline (Complete)
export {
  ExtractionPipeline,
  processUserInput,
  processUserInputLocal,
  getChangeActions,
  filterChangesByType,
  filterChangesByPriority,
  groupChangesByType,
} from './pipeline';
