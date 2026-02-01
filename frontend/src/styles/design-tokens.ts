/**
 * Sequoia Capital Brand Design Tokens
 * 
 * A sophisticated, minimal design system inspired by sequoiacap.com
 * Emphasizes whitespace, restraint, and timeless elegance.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Core Brand Colors
  background: '#FBF7F0',        // Soft Cream - main background
  backgroundAlt: '#F5F1E8',     // Slightly darker cream for cards
  
  // Text Colors
  text: {
    primary: '#1B1916',         // Zeus Black - headings, primary text
    secondary: '#4A4640',       // Muted brown - body text
    tertiary: '#8A857A',        // Light brown - captions, hints
    inverse: '#FBF7F0',         // Cream - text on dark backgrounds
  },
  
  // Accent Colors
  accent: {
    primary: '#007354',         // Sequoia Green - CTAs, active states
    primaryHover: '#005C43',    // Darker green for hover states
    primaryLight: '#E6F2EE',    // Very light green for backgrounds
  },
  
  // Border & Divider Colors
  border: {
    subtle: '#E8E5DC',          // Very subtle borders
    light: '#D1CFC0',           // Taupe - standard borders
    medium: '#B8B5A8',          // Darker taupe for emphasis
  },
  
  // Semantic Colors
  semantic: {
    success: '#007354',         // Sequoia Green
    warning: '#C4841D',         // Warm amber
    error: '#B54248',           // Muted red
    info: '#4A7C8C',            // Muted teal
  },
  
  // Graph-specific Colors
  graph: {
    nodeFramework: '#D1CFC0',   // Taupe for framework nodes
    nodeClaim: '#007354',       // Green for claims
    nodeFact: '#1B1916',        // Dark for facts
    nodeEvidence: '#4A7C8C',    // Teal for evidence
    edgeDefault: '#D1CFC0',     // Subtle edges
    edgeActive: '#1B1916',      // Active/hovered edges
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font Families
  fonts: {
    serif: '"Georgia", "Times New Roman", "Palatino Linotype", serif',
    sans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    mono: '"SF Mono", "Fira Code", "Consolas", monospace',
  },
  
  // Font Sizes (using rem for accessibility)
  sizes: {
    xs: '0.6875rem',    // 11px
    sm: '0.75rem',      // 12px
    base: '0.875rem',   // 14px
    md: '1rem',         // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '2rem',      // 32px
    '4xl': '2.5rem',    // 40px
  },
  
  // Font Weights
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
    widest: '0.15em',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

// =============================================================================
// BORDERS & RADIUS
// =============================================================================

export const borders = {
  width: {
    hairline: '1px',
    thin: '1.5px',
    medium: '2px',
  },
  radius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(27, 25, 22, 0.04)',
  md: '0 2px 8px rgba(27, 25, 22, 0.06)',
  lg: '0 4px 16px rgba(27, 25, 22, 0.08)',
  xl: '0 8px 32px rgba(27, 25, 22, 0.1)',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  verySlow: '500ms ease',
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  tooltip: 500,
} as const;

// =============================================================================
// COMPONENT PRESETS
// =============================================================================

export const presets = {
  // Button Styles
  button: {
    primary: {
      background: colors.accent.primary,
      color: colors.text.inverse,
      border: 'none',
      hoverBackground: colors.accent.primaryHover,
    },
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.light}`,
      hoverBackground: colors.backgroundAlt,
    },
    ghost: {
      background: 'transparent',
      color: colors.accent.primary,
      border: 'none',
      hoverBackground: colors.accent.primaryLight,
    },
    text: {
      background: 'transparent',
      color: colors.text.secondary,
      border: 'none',
      textDecoration: 'underline',
    },
  },
  
  // Card Styles
  card: {
    background: 'white',
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borders.radius.lg,
    shadow: shadows.sm,
  },
  
  // Input Styles
  input: {
    background: 'white',
    border: `1px solid ${colors.border.light}`,
    borderRadius: borders.radius.md,
    focusBorder: colors.accent.primary,
  },
} as const;

// =============================================================================
// EXPORT ALL AS THEME
// =============================================================================

export const theme = {
  colors,
  typography,
  spacing,
  borders,
  shadows,
  transitions,
  zIndex,
  presets,
} as const;

export default theme;
