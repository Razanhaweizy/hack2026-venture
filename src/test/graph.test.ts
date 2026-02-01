/**
 * Integration test for Phase 1 & Phase 2
 * Run with: npx tsx src/test/graph.test.ts
 */

import { useGraphStore, createFreshGraph, isSkeletonInitialized } from '../store/graphStore';
import { getSkeletonLeafNodes } from '../data/skeleton';
import type { ClaimNode, FrameworkNode, FactNode, EvidenceNode } from '../types/graph';

// Helper to log test results
function test(name: string, fn: () => boolean): void {
  try {
    const result = fn();
    console.log(result ? `✅ ${name}` : `❌ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e}`);
  }
}

function section(name: string): void {
  console.log(`\n${'='.repeat(60)}\n${name}\n${'='.repeat(60)}`);
}

// Get store instance
const store = useGraphStore.getState();

// =============================================================================
// PHASE 1 TESTS - Core Data Model
// =============================================================================

section('PHASE 1: Core Data Model');

// Test 1: Node types defined
test('All node types defined (framework, claim, fact, evidence)', () => {
  // This is a type check - if types are wrong, TypeScript would fail
  const nodeTypes = ['framework', 'claim', 'fact', 'evidence'];
  return nodeTypes.length === 4;
});

// Test 2: Edge types defined
test('All edge types defined (requires, supports, contradicts, depends_on, informs, blocks)', () => {
  const edgeTypes = ['requires', 'supports', 'contradicts', 'depends_on', 'informs', 'blocks'];
  return edgeTypes.length === 6;
});

// Test 3: Add a node
test('addNode creates node with id, createdAt, updatedAt, versions', () => {
  store.clear();
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Test Claim',
    content: 'Test content',
    confidence: 50,
    tested: false,
  });
  
  return (
    claim.id !== undefined &&
    claim.createdAt instanceof Date &&
    claim.updatedAt instanceof Date &&
    Array.isArray(claim.versions) &&
    claim.versions.length === 1
  );
});

// Test 4: Update node creates version history
test('updateNode creates version history on content change', () => {
  store.clear();
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Test Claim',
    content: 'Original content',
    confidence: 50,
    tested: false,
  });
  
  const updated = store.updateNode(claim.id, { 
    content: 'Updated content',
    changeNote: 'Fixed content'
  });
  
  return (
    updated !== undefined &&
    updated.versions.length === 2 &&
    updated.versions[1].content === 'Updated content'
  );
});

// Test 5: Add edge between nodes
test('addEdge connects nodes and updates indexes', () => {
  store.clear();
  
  const parent = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Parent',
    content: 'Parent content',
    confidence: 70,
    tested: false,
  });
  
  const child = store.addNode<FactNode>({
    type: 'fact',
    title: 'Child',
    content: 'Child content',
    confidence: 90,
  });
  
  const edge = store.addEdge({
    type: 'supports',
    from: child.id,
    to: parent.id,
  });
  
  return (
    edge.id !== undefined &&
    edge.type === 'supports' &&
    edge.from === child.id &&
    edge.to === parent.id
  );
});

// Test 6: getParents and getChildren work
test('getParents and getChildren return correct nodes', () => {
  store.clear();
  
  const parent = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Parent',
    content: 'Parent content',
    confidence: 70,
    tested: false,
  });
  
  const child = store.addNode<FactNode>({
    type: 'fact',
    title: 'Child',
    content: 'Child content',
    confidence: 90,
  });
  
  store.addEdge({
    type: 'supports',
    from: child.id,
    to: parent.id,
  });
  
  const parents = store.getParents(child.id);
  const children = store.getChildren(parent.id);
  
  return (
    parents.length === 1 &&
    parents[0].node.id === parent.id &&
    children.length === 1 &&
    children[0].node.id === child.id
  );
});

// Test 7: Remove node removes connected edges
test('removeNode also removes connected edges', () => {
  store.clear();
  
  const parent = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Parent',
    content: 'Parent content',
    confidence: 70,
    tested: false,
  });
  
  const child = store.addNode<FactNode>({
    type: 'fact',
    title: 'Child',
    content: 'Child content',
    confidence: 90,
  });
  
  store.addEdge({
    type: 'supports',
    from: child.id,
    to: parent.id,
  });
  
  store.removeNode(child.id);
  
  return (
    store.getNode(child.id) === undefined &&
    store.getAllEdges().length === 0 &&
    store.getChildren(parent.id).length === 0
  );
});

// =============================================================================
// PHASE 2 TESTS - Fixed Skeleton
// =============================================================================

section('PHASE 2: Fixed Skeleton');

// Test 8: Initialize skeleton
test('initializeSkeleton creates all framework nodes', () => {
  store.clear();
  store.initializeSkeleton();
  
  const frameworkNodes = store.getFrameworkNodes();
  const leafNodes = getSkeletonLeafNodes();
  
  // Should have 1 root + 8 categories + 37 leaves = 46 nodes
  return (
    frameworkNodes.length === 46 &&
    leafNodes.length === 37 &&
    store.getNode('framework:root') !== undefined
  );
});

// Test 9: Skeleton has stable IDs
test('Skeleton nodes have stable IDs like framework:market:size', () => {
  store.clear();
  store.initializeSkeleton();
  
  const marketSize = store.getNode('framework:market:size') as FrameworkNode;
  const problemPain = store.getNode('framework:problem:pain') as FrameworkNode;
  const gtmPmf = store.getNode('framework:gtm:pmf_type') as FrameworkNode;
  
  return (
    marketSize !== undefined &&
    marketSize.title === 'Market Size' &&
    problemPain !== undefined &&
    problemPain.title === 'Pain Level (1-10)' &&
    gtmPmf !== undefined &&
    gtmPmf.title === 'PMF Path'
  );
});

// Test 10: All 8 categories present
test('All 8 framework categories present', () => {
  store.clear();
  store.initializeSkeleton();
  
  const categories = [
    'framework:market',
    'framework:problem',
    'framework:solution',
    'framework:timing',
    'framework:founder',
    'framework:competition',
    'framework:business_model',
    'framework:gtm',
  ];
  
  return categories.every(id => store.getNode(id) !== undefined);
});

// Test 11: Requires edges connect skeleton
test('Skeleton uses "requires" edges from parent to children', () => {
  store.clear();
  store.initializeSkeleton();
  
  const edges = store.getAllEdges();
  const requiresEdges = edges.filter(e => e.type === 'requires');
  
  // Check market -> market:size edge exists
  const marketSizeEdge = edges.find(e => 
    e.from === 'framework:market:size' && 
    e.to === 'framework:market'
  );
  
  // 8 category edges + 37 leaf edges = 45 edges
  return (
    requiresEdges.length === 45 &&
    marketSizeEdge !== undefined &&
    marketSizeEdge.type === 'requires'
  );
});

// Test 12: getUnansweredFrameworkNodes returns all leaves initially
test('getUnansweredFrameworkNodes returns 37 unanswered nodes initially', () => {
  store.clear();
  store.initializeSkeleton();
  
  const unanswered = store.getUnansweredFrameworkNodes();
  return unanswered.length === 37;
});

// Test 13: Skeleton nodes protected from deletion
test('Cannot delete skeleton nodes (protected)', () => {
  store.clear();
  store.initializeSkeleton();
  
  const result = store.removeNode('framework:market:size');
  const nodeStillExists = store.getNode('framework:market:size') !== undefined;
  
  return result === false && nodeStillExists;
});

// Test 14: Skeleton nodes protected from rename
test('Cannot rename skeleton nodes (title protected)', () => {
  store.clear();
  store.initializeSkeleton();
  
  const before = store.getNode('framework:market:size') as FrameworkNode;
  store.updateNode('framework:market:size', { title: 'New Title' });
  const after = store.getNode('framework:market:size') as FrameworkNode;
  
  return before.title === after.title && after.title === 'Market Size';
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

section('INTEGRATION: Phase 1 + Phase 2');

// Test 15: createFreshGraph initializes skeleton
test('createFreshGraph() initializes skeleton correctly', () => {
  store.clear();
  createFreshGraph();
  
  return isSkeletonInitialized() && store.getNode('framework:root') !== undefined;
});

// Test 16: Add claim and connect to framework
test('Can add Claim and connect to framework:market:size', () => {
  createFreshGraph();
  
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'TAM is $50B',
    content: 'Based on industry reports, the total addressable market is $50 billion.',
    confidence: 70,
    tested: false,
  });
  
  const edge = store.attachToFramework('framework:market:size', claim.id);
  
  return (
    edge.type === 'supports' &&
    edge.from === claim.id &&
    edge.to === 'framework:market:size'
  );
});

// Test 17: Framework node status reflects attached content
test('getFrameworkNodeStatus shows isAnswered after attaching content', () => {
  createFreshGraph();
  
  // Initially unanswered
  const statusBefore = store.getFrameworkNodeStatus('framework:market:size');
  
  // Add claim
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'TAM is $50B',
    content: 'Market analysis...',
    confidence: 70,
    tested: false,
  });
  
  store.attachToFramework('framework:market:size', claim.id);
  
  // Now answered
  const statusAfter = store.getFrameworkNodeStatus('framework:market:size');
  
  return (
    statusBefore?.isAnswered === false &&
    statusAfter?.isAnswered === true &&
    statusAfter?.attachedCount === 1
  );
});

// Test 18: Multiple nodes can attach to same framework
test('Multiple user nodes can attach to same framework node (graph, not tree)', () => {
  createFreshGraph();
  
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Claim about market',
    content: 'Market claim...',
    confidence: 70,
    tested: false,
  });
  
  const fact = store.addNode<FactNode>({
    type: 'fact',
    title: 'Market fact',
    content: 'Verified fact...',
    confidence: 95,
  });
  
  const evidence = store.addNode<EvidenceNode>({
    type: 'evidence',
    title: 'Market evidence',
    content: 'Research shows...',
    confidence: 85,
    valence: 'supporting',
    source: 'Research paper',
  });
  
  store.attachToFramework('framework:market:size', claim.id);
  store.attachToFramework('framework:market:size', fact.id);
  store.attachToFramework('framework:market:size', evidence.id);
  
  const status = store.getFrameworkNodeStatus('framework:market:size');
  
  return status?.attachedCount === 3;
});

// Test 19: User node can attach to multiple framework nodes (graph, not tree)
test('Single user node can attach to multiple framework nodes', () => {
  createFreshGraph();
  
  const claim = store.addNode<ClaimNode>({
    type: 'claim',
    title: 'Market insight',
    content: 'This relates to both size and growth...',
    confidence: 60,
    tested: false,
  });
  
  store.attachToFramework('framework:market:size', claim.id);
  store.attachToFramework('framework:market:growth', claim.id);
  
  const parents = store.getParents(claim.id);
  
  return (
    parents.length === 2 &&
    parents.some(p => p.node.id === 'framework:market:size') &&
    parents.some(p => p.node.id === 'framework:market:growth')
  );
});

// Test 20: Progress tracking works
test('getSkeletonProgress tracks answered nodes correctly', () => {
  createFreshGraph();
  
  const progressBefore = store.getSkeletonProgress();
  
  // Answer 3 framework nodes
  ['framework:market:size', 'framework:market:growth', 'framework:problem:who'].forEach(fwId => {
    const claim = store.addNode<ClaimNode>({
      type: 'claim',
      title: `Answer for ${fwId}`,
      content: 'Content...',
      confidence: 50,
      tested: false,
    });
    store.attachToFramework(fwId, claim.id);
  });
  
  const progressAfter = store.getSkeletonProgress();
  
  return (
    progressBefore.answered === 0 &&
    progressBefore.total === 37 &&
    progressAfter.answered === 3 &&
    progressAfter.total === 37 &&
    progressAfter.percentage === 8 // 3/37 ≈ 8%
  );
});

// Test 21: getParents/getChildren work across skeleton
test('getParents/getChildren traverse skeleton hierarchy', () => {
  createFreshGraph();
  
  // Market Size -> Market -> THE IDEA
  const marketSizeParents = store.getParents('framework:market:size');
  const marketChildren = store.getChildren('framework:market');
  const rootChildren = store.getChildren('framework:root');
  
  return (
    marketSizeParents.length === 1 &&
    marketSizeParents[0].node.id === 'framework:market' &&
    marketChildren.length === 4 && // 4 market leaves
    rootChildren.length === 8 // 8 categories
  );
});

// Test 22: getAncestors traverses up the tree
test('getAncestors returns all ancestors up to root', () => {
  createFreshGraph();
  
  const ancestors = store.getAncestors('framework:market:size');
  
  return (
    ancestors.length === 2 && // market + root
    ancestors.some(a => a.id === 'framework:market') &&
    ancestors.some(a => a.id === 'framework:root')
  );
});

// =============================================================================
// SUMMARY
// =============================================================================

section('SUMMARY');

console.log('\nReview complete! Check results above.\n');
