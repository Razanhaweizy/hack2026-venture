/**
 * Stage 1: Parse User Input
 * Extracts structured information from freeform text using LLM
 */

import type { 
  ParsedInput, 
  Statement, 
  Entity, 
  LLMClient,
  LLMMessage 
} from './types';
import { parseJSONFromLLM } from './llmProvider';

// =============================================================================
// PROMPTS
// =============================================================================

const SYSTEM_PROMPT = `You are an expert at extracting structured information from startup founder input.
Your job is to parse freeform text and identify:
1. Distinct statements (claims, facts, evidence, questions)
2. Named entities (people, companies, products, metrics, dates, locations)
3. Overall sentiment

Be precise and extract ALL relevant information. If something is unclear, make your best inference.
Always return valid JSON matching the specified schema.`;

function createParsePrompt(userText: string): string {
  return `Extract structured information from this founder's input about their startup idea.

INPUT TEXT:
"${userText}"

EXTRACT THE FOLLOWING:

1. STATEMENTS - Each distinct claim, fact, or piece of evidence. For each statement:
   - text: The core statement (cleaned up, complete sentence)
   - type: One of:
     * "claim" - A belief or hypothesis (e.g., "I think users will pay for this")
     * "fact" - Verifiable information (e.g., "The market is $5B")  
     * "evidence" - Real-world observation/data (e.g., "We talked to 50 users and 80% said...")
     * "question" - Something the founder is uncertain about
   - confidence: How certain does the user seem? (0-100)
     * 100 = absolute certainty ("We know for a fact...")
     * 70-90 = high confidence ("Based on our research...")
     * 40-70 = moderate ("I think...", "It seems like...")
     * Below 40 = uncertain ("Maybe...", "I'm not sure but...")
   - source: Who/what is this information from? (optional)
   - quantitative: If numbers are mentioned, extract:
     * value: The number
     * unit: The unit (dollars, percent, users, etc.)
     * context: What the number refers to

2. ENTITIES - People, companies, products, metrics, dates, locations mentioned. For each:
   - name: The entity name
   - type: One of "person", "company", "product", "metric", "date", "location"
   - role: Their role in the startup context (e.g., "potential customer", "competitor", "advisor")
   - attributes: Any details mentioned about them (as key-value pairs)

3. SENTIMENT - Overall sentiment of the input:
   - "positive" - Optimistic, excited, confident
   - "negative" - Pessimistic, worried, doubtful
   - "neutral" - Factual, balanced, informational

Return ONLY valid JSON matching this exact structure:
{
  "statements": [
    {
      "text": "string",
      "type": "claim" | "fact" | "evidence" | "question",
      "confidence": number,
      "source": "string or null",
      "quantitative": { "value": number, "unit": "string", "context": "string" } | null
    }
  ],
  "entities": [
    {
      "name": "string",
      "type": "person" | "company" | "product" | "metric" | "date" | "location",
      "role": "string or null",
      "attributes": {}
    }
  ],
  "sentiment": "positive" | "negative" | "neutral"
}`;
}

// =============================================================================
// PARSER FUNCTION
// =============================================================================

interface RawParsedOutput {
  statements: Array<{
    text: string;
    type: string;
    confidence: number;
    source?: string | null;
    quantitative?: {
      value: number;
      unit: string;
      context: string;
    } | null;
  }>;
  entities: Array<{
    name: string;
    type: string;
    role?: string | null;
    attributes?: Record<string, unknown>;
  }>;
  sentiment: string;
}

/**
 * Parse user input into structured statements and entities
 */
export async function parseUserInput(
  text: string, 
  llmClient: LLMClient
): Promise<ParsedInput> {
  // Handle empty input
  if (!text || text.trim().length === 0) {
    return {
      statements: [],
      entities: [],
      sentiment: 'neutral',
      rawText: text,
    };
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: createParsePrompt(text) },
  ];

  try {
    const response = await llmClient.chat(messages);
    const parsed = parseJSONFromLLM<RawParsedOutput>(response.content);
    
    // Validate and normalize the response
    const result = normalizeParseResult(parsed, text);
    
    return result;
  } catch (error) {
    console.error('Failed to parse user input:', error);
    
    // Return a fallback with the raw text as a single statement
    return {
      statements: [{
        text: text.trim(),
        type: 'claim',
        confidence: 50,
      }],
      entities: [],
      sentiment: 'neutral',
      rawText: text,
    };
  }
}

/**
 * Normalize and validate the LLM parse result
 */
function normalizeParseResult(raw: RawParsedOutput, originalText: string): ParsedInput {
  // Validate statement types
  const validStatementTypes = ['claim', 'fact', 'evidence', 'question'];
  const statements: Statement[] = (raw.statements || []).map(s => ({
    text: s.text || '',
    type: validStatementTypes.includes(s.type) 
      ? s.type as Statement['type'] 
      : 'claim',
    confidence: Math.min(100, Math.max(0, s.confidence || 50)),
    source: s.source || undefined,
    quantitative: s.quantitative ? {
      value: s.quantitative.value,
      unit: s.quantitative.unit,
      context: s.quantitative.context,
    } : undefined,
  }));

  // Validate entity types
  const validEntityTypes = ['person', 'company', 'product', 'metric', 'date', 'location'];
  const entities: Entity[] = (raw.entities || []).map(e => ({
    name: e.name || '',
    type: validEntityTypes.includes(e.type) 
      ? e.type as Entity['type'] 
      : 'company',
    role: e.role || undefined,
    attributes: e.attributes || {},
  }));

  // Validate sentiment
  const validSentiments = ['positive', 'negative', 'neutral'];
  const sentiment = validSentiments.includes(raw.sentiment) 
    ? raw.sentiment as ParsedInput['sentiment']
    : 'neutral';

  return {
    statements,
    entities,
    sentiment,
    rawText: originalText,
  };
}

// =============================================================================
// BATCH PARSING
// =============================================================================

/**
 * Parse multiple inputs in batch (more efficient for many inputs)
 */
export async function parseUserInputBatch(
  texts: string[],
  llmClient: LLMClient
): Promise<ParsedInput[]> {
  // For small batches, process sequentially
  if (texts.length <= 3) {
    const results: ParsedInput[] = [];
    for (const text of texts) {
      results.push(await parseUserInput(text, llmClient));
    }
    return results;
  }

  // For larger batches, create a combined prompt
  const combinedPrompt = texts.map((text, i) => `
INPUT ${i + 1}:
"${text}"
`).join('\n---\n');

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { 
      role: 'user', 
      content: `Parse each of the following inputs separately and return an array of ParsedInput objects.

${combinedPrompt}

Return a JSON array where each element matches the ParsedInput schema for the corresponding input.`
    },
  ];

  try {
    const response = await llmClient.chat(messages);
    const parsed = parseJSONFromLLM<RawParsedOutput[]>(response.content);
    
    return parsed.map((p, i) => normalizeParseResult(p, texts[i]));
  } catch (error) {
    console.error('Batch parsing failed, falling back to sequential:', error);
    
    // Fallback to sequential parsing
    const results: ParsedInput[] = [];
    for (const text of texts) {
      results.push(await parseUserInput(text, llmClient));
    }
    return results;
  }
}

// =============================================================================
// QUICK PARSE (No LLM, pattern-based)
// =============================================================================

/**
 * Quick local parsing without LLM for simple inputs
 * Use this for real-time feedback while full parsing happens async
 */
export function quickParseLocal(text: string): Partial<ParsedInput> {
  const statements: Statement[] = [];
  
  // Split by sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 3) continue;
    
    // Detect statement type based on patterns
    let type: Statement['type'] = 'claim';
    let confidence = 50;
    
    // Questions
    if (trimmed.includes('?') || /^(how|what|why|when|where|who|should|could|would)/i.test(trimmed)) {
      type = 'question';
      confidence = 30;
    }
    // Evidence patterns
    else if (/\b(talked to|interviewed|surveyed|found that|data shows|research|according to)\b/i.test(trimmed)) {
      type = 'evidence';
      confidence = 70;
    }
    // Fact patterns
    else if (/\b(is worth|market size|revenue|costs?|price|percent|million|billion|\$\d+)\b/i.test(trimmed)) {
      type = 'fact';
      confidence = 60;
    }
    // Certainty modifiers
    if (/\b(definitely|certainly|absolutely|we know|proven)\b/i.test(trimmed)) {
      confidence = Math.min(100, confidence + 30);
    }
    if (/\b(maybe|perhaps|might|could be|possibly|I think|I believe)\b/i.test(trimmed)) {
      confidence = Math.max(0, confidence - 20);
    }
    
    // Extract numbers
    let quantitative: Statement['quantitative'] | undefined;
    const numberMatch = trimmed.match(/\$?([\d,]+(?:\.\d+)?)\s*(million|billion|k|%|percent|users|customers|dollars)?/i);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1].replace(/,/g, ''));
      const unit = numberMatch[2]?.toLowerCase() || 'units';
      quantitative = {
        value,
        unit,
        context: trimmed,
      };
    }
    
    statements.push({
      text: trimmed,
      type,
      confidence,
      quantitative,
    });
  }
  
  // Detect sentiment
  let sentiment: ParsedInput['sentiment'] = 'neutral';
  const positiveWords = /\b(great|excited|amazing|opportunity|growth|success|confident)\b/i;
  const negativeWords = /\b(worried|concerned|problem|issue|difficult|hard|failing)\b/i;
  
  if (positiveWords.test(text)) sentiment = 'positive';
  if (negativeWords.test(text)) sentiment = 'negative';
  
  return {
    statements,
    sentiment,
    rawText: text,
  };
}
