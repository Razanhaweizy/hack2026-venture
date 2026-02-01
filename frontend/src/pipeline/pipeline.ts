/**
 * Complete Extraction & Change Detection Pipeline
 * Orchestrates all stages: Parse → Find Related → Determine Changes
 */

import type {
  PipelineConfig,
  PipelineResult,
  ProposedChange,
  ParsedInput,
  FrameworkRelevance,
  LLMClient,
} from './types';
import type { GraphNode, FrameworkNode } from '../types/graph';
import { createLLMClient, RateLimiter } from './llmProvider';
import { parseUserInput, quickParseLocal } from './parser';
import { findRelatedNodes, findRelatedNodesLocal } from './matcher';
import { determineChanges, determineChangesLocal } from './changeDetector';
import { detectFrameworkRelevance, detectFrameworkRelevanceLocal } from './frameworkDetector';

// =============================================================================
// PIPELINE CLASS
// =============================================================================

export class ExtractionPipeline {
  private config: PipelineConfig;
  private llmClient: LLMClient;
  private rateLimiter: RateLimiter;
  private frameworkNodes: FrameworkNode[] = [];

  constructor(config: Partial<PipelineConfig> & { apiKey: string }) {
    this.config = {
      llmProvider: config.llmProvider || 'openai',
      apiKey: config.apiKey,
      model: config.model,
      embeddingModel: config.embeddingModel,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      maxRelatedNodes: config.maxRelatedNodes ?? 5,
      autoConnectToFramework: config.autoConnectToFramework ?? true,
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 2000,
    };
    
    this.llmClient = createLLMClient(this.config);
    this.rateLimiter = new RateLimiter(3); // 3 calls per second
  }

  /**
   * Set the framework nodes for auto-detection
   */
  setFrameworkNodes(nodes: FrameworkNode[]): void {
    this.frameworkNodes = nodes;
  }

  /**
   * Process user input through the full pipeline
   */
  async process(
    text: string,
    allNodes: GraphNode[]
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      // Stage 1: Parse user input
      const parsed = await this.rateLimiter.throttle(() => 
        parseUserInput(text, this.llmClient)
      );
      
      // Early exit if no statements extracted
      if (parsed.statements.length === 0) {
        return {
          success: true,
          changes: [],
          parsed,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Stage 2: Find related nodes
      const relatedNodesResults = await this.rateLimiter.throttle(() =>
        findRelatedNodes(
          parsed,
          { nodes: allNodes, useEmbeddings: !!this.config.embeddingModel },
          this.llmClient,
          this.config
        )
      );

      // Stage 5: Detect framework relevance (if enabled)
      let frameworkRelevance: FrameworkRelevance[] | undefined;
      if (this.config.autoConnectToFramework && this.frameworkNodes.length > 0) {
        frameworkRelevance = await this.rateLimiter.throttle(() =>
          detectFrameworkRelevance(parsed, this.frameworkNodes, this.llmClient)
        );
      }

      // Stage 3: Determine changes
      const changes = await this.rateLimiter.throttle(() =>
        determineChanges(parsed, relatedNodesResults, this.llmClient, frameworkRelevance)
      );

      return {
        success: true,
        changes,
        parsed,
        frameworkRelevance,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Pipeline error:', error);
      
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Quick local processing for real-time feedback (no LLM calls)
   */
  processLocal(
    text: string,
    allNodes: GraphNode[]
  ): PipelineResult {
    const startTime = Date.now();
    
    try {
      // Quick local parsing
      const partialParsed = quickParseLocal(text);
      const parsed: ParsedInput = {
        statements: partialParsed.statements || [],
        entities: [],
        sentiment: partialParsed.sentiment || 'neutral',
        rawText: text,
      };
      
      // Local matching and change detection
      const changes: ProposedChange[] = [];
      
      for (let i = 0; i < parsed.statements.length; i++) {
        const statement = parsed.statements[i];
        
        // Find related nodes locally
        const relatedNodes = findRelatedNodesLocal(statement, allNodes, this.config.maxRelatedNodes);
        
        // Determine changes locally
        const statementChanges = determineChangesLocal(statement, {
          statementIndex: i,
          statement,
          relatedNodes,
        });
        
        changes.push(...statementChanges);
      }
      
      // Detect framework relevance locally
      let frameworkRelevance: FrameworkRelevance[] | undefined;
      if (this.config.autoConnectToFramework && this.frameworkNodes.length > 0) {
        frameworkRelevance = detectFrameworkRelevanceLocal(text, this.frameworkNodes);
      }
      
      return {
        success: true,
        changes,
        parsed,
        frameworkRelevance,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Recreate LLM client if provider changed
    if (updates.llmProvider || updates.apiKey) {
      this.llmClient = createLLMClient(this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<PipelineConfig> {
    return { ...this.config };
  }
}

// =============================================================================
// FUNCTIONAL API
// =============================================================================

/**
 * Process user input through the pipeline (functional API)
 */
export async function processUserInput(
  text: string,
  allNodes: GraphNode[],
  config: Partial<PipelineConfig> & { apiKey: string },
  frameworkNodes?: FrameworkNode[]
): Promise<PipelineResult> {
  const pipeline = new ExtractionPipeline(config);
  
  if (frameworkNodes) {
    pipeline.setFrameworkNodes(frameworkNodes);
  }
  
  return pipeline.process(text, allNodes);
}

/**
 * Quick local processing (no LLM)
 */
export function processUserInputLocal(
  text: string,
  allNodes: GraphNode[],
  frameworkNodes?: FrameworkNode[]
): PipelineResult {
  const pipeline = new ExtractionPipeline({ 
    apiKey: '', // Not needed for local processing
    llmProvider: 'openai',
  });
  
  if (frameworkNodes) {
    pipeline.setFrameworkNodes(frameworkNodes);
  }
  
  return pipeline.processLocal(text, allNodes);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Apply a proposed change to the graph
 * Returns the actions needed to implement the change
 */
export function getChangeActions(change: ProposedChange): {
  action: string;
  params: Record<string, unknown>;
}[] {
  const actions: { action: string; params: Record<string, unknown> }[] = [];
  
  switch (change.type) {
    case 'UPDATE':
      actions.push({
        action: 'updateNode',
        params: {
          nodeId: change.targetNodeId,
          updates: { content: change.newContent },
        },
      });
      break;
      
    case 'ADD':
      if (change.newNode) {
        actions.push({
          action: 'addNode',
          params: {
            type: change.newNode.type,
            title: change.newNode.title,
            content: change.newNode.content,
            confidence: change.newNode.confidence,
          },
        });
        
        // Add edges to connect
        if (change.connectTo) {
          for (const conn of change.connectTo) {
            actions.push({
              action: 'addEdge',
              params: {
                type: conn.edgeType,
                // Note: source will be the newly created node ID
                targetNodeId: conn.nodeId,
              },
            });
          }
        }
      }
      break;
      
    case 'CONNECT':
      actions.push({
        action: 'addEdge',
        params: {
          type: change.edgeType,
          from: change.sourceNodeId,
          to: change.targetNodeId,
        },
      });
      break;
      
    case 'STRENGTHEN':
    case 'WEAKEN':
      actions.push({
        action: 'updateNode',
        params: {
          nodeId: change.nodeId,
          updates: { 
            // Note: actual confidence calculation should be done by caller
            confidenceDelta: change.confidenceDelta,
          },
        },
      });
      break;
      
    case 'CONTRADICT':
      actions.push({
        action: 'addEdge',
        params: {
          type: 'contradicts',
          from: change.nodeAId,
          to: change.nodeBId,
        },
      });
      break;
      
    case 'MERGE':
      if (change.nodeIds && change.nodeIds.length >= 2) {
        // Keep first node, update it, remove others
        actions.push({
          action: 'updateNode',
          params: {
            nodeId: change.nodeIds[0],
            updates: {
              title: change.mergedTitle,
              content: change.mergedContent,
            },
          },
        });
        
        for (let i = 1; i < change.nodeIds.length; i++) {
          actions.push({
            action: 'removeNode',
            params: { nodeId: change.nodeIds[i] },
          });
        }
      }
      break;
      
    case 'SPLIT':
      if (change.originalNodeId && change.splitInto) {
        // Remove original
        actions.push({
          action: 'removeNode',
          params: { nodeId: change.originalNodeId },
        });
        
        // Add new nodes
        for (const split of change.splitInto) {
          actions.push({
            action: 'addNode',
            params: {
              type: 'claim', // Default to claim
              title: split.title,
              content: split.content,
              confidence: 50,
            },
          });
        }
      }
      break;
      
    case 'SUGGEST':
      // Suggestions don't have direct actions
      // They're informational
      break;
  }
  
  return actions;
}

/**
 * Filter changes by type
 */
export function filterChangesByType(
  changes: ProposedChange[],
  types: ProposedChange['type'][]
): ProposedChange[] {
  return changes.filter(c => types.includes(c.type));
}

/**
 * Filter changes by priority
 */
export function filterChangesByPriority(
  changes: ProposedChange[],
  priorities: ProposedChange['priority'][]
): ProposedChange[] {
  return changes.filter(c => priorities.includes(c.priority));
}

/**
 * Group changes by type
 */
export function groupChangesByType(
  changes: ProposedChange[]
): Map<ProposedChange['type'], ProposedChange[]> {
  const groups = new Map<ProposedChange['type'], ProposedChange[]>();
  
  for (const change of changes) {
    if (!groups.has(change.type)) {
      groups.set(change.type, []);
    }
    groups.get(change.type)!.push(change);
  }
  
  return groups;
}
