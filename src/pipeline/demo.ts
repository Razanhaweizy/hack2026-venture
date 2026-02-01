/**
 * Pipeline Demo
 * Demonstrates the extraction and change detection pipeline
 */

import {
  ExtractionPipeline,
  processUserInputLocal,
  quickParseLocal,
  detectFrameworkRelevanceLocal,
  getChangeActions,
  groupChangesByType,
} from './index';
import type { GraphNode, FrameworkNode } from '../types/graph';

// =============================================================================
// DEMO DATA
// =============================================================================

// Sample framework nodes (subset of the full skeleton)
const sampleFrameworkNodes: FrameworkNode[] = [
  {
    id: 'framework:problem:pain',
    type: 'framework',
    title: 'How painful is it?',
    content: '',
    description: 'How painful is the problem for customers? Rate 1-10 and explain.',
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
];

// Sample existing nodes in the graph
const sampleExistingNodes: GraphNode[] = [
  ...sampleFrameworkNodes,
  {
    id: 'claim:restaurant-waste',
    type: 'claim',
    title: 'Restaurants waste 30% of food inventory',
    content: 'Based on initial conversations, restaurants seem to waste about 30% of their food inventory.',
    confidence: 60,
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000),
    versions: [],
    tested: false, // Required for ClaimNode
  } as GraphNode,
];

// =============================================================================
// DEMO: Quick Local Parsing
// =============================================================================

export function demoQuickParse(): void {
  console.log('=== Demo: Quick Local Parsing ===\n');
  
  const inputs = [
    "Restaurants lose $2000 per month to food waste according to our survey.",
    "I think we can reduce waste by 50% with our solution.",
    "Maria from Joe's Diner said she would pay $200/month for this.",
    "The restaurant waste management market is worth $5 billion.",
  ];
  
  for (const input of inputs) {
    console.log(`Input: "${input}"`);
    const result = quickParseLocal(input);
    console.log('Parsed:', JSON.stringify(result, null, 2));
    console.log('---\n');
  }
}

// =============================================================================
// DEMO: Framework Detection
// =============================================================================

export function demoFrameworkDetection(): void {
  console.log('=== Demo: Framework Detection ===\n');
  
  const input = "Restaurants lose $2000 per month to food waste. We talked to 50 restaurant owners and 80% said this is a major pain point.";
  
  console.log(`Input: "${input}"\n`);
  
  const relevance = detectFrameworkRelevanceLocal(input, sampleFrameworkNodes);
  
  console.log('Framework Relevance:');
  for (const r of relevance) {
    console.log(`  - ${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}%`);
    console.log(`    Reason: ${r.reason}`);
  }
  console.log('');
}

// =============================================================================
// DEMO: Local Processing (No LLM)
// =============================================================================

export function demoLocalProcessing(): void {
  console.log('=== Demo: Local Processing (No LLM) ===\n');
  
  const input = "We surveyed 50 restaurants and found they lose an average of $2000/month to food waste. This confirms our earlier hypothesis.";
  
  console.log(`Input: "${input}"\n`);
  
  const result = processUserInputLocal(input, sampleExistingNodes, sampleFrameworkNodes);
  
  console.log(`Success: ${result.success}`);
  console.log(`Processing time: ${result.processingTimeMs}ms`);
  console.log(`Statements found: ${result.parsed?.statements.length || 0}`);
  console.log(`Changes proposed: ${result.changes.length}`);
  
  if (result.changes.length > 0) {
    console.log('\nProposed Changes:');
    for (const change of result.changes) {
      console.log(`  [${change.priority.toUpperCase()}] ${change.type}: ${change.explanation}`);
    }
  }
  
  if (result.frameworkRelevance && result.frameworkRelevance.length > 0) {
    console.log('\nFramework Relevance:');
    for (const r of result.frameworkRelevance) {
      console.log(`  - ${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}%`);
    }
  }
  
  console.log('');
}

// =============================================================================
// DEMO: Change Actions
// =============================================================================

export function demoChangeActions(): void {
  console.log('=== Demo: Change Actions ===\n');
  
  const input = "New data shows restaurants actually lose $2500/month, not $2000.";
  
  console.log(`Input: "${input}"\n`);
  
  const result = processUserInputLocal(input, sampleExistingNodes, sampleFrameworkNodes);
  
  console.log('Proposed Changes and their Actions:\n');
  
  for (const change of result.changes) {
    console.log(`Change: ${change.type}`);
    console.log(`  Priority: ${change.priority}`);
    console.log(`  Explanation: ${change.explanation}`);
    
    const actions = getChangeActions(change);
    console.log(`  Actions:`);
    for (const action of actions) {
      console.log(`    - ${action.action}:`, JSON.stringify(action.params));
    }
    console.log('');
  }
}

// =============================================================================
// DEMO: Full Pipeline (Requires API Key)
// =============================================================================

export async function demoFullPipeline(apiKey: string): Promise<void> {
  console.log('=== Demo: Full Pipeline (with LLM) ===\n');
  
  const pipeline = new ExtractionPipeline({
    apiKey,
    llmProvider: 'openai',
    model: 'gpt-4o-mini',
  });
  
  pipeline.setFrameworkNodes(sampleFrameworkNodes);
  
  const input = `
    I just talked to Maria, the owner of Joe's Diner downtown. 
    She said they throw away about $2000 worth of food every month.
    She's been looking for a solution but everything she's tried is too complicated.
    She said she'd pay up to $300/month for something that actually works.
    The restaurant industry is huge - there are 1 million restaurants in the US.
  `;
  
  console.log(`Input: "${input.trim()}"\n`);
  
  const result = await pipeline.process(input, sampleExistingNodes);
  
  console.log(`Success: ${result.success}`);
  console.log(`Processing time: ${result.processingTimeMs}ms`);
  
  if (result.error) {
    console.log(`Error: ${result.error}`);
    return;
  }
  
  if (result.parsed) {
    console.log(`\nParsed Statements: ${result.parsed.statements.length}`);
    for (const stmt of result.parsed.statements) {
      console.log(`  [${stmt.type}] ${stmt.text.substring(0, 60)}... (${stmt.confidence}% confident)`);
    }
    
    console.log(`\nEntities: ${result.parsed.entities.length}`);
    for (const entity of result.parsed.entities) {
      console.log(`  [${entity.type}] ${entity.name} - ${entity.role || 'no role'}`);
    }
    
    console.log(`\nSentiment: ${result.parsed.sentiment}`);
  }
  
  if (result.frameworkRelevance && result.frameworkRelevance.length > 0) {
    console.log('\nFramework Relevance:');
    for (const r of result.frameworkRelevance) {
      console.log(`  - ${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}% - ${r.reason}`);
    }
  }
  
  console.log(`\nProposed Changes: ${result.changes.length}`);
  
  const grouped = groupChangesByType(result.changes);
  for (const [type, changes] of grouped) {
    console.log(`\n  ${type} (${changes.length}):`);
    for (const change of changes) {
      console.log(`    [${change.priority}] ${change.explanation}`);
    }
  }
}

// =============================================================================
// RUN ALL DEMOS
// =============================================================================

export function runAllLocalDemos(): void {
  console.log('========================================');
  console.log('  Ideograph Pipeline Demos (Local)');
  console.log('========================================\n');
  
  demoQuickParse();
  demoFrameworkDetection();
  demoLocalProcessing();
  demoChangeActions();
  
  console.log('========================================');
  console.log('  All local demos completed!');
  console.log('========================================\n');
  console.log('To run the full LLM pipeline demo:');
  console.log('  import { demoFullPipeline } from "./pipeline/demo"');
  console.log('  await demoFullPipeline("your-openai-api-key")');
}

// Export for use in browser console or tests
export default runAllLocalDemos;
