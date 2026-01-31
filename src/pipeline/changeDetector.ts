/**
 * Stage 3: Determine Changes
 * Analyzes parsed input + related nodes to propose graph changes
 */

import type {
  ParsedInput,
  Statement,
  RelatedNodesResult,
  ProposedChange,
  ChangeType,
  ChangePriority,
  LLMClient,
  LLMMessage,
  FrameworkRelevance,
} from './types';
import type { GraphNode, EdgeType } from '../types/graph';
import { parseJSONFromLLM } from './llmProvider';
import { v4 as uuid } from 'uuid';

// =============================================================================
// PROMPTS
// =============================================================================

const CHANGE_DETECTION_PROMPT = `You are analyzing how new information should affect an existing knowledge graph about a startup idea.

EXISTING RELATED NODES:
{relatedNodesJson}

NEW INFORMATION:
Statement: "{statementText}"
Type: {statementType} (claim=belief, fact=verifiable, evidence=real-world data, question=uncertainty)
Source: {statementSource}
Confidence: {statementConfidence}%
{quantitativeInfo}

For each related node, determine:
1. Does this new info CONFIRM, CONTRADICT, or ADD DETAIL to the existing node?
2. Should we UPDATE the existing node, or ADD a new node that connects to it?
3. If the existing node had confidence X, should it go up or down?

Consider proposing these change types:
- UPDATE: Modify existing node content (when new info is clearly better/more complete)
- ADD: Create new node (when this is distinct information)
- CONNECT: Add edge between nodes (when relationship should be explicit)
- STRENGTHEN: Increase confidence (+10 to +30) when evidence confirms
- WEAKEN: Decrease confidence (-10 to -30) when contradicted
- CONTRADICT: Mark conflict between nodes (important - don't hide contradictions!)
- MERGE: Combine nodes if they're clearly the same thing
- SPLIT: Break a node if it contains multiple distinct things
- SUGGEST: Recommend something the founder should consider

PRIORITIZATION:
- HIGH: Contradictions, significant new evidence, answers to questions
- MEDIUM: Confirmations, detail additions, new claims
- LOW: Context, suggestions, minor updates

Return a JSON array of proposed changes:
[
  {
    "type": "UPDATE" | "ADD" | "CONNECT" | "STRENGTHEN" | "WEAKEN" | "CONTRADICT" | "MERGE" | "SPLIT" | "SUGGEST",
    "priority": "high" | "medium" | "low",
    "targetNodeId": "string (for UPDATE, CONNECT target)",
    "oldContent": "string (for UPDATE)",
    "newContent": "string (for UPDATE)",
    "newNode": { "type": "claim" | "fact" | "evidence", "title": "string", "content": "string", "confidence": number } (for ADD),
    "connectTo": [{ "nodeId": "string", "edgeType": "requires" | "supports" | "contradicts" | "depends_on" | "informs" | "blocks" }] (for ADD),
    "sourceNodeId": "string (for CONNECT source)",
    "edgeType": "string (for CONNECT)",
    "nodeId": "string (for STRENGTHEN/WEAKEN)",
    "confidenceDelta": number (for STRENGTHEN/WEAKEN, e.g., +20 or -15),
    "reason": "string (for STRENGTHEN/WEAKEN)",
    "nodeAId": "string (for CONTRADICT)",
    "nodeBId": "string (for CONTRADICT)",
    "nodeIds": ["string"] (for MERGE),
    "mergedContent": "string (for MERGE)",
    "mergedTitle": "string (for MERGE)",
    "originalNodeId": "string (for SPLIT)",
    "splitInto": [{ "title": "string", "content": "string" }] (for SPLIT),
    "suggestion": "string (for SUGGEST)",
    "rationale": "string (for SUGGEST)",
    "explanation": "string (required - why this change)"
  }
]

Only include relevant fields for each change type. Always include "explanation".
If no changes needed, return empty array [].`;

// =============================================================================
// CHANGE DETECTION
// =============================================================================

interface RawProposedChange {
  type: string;
  priority?: string;
  targetNodeId?: string;
  oldContent?: string;
  newContent?: string;
  newNode?: {
    type: string;
    title: string;
    content: string;
    confidence: number;
  };
  connectTo?: Array<{
    nodeId: string;
    edgeType: string;
  }>;
  sourceNodeId?: string;
  edgeType?: string;
  nodeId?: string;
  confidenceDelta?: number;
  reason?: string;
  nodeAId?: string;
  nodeBId?: string;
  nodeIds?: string[];
  mergedContent?: string;
  mergedTitle?: string;
  originalNodeId?: string;
  splitInto?: Array<{ title: string; content: string }>;
  suggestion?: string;
  rationale?: string;
  explanation?: string;
}

/**
 * Determine changes for a single statement with its related nodes
 */
async function determineChangesForStatement(
  statement: Statement,
  relatedNodes: RelatedNodesResult,
  llmClient: LLMClient
): Promise<ProposedChange[]> {
  // If no related nodes, suggest adding as new node
  if (relatedNodes.relatedNodes.length === 0) {
    return [createAddNodeChange(statement)];
  }

  // Prepare related nodes for prompt
  const relatedNodesForPrompt = relatedNodes.relatedNodes.map(r => ({
    id: r.nodeId,
    type: r.node.type,
    title: r.node.title,
    content: r.node.content,
    confidence: r.node.confidence,
    relevanceScore: r.relevanceScore,
    relationshipHint: r.relationshipHint,
  }));

  // Quantitative info
  let quantitativeInfo = '';
  if (statement.quantitative) {
    quantitativeInfo = `Quantitative Data: ${statement.quantitative.value} ${statement.quantitative.unit} (${statement.quantitative.context})`;
  }

  const prompt = CHANGE_DETECTION_PROMPT
    .replace('{relatedNodesJson}', JSON.stringify(relatedNodesForPrompt, null, 2))
    .replace('{statementText}', statement.text)
    .replace('{statementType}', statement.type)
    .replace('{statementSource}', statement.source || 'not specified')
    .replace('{statementConfidence}', statement.confidence.toString())
    .replace('{quantitativeInfo}', quantitativeInfo);

  const messages: LLMMessage[] = [
    { role: 'user', content: prompt },
  ];

  try {
    const response = await llmClient.chat(messages);
    const rawChanges = parseJSONFromLLM<RawProposedChange[]>(response.content);
    
    // Normalize and validate changes
    return rawChanges.map(raw => normalizeChange(raw, statement.text));
  } catch (error) {
    console.error('Failed to determine changes:', error);
    
    // Fallback: suggest adding as new node
    return [createAddNodeChange(statement)];
  }
}

/**
 * Create an ADD node change from a statement
 */
function createAddNodeChange(statement: Statement): ProposedChange {
  return {
    id: uuid(),
    type: 'ADD',
    priority: statement.type === 'evidence' ? 'high' : 'medium',
    newNode: {
      type: statement.type === 'question' ? 'claim' : statement.type,
      title: statement.text.substring(0, 100),
      content: statement.text,
      confidence: statement.confidence,
    },
    sourceText: statement.text,
    explanation: `New ${statement.type} with no matching existing nodes`,
    timestamp: new Date(),
  };
}

/**
 * Normalize and validate a raw change from LLM
 */
function normalizeChange(raw: RawProposedChange, sourceText: string): ProposedChange {
  const validTypes: ChangeType[] = [
    'UPDATE', 'ADD', 'CONNECT', 'STRENGTHEN', 
    'WEAKEN', 'CONTRADICT', 'MERGE', 'SPLIT', 'SUGGEST'
  ];
  
  const validPriorities: ChangePriority[] = ['high', 'medium', 'low'];
  
  const validEdgeTypes: EdgeType[] = [
    'requires', 'supports', 'contradicts', 
    'depends_on', 'informs', 'blocks'
  ];

  const type = validTypes.includes(raw.type as ChangeType) 
    ? raw.type as ChangeType 
    : 'SUGGEST';
    
  const priority = validPriorities.includes(raw.priority as ChangePriority)
    ? raw.priority as ChangePriority
    : 'medium';

  const change: ProposedChange = {
    id: uuid(),
    type,
    priority,
    sourceText,
    explanation: raw.explanation || 'No explanation provided',
    timestamp: new Date(),
  };

  // Copy relevant fields based on change type
  switch (type) {
    case 'UPDATE':
      change.targetNodeId = raw.targetNodeId;
      change.oldContent = raw.oldContent;
      change.newContent = raw.newContent;
      break;
      
    case 'ADD':
      if (raw.newNode) {
        change.newNode = {
          type: ['claim', 'fact', 'evidence'].includes(raw.newNode.type) 
            ? raw.newNode.type as 'claim' | 'fact' | 'evidence'
            : 'claim',
          title: raw.newNode.title,
          content: raw.newNode.content,
          confidence: Math.min(100, Math.max(0, raw.newNode.confidence || 50)),
        };
      }
      if (raw.connectTo) {
        change.connectTo = raw.connectTo
          .filter(c => validEdgeTypes.includes(c.edgeType as EdgeType))
          .map(c => ({
            nodeId: c.nodeId,
            edgeType: c.edgeType as EdgeType,
          }));
      }
      break;
      
    case 'CONNECT':
      change.sourceNodeId = raw.sourceNodeId;
      change.targetNodeId = raw.targetNodeId;
      if (validEdgeTypes.includes(raw.edgeType as EdgeType)) {
        change.edgeType = raw.edgeType as EdgeType;
      }
      break;
      
    case 'STRENGTHEN':
    case 'WEAKEN':
      change.nodeId = raw.nodeId;
      change.confidenceDelta = raw.confidenceDelta;
      change.reason = raw.reason;
      break;
      
    case 'CONTRADICT':
      change.nodeAId = raw.nodeAId;
      change.nodeBId = raw.nodeBId;
      break;
      
    case 'MERGE':
      change.nodeIds = raw.nodeIds;
      change.mergedContent = raw.mergedContent;
      change.mergedTitle = raw.mergedTitle;
      break;
      
    case 'SPLIT':
      change.originalNodeId = raw.originalNodeId;
      change.splitInto = raw.splitInto;
      break;
      
    case 'SUGGEST':
      change.suggestion = raw.suggestion;
      change.rationale = raw.rationale;
      break;
  }

  return change;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Determine all changes for parsed input and related nodes
 */
export async function determineChanges(
  parsed: ParsedInput,
  relatedNodesResults: RelatedNodesResult[],
  llmClient: LLMClient,
  frameworkRelevance?: FrameworkRelevance[]
): Promise<ProposedChange[]> {
  const allChanges: ProposedChange[] = [];

  // Process each statement
  for (const relatedNodes of relatedNodesResults) {
    try {
      const changes = await determineChangesForStatement(
        relatedNodes.statement,
        relatedNodes,
        llmClient
      );
      
      allChanges.push(...changes);
    } catch (error) {
      console.error(`Failed to determine changes for statement ${relatedNodes.statementIndex}:`, error);
    }
  }

  // Add framework connection suggestions if auto-connect is enabled
  if (frameworkRelevance && frameworkRelevance.length > 0) {
    const frameworkSuggestions = createFrameworkConnectionSuggestions(
      parsed,
      frameworkRelevance
    );
    allChanges.push(...frameworkSuggestions);
  }

  // Deduplicate and merge similar changes
  const deduped = deduplicateChanges(allChanges);

  // Sort by priority
  return sortChangesByPriority(deduped);
}

/**
 * Create suggestions to connect new nodes to framework
 */
function createFrameworkConnectionSuggestions(
  parsed: ParsedInput,
  relevance: FrameworkRelevance[]
): ProposedChange[] {
  const suggestions: ProposedChange[] = [];
  
  // Group relevance by framework node
  const highRelevance = relevance.filter(r => r.relevance >= 0.7);
  
  for (const r of highRelevance) {
    suggestions.push({
      id: uuid(),
      type: 'SUGGEST',
      priority: 'medium',
      suggestion: `Connect new information to framework question: "${r.frameworkTitle}"`,
      rationale: r.reason,
      sourceText: parsed.rawText,
      explanation: `This input appears to address the framework question "${r.frameworkTitle}"`,
      timestamp: new Date(),
    });
  }
  
  return suggestions;
}

/**
 * Deduplicate similar changes
 */
function deduplicateChanges(changes: ProposedChange[]): ProposedChange[] {
  const seen = new Set<string>();
  const result: ProposedChange[] = [];
  
  for (const change of changes) {
    // Create a signature for this change
    let signature = change.type;
    
    switch (change.type) {
      case 'UPDATE':
        signature += `:${change.targetNodeId}`;
        break;
      case 'ADD':
        signature += `:${change.newNode?.title?.substring(0, 50)}`;
        break;
      case 'CONNECT':
        signature += `:${change.sourceNodeId}:${change.targetNodeId}`;
        break;
      case 'STRENGTHEN':
      case 'WEAKEN':
        signature += `:${change.nodeId}`;
        break;
      case 'CONTRADICT':
        signature += `:${change.nodeAId}:${change.nodeBId}`;
        break;
      case 'MERGE':
        signature += `:${change.nodeIds?.sort().join(',')}`;
        break;
      case 'SPLIT':
        signature += `:${change.originalNodeId}`;
        break;
      case 'SUGGEST':
        signature += `:${change.suggestion?.substring(0, 50)}`;
        break;
    }
    
    if (!seen.has(signature)) {
      seen.add(signature);
      result.push(change);
    }
  }
  
  return result;
}

/**
 * Sort changes by priority
 */
function sortChangesByPriority(changes: ProposedChange[]): ProposedChange[] {
  const priorityOrder: Record<ChangePriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  
  // Also prioritize by type (contradictions first, suggestions last)
  const typeOrder: Record<ChangeType, number> = {
    CONTRADICT: 0,
    WEAKEN: 1,
    UPDATE: 2,
    STRENGTHEN: 3,
    ADD: 4,
    CONNECT: 5,
    MERGE: 6,
    SPLIT: 7,
    SUGGEST: 8,
  };
  
  return changes.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

// =============================================================================
// LOCAL CHANGE DETECTION (No LLM)
// =============================================================================

/**
 * Quick local change detection for real-time feedback
 */
export function determineChangesLocal(
  statement: Statement,
  relatedNodes: RelatedNodesResult
): ProposedChange[] {
  const changes: ProposedChange[] = [];
  
  // If no related nodes, suggest adding
  if (relatedNodes.relatedNodes.length === 0) {
    changes.push(createAddNodeChange(statement));
    return changes;
  }
  
  // Analyze each related node
  for (const related of relatedNodes.relatedNodes) {
    const change = createChangeFromRelationship(statement, related);
    if (change) {
      changes.push(change);
    }
  }
  
  return changes;
}

/**
 * Create a change based on the relationship hint
 */
function createChangeFromRelationship(
  statement: Statement,
  related: { node: GraphNode; relevanceScore: number; relationshipHint: string }
): ProposedChange | null {
  const { node, relevanceScore, relationshipHint } = related;
  
  switch (relationshipHint) {
    case 'confirms':
      return {
        id: uuid(),
        type: 'STRENGTHEN',
        priority: 'medium',
        nodeId: node.id,
        confidenceDelta: Math.round(relevanceScore * 20),
        reason: 'New information confirms this',
        sourceText: statement.text,
        explanation: `Statement "${statement.text.substring(0, 50)}..." confirms "${node.title}"`,
        timestamp: new Date(),
      };
      
    case 'contradicts':
      return {
        id: uuid(),
        type: 'CONTRADICT',
        priority: 'high',
        nodeAId: node.id,
        sourceText: statement.text,
        explanation: `Statement contradicts existing node "${node.title}"`,
        timestamp: new Date(),
      };
      
    case 'adds_detail':
      return {
        id: uuid(),
        type: 'ADD',
        priority: 'low',
        newNode: {
          type: statement.type === 'question' ? 'claim' : statement.type,
          title: statement.text.substring(0, 100),
          content: statement.text,
          confidence: statement.confidence,
        },
        connectTo: [{
          nodeId: node.id,
          edgeType: 'informs',
        }],
        sourceText: statement.text,
        explanation: `Adds detail to "${node.title}"`,
        timestamp: new Date(),
      };
      
    case 'supersedes':
      return {
        id: uuid(),
        type: 'UPDATE',
        priority: 'medium',
        targetNodeId: node.id,
        oldContent: node.content,
        newContent: statement.text,
        sourceText: statement.text,
        explanation: `New information supersedes existing node`,
        timestamp: new Date(),
      };
      
    default:
      // For 'same_topic' and 'related', suggest connection
      return {
        id: uuid(),
        type: 'SUGGEST',
        priority: 'low',
        suggestion: `Consider connecting new information to "${node.title}"`,
        rationale: `Both discuss similar topics (relevance: ${(relevanceScore * 100).toFixed(0)}%)`,
        sourceText: statement.text,
        explanation: `Related to existing node`,
        timestamp: new Date(),
      };
  }
}
