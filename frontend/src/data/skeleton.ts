/**
 * Ideograph - Evaluation Framework Skeleton
 * 
 * This defines the fixed structure that every founder sees.
 * The skeleton is immutable - users can only attach content to it, not modify it.
 */

import type { 
  FrameworkNode, 
  FrameworkCategory, 
  PositionHint,
  CreateNodeInput,
  CreateEdgeInput,
} from '../types/graph';

// =============================================================================
// SKELETON NODE DEFINITIONS
// =============================================================================

/**
 * Definition for a skeleton node before it's created in the graph
 */
interface SkeletonNodeDef {
  id: string;
  title: string;
  description: string;
  category: FrameworkCategory;
  parentId?: string;
  position: PositionHint;
}

/**
 * Layout constants for positioning
 */
const LAYOUT = {
  ROOT_Y: 0,
  CATEGORY_Y: 150,
  LEAF_Y: 300,
  CATEGORY_SPACING: 180,
  LEAF_SPACING: 120,
  START_X: -630, // Center 8 categories: -630 to +630
} as const;

/**
 * Calculate X position for category index (0-7)
 */
const categoryX = (index: number): number => LAYOUT.START_X + (index * LAYOUT.CATEGORY_SPACING);

/**
 * Calculate X positions for leaf nodes under a category
 */
const leafX = (categoryIndex: number, leafIndex: number, totalLeaves: number): number => {
  const categoryCenter = categoryX(categoryIndex);
  const totalWidth = (totalLeaves - 1) * LEAF_SPACING;
  const startX = categoryCenter - totalWidth / 2;
  return startX + leafIndex * LEAF_SPACING;
};

// =============================================================================
// ROOT NODE
// =============================================================================

const ROOT: SkeletonNodeDef = {
  id: 'framework:root',
  title: 'THE IDEA',
  description: 'Your startup idea - the central thesis that everything else supports or challenges.',
  category: 'root',
  position: { x: 0, y: LAYOUT.ROOT_Y, level: 0 },
};

// =============================================================================
// CATEGORY NODES (Level 1)
// =============================================================================

const CATEGORIES: SkeletonNodeDef[] = [
  {
    id: 'framework:market',
    title: 'MARKET',
    description: 'Understanding the market you\'re entering - its size, growth, and structure.',
    category: 'market',
    parentId: 'framework:root',
    position: { x: categoryX(0), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:problem',
    title: 'PROBLEM',
    description: 'The problem you\'re solving - who has it, how painful it is, and why it persists.',
    category: 'problem',
    parentId: 'framework:root',
    position: { x: categoryX(1), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:solution',
    title: 'SOLUTION',
    description: 'What you\'re building - how it\'s different, defensible, and achievable.',
    category: 'solution',
    parentId: 'framework:root',
    position: { x: categoryX(2), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:timing',
    title: 'TIMING',
    description: 'Why now is the right time - what changed and what\'s the window of opportunity.',
    category: 'timing',
    parentId: 'framework:root',
    position: { x: categoryX(3), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:founder',
    title: 'FOUNDER',
    description: 'Why you\'re the right person/team - your advantages and gaps.',
    category: 'founder',
    parentId: 'framework:root',
    position: { x: categoryX(4), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:competition',
    title: 'COMPETITION',
    description: 'The competitive landscape - who else is trying, who failed, and why you\'ll win.',
    category: 'competition',
    parentId: 'framework:root',
    position: { x: categoryX(5), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:business_model',
    title: 'BUSINESS MODEL',
    description: 'How you make money - pricing, unit economics, and path to profitability.',
    category: 'business_model',
    parentId: 'framework:root',
    position: { x: categoryX(6), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
  {
    id: 'framework:gtm',
    title: 'GTM',
    description: 'Go-to-market strategy - how you\'ll find and acquire customers.',
    category: 'gtm',
    parentId: 'framework:root',
    position: { x: categoryX(7), y: LAYOUT.CATEGORY_Y, level: 1 },
  },
];

// =============================================================================
// LEAF NODES (Level 2) - Organized by category
// =============================================================================

const LEAF_SPACING = 100;

// MARKET children
const MARKET_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:market:size',
    title: 'Market Size',
    description: 'What is the Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM)?',
    category: 'market',
    parentId: 'framework:market',
    position: { x: leafX(0, 0, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:market:growth',
    title: 'Market Growth',
    description: 'How fast is this market growing? What\'s the CAGR? Is it accelerating or decelerating?',
    category: 'market',
    parentId: 'framework:market',
    position: { x: leafX(0, 1, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:market:structure',
    title: 'Market Structure',
    description: 'Is the market fragmented (many small players) or concentrated (few large players)? What does this mean for your entry strategy?',
    category: 'market',
    parentId: 'framework:market',
    position: { x: leafX(0, 2, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:market:why',
    title: 'Why This Market?',
    description: 'Why did you choose this market? What unique insight or connection do you have?',
    category: 'market',
    parentId: 'framework:market',
    position: { x: leafX(0, 3, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// PROBLEM children
const PROBLEM_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:problem:who',
    title: 'Who Has This Problem?',
    description: 'Describe your target customer in detail. What segment experiences this problem most acutely?',
    category: 'problem',
    parentId: 'framework:problem',
    position: { x: leafX(1, 0, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:problem:pain',
    title: 'Pain Level (1-10)',
    description: 'How painful is this problem? A "10" is a hair-on-fire emergency. A "1" is a minor inconvenience.',
    category: 'problem',
    parentId: 'framework:problem',
    position: { x: leafX(1, 1, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:problem:current_solution',
    title: 'Current Solutions',
    description: 'How do people solve this problem today? What workarounds, hacks, or alternatives exist?',
    category: 'problem',
    parentId: 'framework:problem',
    position: { x: leafX(1, 2, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:problem:frequency',
    title: 'Frequency',
    description: 'How often do customers experience this problem? Daily? Weekly? Once a year?',
    category: 'problem',
    parentId: 'framework:problem',
    position: { x: leafX(1, 3, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:problem:why_unsolved',
    title: 'Why Unsolved?',
    description: 'Why hasn\'t this problem been solved already? What prevented previous solutions?',
    category: 'problem',
    parentId: 'framework:problem',
    position: { x: leafX(1, 4, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// SOLUTION children
const SOLUTION_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:solution:what',
    title: 'What Do You Build?',
    description: 'Describe your product or service. What is it concretely?',
    category: 'solution',
    parentId: 'framework:solution',
    position: { x: leafX(2, 0, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:solution:different',
    title: 'How Is It Different?',
    description: 'Not just better - how is it fundamentally different? What\'s the 10x improvement or new approach?',
    category: 'solution',
    parentId: 'framework:solution',
    position: { x: leafX(2, 1, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:solution:moat',
    title: 'What\'s the Moat?',
    description: 'What makes this defensible? Network effects, data, brand, patents, regulatory, switching costs?',
    category: 'solution',
    parentId: 'framework:solution',
    position: { x: leafX(2, 2, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:solution:buildable',
    title: 'Can You Build It?',
    description: 'Do you have the technical ability to build this? What\'s the hardest part?',
    category: 'solution',
    parentId: 'framework:solution',
    position: { x: leafX(2, 3, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:solution:v1',
    title: 'First Version (MVP)',
    description: 'What\'s the minimum viable product? What can you ship in weeks, not months?',
    category: 'solution',
    parentId: 'framework:solution',
    position: { x: leafX(2, 4, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// TIMING children
const TIMING_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:timing:why_now',
    title: 'Why Now?',
    description: 'What makes now the right time? Why would this not have worked 5 years ago?',
    category: 'timing',
    parentId: 'framework:timing',
    position: { x: leafX(3, 0, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:timing:change',
    title: 'What Changed?',
    description: 'What recent shift enabled this opportunity? Technology, regulation, behavior, cost?',
    category: 'timing',
    parentId: 'framework:timing',
    position: { x: leafX(3, 1, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:timing:window',
    title: 'Window of Opportunity',
    description: 'How long is the window? Is this a land grab or can you take your time?',
    category: 'timing',
    parentId: 'framework:timing',
    position: { x: leafX(3, 2, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:timing:late',
    title: 'If You\'re Late?',
    description: 'What happens if you\'re 2 years late? Does the opportunity disappear or just shrink?',
    category: 'timing',
    parentId: 'framework:timing',
    position: { x: leafX(3, 3, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// FOUNDER children
const FOUNDER_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:founder:why_you',
    title: 'Why You?',
    description: 'Why are you the right person to build this? What\'s your unique founder-market fit?',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 0, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:founder:domain',
    title: 'Domain Expertise',
    description: 'What relevant domain expertise do you have? Years in industry, specific knowledge?',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 1, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:founder:technical',
    title: 'Technical Ability',
    description: 'Can you build the product yourself? What\'s your technical background?',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 2, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:founder:network',
    title: 'Network Advantage',
    description: 'Do you have distribution or network advantages? Access to customers, partners, talent?',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 3, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:founder:gaps',
    title: 'Gaps',
    description: 'What do you lack? Be honest about weaknesses and blind spots.',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 4, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:founder:cofounder',
    title: 'Co-founder Needs',
    description: 'Do you need a co-founder? What profile would complement you?',
    category: 'founder',
    parentId: 'framework:founder',
    position: { x: leafX(4, 5, 6), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// COMPETITION children
const COMPETITION_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:competition:direct',
    title: 'Direct Competitors',
    description: 'Who offers a similar solution to the same problem? What are their strengths and weaknesses?',
    category: 'competition',
    parentId: 'framework:competition',
    position: { x: leafX(5, 0, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:competition:indirect',
    title: 'Indirect Competitors',
    description: 'What alternatives do customers use even if not directly competing? Substitutes and workarounds?',
    category: 'competition',
    parentId: 'framework:competition',
    position: { x: leafX(5, 1, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:competition:failed',
    title: 'Failed Attempts',
    description: 'Who tried this before and failed? Why did they fail? What can you learn from their autopsy?',
    category: 'competition',
    parentId: 'framework:competition',
    position: { x: leafX(5, 2, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:competition:incumbents',
    title: 'Why Not Incumbents?',
    description: 'Why won\'t existing large players just add this feature or acquire you?',
    category: 'competition',
    parentId: 'framework:competition',
    position: { x: leafX(5, 3, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// BUSINESS MODEL children
const BUSINESS_MODEL_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:business_model:revenue',
    title: 'Revenue Model',
    description: 'How do you make money? Subscription, transaction, advertising, licensing?',
    category: 'business_model',
    parentId: 'framework:business_model',
    position: { x: leafX(6, 0, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:business_model:pricing',
    title: 'Pricing',
    description: 'How do you price? What\'s the pricing structure and how did you arrive at it?',
    category: 'business_model',
    parentId: 'framework:business_model',
    position: { x: leafX(6, 1, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:business_model:unit_economics',
    title: 'Unit Economics',
    description: 'What are your CAC, LTV, and LTV:CAC ratio? Gross margins per customer?',
    category: 'business_model',
    parentId: 'framework:business_model',
    position: { x: leafX(6, 2, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:business_model:profitability',
    title: 'Path to Profitability',
    description: 'What does the path to profitability look like? When and how do you become profitable?',
    category: 'business_model',
    parentId: 'framework:business_model',
    position: { x: leafX(6, 3, 4), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// GTM children
const GTM_LEAVES: SkeletonNodeDef[] = [
  {
    id: 'framework:gtm:pmf_type',
    title: 'PMF Path',
    description: 'What type of Product-Market Fit are you pursuing? Hair on Fire (urgent need), Hard Fact (proven demand), or Future Vision (creating new behavior)?',
    category: 'gtm',
    parentId: 'framework:gtm',
    position: { x: leafX(7, 0, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:gtm:first_customers',
    title: 'First Customers',
    description: 'Who are your first 10 customers? Do you have names and can you contact them today?',
    category: 'gtm',
    parentId: 'framework:gtm',
    position: { x: leafX(7, 1, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:gtm:acquisition',
    title: 'Acquisition Channel',
    description: 'What\'s your primary customer acquisition channel? Paid, organic, viral, sales, partnerships?',
    category: 'gtm',
    parentId: 'framework:gtm',
    position: { x: leafX(7, 2, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:gtm:sales_motion',
    title: 'Sales Motion',
    description: 'Is this self-serve, inside sales, field sales, or product-led? What\'s the typical sales cycle?',
    category: 'gtm',
    parentId: 'framework:gtm',
    position: { x: leafX(7, 3, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
  {
    id: 'framework:gtm:expansion',
    title: 'Expansion Strategy',
    description: 'How do you expand within accounts and to new segments? Land and expand plan?',
    category: 'gtm',
    parentId: 'framework:gtm',
    position: { x: leafX(7, 4, 5), y: LAYOUT.LEAF_Y, level: 2 },
  },
];

// =============================================================================
// COMBINED SKELETON DATA
// =============================================================================

/**
 * All skeleton node definitions
 */
export const SKELETON_NODES: SkeletonNodeDef[] = [
  ROOT,
  ...CATEGORIES,
  ...MARKET_LEAVES,
  ...PROBLEM_LEAVES,
  ...SOLUTION_LEAVES,
  ...TIMING_LEAVES,
  ...FOUNDER_LEAVES,
  ...COMPETITION_LEAVES,
  ...BUSINESS_MODEL_LEAVES,
  ...GTM_LEAVES,
];

/**
 * All skeleton edge definitions (parent requires children)
 */
export const SKELETON_EDGES: Array<{ from: string; to: string }> = SKELETON_NODES
  .filter(node => node.parentId)
  .map(node => ({
    from: node.id,
    to: node.parentId!,
  }));

// =============================================================================
// SKELETON CREATION FUNCTIONS
// =============================================================================

/**
 * Convert a skeleton node definition to a CreateNodeInput
 */
function toFrameworkNodeInput(def: SkeletonNodeDef): CreateNodeInput<FrameworkNode> {
  return {
    id: def.id,
    type: 'framework',
    title: def.title,
    content: '', // Framework nodes don't have user content
    description: def.description,
    confidence: 100, // Framework structure is always "confident"
    frameworkCategory: def.category,
    position: def.position,
    isSkeleton: true,
    parentId: def.parentId,
  };
}

/**
 * Convert a skeleton edge definition to a CreateEdgeInput
 */
function toEdgeInput(edge: { from: string; to: string }): CreateEdgeInput {
  return {
    id: `edge:${edge.from}:${edge.to}`,
    type: 'requires',
    from: edge.from,
    to: edge.to,
  };
}

/**
 * Get all skeleton node inputs ready for graph creation
 */
export function getSkeletonNodeInputs(): CreateNodeInput<FrameworkNode>[] {
  return SKELETON_NODES.map(toFrameworkNodeInput);
}

/**
 * Get all skeleton edge inputs ready for graph creation
 */
export function getSkeletonEdgeInputs(): CreateEdgeInput[] {
  return SKELETON_EDGES.map(toEdgeInput);
}

// =============================================================================
// SKELETON NODE LOOKUPS
// =============================================================================

/**
 * Get a skeleton node definition by ID
 */
export function getSkeletonNodeDef(id: string): SkeletonNodeDef | undefined {
  return SKELETON_NODES.find(node => node.id === id);
}

/**
 * Get all skeleton node IDs
 */
export function getSkeletonNodeIds(): string[] {
  return SKELETON_NODES.map(node => node.id);
}

/**
 * Get skeleton nodes by category
 */
export function getSkeletonNodesByCategory(category: FrameworkCategory): SkeletonNodeDef[] {
  return SKELETON_NODES.filter(node => node.category === category);
}

/**
 * Get leaf skeleton nodes (level 2 nodes that founders need to address)
 */
export function getSkeletonLeafNodes(): SkeletonNodeDef[] {
  return SKELETON_NODES.filter(node => node.position.level === 2);
}

/**
 * Get category skeleton nodes (level 1 nodes)
 */
export function getSkeletonCategoryNodes(): SkeletonNodeDef[] {
  return SKELETON_NODES.filter(node => node.position.level === 1);
}

/**
 * Check if a node ID is a skeleton node
 */
export function isSkeletonNode(id: string): boolean {
  return id.startsWith('framework:');
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { SkeletonNodeDef };
