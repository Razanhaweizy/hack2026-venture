/**
 * Stage 5: Framework Node Detection
 * Detects which framework questions the user input addresses
 */

import type {
  ParsedInput,
  FrameworkRelevance,
  LLMClient,
  LLMMessage,
} from './types';
import type { FrameworkNode } from '../types/graph';
import { parseJSONFromLLM } from './llmProvider';

// =============================================================================
// PROMPTS
// =============================================================================

const FRAMEWORK_DETECTION_PROMPT = `You are analyzing which startup evaluation framework questions are addressed by user input.

FRAMEWORK QUESTIONS (these are the standard questions every startup must answer):
{frameworkNodesJson}

USER INPUT:
"{userInput}"

EXTRACTED STATEMENTS:
{statementsJson}

For each framework question, determine if the user input addresses it:
- Score 0.0 to 1.0 based on how directly the input answers/addresses that question
- Only include questions with relevance >= 0.3
- Provide a brief reason for each match

Return JSON array:
[
  {
    "frameworkNodeId": "string",
    "relevance": number (0.0 to 1.0),
    "reason": "string (brief explanation)"
  }
]

Example relevance scores:
- 0.9-1.0: Directly answers the question with specific data
- 0.7-0.9: Addresses the question with claims/beliefs
- 0.5-0.7: Partially relevant, touches on the topic
- 0.3-0.5: Tangentially related
- Below 0.3: Not relevant (don't include)

Return empty array [] if nothing is relevant.`;

// =============================================================================
// FRAMEWORK DETECTION
// =============================================================================

interface RawFrameworkRelevance {
  frameworkNodeId: string;
  relevance: number;
  reason: string;
}

/**
 * Detect which framework questions the input addresses using LLM
 */
export async function detectFrameworkRelevance(
  parsed: ParsedInput,
  frameworkNodes: FrameworkNode[],
  llmClient: LLMClient
): Promise<FrameworkRelevance[]> {
  // Only consider leaf framework nodes (actual questions)
  const leafNodes = frameworkNodes.filter(n => n.position?.level === 2);
  
  if (leafNodes.length === 0) {
    return [];
  }

  // Prepare framework nodes for prompt
  const nodesForPrompt = leafNodes.map(n => ({
    id: n.id,
    title: n.title,
    description: n.description,
    category: n.frameworkCategory,
  }));

  // Prepare statements for prompt
  const statementsForPrompt = parsed.statements.map(s => ({
    text: s.text,
    type: s.type,
    confidence: s.confidence,
  }));

  const prompt = FRAMEWORK_DETECTION_PROMPT
    .replace('{frameworkNodesJson}', JSON.stringify(nodesForPrompt, null, 2))
    .replace('{userInput}', parsed.rawText)
    .replace('{statementsJson}', JSON.stringify(statementsForPrompt, null, 2));

  const messages: LLMMessage[] = [
    { role: 'user', content: prompt },
  ];

  try {
    const response = await llmClient.chat(messages);
    const rawResults = parseJSONFromLLM<RawFrameworkRelevance[]>(response.content);
    
    // Map to full FrameworkRelevance with titles
    const nodeMap = new Map(leafNodes.map(n => [n.id, n]));
    
    return rawResults
      .filter(r => r.relevance >= 0.3 && nodeMap.has(r.frameworkNodeId))
      .map(r => ({
        frameworkNodeId: r.frameworkNodeId,
        frameworkTitle: nodeMap.get(r.frameworkNodeId)!.title,
        relevance: Math.min(1, Math.max(0, r.relevance)),
        reason: r.reason,
      }))
      .sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error('Failed to detect framework relevance:', error);
    return [];
  }
}

// =============================================================================
// LOCAL DETECTION (No LLM)
// =============================================================================

/**
 * Quick local framework detection using keyword matching
 * Use for real-time feedback while full detection happens async
 */
export function detectFrameworkRelevanceLocal(
  text: string,
  frameworkNodes: FrameworkNode[]
): FrameworkRelevance[] {
  const textLower = text.toLowerCase();
  const results: FrameworkRelevance[] = [];
  
  // Consider leaf nodes (level 2) or nodes that are likely questions (have "?" or specific patterns)
  // Also include all framework nodes if there are no level 2 nodes found
  let leafNodes = frameworkNodes.filter(n => n.position?.level === 2);
  
  // If no level 2 nodes, try to identify leaf nodes by ID pattern or lack of children
  if (leafNodes.length === 0) {
    // Look for nodes with IDs that suggest they're leaf questions (have 3 parts like "framework:category:question")
    leafNodes = frameworkNodes.filter(n => {
      const parts = n.id.split(':');
      return parts.length >= 3 && n.type === 'framework';
    });
  }
  
  // If still no nodes, use all framework nodes
  if (leafNodes.length === 0) {
    leafNodes = frameworkNodes;
  }
  
  for (const node of leafNodes) {
    const relevance = calculateLocalRelevance(textLower, node);
    
    if (relevance >= 0.2) { // Lower threshold for more matches
      results.push({
        frameworkNodeId: node.id,
        frameworkTitle: node.title,
        relevance,
        reason: `Keyword match with "${node.title}"`,
      });
    }
  }
  
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Calculate relevance score based on keyword matching
 */
function calculateLocalRelevance(text: string, node: FrameworkNode): number {
  let score = 0;
  
  // Keywords for each framework category
  const categoryKeywords: Record<string, string[]> = {
    market: ['market', 'industry', 'sector', 'tam', 'sam', 'som', 'billion', 'million', 'growth', 'restaurant', 'food'],
    problem: ['problem', 'pain', 'issue', 'challenge', 'frustration', 'solve', 'need', 'want', 'waste', 'cost', 'lose', 'losing', 'lost'],
    solution: ['solution', 'product', 'build', 'feature', 'technology', 'platform', 'app', 'apps', 'service', 'tried', 'nothing worked', 'nothing stuck'],
    timing: ['now', 'timing', 'trend', 'change', 'recent', 'window', 'opportunity'],
    founder: ['founder', 'team', 'experience', 'expertise', 'background', 'built', 'worked', 'talked to', 'interview'],
    competition: ['competitor', 'alternative', 'incumbent', 'versus', 'compare', 'better than', 'tried', 'apps', 'existing'],
    business_model: ['revenue', 'price', 'pricing', 'cost', 'unit economics', 'margin', 'ltv', 'cac', 'monetize', 'pay', 'paying', 'month', 'per month', 'would pay', 'willing'],
    gtm: ['customer', 'customers', 'acquisition', 'sales', 'marketing', 'channel', 'viral', 'growth', 'owner', 'owns'],
  };
  
  // Specific question keywords
  const questionKeywords: Record<string, string[]> = {
    'framework:market:size': ['market size', 'tam', 'billion', 'million dollar', 'restaurants', 'industry'],
    'framework:market:growth': ['growth rate', 'growing', 'cagr', 'expanding'],
    'framework:problem:who': ['who has', 'target', 'user', 'customer segment', 'owner', 'owns', 'restaurant owner'],
    'framework:problem:pain': ['pain point', 'frustration', 'cost of', 'lose', 'waste', 'costs', 'per month', 'food waste', 'painful'],
    'framework:problem:current_solution': ['currently', 'today', 'existing', 'alternative', 'tried', 'apps', 'nothing stuck', 'nothing worked'],
    'framework:problem:frequency': ['often', 'frequently', 'daily', 'monthly', 'per month'],
    'framework:solution:what': ['build', 'product', 'platform', 'solution is'],
    'framework:solution:different': ['different', 'unique', 'unlike', 'novel', 'actually worked', 'actually works'],
    'framework:solution:moat': ['moat', 'defensible', 'barrier', 'competitive advantage'],
    'framework:timing:why_now': ['why now', 'timing', 'moment', 'opportunity'],
    'framework:founder:why_you': ['why me', 'my background', 'experience', 'qualified'],
    'framework:competition:direct': ['competitor', 'competing', 'similar', 'tried apps', 'other apps'],
    'framework:business_model:revenue': ['revenue', 'make money', 'charge', 'pricing'],
    'framework:business_model:pricing': ['pay', 'would pay', 'willing to pay', 'per month', 'pricing', 'price point', 'charge'],
    'framework:gtm:first_customers': ['first customer', 'initial', 'early adopter', 'pilot', 'talked to', 'interview'],
  };
  
  // Check category keywords
  const category = node.frameworkCategory || '';
  const catKeywords = categoryKeywords[category] || [];
  for (const keyword of catKeywords) {
    if (text.includes(keyword)) {
      score += 0.1;
    }
  }
  
  // Check specific question keywords
  const qKeywords = questionKeywords[node.id] || [];
  for (const keyword of qKeywords) {
    if (text.includes(keyword)) {
      score += 0.2;
    }
  }
  
  // Check title keywords
  const titleWords = node.title.toLowerCase().split(/\s+/);
  for (const word of titleWords) {
    if (word.length > 3 && text.includes(word)) {
      score += 0.1;
    }
  }
  
  // Check description keywords if available
  if (node.description) {
    const descWords = node.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    for (const word of descWords.slice(0, 10)) {
      if (text.includes(word)) {
        score += 0.05;
      }
    }
  }
  
  return Math.min(1, score);
}

// =============================================================================
// BATCH DETECTION
// =============================================================================

/**
 * Detect framework relevance for multiple inputs efficiently
 */
export async function detectFrameworkRelevanceBatch(
  inputs: ParsedInput[],
  frameworkNodes: FrameworkNode[],
  llmClient: LLMClient
): Promise<Map<number, FrameworkRelevance[]>> {
  const results = new Map<number, FrameworkRelevance[]>();
  
  // For small batches, process sequentially
  for (let i = 0; i < inputs.length; i++) {
    const relevance = await detectFrameworkRelevance(inputs[i], frameworkNodes, llmClient);
    results.set(i, relevance);
  }
  
  return results;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the most relevant framework question for a piece of text
 */
export function getMostRelevantFrameworkNode(
  text: string,
  frameworkNodes: FrameworkNode[]
): FrameworkRelevance | null {
  const relevance = detectFrameworkRelevanceLocal(text, frameworkNodes);
  return relevance.length > 0 ? relevance[0] : null;
}

/**
 * Check if input addresses a specific framework question
 */
export function addressesFrameworkQuestion(
  text: string,
  frameworkNodeId: string,
  frameworkNodes: FrameworkNode[]
): boolean {
  const relevance = detectFrameworkRelevanceLocal(text, frameworkNodes);
  const match = relevance.find(r => r.frameworkNodeId === frameworkNodeId);
  return match ? match.relevance >= 0.5 : false;
}
