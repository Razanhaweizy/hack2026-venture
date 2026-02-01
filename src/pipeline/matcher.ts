/**
 * Stage 2: Find Related Nodes
 * Finds existing graph nodes that relate to parsed statements
 * Supports both embedding-based and LLM-based matching
 */

import type {
  ParsedInput,
  Statement,
  RelatedNode,
  RelatedNodesResult,
  RelationshipHint,
  LLMClient,
  LLMMessage,
  PipelineConfig,
} from './types';
import type { GraphNode } from '../types/graph';
import { parseJSONFromLLM, cosineSimilarity } from './llmProvider';

// =============================================================================
// EMBEDDING CACHE
// =============================================================================

// Cache for node embeddings to avoid recomputation
const embeddingCache = new Map<string, number[]>();

/**
 * Get or compute embedding for a node
 */
async function getNodeEmbedding(
  node: GraphNode,
  llmClient: LLMClient
): Promise<number[]> {
  const cacheKey = `${node.id}:${node.updatedAt.getTime()}`;
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }
  
  if (!llmClient.generateEmbedding) {
    throw new Error('LLM client does not support embeddings');
  }
  
  // Combine title and content for embedding
  const text = `${node.title}. ${node.content || ''}`;
  const embedding = await llmClient.generateEmbedding(text);
  
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Clear embedding cache (useful when nodes are updated)
 */
export function clearEmbeddingCache(nodeId?: string): void {
  if (nodeId) {
    // Clear all entries for this node
    for (const key of embeddingCache.keys()) {
      if (key.startsWith(`${nodeId}:`)) {
        embeddingCache.delete(key);
      }
    }
  } else {
    embeddingCache.clear();
  }
}

// =============================================================================
// EMBEDDING-BASED MATCHING
// =============================================================================

/**
 * Find related nodes using embedding similarity
 * More scalable for larger graphs
 */
async function findRelatedNodesEmbedding(
  statement: Statement,
  nodes: GraphNode[],
  llmClient: LLMClient,
  config: PipelineConfig
): Promise<RelatedNode[]> {
  if (!llmClient.generateEmbedding) {
    throw new Error('LLM client does not support embeddings');
  }

  // Get embedding for the statement
  const statementEmbedding = await llmClient.generateEmbedding(statement.text);
  
  // Get embeddings for all nodes and compute similarities
  const similarities: Array<{ node: GraphNode; score: number }> = [];
  
  for (const node of nodes) {
    try {
      const nodeEmbedding = await getNodeEmbedding(node, llmClient);
      const score = cosineSimilarity(statementEmbedding, nodeEmbedding);
      
      if (score >= config.similarityThreshold) {
        similarities.push({ node, score });
      }
    } catch (error) {
      console.warn(`Failed to get embedding for node ${node.id}:`, error);
    }
  }
  
  // Sort by similarity and take top-k
  similarities.sort((a, b) => b.score - a.score);
  const topNodes = similarities.slice(0, config.maxRelatedNodes);
  
  // Convert to RelatedNode with relationship hints
  // We'll need LLM to determine the relationship type
  return topNodes.map(({ node, score }) => ({
    nodeId: node.id,
    node,
    relevanceScore: score,
    relationshipHint: inferRelationshipHint(statement, node),
  }));
}

/**
 * Simple heuristic to infer relationship hint based on content overlap
 */
function inferRelationshipHint(statement: Statement, node: GraphNode): RelationshipHint {
  const statementLower = statement.text.toLowerCase();
  const nodeLower = `${node.title} ${node.content || ''}`.toLowerCase();
  
  // Check for negation/contradiction patterns
  const contradictionPatterns = [
    /\b(not|never|no|don't|doesn't|isn't|aren't|won't|can't)\b/,
    /\b(wrong|false|incorrect|inaccurate)\b/,
    /\b(however|but|although|despite|contrary)\b/,
  ];
  
  const hasContradiction = contradictionPatterns.some(p => 
    p.test(statementLower) || p.test(nodeLower)
  );
  
  if (hasContradiction) {
    return 'contradicts';
  }
  
  // Check for confirmation patterns
  const confirmationPatterns = [
    /\b(confirms?|validates?|proves?|supports?|agrees?)\b/,
    /\b(also|similarly|likewise|same|true)\b/,
  ];
  
  const hasConfirmation = confirmationPatterns.some(p => p.test(statementLower));
  
  if (hasConfirmation) {
    return 'confirms';
  }
  
  // Check for detail/elaboration
  if (statement.text.length > node.content?.length || 0) {
    return 'adds_detail';
  }
  
  // Default to same topic
  return 'same_topic';
}

// =============================================================================
// LLM-BASED MATCHING
// =============================================================================

const MATCHING_PROMPT = `You are analyzing how a new statement relates to existing knowledge graph nodes.

EXISTING NODES:
{nodesJson}

NEW STATEMENT:
Text: "{statementText}"
Type: {statementType}
Confidence: {statementConfidence}%
Source: {statementSource}

For each existing node that is related to this statement, determine:
1. How related is it? (relevanceScore: 0.0 to 1.0)
2. What is the relationship? (relationshipHint):
   - "confirms" - Statement confirms/supports the existing node
   - "contradicts" - Statement contradicts/conflicts with the node
   - "adds_detail" - Statement adds more detail to the node
   - "same_topic" - Same general topic but different angle
   - "supersedes" - Statement should replace the node
   - "related" - Generally related

Only include nodes with relevanceScore >= 0.5

Return JSON array:
[
  {
    "nodeId": "string",
    "relevanceScore": number,
    "relationshipHint": "confirms" | "contradicts" | "adds_detail" | "same_topic" | "supersedes" | "related"
  }
]

If no nodes are related, return empty array: []`;

interface LLMMatchResult {
  nodeId: string;
  relevanceScore: number;
  relationshipHint: RelationshipHint;
}

/**
 * Find related nodes using LLM-based matching
 * Better for smaller graphs where context matters
 */
async function findRelatedNodesLLM(
  statement: Statement,
  nodes: GraphNode[],
  llmClient: LLMClient,
  config: PipelineConfig
): Promise<RelatedNode[]> {
  // Prepare nodes for the prompt (simplified view)
  const nodesForPrompt = nodes.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content?.substring(0, 200) || '',
    confidence: n.confidence,
  }));

  const prompt = MATCHING_PROMPT
    .replace('{nodesJson}', JSON.stringify(nodesForPrompt, null, 2))
    .replace('{statementText}', statement.text)
    .replace('{statementType}', statement.type)
    .replace('{statementConfidence}', statement.confidence.toString())
    .replace('{statementSource}', statement.source || 'not specified');

  const messages: LLMMessage[] = [
    { role: 'user', content: prompt },
  ];

  try {
    const response = await llmClient.chat(messages);
    const matches = parseJSONFromLLM<LLMMatchResult[]>(response.content);
    
    // Convert to RelatedNode, looking up full node objects
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    return matches
      .filter(m => m.relevanceScore >= config.similarityThreshold)
      .slice(0, config.maxRelatedNodes)
      .map(m => ({
        nodeId: m.nodeId,
        node: nodeMap.get(m.nodeId)!,
        relevanceScore: m.relevanceScore,
        relationshipHint: m.relationshipHint,
      }))
      .filter(r => r.node); // Filter out any with missing nodes
  } catch (error) {
    console.error('LLM matching failed:', error);
    return [];
  }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export interface FindRelatedNodesOptions {
  useEmbeddings?: boolean;  // Default: false (use LLM matching)
  nodes: GraphNode[];       // All nodes in the graph
}

/**
 * Find related nodes for all statements in parsed input
 */
export async function findRelatedNodes(
  parsed: ParsedInput,
  options: FindRelatedNodesOptions,
  llmClient: LLMClient,
  config: PipelineConfig
): Promise<RelatedNodesResult[]> {
  const results: RelatedNodesResult[] = [];
  const { nodes, useEmbeddings = false } = options;
  
  // Skip if no nodes to match against
  if (nodes.length === 0) {
    return parsed.statements.map((statement, index) => ({
      statementIndex: index,
      statement,
      relatedNodes: [],
    }));
  }

  // Choose matching strategy
  const matchFn = useEmbeddings && llmClient.generateEmbedding
    ? findRelatedNodesEmbedding
    : findRelatedNodesLLM;

  // Process each statement
  for (let i = 0; i < parsed.statements.length; i++) {
    const statement = parsed.statements[i];
    
    try {
      const relatedNodes = await matchFn(statement, nodes, llmClient, config);
      
      results.push({
        statementIndex: i,
        statement,
        relatedNodes,
      });
    } catch (error) {
      console.error(`Failed to find related nodes for statement ${i}:`, error);
      
      // Add empty result on error
      results.push({
        statementIndex: i,
        statement,
        relatedNodes: [],
      });
    }
  }

  return results;
}

// =============================================================================
// LOCAL MATCHING (No LLM)
// =============================================================================

/**
 * Quick local matching using keyword overlap
 * Use for real-time feedback while full matching happens async
 */
export function findRelatedNodesLocal(
  statement: Statement,
  nodes: GraphNode[],
  maxResults: number = 5
): RelatedNode[] {
  // Tokenize statement
  const statementTokens = new Set(
    statement.text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2)
  );
  
  // Score each node by token overlap
  const scores: Array<{ node: GraphNode; score: number }> = [];
  
  for (const node of nodes) {
    const nodeText = `${node.title} ${node.content || ''}`.toLowerCase();
    const nodeTokens = new Set(
      nodeText
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2)
    );
    
    // Calculate Jaccard similarity
    let intersection = 0;
    for (const token of statementTokens) {
      if (nodeTokens.has(token)) intersection++;
    }
    
    const union = statementTokens.size + nodeTokens.size - intersection;
    const score = union > 0 ? intersection / union : 0;
    
    if (score > 0.1) {
      scores.push({ node, score });
    }
  }
  
  // Sort and take top results
  scores.sort((a, b) => b.score - a.score);
  
  return scores.slice(0, maxResults).map(({ node, score }) => ({
    nodeId: node.id,
    node,
    relevanceScore: Math.min(score * 2, 1), // Scale up for display
    relationshipHint: inferRelationshipHint(statement, node),
  }));
}
