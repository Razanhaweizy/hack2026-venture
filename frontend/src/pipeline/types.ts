/**
 * Pipeline Types
 * Type definitions for the extraction and change detection pipeline
 */

import type { NodeType, EdgeType, GraphNode } from '../types/graph';

// =============================================================================
// PARSED INPUT TYPES
// =============================================================================

export interface QuantitativeData {
  value: number;
  unit: string;
  context: string;
}

export interface Statement {
  text: string;                           // The core claim or fact
  type: 'claim' | 'fact' | 'evidence' | 'question';
  confidence: number;                     // How certain the user seems (0-100)
  source?: string;                        // "Maria said...", "I read that..."
  quantitative?: QuantitativeData;        // Any numbers mentioned
}

export interface Entity {
  name: string;
  type: 'person' | 'company' | 'product' | 'metric' | 'date' | 'location';
  role?: string;                          // "potential customer", "competitor", "advisor"
  attributes: Record<string, unknown>;    // extracted details about this entity
}

export interface ParsedInput {
  statements: Statement[];
  entities: Entity[];
  sentiment: 'positive' | 'negative' | 'neutral';
  rawText: string;                        // Original input text
}

// =============================================================================
// RELATED NODES TYPES
// =============================================================================

export type RelationshipHint = 
  | 'confirms' 
  | 'contradicts' 
  | 'adds_detail' 
  | 'same_topic' 
  | 'related'
  | 'supersedes';

export interface RelatedNode {
  nodeId: string;
  node: GraphNode;
  relevanceScore: number;                 // 0-1
  relationshipHint: RelationshipHint;     // How the statement relates to this node
}

export interface RelatedNodesResult {
  statementIndex: number;
  statement: Statement;
  relatedNodes: RelatedNode[];
}

// =============================================================================
// CHANGE TYPES
// =============================================================================

export type ChangeType = 
  | 'UPDATE'      // Modify existing node content
  | 'ADD'         // Create new node
  | 'CONNECT'     // Add edge between existing nodes
  | 'STRENGTHEN'  // Increase confidence on existing node
  | 'WEAKEN'      // Decrease confidence on existing node
  | 'CONTRADICT'  // Mark conflict between nodes
  | 'MERGE'       // Combine similar nodes
  | 'SPLIT'       // Break one node into multiple
  | 'SUGGEST';    // Recommend a new node/connection

export type ChangePriority = 'high' | 'medium' | 'low';

export interface NewNodeSpec {
  type: NodeType;
  title: string;
  content: string;
  confidence: number;
}

export interface EdgeConnection {
  nodeId: string;
  edgeType: EdgeType;
}

export interface SplitSpec {
  title: string;
  content: string;
}

export interface ProposedChange {
  id: string;                             // Unique ID for this proposal
  type: ChangeType;
  priority: ChangePriority;
  
  // For UPDATE
  targetNodeId?: string;
  oldContent?: string;
  newContent?: string;
  
  // For ADD
  newNode?: NewNodeSpec;
  connectTo?: EdgeConnection[];           // Edges to create for new node
  
  // For CONNECT
  sourceNodeId?: string;
  edgeType?: EdgeType;
  
  // For STRENGTHEN / WEAKEN
  nodeId?: string;
  confidenceDelta?: number;               // +20 or -15
  reason?: string;
  
  // For CONTRADICT
  nodeAId?: string;
  nodeBId?: string;
  
  // For MERGE
  nodeIds?: string[];
  mergedContent?: string;
  mergedTitle?: string;
  
  // For SPLIT
  originalNodeId?: string;
  splitInto?: SplitSpec[];
  
  // For SUGGEST
  suggestion?: string;
  rationale?: string;
  
  // Metadata
  sourceText: string;                     // The user input that triggered this
  explanation: string;                    // Why this change is proposed
  timestamp: Date;
}

// =============================================================================
// FRAMEWORK RELEVANCE
// =============================================================================

export interface FrameworkRelevance {
  frameworkNodeId: string;
  frameworkTitle: string;
  relevance: number;                      // 0-1
  reason: string;
}

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

export type LLMProvider = 'openai' | 'anthropic';

export interface PipelineConfig {
  llmProvider: LLMProvider;
  apiKey: string;
  model?: string;                         // e.g., 'gpt-4', 'claude-3-opus'
  embeddingModel?: string;                // For semantic search
  similarityThreshold: number;            // Default 0.7
  maxRelatedNodes: number;                // Default 5 per statement
  autoConnectToFramework: boolean;        // Auto-detect framework relevance
  temperature?: number;                   // LLM temperature
  maxTokens?: number;                     // Max tokens per request
}

export const DEFAULT_CONFIG: Omit<PipelineConfig, 'apiKey'> = {
  llmProvider: 'openai',
  model: 'gpt-4o-mini',
  similarityThreshold: 0.7,
  maxRelatedNodes: 5,
  autoConnectToFramework: true,
  temperature: 0.3,
  maxTokens: 2000,
};

// =============================================================================
// PIPELINE RESULT
// =============================================================================

export interface PipelineResult {
  success: boolean;
  changes: ProposedChange[];
  parsed?: ParsedInput;
  frameworkRelevance?: FrameworkRelevance[];
  error?: string;
  processingTimeMs: number;
}

// =============================================================================
// LLM TYPES
// =============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  generateEmbedding?(text: string): Promise<number[]>;
}
