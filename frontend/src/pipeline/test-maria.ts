/**
 * Pipeline Test: Maria Restaurant Example
 * Tests the extraction pipeline with a specific customer interview
 */

import {
  ExtractionPipeline,
  processUserInputLocal,
  quickParseLocal,
  detectFrameworkRelevanceLocal,
  groupChangesByType,
} from './index';
import type { FrameworkNode } from '../types/graph';

// =============================================================================
// TEST INPUT
// =============================================================================

const TEST_INPUT = `Talked to Maria yesterday, she owns a restaurant in Brooklyn with about 30 seats. She said food waste costs her around $2,500 per month and she's tried a few apps but nothing stuck. She'd pay up to $75/month for something that actually worked.`;

// =============================================================================
// EXPECTED OUTPUT (for validation)
// =============================================================================

const EXPECTED = {
  statements: [
    {
      text: 'Food waste costs ~$2,500/month',
      type: 'evidence',
      confidence: 'high', // 70-100
      source: 'Maria',
    },
    {
      text: "She's tried apps but nothing stuck",
      type: 'evidence',
      confidence: 'medium', // 40-70
      source: 'Maria',
    },
    {
      text: 'Would pay up to $75/month',
      type: 'evidence',
      confidence: 'high', // 70-100
      source: 'Maria',
    },
  ],
  entities: [
    {
      name: 'Maria',
      type: 'person',
      role: 'potential customer',
      attributes: {
        restaurant_owner: true,
        location: 'Brooklyn',
        seats: 30,
      },
    },
  ],
  frameworkRelevance: [
    'framework:problem:pain',
    'framework:problem:current_solution',
    'framework:business_model:pricing',
  ],
};

// =============================================================================
// TEST FRAMEWORK NODES
// =============================================================================

const testFrameworkNodes: FrameworkNode[] = [
  {
    id: 'framework:problem:pain',
    type: 'framework',
    title: 'How painful is it?',
    content: '',
    description: 'How painful is the problem for customers? What does it cost them in time, money, or frustration?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'problem',
    position: { x: -10, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:problem',
  },
  {
    id: 'framework:problem:who',
    type: 'framework',
    title: 'Who has this problem?',
    content: '',
    description: 'Who are the target customers experiencing this problem?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'problem',
    position: { x: -10, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:problem',
  },
  {
    id: 'framework:problem:current_solution',
    type: 'framework',
    title: 'How do they solve it today?',
    content: '',
    description: 'What are the current alternatives or workarounds customers use?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'problem',
    position: { x: -10, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:problem',
  },
  {
    id: 'framework:market:size',
    type: 'framework',
    title: 'Market size',
    content: '',
    description: 'What is the total addressable market (TAM)?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'market',
    position: { x: -14, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:market',
  },
  {
    id: 'framework:business_model:pricing',
    type: 'framework',
    title: 'Pricing',
    content: '',
    description: 'How will you price your product? What will customers pay?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'business_model',
    position: { x: 10, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:business_model',
  },
  {
    id: 'framework:business_model:unit_economics',
    type: 'framework',
    title: 'Unit economics',
    content: '',
    description: 'What are the unit economics? CAC, LTV, margins?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'business_model',
    position: { x: 10, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:business_model',
  },
  {
    id: 'framework:gtm:first_customers',
    type: 'framework',
    title: 'First customers',
    content: '',
    description: 'Who will be your first customers and how will you reach them?',
    confidence: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    frameworkCategory: 'gtm',
    position: { x: 14, y: 4, level: 2 },
    isSkeleton: true,
    parentId: 'framework:gtm',
  },
];

// =============================================================================
// TEST: Local Quick Parse
// =============================================================================

export function testQuickParse(): { passed: boolean; details: string } {
  console.log('\n=== Test: Quick Local Parse ===\n');
  console.log(`Input: "${TEST_INPUT}"\n`);
  
  const result = quickParseLocal(TEST_INPUT);
  
  console.log('Parsed Statements:');
  for (const stmt of result.statements || []) {
    console.log(`  [${stmt.type}] "${stmt.text.substring(0, 60)}..." (confidence: ${stmt.confidence})`);
    if (stmt.quantitative) {
      console.log(`    Quantitative: ${stmt.quantitative.value} ${stmt.quantitative.unit}`);
    }
  }
  
  console.log(`\nSentiment: ${result.sentiment}`);
  
  // Validation
  const stmtCount = result.statements?.length || 0;
  const hasEvidence = result.statements?.some(s => s.type === 'evidence') ?? false;
  const hasNumbers = result.statements?.some(s => s.quantitative) ?? false;
  
  const passed = stmtCount >= 2 && hasNumbers;
  
  console.log(`\nValidation:`);
  console.log(`  - Found ${stmtCount} statements (expected >= 2): ${stmtCount >= 2 ? '✓' : '✗'}`);
  console.log(`  - Has quantitative data: ${hasNumbers ? '✓' : '✗'}`);
  console.log(`  - Has evidence type: ${hasEvidence ? '✓' : '✗'}`);
  
  return {
    passed,
    details: `Found ${stmtCount} statements, hasNumbers=${hasNumbers}, hasEvidence=${hasEvidence}`,
  };
}

// =============================================================================
// TEST: Framework Detection
// =============================================================================

export function testFrameworkDetection(): { passed: boolean; details: string } {
  console.log('\n=== Test: Framework Detection ===\n');
  
  const relevance = detectFrameworkRelevanceLocal(TEST_INPUT, testFrameworkNodes);
  
  console.log('Framework Relevance (local detection):');
  for (const r of relevance) {
    console.log(`  - ${r.frameworkTitle} (${r.frameworkNodeId}): ${(r.relevance * 100).toFixed(0)}%`);
  }
  
  // Check expected framework matches
  const expectedIds = EXPECTED.frameworkRelevance;
  const foundIds = relevance.map(r => r.frameworkNodeId);
  
  const matchedExpected = expectedIds.filter(id => foundIds.includes(id));
  
  console.log(`\nValidation:`);
  console.log(`  - Expected frameworks: ${expectedIds.join(', ')}`);
  console.log(`  - Found frameworks: ${foundIds.join(', ')}`);
  console.log(`  - Matched: ${matchedExpected.length}/${expectedIds.length}`);
  
  const passed = matchedExpected.length >= 2; // At least 2 of 3 expected
  
  return {
    passed,
    details: `Matched ${matchedExpected.length}/${expectedIds.length} expected framework nodes`,
  };
}

// =============================================================================
// TEST: Local Pipeline Processing
// =============================================================================

export function testLocalPipeline(): { passed: boolean; details: string } {
  console.log('\n=== Test: Local Pipeline Processing ===\n');
  
  const result = processUserInputLocal(TEST_INPUT, testFrameworkNodes, testFrameworkNodes);
  
  console.log(`Success: ${result.success}`);
  console.log(`Processing time: ${result.processingTimeMs}ms`);
  
  if (result.parsed) {
    console.log(`\nParsed:`);
    console.log(`  - Statements: ${result.parsed.statements.length}`);
    console.log(`  - Sentiment: ${result.parsed.sentiment}`);
  }
  
  if (result.frameworkRelevance) {
    console.log(`\nFramework Relevance: ${result.frameworkRelevance.length} matches`);
  }
  
  console.log(`\nProposed Changes: ${result.changes.length}`);
  
  const grouped = groupChangesByType(result.changes);
  for (const [type, changes] of grouped) {
    console.log(`\n  ${type} (${changes.length}):`);
    for (const change of changes) {
      console.log(`    [${change.priority}] ${change.explanation.substring(0, 80)}...`);
      if (change.newNode) {
        console.log(`      -> New node: "${change.newNode.title}"`);
      }
      if (change.connectTo) {
        console.log(`      -> Connects to: ${change.connectTo.map(c => c.nodeId).join(', ')}`);
      }
    }
  }
  
  // Validation
  const hasAddChanges = result.changes.some(c => c.type === 'ADD');
  const hasSuggestChanges = result.changes.some(c => c.type === 'SUGGEST');
  
  console.log(`\nValidation:`);
  console.log(`  - Has ADD changes: ${hasAddChanges ? '✓' : '✗'}`);
  console.log(`  - Has SUGGEST changes: ${hasSuggestChanges ? '✓' : '✗'}`);
  console.log(`  - Total changes: ${result.changes.length}`);
  
  const passed = result.success && result.changes.length > 0;
  
  return {
    passed,
    details: `Generated ${result.changes.length} changes, hasADD=${hasAddChanges}`,
  };
}

// =============================================================================
// TEST: Full LLM Pipeline
// =============================================================================

export async function testFullPipeline(apiKey: string): Promise<{ passed: boolean; details: string }> {
  console.log('\n=== Test: Full LLM Pipeline ===\n');
  console.log(`Input: "${TEST_INPUT}"\n`);
  
  const pipeline = new ExtractionPipeline({
    apiKey,
    llmProvider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.2, // Lower for more consistent extraction
  });
  
  pipeline.setFrameworkNodes(testFrameworkNodes);
  
  const result = await pipeline.process(TEST_INPUT, testFrameworkNodes);
  
  console.log(`Success: ${result.success}`);
  console.log(`Processing time: ${result.processingTimeMs}ms`);
  
  if (result.error) {
    console.log(`Error: ${result.error}`);
    return { passed: false, details: `Error: ${result.error}` };
  }
  
  // Validate parsed output
  console.log('\n--- PARSED OUTPUT ---');
  
  if (result.parsed) {
    console.log(`\nStatements (${result.parsed.statements.length}):`);
    for (let i = 0; i < result.parsed.statements.length; i++) {
      const stmt = result.parsed.statements[i];
      console.log(`  ${i + 1}. [${stmt.type}] "${stmt.text}"`);
      console.log(`     Confidence: ${stmt.confidence}%, Source: ${stmt.source || 'none'}`);
      if (stmt.quantitative) {
        console.log(`     Quantitative: ${stmt.quantitative.value} ${stmt.quantitative.unit} (${stmt.quantitative.context})`);
      }
    }
    
    console.log(`\nEntities (${result.parsed.entities.length}):`);
    for (const entity of result.parsed.entities) {
      console.log(`  - ${entity.name} [${entity.type}]`);
      console.log(`    Role: ${entity.role || 'none'}`);
      console.log(`    Attributes: ${JSON.stringify(entity.attributes)}`);
    }
    
    console.log(`\nSentiment: ${result.parsed.sentiment}`);
  }
  
  // Validate framework relevance
  console.log('\n--- FRAMEWORK RELEVANCE ---');
  
  if (result.frameworkRelevance && result.frameworkRelevance.length > 0) {
    for (const r of result.frameworkRelevance) {
      console.log(`  - ${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}%`);
      console.log(`    Reason: ${r.reason}`);
    }
  } else {
    console.log('  No framework relevance detected');
  }
  
  // Validate proposed changes
  console.log('\n--- PROPOSED CHANGES ---');
  
  const grouped = groupChangesByType(result.changes);
  for (const [type, changes] of grouped) {
    console.log(`\n${type} (${changes.length}):`);
    for (const change of changes) {
      console.log(`  [${change.priority.toUpperCase()}] ${change.explanation}`);
      
      if (change.newNode) {
        console.log(`    New node: "${change.newNode.title}" (${change.newNode.type}, ${change.newNode.confidence}% confidence)`);
        console.log(`    Content: ${change.newNode.content.substring(0, 100)}...`);
      }
      
      if (change.connectTo && change.connectTo.length > 0) {
        console.log(`    Connects to:`);
        for (const conn of change.connectTo) {
          console.log(`      - ${conn.nodeId} via "${conn.edgeType}"`);
        }
      }
      
      if (change.suggestion) {
        console.log(`    Suggestion: ${change.suggestion}`);
      }
    }
  }
  
  // Validation against expected output
  console.log('\n--- VALIDATION ---');
  
  const validations: Record<string, boolean> = {
    hasStatements: (result.parsed?.statements.length || 0) >= 3,
    hasEvidenceStatements: (result.parsed?.statements.filter(s => s.type === 'evidence').length || 0) >= 2,
    hasSourceMaria: result.parsed?.statements.some(s => s.source?.toLowerCase().includes('maria')) ?? false,
    hasMariaPerson: result.parsed?.entities.some(e => e.name.toLowerCase().includes('maria') && e.type === 'person') ?? false,
    hasQuantitativeData: result.parsed?.statements.some(s => s.quantitative) ?? false,
    hasFrameworkMatches: (result.frameworkRelevance?.length || 0) >= 2,
    hasAddChanges: result.changes.some(c => c.type === 'ADD'),
    changesConnectToFramework: result.changes.some(c => c.connectTo && c.connectTo.length > 0),
  };
  
  console.log(`  ✓/✗ Has >= 3 statements: ${validations.hasStatements ? '✓' : '✗'} (got ${result.parsed?.statements.length || 0})`);
  console.log(`  ✓/✗ Has >= 2 evidence statements: ${validations.hasEvidenceStatements ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Has Maria as source: ${validations.hasSourceMaria ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Has Maria as person entity: ${validations.hasMariaPerson ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Has quantitative data: ${validations.hasQuantitativeData ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Has >= 2 framework matches: ${validations.hasFrameworkMatches ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Has ADD changes: ${validations.hasAddChanges ? '✓' : '✗'}`);
  console.log(`  ✓/✗ Changes connect to framework: ${validations.changesConnectToFramework ? '✓' : '✗'}`);
  
  const passCount = Object.values(validations).filter(v => v).length;
  const totalChecks = Object.keys(validations).length;
  const passed = passCount >= totalChecks - 2; // Allow 2 failures
  
  console.log(`\n  RESULT: ${passCount}/${totalChecks} checks passed - ${passed ? 'PASS' : 'FAIL'}`);
  
  return {
    passed,
    details: `${passCount}/${totalChecks} validation checks passed`,
  };
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export function runLocalTests(): void {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Ideograph Pipeline Test: Maria Restaurant Example    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log(`\nTest Input:\n"${TEST_INPUT}"\n`);
  
  const results: { name: string; passed: boolean; details: string }[] = [];
  
  // Test 1: Quick Parse
  const parseResult = testQuickParse();
  results.push({ name: 'Quick Parse', ...parseResult });
  
  // Test 2: Framework Detection
  const frameworkResult = testFrameworkDetection();
  results.push({ name: 'Framework Detection', ...frameworkResult });
  
  // Test 3: Local Pipeline
  const pipelineResult = testLocalPipeline();
  results.push({ name: 'Local Pipeline', ...pipelineResult });
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${status} - ${result.name}`);
    console.log(`         ${result.details}`);
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n  Overall: ${passed}/${total} tests passed\n`);
  
  console.log('To run full LLM tests:');
  console.log('  import { testFullPipeline } from "./pipeline/test-maria"');
  console.log('  await testFullPipeline("your-openai-api-key")');
}

// Export for browser/console use
export { TEST_INPUT, EXPECTED, testFrameworkNodes };
