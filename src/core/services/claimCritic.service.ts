/**
 * Claim Critic Service
 * Uses Gemini 2.5 Flash to critique user claims against the Sequoia product framework.
 */

import { GoogleGenAI } from '@google/genai';
import { SKELETON_NODES } from '../../data/skeleton';
import type { ClaimCriticInput, ClaimCriticResult, ClaimCriticError } from './claimCritic.types';

const GEMINI_MODEL = 'gemini-2.5-flash';

function buildSequoiaFrameworkText(): string {
  const lines: string[] = [
    'THE IDEA (root): Your startup idea - the central thesis.',
    '',
    'Categories and evaluation dimensions:',
  ];
  const byCategory = new Map<string, Array<{ title: string; description: string }>>();
  for (const node of SKELETON_NODES) {
    if (node.position.level === 0) continue;
    if (node.position.level === 1) {
      byCategory.set(node.title, []);
      continue;
    }
    const parent = SKELETON_NODES.find(n => n.id === node.parentId);
    const cat = parent?.title ?? 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push({ title: node.title, description: node.description });
  }
  const categoryOrder = [
    'MARKET', 'PROBLEM', 'SOLUTION', 'TIMING', 'FOUNDER',
    'COMPETITION', 'BUSINESS MODEL', 'GTM',
  ];
  for (const cat of categoryOrder) {
    const leaves = byCategory.get(cat);
    if (!leaves?.length) continue;
    lines.push(`${cat}: ${leaves.map(l => l.title).join(', ')}`);
    for (const l of leaves) {
      lines.push(`  - ${l.title}: ${l.description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const SEQUOIA_FRAMEWORK_TEXT = buildSequoiaFrameworkText();

function buildSystemPrompt(): string {
  return `You are an expert startup advisor critiquing founder claims against the Sequoia-style product framework. Be direct, constructive, and specific. Do not use emojis.

Sequoia product framework (evaluation dimensions):

${SEQUOIA_FRAMEWORK_TEXT}

For each claim you receive:
1. Evaluate how well it addresses the relevant framework dimensions (clarity, specificity, evidence, coherence).
2. Identify strengths (what is well-articulated or convincing).
3. Identify gaps (what is vague, missing, or weak).
4. Give 1-3 concrete suggestions to strengthen the claim.
5. State which framework category (e.g. MARKET, PROBLEM, SOLUTION, TIMING, FOUNDER, COMPETITION, BUSINESS MODEL, GTM) this claim best fits.
6. Give an overall assessment: "weak", "moderate", or "strong".

Respond with valid JSON only, no markdown code fence. Use this exact structure:
{
  "summary": "One or two sentence overall critique.",
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "frameworkCategory": "CATEGORY_NAME",
  "assessment": "weak" | "moderate" | "strong"
}`;
}

function parseCritiqueResponse(text: string): ClaimCriticResult {
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  const parsed = JSON.parse(cleaned) as {
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    suggestions?: string[];
    frameworkCategory?: string;
    assessment?: string;
  };
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'No summary.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    frameworkCategory: typeof parsed.frameworkCategory === 'string'
      ? parsed.frameworkCategory
      : 'Unknown',
    assessment: ['weak', 'moderate', 'strong'].includes(parsed.assessment ?? '')
      ? (parsed.assessment as ClaimCriticResult['assessment'])
      : 'moderate',
  };
}

export interface ClaimCriticConfig {
  apiKey: string;
}

/**
 * Critique a user claim against the Sequoia product framework using Gemini 2.5 Flash.
 */
export async function critiqueClaim(
  input: ClaimCriticInput,
  config: ClaimCriticConfig
): Promise<ClaimCriticResult | ClaimCriticError> {
  if (!config.apiKey?.trim()) {
    return { message: 'Gemini API key is required. Set VITE_GEMINI_API_KEY in .env.', code: 'NO_API_KEY' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const contextNote = input.frameworkContextTitle
      ? ` (Attached to framework: ${input.frameworkContextTitle})`
      : '';
    const userContent = `Critique this founder claim${contextNote}:

Title: ${input.title}

Content: ${input.content}

Respond with JSON only.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userContent,
      config: {
        systemInstruction: buildSystemPrompt(),
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text;
    if (!text?.trim()) {
      return { message: 'Empty response from Gemini.', code: 'EMPTY_RESPONSE' };
    }

    return parseCritiqueResponse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { message: `Claim critic failed: ${message}`, code: 'CRITIC_ERROR' };
  }
}
