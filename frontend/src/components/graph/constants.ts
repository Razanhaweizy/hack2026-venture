/**
 * Ideograph Visualization Constants
 * Sequoia Capital Brand-Aligned Color Palette
 * 
 * A sophisticated, minimal visual language emphasizing
 * restraint, whitespace, and timeless elegance.
 */

import type { NodeType, EdgeType, EvidenceValence } from '../../types/graph';

// =============================================================================
// COLOR PALETTE - Sequoia Brand
// =============================================================================

export const COLORS = {
  // Backgrounds
  background: '#FBF7F0',        // Soft Cream
  backgroundAlt: '#F5F1E8',     // Slightly darker cream
  backgroundCard: '#FFFFFF',    // Pure white for cards
  
  // Primary Brand
  sequoiaGreen: '#007354',      // Sequoia Green - primary accent
  sequoiaGreenHover: '#005C43', // Darker green for hover
  sequoiaGreenLight: '#E6F2EE', // Very light green for backgrounds
  
  // Text
  zeusBlack: '#1B1916',         // Zeus - headings, primary text
  textSecondary: '#4A4640',     // Muted brown for body
  textTertiary: '#8A857A',      // Light brown for captions
  textInverse: '#FBF7F0',       // Cream on dark backgrounds
  
  // Borders & Lines
  taupe: '#D1CFC0',             // Standard borders
  taupeSubtle: '#E8E5DC',       // Very subtle borders
  taupeStrong: '#B8B5A8',       // Emphasized borders
  
  // Semantic
  supporting: '#007354',        // Green - positive/supporting
  contradicting: '#B54248',     // Muted red - contradicting
  blocking: '#C4841D',          // Warm amber - blocking
  info: '#4A7C8C',              // Muted teal - informational
  
  // UI Aliases
  text: '#1B1916',
  textMuted: '#8A857A',
  highlight: '#007354',
  selection: '#007354',
  border: '#D1CFC0',
} as const;

// =============================================================================
// NODE COLORS BY TYPE
// =============================================================================

export const NODE_COLORS: Record<NodeType, string> = {
  framework: COLORS.taupe,        // Subtle taupe for framework
  claim: COLORS.sequoiaGreen,     // Green for claims
  fact: COLORS.zeusBlack,         // Dark for facts
  evidence: COLORS.info,          // Teal for evidence (default)
  startup_meta: COLORS.sequoiaGreen, // Hidden node - uses accent color
};

export const EVIDENCE_VALENCE_COLORS: Record<EvidenceValence, string> = {
  supporting: COLORS.supporting,
  contradicting: COLORS.contradicting,
};

// =============================================================================
// EDGE COLORS BY TYPE - Subtle and refined
// =============================================================================

export const EDGE_COLORS: Record<EdgeType, string> = {
  requires: COLORS.taupe,           // Subtle taupe
  supports: COLORS.supporting,      // Green
  contradicts: COLORS.contradicting, // Muted red
  depends_on: COLORS.textSecondary, // Medium brown
  informs: COLORS.taupeSubtle,      // Very subtle
  blocks: COLORS.blocking,          // Amber
};

// Thicker edges for better visibility
export const EDGE_THICKNESS: Record<EdgeType, number> = {
  requires: 0.06,
  supports: 0.05,
  contradicts: 0.05,
  depends_on: 0.07,
  informs: 0.04,
  blocks: 0.05,
};

// Increased opacity for better visibility of confidence colors
export const EDGE_OPACITY: Record<EdgeType, number> = {
  requires: 0.7,
  supports: 0.75,
  contradicts: 0.75,
  depends_on: 0.7,
  informs: 0.5,
  blocks: 0.75,
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
// NODE SIZE CONSTANTS - Refined for elegance
// =============================================================================

export const NODE_SIZE = {
  BASE: 0.25,           // Slightly smaller base
  MAX: 0.9,
  INCREMENT_PER_DEPENDENT: 0.08,
  FRAMEWORK_MULTIPLIER: 1.1,
  ROOT_SIZE: 1.0,
  CATEGORY_SIZE: 0.7,
} as const;

// =============================================================================
// TYPOGRAPHY (for labels)
// =============================================================================

export const TYPOGRAPHY = {
  fontSerif: '"Georgia", "Times New Roman", serif',
  fontSans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
  
  // Label sizes
  labelSize: {
    small: 0.08,
    medium: 0.12,
    large: 0.16,
  },
} as const;

// =============================================================================
// CONFIDENCE-BASED EDGE COLORS - Band-Based (Honest Uncertainty)
// =============================================================================

/**
 * Confidence band colors - distinct bands instead of false-precision gradients
 * 
 * Key insight: Don't interpolate. Use clear bands to communicate uncertainty honestly.
 * - Strong evidence: Multiple credible sources agree
 * - Some evidence: Reasonable basis but needs more validation
 * - Weak evidence: Limited data, treat as hypothesis
 * - Assumption: No real evidence, needs validation before building on it
 */
export const CONFIDENCE_BAND_COLORS = {
  high: '#007354',      // Sequoia green - Strong evidence
  medium: '#E5A826',    // Golden yellow - Some evidence
  low: '#FB923C',       // Orange - Weak evidence
  assumption: '#D4442E', // Red - Assumption (needs validation)
} as const;

export type ConfidenceBandLevel = 'high' | 'medium' | 'low' | 'assumption';

export interface ConfidenceBandInfo {
  level: ConfidenceBandLevel;
  label: string;
  description: string;
  color: string;
}

/**
 * Get confidence band info from internal confidence value
 * Uses honest bands instead of false-precision percentages
 * Internal scores are never shown to users - only labels
 */
export function getConfidenceBand(confidence: number): ConfidenceBandInfo {
  const c = Math.max(0, Math.min(100, confidence));
  const normalized = c / 100;
  
  if (normalized >= 0.75) {
    return {
      level: 'high',
      label: 'Strong evidence',
      description: 'Multiple credible sources agree. Still could be wrong.',
      color: CONFIDENCE_BAND_COLORS.high,
    };
  } else if (normalized >= 0.55) {
    return {
      level: 'medium',
      label: 'Some evidence',
      description: 'Reasonable basis but needs more validation.',
      color: CONFIDENCE_BAND_COLORS.medium,
    };
  } else if (normalized >= 0.35) {
    return {
      level: 'low',
      label: 'Weak evidence',
      description: 'Limited data. Treat as hypothesis to test.',
      color: CONFIDENCE_BAND_COLORS.low,
    };
  } else {
    return {
      level: 'assumption',
      label: 'Assumption',
      description: 'No real evidence. Needs validation before building on it.',
      color: CONFIDENCE_BAND_COLORS.assumption,
    };
  }
}

/**
 * Get edge color based on confidence band
 * Returns distinct band color - no gradients for honest uncertainty
 */
export function getConfidenceEdgeColor(confidence: number): string {
  return getConfidenceBand(confidence).color;
}

/**
 * Get confidence label for display
 */
export function getConfidenceLabel(confidence: number): string {
  return getConfidenceBand(confidence).label;
}

/**
 * Get edge opacity based on confidence band
 * Higher confidence bands are more visible
 */
export function getConfidenceEdgeOpacity(confidence: number, baseOpacity: number): number {
  const band = getConfidenceBand(confidence);
  
  // Band-based opacity scaling
  const bandOpacity: Record<ConfidenceBandLevel, number> = {
    high: 1.0,
    medium: 0.85,
    low: 0.7,
    assumption: 0.6,
  };
  
  return Math.min(baseOpacity * bandOpacity[band.level], 1);
}
