/**
 * Question Generator
 * Generates follow-up questions based on parsed input and proposed changes
 */

import { v4 as uuid } from 'uuid';
import type {
  FollowUpQuestion,
  QuestionGeneratorInput,
  GeneratedQuestions,
  QuestionCategory,
} from './types';
import { interpolateTemplate, getTemplate } from './templates';
import type { ParsedInput } from '../pipeline/types';
import type { GraphNode } from '../types/graph';

// =============================================================================
// VAGUE TERM DETECTION
// =============================================================================

const VAGUE_TERMS = [
  'a lot', 'lots of', 'many', 'few', 'some', 'several', 'most', 'often',
  'sometimes', 'rarely', 'frequently', 'expensive', 'cheap', 'affordable',
  'big', 'small', 'significant', 'substantial', 'considerable', 'major',
  'minor', 'pretty much', 'kind of', 'sort of', 'around', 'about', 'roughly',
  'approximately', 'more or less', 'quite a bit', 'not much', 'a while',
  'soon', 'later', 'eventually', 'probably', 'maybe', 'possibly',
];

function detectVagueTerms(statements: ParsedInput['statements'] | undefined): string[] {
  if (!statements) return [];
  
  const found: string[] = [];
  
  for (const statement of statements) {
    const text = statement.text.toLowerCase();
    for (const term of VAGUE_TERMS) {
      if (text.includes(term) && !found.includes(term)) {
        found.push(term);
      }
    }
  }
  
  return found;
}

// =============================================================================
// QUESTION CREATION HELPER
// =============================================================================

function createQuestion(
  category: QuestionCategory,
  trigger: string,
  variables: Record<string, string>,
  priorityOverride?: 'high' | 'medium' | 'low',
  targetNodeId?: string,
  targetFrameworkId?: string,
): FollowUpQuestion | null {
  const template = getTemplate(category, trigger);
  if (!template) return null;
  
  const question = interpolateTemplate(template.template, variables);
  const reason = template.reason 
    ? interpolateTemplate(template.reason, variables)
    : `Help us understand more about ${category}`;
  
  return {
    id: uuid(),
    category,
    question,
    priority: priorityOverride || template.defaultPriority || 'medium',
    targetNodeId,
    targetFrameworkId,
    inputType: template.inputType,
    options: template.options,
    scaleRange: template.scaleRange,
    scaleLabels: template.scaleLabels,
    placeholder: template.placeholder,
    skippable: true,
    reason,
  };
}

// =============================================================================
// SMART QUESTION SELECTION
// =============================================================================

export function generateFollowUpQuestionsLocal(
  input: QuestionGeneratorInput
): GeneratedQuestions {
  const { parsedInput, proposedChanges, nodes, frameworkNodes } = input;
  const questions: FollowUpQuestion[] = [];
  
  // Safely get arrays with defaults
  const entities = parsedInput.entities || [];
  const statements = parsedInput.statements || [];
  
  // 1. Check for missing identity info
  for (const entity of entities) {
    if (entity.type === 'person') {
      if (!entity.name || entity.name === 'Unknown') {
        const q = createQuestion('identity', 'person_without_name', {});
        if (q) questions.push(q);
      }
      if (entity.name && !entity.role) {
        const q = createQuestion('identity', 'person_without_role', { person: entity.name });
        if (q) questions.push(q);
      }
    }
  }
  
  // 2. Check for vague quantifications
  const vagueTerms = detectVagueTerms(statements);
  for (const vague of vagueTerms.slice(0, 2)) { // Limit to 2
    const q = createQuestion('quantification', 'vague_amount', { vague_term: vague });
    if (q) questions.push(q);
  }
  
  // 3. Check for contradictions with existing data
  for (const change of proposedChanges) {
    if (change.type === 'CONTRADICT') {
      const q = createQuestion(
        'contradiction',
        'conflicts_with_existing',
        { existing_claim: change.explanation || 'existing information' },
        'high'
      );
      if (q) questions.push(q);
    }
  }
  
  // 4. Check for missing context on entities (business size/type)
  for (const entity of entities) {
    if (entity.type === 'company' || entity.attributes?.restaurant_owner) {
      const entityName = entity.name || 'the business';
      
      if (!entity.attributes?.size && !entity.attributes?.seats) {
        const q = createQuestion('context', 'business_without_size', { entity: entityName });
        if (q) questions.push(q);
      }
      if (!entity.attributes?.type && !entity.attributes?.segment) {
        const q = createQuestion('context', 'business_without_type', { entity: entityName });
        if (q) questions.push(q);
      }
    }
  }
  
  // 5. Check for missing intent/willingness to pay
  const hasWTP = statements.some(s => {
    const text = s.text.toLowerCase();
    return text.includes('pay') || text.includes('buy') || text.includes('purchase') ||
           text.includes('would pay') || text.includes('willing to');
  });
  
  const hasPerson = entities.some(e => e.type === 'person');
  if (hasPerson && !hasWTP) {
    const person = entities.find(e => e.type === 'person');
    const q = createQuestion('intent', 'no_willingness_to_pay', { person: person?.name || 'this person' });
    if (q) questions.push(q);
  }
  
  // 6. Check for missing behavior info (current solution)
  const hasCurrentSolution = statements.some(s => {
    const text = s.text.toLowerCase();
    return text.includes('currently') || text.includes('today') || text.includes('right now') ||
           text.includes('tried') || text.includes('using') || text.includes('workaround');
  });
  
  if (hasPerson && !hasCurrentSolution) {
    const person = entities.find(e => e.type === 'person');
    const q = createQuestion('behavior', 'problem_without_current_solution', { person: person?.name || 'they' });
    if (q) questions.push(q);
  }
  
  // 7. Check if user has tried alternatives
  const mentionedTryingApps = statements.some(s => 
    s.text.toLowerCase().includes('tried') || s.text.toLowerCase().includes('app')
  );
  
  if (mentionedTryingApps) {
    const person = entities.find(e => e.type === 'person');
    const q = createQuestion('behavior', 'tried_alternatives', { person: person?.name || 'they' });
    if (q) questions.push(q);
  }
  
  // 8. Check for missing source info
  for (const entity of entities) {
    if (entity.type === 'person' && !entity.attributes?.source && !entity.attributes?.how_found) {
      const q = createQuestion('source', 'person_source_unknown', { person: entity.name || 'this person' });
      if (q) questions.push(q);
    }
  }
  
  // 9. Check for single data points (confidence)
  const evidenceCount = proposedChanges.filter(c =>
    c.type === 'ADD' && c.newNode?.type === 'evidence'
  ).length;
  
  if (evidenceCount === 1 && hasPerson) {
    const person = entities.find(e => e.type === 'person');
    const q = createQuestion('confidence', 'single_data_point', { person: person?.name || 'this person' });
    if (q) questions.push(q);
  }
  
  // 10. Check for urgency if not mentioned
  const mentionsUrgency = statements.some(s => {
    const text = s.text.toLowerCase();
    return text.includes('urgent') || text.includes('asap') || text.includes('immediately') ||
           text.includes('critical') || text.includes('priority');
  });
  
  if (hasPerson && !mentionsUrgency) {
    const person = entities.find(e => e.type === 'person');
    const q = createQuestion('intent', 'urgency_unclear', { person: person?.name || 'they' });
    if (q) questions.push(q);
  }
  
  // 11. Check for unanswered high-priority framework questions
  const unansweredFramework = getUnansweredFrameworkNodes(nodes, frameworkNodes);
  const criticalFramework = [
    'framework:problem:pain',
    'framework:solution:what',
    'framework:market:size',
    'framework:business_model:pricing',
  ];
  
  for (const fwNode of unansweredFramework.slice(0, 2)) { // Limit to 2
    if (criticalFramework.includes(fwNode.id)) {
      const q = createQuestion(
        'exploration',
        'framework_gap',
        { framework_question: fwNode.title },
        'medium',
        undefined,
        fwNode.id
      );
      if (q) questions.push(q);
    }
  }
  
  // Deduplicate and prioritize
  const dedupedQuestions = deduplicateQuestions(questions);
  const prioritized = prioritizeQuestions(dedupedQuestions);
  
  // Limit to top questions (don't overwhelm user)
  const maxQuestions = 5;
  const topQuestions = prioritized.slice(0, maxQuestions);
  
  return {
    questions: topQuestions,
    groupedByPriority: {
      high: topQuestions.filter(q => q.priority === 'high'),
      medium: topQuestions.filter(q => q.priority === 'medium'),
      low: topQuestions.filter(q => q.priority === 'low'),
    },
    totalCount: topQuestions.length,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getUnansweredFrameworkNodes(
  allNodes: GraphNode[],
  frameworkNodes: GraphNode[]
): GraphNode[] {
  // Framework nodes that don't have user content connected
  const connectedFrameworkIds = new Set<string>();
  
  // Check which framework nodes have user content connected
  // For now, we'll check if the framework node's isAnswered is true
  for (const node of allNodes) {
    if (node.type === 'framework' && 'isAnswered' in node && (node as any).isAnswered) {
      connectedFrameworkIds.add(node.id);
    }
  }
  
  // Return framework nodes that are not answered
  return frameworkNodes.filter(n => 
    n.type === 'framework' && 
    !connectedFrameworkIds.has(n.id) &&
    n.id.includes(':') && // Has at least one colon (is a child node)
    n.id.split(':').length >= 3 // Is a leaf node (category:question format)
  );
}

function deduplicateQuestions(questions: FollowUpQuestion[]): FollowUpQuestion[] {
  const seen = new Set<string>();
  return questions.filter(q => {
    // Create a simple key based on question text and category
    const key = `${q.category}:${q.question.substring(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================================================================
// PRIORITY LOGIC
// =============================================================================

const PRIORITY_SCORES: Record<QuestionCategory, number> = {
  contradiction: 100,      // Must resolve conflicts
  quantification: 80,      // Numbers are high value
  intent: 70,              // Willingness to pay is critical
  identity: 60,            // Need to track who said what
  context: 50,             // Segmentation matters
  behavior: 40,            // Understanding current state
  confidence: 30,          // Calibration
  source: 20,              // Replication
  exploration: 10,         // Nice to have
};

function prioritizeQuestions(questions: FollowUpQuestion[]): FollowUpQuestion[] {
  return questions
    .map(q => ({
      ...q,
      _score: PRIORITY_SCORES[q.category] + 
              (q.priority === 'high' ? 50 : q.priority === 'medium' ? 25 : 0),
    }))
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .map(({ _score, ...q }) => q as FollowUpQuestion);
}

// =============================================================================
// ANSWER PROCESSING
// =============================================================================

export function formatAnswerAsStatement(
  question: FollowUpQuestion,
  answer: string | number | string[]
): string {
  const answerStr = Array.isArray(answer) ? answer.join(', ') : String(answer);
  
  switch (question.category) {
    case 'identity':
      if (question.question.includes('name')) {
        return `The person's name is ${answerStr}.`;
      }
      if (question.question.includes('role')) {
        return `Their role is ${answerStr}.`;
      }
      if (question.question.includes('company')) {
        return `They work for ${answerStr}.`;
      }
      return `Identity info: ${answerStr}`;
      
    case 'context':
      if (question.question.includes('big') || question.question.includes('size')) {
        return `The business size is ${answerStr}.`;
      }
      if (question.question.includes('type') || question.question.includes('segment')) {
        return `The business type is ${answerStr}.`;
      }
      if (question.question.includes('location')) {
        return `Located in ${answerStr}.`;
      }
      return `Context: ${answerStr}`;
      
    case 'quantification':
      return `The specific amount/value is ${answerStr}.`;
      
    case 'behavior':
      if (question.question.includes('currently') || question.question.includes('handle')) {
        return `They currently handle it by: ${answerStr}.`;
      }
      if (question.question.includes('tried')) {
        return `They have tried: ${answerStr}.`;
      }
      return `Behavior: ${answerStr}`;
      
    case 'intent':
      if (question.question.includes('pay')) {
        return `Regarding willingness to pay: ${answerStr}.`;
      }
      if (question.inputType === 'scale') {
        return `Urgency level is ${answerStr} out of 10.`;
      }
      return `Intent: ${answerStr}`;
      
    case 'source':
      return `Source/channel: ${answerStr}.`;
      
    case 'confidence':
      return `Confidence assessment: ${answerStr}.`;
      
    case 'contradiction':
      return `Resolution: ${answerStr}.`;
      
    case 'exploration':
      return `Additional info: ${answerStr}.`;
      
    default:
      return answerStr;
  }
}

export function combineAnswersAsInput(
  answers: Record<string, string | number | string[]>,
  questions: FollowUpQuestion[]
): string {
  const statements: string[] = [];
  
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = questions.find(q => q.id === questionId);
    if (!question || answer === '' || answer === undefined) continue;
    
    const statement = formatAnswerAsStatement(question, answer);
    statements.push(statement);
  }
  
  return statements.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  detectVagueTerms,
  createQuestion,
  getUnansweredFrameworkNodes,
  prioritizeQuestions,
};
