/**
 * Test Version History System
 * Setup sequence for testing node history, restore, and time travel
 */

import { useGraphStore, createFreshGraph } from '../store';
import { useVersionStore } from '../version/versionStore';
import { 
  addNodeWithVersion, 
  updateNodeWithVersion,
  addEdgeWithVersion,
  createSnapshotAfterChanges,
} from '../version/versionedGraph';
import type { ClaimNode, EvidenceNode } from '../types/graph';

// Store the claim ID for reference
let pricingClaimId: string = '';

/**
 * Setup the test scenario with sequential changes
 */
export function setupVersionHistoryTest(): { claimId: string } {
  console.log('\n========================================');
  console.log('VERSION HISTORY TEST SETUP');
  console.log('========================================\n');
  
  // Reset stores
  useVersionStore.getState().reset();
  
  // t=0: Create skeleton graph
  console.log('t=0: Creating skeleton graph...');
  createFreshGraph();
  createSnapshotAfterChanges('Initial skeleton', 'Setup');
  
  // t=1: Add Claim node "Customers will pay $99/mo"
  console.log('t=1: Adding claim "Customers will pay $99/mo"...');
  const claim = addNodeWithVersion({
    type: 'claim',
    title: 'Pricing Assumption',
    content: 'Customers will pay $99/mo',
    confidence: 30,
    tested: false,
  } as Omit<ClaimNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>, 'User input: pricing assumption');
  
  if (!claim) {
    console.error('Failed to create claim');
    return { claimId: '' };
  }
  
  pricingClaimId = claim.id;
  console.log(`  Created claim with ID: ${pricingClaimId}`);
  
  // Connect to framework
  const store = useGraphStore.getState();
  const pricingFramework = store.getAllNodes().find(n => 
    n.type === 'framework' && n.title.toLowerCase().includes('pricing')
  );
  if (pricingFramework) {
    addEdgeWithVersion({
      type: 'supports',
      from: claim.id,
      to: pricingFramework.id,
    }, 'Auto-connect to framework');
  }
  
  createSnapshotAfterChanges('Added pricing claim', 'User input');
  
  // t=2: Update claim content to "Customers will pay $75-99/mo"
  console.log('t=2: Updating claim content to "$75-99/mo"...');
  updateNodeWithVersion(pricingClaimId, {
    content: 'Customers will pay $75-99/mo',
  }, 'User refinement based on market research');
  
  createSnapshotAfterChanges('Refined pricing range', 'User edit');
  
  // t=3: Add Evidence node "Maria: max $75" supporting the claim
  console.log('t=3: Adding evidence from Maria...');
  const evidence = addNodeWithVersion({
    type: 'evidence',
    title: 'Maria Interview',
    content: 'Maria said she would pay maximum $75/mo for a solution',
    confidence: 85,
    valence: 'supporting',
    source: 'Customer interview - Maria, Brooklyn restaurant owner',
  } as Omit<EvidenceNode, 'id' | 'createdAt' | 'updatedAt' | 'versions'>, 'Customer interview');
  
  if (evidence) {
    // Connect evidence to claim
    addEdgeWithVersion({
      type: 'supports',
      from: evidence.id,
      to: pricingClaimId,
    }, 'Evidence supports claim');
  }
  
  createSnapshotAfterChanges('Added Maria evidence', 'Customer interview');
  
  // t=4: Update claim confidence from 30% to 55%
  console.log('t=4: Updating claim confidence to 55%...');
  updateNodeWithVersion(pricingClaimId, {
    confidence: 55,
  }, 'Confidence increased based on customer feedback');
  
  createSnapshotAfterChanges('Confidence update', 'Analysis');
  
  // t=5: Update claim content to "$50-75/mo based on evidence"
  console.log('t=5: Updating claim content based on evidence...');
  updateNodeWithVersion(pricingClaimId, {
    content: '$50-75/mo based on customer evidence',
  }, 'Content refined based on Maria interview');
  
  createSnapshotAfterChanges('Content refined', 'User edit');
  
  // t=6: Update claim confidence to 70%
  console.log('t=6: Updating claim confidence to 70%...');
  updateNodeWithVersion(pricingClaimId, {
    confidence: 70,
  }, 'High confidence based on multiple data points');
  
  createSnapshotAfterChanges('Final confidence', 'Analysis');
  
  // Print summary
  const versionStore = useVersionStore.getState();
  const history = versionStore.getNodeHistory(pricingClaimId);
  const snapshots = versionStore.snapshots;
  
  console.log('\n--- SETUP COMPLETE ---');
  console.log(`Claim ID: ${pricingClaimId}`);
  console.log(`Node versions: ${history.length}`);
  console.log(`Graph snapshots: ${snapshots.length}`);
  
  console.log('\nNode History:');
  history.forEach((v) => {
    console.log(`  v${v.versionNumber}: ${v.changeType} - ${v.changeSummary}`);
    console.log(`    Content: "${v.snapshot.content.substring(0, 40)}..."`);
    console.log(`    Confidence: ${v.snapshot.confidence}%`);
  });
  
  console.log('\nSnapshots:');
  snapshots.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.description} (${s.nodes.length} nodes)`);
  });
  
  return { claimId: pricingClaimId };
}

/**
 * Get the pricing claim ID for testing
 */
export function getPricingClaimId(): string {
  return pricingClaimId;
}

/**
 * Verify the version history is correct
 */
export function verifyVersionHistory(): {
  passed: boolean;
  details: string[];
} {
  const details: string[] = [];
  let passed = true;
  
  const versionStore = useVersionStore.getState();
  const history = versionStore.getNodeHistory(pricingClaimId);
  
  // Check version count
  if (history.length < 4) {
    details.push(`❌ Expected at least 4 versions, got ${history.length}`);
    passed = false;
  } else {
    details.push(`✓ Version count: ${history.length}`);
  }
  
  // Check v1 is created
  const v1 = history.find(v => v.versionNumber === 1);
  if (v1?.changeType !== 'created') {
    details.push(`❌ v1 should be 'created', got '${v1?.changeType}'`);
    passed = false;
  } else {
    details.push(`✓ v1 is created`);
  }
  
  // Check confidence changes
  const confidenceVersions = history.filter(v => v.changeType === 'confidence_changed');
  details.push(`✓ Confidence changes: ${confidenceVersions.length}`);
  
  // Check content updates
  const contentUpdates = history.filter(v => 
    v.diff?.some(d => d.field === 'content')
  );
  details.push(`✓ Content updates: ${contentUpdates.length}`);
  
  return { passed, details };
}

// Export for use in App
export { pricingClaimId };
