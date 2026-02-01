/**
 * PathBadge Component
 * Displays the current PMF path with icon and status indicator
 */

import { useState } from 'react';
import type { PmfPath } from '../../types/graph';
import { PMF_PATH_CONFIGS } from '../../types/graph';

// =============================================================================
// SEQUOIA STYLES
// =============================================================================

const S = {
  fonts: {
    serif: '"Georgia", "Times New Roman", serif',
    sans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
  },
  colors: {
    bg: '#FBF7F0',
    bgAlt: '#F5F1E8',
    bgCard: '#FFFFFF',
    text: '#1B1916',
    textSecondary: '#4A4640',
    textTertiary: '#8A857A',
    accent: '#007354',
    accentHover: '#005C43',
    accentLight: '#E6F2EE',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
    danger: '#D4442E',
    warning: '#E5A826',
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface PathBadgeProps {
  path: PmfPath | null;
  hasBlockers?: boolean;
  hasWarnings?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PathBadge({ 
  path, 
  hasBlockers = false, 
  hasWarnings = false, 
  onClick,
  compact = false,
}: PathBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!path) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '6px 12px' : '8px 14px',
          background: isHovered ? S.colors.bgAlt : S.colors.bgCard,
          border: `1px dashed ${S.colors.border}`,
          borderRadius: '8px',
          cursor: onClick ? 'pointer' : 'default',
          fontFamily: S.fonts.sans,
          fontSize: compact ? '11px' : '12px',
          color: S.colors.textTertiary,
          transition: 'all 150ms ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Select Path
      </button>
    );
  }
  
  const config = PMF_PATH_CONFIGS[path];
  
  // Determine status color
  let statusColor = S.colors.accent;
  let statusBg = S.colors.accentLight;
  if (hasBlockers) {
    statusColor = S.colors.danger;
    statusBg = '#FDEEED';
  } else if (hasWarnings) {
    statusColor = S.colors.warning;
    statusBg = '#FDF8E8';
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '8px' : '10px',
        padding: compact ? '6px 12px' : '8px 14px',
        background: isHovered ? statusBg : S.colors.bgCard,
        border: `1px solid ${isHovered ? statusColor : S.colors.borderSubtle}`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: S.fonts.sans,
        transition: 'all 150ms ease',
        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: compact ? '14px' : '16px' }}>{config.icon}</span>
      
      {/* Path Name */}
      <span
        style={{
          fontSize: compact ? '11px' : '12px',
          fontWeight: 600,
          color: S.colors.text,
          letterSpacing: '0.02em',
        }}
      >
        {config.name}
      </span>
      
      {/* Status Indicator */}
      {(hasBlockers || hasWarnings) && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: statusColor,
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 700,
          }}
        >
          !
        </span>
      )}
      
      {/* Chevron */}
      {onClick && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={S.colors.textTertiary}
          strokeWidth="2"
          style={{ marginLeft: '2px' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}

// =============================================================================
// MINI BADGE (For inline use)
// =============================================================================

interface PathMiniBadgeProps {
  path: PmfPath;
}

export function PathMiniBadge({ path }: PathMiniBadgeProps) {
  const config = PMF_PATH_CONFIGS[path];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        background: S.colors.accentLight,
        borderRadius: '4px',
        fontFamily: S.fonts.sans,
        fontSize: '10px',
        fontWeight: 600,
        color: S.colors.accent,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ fontSize: '10px' }}>{config.icon}</span>
      {config.name}
    </span>
  );
}

export default PathBadge;
