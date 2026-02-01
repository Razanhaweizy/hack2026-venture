/**
 * ClaimCriticPanel
 * Displays AI critique of a user claim against the Sequoia product framework.
 */

import { COLORS } from '../graph/constants';
import type { ClaimCriticResult, ClaimCriticError } from '../../core/services/claimCritic.types';

interface ClaimCriticPanelProps {
  claimTitle: string;
  result: ClaimCriticResult | ClaimCriticError | null;
  loading: boolean;
  onClose: () => void;
}

function isError(r: ClaimCriticResult | ClaimCriticError | null): r is ClaimCriticError {
  return r !== null && 'message' in r && !('summary' in r);
}

export function ClaimCriticPanel({ claimTitle, result, loading, onClose }: ClaimCriticPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(251, 247, 240, 0.98)',
        borderLeft: `1px solid ${COLORS.taupe}`,
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLORS.text,
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 250,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.sequoiaGreen, margin: 0 }}>
          Claim critique
        </h2>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: COLORS.textMuted,
            padding: '4px 8px',
          }}
          aria-label="Close"
        >
          Close
        </button>
      </div>

      <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>
        Claim: {claimTitle}
      </p>

      {loading && (
        <p style={{ fontSize: '14px', color: COLORS.textMuted }}>Critiquing with Gemini 2.5 Flash...</p>
      )}

      {!loading && result && isError(result) && (
        <div style={{ fontSize: '14px', color: '#DC2626' }}>
          {result.message}
        </div>
      )}

      {!loading && result && !isError(result) && (
        <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
          <p style={{ marginBottom: '12px', fontWeight: 500 }}>{result.summary}</p>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
              Framework category
            </strong>
            <p style={{ margin: '4px 0 0 0' }}>{result.frameworkCategory}</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
              Assessment
            </strong>
            <p style={{ margin: '4px 0 0 0', textTransform: 'capitalize' }}>{result.assessment}</p>
          </div>

          {result.strengths.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                Strengths
              </strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {result.strengths.map((s, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                Gaps
              </strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {result.gaps.map((g, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div>
              <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                Suggestions
              </strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                {result.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
