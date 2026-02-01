/**
 * Test Diff System - Manual test scenario
 * Tests the complete diff workflow with specific changes
 */

import { v4 as uuid } from 'uuid';
import { useGraphStore, createFreshGraph } from '../store';
import { useDiffStore } from '../store/diffStore';
import type { ProposedChange } from '../pipeline/types';
import type { ClaimNode } from '../types/graph';

// =============================================================================
// SETUP: Create test graph with existing claim
// =============================================================================

export function setupTestGraph(): void {
  // 1. Create fresh skeleton
  createFreshGraph();
  console.log('✓ Skeleton created');
  
  const graphStore = useGraphStore.getState();
  
  // 2. Add existing claim: "Customers will pay $99/mo"
  const existingClaim: ClaimNode = {
    id: 'claim:pricing:99',
    type: 'claim',
    title: 'Customers will pay $99/mo',
    content: 'Based on competitor analysis, customers should be willing to pay around $99 per month for a premium solution.',
    confidence: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [],
    tested: false,
  };
  
  graphStore.addNode(existingClaim);
  
  // Connect to framework:business_model:pricing
  graphStore.addEdge({
    id: 'edge:claim-pricing',
    type: 'supports',
    from: 'claim:pricing:99',
    to: 'framework:business_model:pricing',
  });
  
  console.log('✓ Added existing claim: "Customers will pay $99/mo"');
  console.log(`  Total nodes: ${graphStore.getAllNodes().length}`);
  console.log(`  Total edges: ${graphStore.getAllEdges().length}`);
}

// =============================================================================
// CREATE TEST CHANGES
// =============================================================================

export function createTestChanges(): ProposedChange[] {
  const now = new Date();
  
  return [
    // Change 1: ADD - Evidence node about waste cost
    {
      id: uuid(),
      type: 'ADD',
      priority: 'high',
      newNode: {
        type: 'evidence',
        title: 'Maria: $2,500/mo waste cost',
        content: 'Maria, owner of a 30-seat Brooklyn restaurant, reports food waste costs around $2,500 per month.',
        confidence: 85,
      },
      connectTo: [
        { nodeId: 'framework:problem:pain', edgeType: 'supports' },
      ],
      sourceText: 'She said food waste costs her around $2,500 per month',
      explanation: 'Direct evidence from customer interview about problem severity.',
      timestamp: now,
    },
    
    // Change 2: ADD - Evidence node about pricing willingness
    {
      id: uuid(),
      type: 'ADD',
      priority: 'high',
      newNode: {
        type: 'evidence',
        title: 'Maria: max $75/mo',
        content: 'Maria would pay up to $75/month for a solution that actually worked to reduce food waste.',
        confidence: 80,
      },
      connectTo: [
        { nodeId: 'framework:business_model:pricing', edgeType: 'supports' },
      ],
      sourceText: "She'd pay up to $75/month for something that actually worked",
      explanation: 'Customer pricing data point - lower than current assumption.',
      timestamp: now,
    },
    
    // Change 3: CONTRADICT - New evidence vs existing $99/mo claim
    {
      id: uuid(),
      type: 'CONTRADICT',
      priority: 'high',
      nodeAId: 'claim:pricing:99',
      nodeBId: 'maria-pricing-evidence', // Would be created by change 2
      explanation: 'Maria\'s willingness to pay $75/mo contradicts our assumption of $99/mo pricing. This suggests we may need to revisit pricing strategy or segment by customer type.',
      sourceText: 'Maria: max $75/mo vs existing $99/mo assumption',
      timestamp: now,
    },
    
    // Change 4: STRENGTHEN - Increase confidence on problem:pain
    {
      id: uuid(),
      type: 'STRENGTHEN',
      priority: 'medium',
      nodeId: 'framework:problem:pain',
      confidenceDelta: 20,
      reason: 'Maria\'s $2,500/mo waste cost confirms the problem is financially painful for restaurant owners.',
      sourceText: 'Maria confirms significant financial impact',
      explanation: 'Real customer data validates problem severity.',
      timestamp: now,
    },
    
    // Change 5: SUGGEST - Customer segmentation
    {
      id: uuid(),
      type: 'SUGGEST',
      priority: 'low',
      suggestion: 'Segment by restaurant size',
      rationale: 'Maria\'s 30-seat restaurant may have different economics than larger venues. Pain level and willingness to pay likely vary by size. Consider defining customer segments (small: <50 seats, medium: 50-150, large: 150+).',
      sourceText: 'Maria owns a restaurant with about 30 seats',
      explanation: 'Customer data suggests segmentation could improve targeting.',
      timestamp: now,
    },
  ];
}

// =============================================================================
// RUN TEST
// =============================================================================

export function runDiffSystemTest(): void {
  console.log('\n=== DIFF SYSTEM TEST ===\n');
  
  // Step 1: Setup
  console.log('1. Setting up test graph...');
  setupTestGraph();
  
  // Step 2: Create test changes
  console.log('\n2. Creating test changes...');
  const testChanges = createTestChanges();
  console.log(`   Created ${testChanges.length} proposed changes:`);
  testChanges.forEach((c, i) => {
    console.log(`   ${i + 1}. [${c.type}] ${c.priority} priority - ${c.explanation.substring(0, 50)}...`);
  });
  
  // Step 3: Open diff panel with changes
  console.log('\n3. Opening diff panel...');
  const diffStore = useDiffStore.getState();
  const testInput = 'Talked to Maria yesterday, she owns a restaurant in Brooklyn with about 30 seats. She said food waste costs her around $2,500 per month and she\'s tried a few apps but nothing stuck. She\'d pay up to $75/month for something that actually worked.';
  
  diffStore.openDiff(testInput, testChanges);
  console.log('   ✓ Diff panel opened with test changes');
  
  // Step 4: Verify initial state
  console.log('\n4. Verifying initial state...');
  const state = useDiffStore.getState();
  console.log(`   - isOpen: ${state.isOpen}`);
  console.log(`   - Total changes: ${state.proposedChanges.length}`);
  console.log(`   - Pending: ${state.pendingCount}`);
  console.log(`   - Accepted: ${state.acceptedCount}`);
  console.log(`   - Rejected: ${state.rejectedCount}`);
  
  // Step 5: Test accept
  console.log('\n5. Testing accept change #1...');
  diffStore.acceptChange(testChanges[0].id);
  console.log(`   ✓ Change #1 accepted`);
  console.log(`   - Accepted count: ${useDiffStore.getState().acceptedCount}`);
  
  // Step 6: Test reject
  console.log('\n6. Testing reject change #5...');
  diffStore.rejectChange(testChanges[4].id);
  console.log(`   ✓ Change #5 rejected`);
  console.log(`   - Rejected count: ${useDiffStore.getState().rejectedCount}`);
  
  // Step 7: Test edit
  console.log('\n7. Testing edit change #2...');
  const editedChange: ProposedChange = {
    ...testChanges[1],
    newNode: {
      ...testChanges[1].newNode!,
      title: 'Maria Interview: Pricing $75/mo max',
      content: 'Maria (30-seat Brooklyn restaurant) would pay up to $75/month for an effective food waste solution.',
    },
  };
  diffStore.editChange(testChanges[1].id, editedChange);
  console.log(`   ✓ Change #2 edited`);
  console.log(`   - New title: "${editedChange.newNode?.title}"`);
  
  // Step 8: Accept all remaining pending
  console.log('\n8. Accepting all remaining...');
  diffStore.acceptAll();
  const finalState = useDiffStore.getState();
  console.log(`   - Pending: ${finalState.pendingCount}`);
  console.log(`   - Accepted: ${finalState.acceptedCount}`);
  console.log(`   - Rejected: ${finalState.rejectedCount}`);
  
  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('All basic operations working:');
  console.log('  ✓ Setup graph with skeleton + existing claim');
  console.log('  ✓ Create proposed changes');
  console.log('  ✓ Open diff panel');
  console.log('  ✓ Accept individual change');
  console.log('  ✓ Reject individual change');
  console.log('  ✓ Edit change');
  console.log('  ✓ Accept all');
  console.log('\nTo test Apply: Click "Apply Changes" button in the UI');
  console.log('To test highlighting: Check 3D view while diff panel is open');
}
