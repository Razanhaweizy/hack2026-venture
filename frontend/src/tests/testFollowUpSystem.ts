/**
 * Test Follow-up Question System
 * Tests the follow-up question generation and feedback loop
 */

import { v4 as uuid } from 'uuid';
import { useGraphStore, createFreshGraph } from '../store';
import { useFollowUpStore } from '../followup/followupStore';
import { 
  generateFollowUpQuestionsLocal,
  combineAnswersAsInput,
} from '../followup/questionGenerator';
import { 
  processUserInputLocal,
  quickParseLocal,
} from '../pipeline';

// =============================================================================
// TEST INPUT - VAGUE INPUT
// =============================================================================

export const VAGUE_INPUT = `Talked to a restaurant owner yesterday. They said waste is a huge problem, costs them a lot.`;

// Expected questions (in priority order)
export const EXPECTED_QUESTIONS = [
  { category: 'quantification', trigger: 'a lot', priority: 'high' },
  { category: 'identity', trigger: 'name missing', priority: 'high' },
  { category: 'context', trigger: 'business size', priority: 'medium' },
  { category: 'intent', trigger: 'willingness to pay', priority: 'high' },
  { category: 'source', trigger: 'how found', priority: 'low' },
];

// =============================================================================
// TEST: Generate Questions from Vague Input
// =============================================================================

export function testQuestionGeneration(): {
  passed: boolean;
  questions: string[];
  details: string;
} {
  console.log('\n=== Test: Question Generation from Vague Input ===\n');
  console.log('Input:', VAGUE_INPUT);
  
  // Initialize fresh graph
  createFreshGraph();
  
  const store = useGraphStore.getState();
  const allNodes = store.getAllNodes();
  const frameworkNodes = store.getFrameworkNodes();
  
  // Parse the input
  const parsed = quickParseLocal(VAGUE_INPUT);
  console.log('\nParsed Input:');
  console.log('  Statements:', parsed.statements?.length || 0);
  console.log('  Entities:', parsed.entities?.length || 0);
  
  // Process through pipeline to get proposed changes
  const pipelineResult = processUserInputLocal(VAGUE_INPUT, allNodes, frameworkNodes);
  console.log('\nPipeline Result:');
  console.log('  Changes:', pipelineResult.changes.length);
  
  // Generate follow-up questions
  const result = generateFollowUpQuestionsLocal({
    parsedInput: parsed,
    proposedChanges: pipelineResult.changes,
    nodes: allNodes,
    frameworkNodes,
  });
  
  console.log('\nGenerated Questions:', result.questions.length);
  console.log('  High priority:', result.groupedByPriority.high.length);
  console.log('  Medium priority:', result.groupedByPriority.medium.length);
  console.log('  Low priority:', result.groupedByPriority.low.length);
  
  const questionSummaries: string[] = [];
  
  for (const q of result.questions) {
    const summary = `[${q.priority.toUpperCase()}] ${q.category}: ${q.question.substring(0, 60)}...`;
    console.log(`  ${summary}`);
    questionSummaries.push(summary);
  }
  
  // Verify expected question types
  let hasQuantification = false;
  let hasIdentity = false;
  let hasVagueTerm = false;
  
  for (const q of result.questions) {
    if (q.category === 'quantification') hasQuantification = true;
    if (q.category === 'identity') hasIdentity = true;
    if (q.question.toLowerCase().includes('a lot') || 
        q.question.toLowerCase().includes('huge')) {
      hasVagueTerm = true;
    }
  }
  
  console.log('\n--- Verification ---');
  console.log(`  Quantification question: ${hasQuantification ? '✓' : '✗'}`);
  console.log(`  Identity question: ${hasIdentity ? '✓' : '✗'}`);
  console.log(`  Vague term detected ("a lot" or "huge"): ${hasVagueTerm ? '✓' : '✗'}`);
  
  const passed = result.questions.length >= 3 && (hasQuantification || hasVagueTerm);
  
  return {
    passed,
    questions: questionSummaries,
    details: passed 
      ? `Generated ${result.questions.length} relevant questions` 
      : 'Missing expected question types',
  };
}

// =============================================================================
// TEST: Answer Questions and Verify Feedback Loop
// =============================================================================

export function testFeedbackLoop(): {
  passed: boolean;
  newChanges: number;
  details: string;
} {
  console.log('\n=== Test: Feedback Loop ===\n');
  
  // Initialize fresh graph
  createFreshGraph();
  
  const store = useGraphStore.getState();
  const allNodes = store.getAllNodes();
  const frameworkNodes = store.getFrameworkNodes();
  
  // Parse and generate questions
  const parsed = quickParseLocal(VAGUE_INPUT);
  const pipelineResult = processUserInputLocal(VAGUE_INPUT, allNodes, frameworkNodes);
  const result = generateFollowUpQuestionsLocal({
    parsedInput: parsed,
    proposedChanges: pipelineResult.changes,
    nodes: allNodes,
    frameworkNodes,
  });
  
  console.log('Questions generated:', result.questions.length);
  
  // Simulate answering questions
  const answers: Record<string, string | number | string[]> = {};
  
  // Answer first few questions
  if (result.questions.length > 0) {
    // Find quantification question
    const quantQ = result.questions.find(q => 
      q.category === 'quantification' || 
      q.question.toLowerCase().includes('quantify')
    );
    if (quantQ) {
      answers[quantQ.id] = '$2,800/month';
      console.log(`Answer 1: "$2,800/month" for quantification`);
    }
    
    // Find identity question
    const identityQ = result.questions.find(q => 
      q.category === 'identity' || 
      q.question.toLowerCase().includes('name')
    );
    if (identityQ) {
      answers[identityQ.id] = 'Sarah';
      console.log(`Answer 2: "Sarah" for identity`);
    }
  }
  
  // Combine answers as input
  const combinedInput = combineAnswersAsInput(answers, result.questions);
  console.log('\nCombined input from answers:');
  console.log(combinedInput);
  
  // Process through pipeline again
  const newResult = processUserInputLocal(combinedInput, allNodes, frameworkNodes);
  
  console.log('\nNew changes from answers:', newResult.changes.length);
  for (const change of newResult.changes) {
    console.log(`  [${change.type}] ${change.explanation?.substring(0, 50) || change.newNode?.title || ''}`);
  }
  
  // Verify new changes include the specific data
  let hasEvidenceWithAmount = false;
  for (const change of newResult.changes) {
    if (change.type === 'ADD' && change.newNode) {
      const text = `${change.newNode.title} ${change.newNode.content}`.toLowerCase();
      if (text.includes('2,800') || text.includes('2800')) {
        hasEvidenceWithAmount = true;
      }
    }
  }
  
  console.log(`  Has evidence with $2,800: ${hasEvidenceWithAmount ? '✓' : '✗'}`);
  
  const passed = newResult.changes.length > 0;
  
  return {
    passed,
    newChanges: newResult.changes.length,
    details: passed 
      ? `Generated ${newResult.changes.length} new changes from answers` 
      : 'No new changes generated',
  };
}

// =============================================================================
// TEST: Edge Cases
// =============================================================================

export function testEdgeCases(): {
  skipAll: boolean;
  emptyInput: boolean;
  details: string;
} {
  console.log('\n=== Test: Edge Cases ===\n');
  
  const results = {
    skipAll: false,
    emptyInput: false,
    details: '',
  };
  
  // Test 1: Skip all questions
  console.log('Test 1: Skip all questions');
  try {
    const followUpStore = useFollowUpStore.getState();
    
    // Create some mock questions
    const mockQuestions = [
      {
        id: uuid(),
        category: 'quantification' as const,
        question: 'Test question 1',
        priority: 'high' as const,
        inputType: 'text' as const,
        skippable: true,
        reason: 'Test reason',
      },
      {
        id: uuid(),
        category: 'identity' as const,
        question: 'Test question 2',
        priority: 'medium' as const,
        inputType: 'text' as const,
        skippable: true,
        reason: 'Test reason',
      },
    ];
    
    followUpStore.openFollowUp(mockQuestions);
    followUpStore.skipAll();
    
    const state = useFollowUpStore.getState();
    results.skipAll = state.skipped.size === mockQuestions.length;
    console.log(`  Skip all: ${results.skipAll ? '✓' : '✗'} (${state.skipped.size}/${mockQuestions.length} skipped)`);
    
    followUpStore.reset();
  } catch (e) {
    console.log(`  Skip all: ✗ (error: ${e})`);
    results.skipAll = false;
  }
  
  // Test 2: Empty/minimal input should generate exploratory questions
  console.log('\nTest 2: Empty/minimal input');
  try {
    createFreshGraph();
    const store = useGraphStore.getState();
    
    const parsed = quickParseLocal('');
    const result = generateFollowUpQuestionsLocal({
      parsedInput: parsed,
      proposedChanges: [],
      nodes: store.getAllNodes(),
      frameworkNodes: store.getFrameworkNodes(),
    });
    
    // Should still work (may generate framework gap questions)
    results.emptyInput = true;
    console.log(`  Empty input: ✓ (generated ${result.questions.length} questions)`);
  } catch (e) {
    console.log(`  Empty input: ✗ (error: ${e})`);
    results.emptyInput = false;
  }
  
  results.details = `Skip all: ${results.skipAll}, Empty input: ${results.emptyInput}`;
  
  return results;
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export function runFollowUpTests(): void {
  console.log('\n========================================');
  console.log('FOLLOW-UP SYSTEM TESTS');
  console.log('========================================\n');
  
  const test1 = testQuestionGeneration();
  const test2 = testFeedbackLoop();
  const test3 = testEdgeCases();
  
  console.log('\n========================================');
  console.log('RESULTS SUMMARY');
  console.log('========================================');
  console.log(`1. Question Generation: ${test1.passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`   ${test1.details}`);
  console.log(`2. Feedback Loop: ${test2.passed ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`   ${test2.details}`);
  console.log(`3. Edge Cases:`);
  console.log(`   Skip All: ${test3.skipAll ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`   Empty Input: ${test3.emptyInput ? '✓ PASS' : '✗ FAIL'}`);
  
  const allPassed = test1.passed && test2.passed && test3.skipAll && test3.emptyInput;
  console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASS' : '✗ SOME TESTS FAILED'}`);
}

// Export the vague input for use in App
export { VAGUE_INPUT as TEST_VAGUE_INPUT };
