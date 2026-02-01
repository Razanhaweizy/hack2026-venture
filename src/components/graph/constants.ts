/**
 * Ideograph Visualization Constants
 * Color palette and visual configuration
 */

import type { NodeType, EdgeType, EvidenceValence } from '../../types/graph';

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const COLORS = {
  // Background
  background: '#FBF7F0',      // Soft Cream
  
  // Primary
  sequoiaGreen: '#007354',    // Sequoia Green - primary brand
  zeusBlack: '#1B1916',       // Zeus - text and edges
  taupe: '#D1CFC0',           // Taupe - subtle elements
  
  // Semantic
  supporting: '#4ADE80',      // Green - supporting evidence
  contradicting: '#F87171',   // Red - contradicting evidence
  blocking: '#FB923C',        // Orange - blocking relationships
  
  // UI
  text: '#1B1916',
  textMuted: '#6B7280',
  highlight: '#007354',
  selection: '#007354',
} as const;

// =============================================================================
// NODE COLORS BY TYPE
// =============================================================================

export const NODE_COLORS: Record<NodeType, string> = {
  framework: COLORS.taupe,
  claim: COLORS.sequoiaGreen,
  fact: COLORS.zeusBlack,
  evidence: COLORS.supporting, // Default, overridden by valence
};

export const EVIDENCE_VALENCE_COLORS: Record<EvidenceValence, string> = {
  supporting: COLORS.supporting,
  contradicting: COLORS.contradicting,
};

// =============================================================================
// EDGE COLORS BY TYPE
// =============================================================================

export const EDGE_COLORS: Record<EdgeType, string> = {
  requires: COLORS.zeusBlack,
  supports: COLORS.supporting,
  contradicts: COLORS.contradicting,
  depends_on: COLORS.zeusBlack,
  informs: COLORS.taupe,
  blocks: COLORS.blocking,
};

export const EDGE_THICKNESS: Record<EdgeType, number> = {
  requires: 0.04,
  supports: 0.03,
  contradicts: 0.03,
  depends_on: 0.05,
  informs: 0.02,
  blocks: 0.03,
};

export const EDGE_OPACITY: Record<EdgeType, number> = {
  requires: 0.8,
  supports: 0.7,
  contradicts: 0.7,
  depends_on: 0.9,
  informs: 0.5,
  blocks: 0.7,
};

// =============================================================================
// 3D LAYOUT CONSTANTS
// =============================================================================

export const LAYOUT = {
  // Y-axis levels (vertical hierarchy)
  Y_ROOT: 10,           // THE IDEA
  Y_CATEGORY: 7,        // 8 framework categories
  Y_FRAMEWORK_LEAF: 4,  // Framework children
  Y_CLAIM_FACT: 2,      // Claims and Facts
  Y_EVIDENCE: 0,        // Evidence (bottom)
  
  // X-axis positions for categories
  CATEGORY_X: {
    market: -14,
    problem: -10,
    solution: -6,
    timing: -2,
    founder: 2,
    competition: 6,
    business_model: 10,
    gtm: 14,
  } as Record<string, number>,
  
  // Spacing
  Z_SPREAD: 3,          // Z-axis spread for nodes within category
  CHILD_SPREAD: 2,      // Spread for children under a parent
} as const;

// =============================================================================
// NODE SIZE CONSTANTS
// =============================================================================

export const NODE_SIZE = {
  BASE: 0.3,
  MAX: 1.0,
  INCREMENT_PER_DEPENDENT: 0.1,
  FRAMEWORK_MULTIPLIER: 1.2,    // Framework nodes are slightly larger
  ROOT_SIZE: 1.2,               // THE IDEA is largest
  CATEGORY_SIZE: 0.8,           // Categories are large
} as const;
