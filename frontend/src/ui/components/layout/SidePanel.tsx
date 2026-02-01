/**
 * SidePanel Component
 * 
 * The main control panel for the Ideograph application.
 * Displays node details, controls, and action buttons.
 */

import type { GraphNode, FrameworkNode } from '../../../types/graph';
import { COLORS } from '../../../components/graph/constants';

// =============================================================================
// TYPES
// =============================================================================

export interface SidePanelProps {
  // State
  selectedNode: GraphNode | null;
  progress: { answered: number; total: number; percentage: number };
  pipelineResult: string | null;
  isDiffOpen: boolean;
  isFollowUpOpen: boolean;
  hasFollowUpData: boolean;
  isTimeTraveling: boolean;
  
  // Actions
  onAddTestClaim: () => void;
  onAddSpecificClaim: () => void;
  onTestPipeline: () => void;
  onOpenDiffPanel: () => void;
  onTestDiffSystem: () => void;
  onOpenFollowUp: () => void;
  onTestVagueFollowUp: () => void;
  onShowNodeHistory: () => void;
  onCreateSnapshot: () => void;
  onTestVersionHistory: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getNodeTypeColor(node: GraphNode): string {
  switch (node.type) {
    case 'framework': return COLORS.taupe;
    case 'claim': return COLORS.sequoiaGreen;
    case 'fact': return COLORS.zeusBlack;
    case 'evidence': return '#4ADE80';
    default: return COLORS.text;
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ProgressSection({ progress }: { progress: SidePanelProps['progress'] }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Progress</span>
        <span style={{ fontSize: '14px', opacity: 0.7 }}>
          {progress.answered}/{progress.total} ({progress.percentage}%)
        </span>
      </div>
      <div style={{
        height: '8px',
        background: COLORS.taupe,
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress.percentage}%`,
          background: COLORS.sequoiaGreen,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function SelectedNodeSection({ 
  selectedNode, 
  onShowNodeHistory,
  isTimeTraveling,
}: { 
  selectedNode: GraphNode | null;
  onShowNodeHistory: () => void;
  isTimeTraveling: boolean;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ 
        fontSize: '14px', 
        fontWeight: 600,
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        opacity: 0.7,
      }}>
        Selected Node
      </h2>
      
      {selectedNode ? (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${COLORS.taupe}`,
        }}>
          <div style={{ 
            fontSize: '12px', 
            textTransform: 'uppercase',
            color: getNodeTypeColor(selectedNode),
            marginBottom: '4px',
            fontWeight: 500,
          }}>
            {selectedNode.type}
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            {selectedNode.title}
          </div>
          
          {selectedNode.content && (
            <p style={{ 
              fontSize: '13px', 
              lineHeight: 1.5,
              opacity: 0.8,
              marginBottom: '12px',
            }}>
              {selectedNode.content}
            </p>
          )}
          
          {selectedNode.type === 'framework' && (
            <p style={{ 
              fontSize: '12px', 
              fontStyle: 'italic',
              opacity: 0.7,
              lineHeight: 1.4,
            }}>
              {(selectedNode as FrameworkNode).description}
            </p>
          )}
          
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${COLORS.taupe}`,
            fontSize: '12px',
            opacity: 0.6,
          }}>
            Evidence: {(() => {
              const n = selectedNode.confidence / 100;
              if (n >= 0.75) return 'Strong';
              if (n >= 0.55) return 'Some';
              if (n >= 0.35) return 'Weak';
              return 'Assumption';
            })()}
          </div>
          
          <button
            onClick={onShowNodeHistory}
            disabled={isTimeTraveling}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '8px 12px',
              background: isTimeTraveling ? '#E5E7EB' : 'white',
              color: isTimeTraveling ? '#9CA3AF' : COLORS.text,
              border: `1px solid ${COLORS.taupe}`,
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isTimeTraveling ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⏱️</span>
            <span>View History</span>
          </button>
        </div>
      ) : (
        <p style={{ 
          fontSize: '13px', 
          opacity: 0.5,
          fontStyle: 'italic',
        }}>
          Click a node to see details
        </p>
      )}
    </div>
  );
}

function ControlsSection({
  pipelineResult,
  isDiffOpen,
  isFollowUpOpen,
  hasFollowUpData,
  isTimeTraveling,
  onAddTestClaim,
  onAddSpecificClaim,
  onTestPipeline,
  onOpenDiffPanel,
  onTestDiffSystem,
  onOpenFollowUp,
  onTestVagueFollowUp,
  onCreateSnapshot,
  onTestVersionHistory,
}: Omit<SidePanelProps, 'selectedNode' | 'progress' | 'onShowNodeHistory'>) {
  return (
    <div>
      <h2 style={{ 
        fontSize: '14px', 
        fontWeight: 600,
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        opacity: 0.7,
      }}>
        Controls
      </h2>
      
      <div style={{ 
        fontSize: '12px', 
        lineHeight: 2,
        opacity: 0.7,
      }}>
        <div>🖱️ Drag to rotate</div>
        <div>📜 Scroll to zoom</div>
        <div>⇧+Drag to pan</div>
        <div>👆 Click to select</div>
        <div>👆👆 Double-click to focus</div>
      </div>
      
      {/* Test Buttons */}
      <button
        onClick={onAddTestClaim}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '10px 16px',
          background: COLORS.sequoiaGreen,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Add Random Claim
      </button>
      
      <button
        onClick={onAddSpecificClaim}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '10px 16px',
          background: COLORS.zeusBlack,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Add "Restaurant Waste" Claim
      </button>
      
      <button
        onClick={onTestPipeline}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '10px 16px',
          background: '#6366F1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Test Pipeline (Maria Example)
      </button>
      
      {pipelineResult && (
        <>
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#F3F4F6',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '150px',
            overflowY: 'auto',
          }}>
            {pipelineResult}
          </div>
          
          <button
            onClick={onOpenDiffPanel}
            disabled={isDiffOpen}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '12px 16px',
              background: isDiffOpen ? '#E5E7EB' : '#007354',
              color: isDiffOpen ? '#9CA3AF' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isDiffOpen ? 'not-allowed' : 'pointer',
            }}
          >
            {isDiffOpen ? 'Review Panel Open' : 'Review & Apply Changes'}
          </button>
        </>
      )}
      
      <button
        onClick={onTestDiffSystem}
        disabled={isDiffOpen || isFollowUpOpen}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '10px 16px',
          background: (isDiffOpen || isFollowUpOpen) ? '#E5E7EB' : '#DC2626',
          color: (isDiffOpen || isFollowUpOpen) ? '#9CA3AF' : 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: (isDiffOpen || isFollowUpOpen) ? 'not-allowed' : 'pointer',
        }}
      >
        Test Diff System (5 Changes)
      </button>
      
      <button
        onClick={onOpenFollowUp}
        disabled={isDiffOpen || isFollowUpOpen || !hasFollowUpData}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '10px 16px',
          background: (isDiffOpen || isFollowUpOpen || !hasFollowUpData) ? '#E5E7EB' : '#8B5CF6',
          color: (isDiffOpen || isFollowUpOpen || !hasFollowUpData) ? '#9CA3AF' : 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: (isDiffOpen || isFollowUpOpen || !hasFollowUpData) ? 'not-allowed' : 'pointer',
        }}
      >
        Follow-up Questions
      </button>
      
      <button
        onClick={onTestVagueFollowUp}
        disabled={isDiffOpen || isFollowUpOpen}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '10px 16px',
          background: (isDiffOpen || isFollowUpOpen) ? '#E5E7EB' : '#F59E0B',
          color: (isDiffOpen || isFollowUpOpen) ? '#9CA3AF' : 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: (isDiffOpen || isFollowUpOpen) ? 'not-allowed' : 'pointer',
        }}
      >
        Test Vague Input Follow-up
      </button>
      
      {/* Version History Section */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: `1px solid ${COLORS.taupe}`,
      }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          opacity: 0.7,
        }}>
          Version History
        </h3>
        
        <button
          onClick={onCreateSnapshot}
          disabled={isTimeTraveling}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: isTimeTraveling ? '#E5E7EB' : '#6366F1',
            color: isTimeTraveling ? '#9CA3AF' : 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isTimeTraveling ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>📸</span>
          <span>Create Snapshot</span>
        </button>
        
        <button
          onClick={onTestVersionHistory}
          disabled={isTimeTraveling}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '10px 16px',
            background: isTimeTraveling ? '#E5E7EB' : '#10B981',
            color: isTimeTraveling ? '#9CA3AF' : 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isTimeTraveling ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>⏱️</span>
          <span>Test Version History</span>
        </button>
        
        {isTimeTraveling && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#92400E',
          }}>
            ⏱️ Viewing past state - edits disabled
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SidePanel(props: SidePanelProps) {
  const {
    selectedNode,
    progress,
    pipelineResult,
    isDiffOpen,
    isFollowUpOpen,
    hasFollowUpData,
    isTimeTraveling,
    onShowNodeHistory,
    ...controlProps
  } = props;
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '320px',
        height: 'calc(100% - 80px)',
        background: 'rgba(251, 247, 240, 0.98)',
        borderLeft: `1px solid ${COLORS.taupe}`,
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLORS.text,
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 200,
      }}
    >
      {/* Header */}
      <h1 style={{ 
        fontSize: '20px', 
        marginBottom: '4px',
        color: COLORS.sequoiaGreen,
      }}>
        Ideograph
      </h1>
      <p style={{ 
        fontSize: '12px', 
        opacity: 0.6, 
        marginBottom: '20px' 
      }}>
        Startup Idea Evaluation
      </p>
      
      <ProgressSection progress={progress} />
      
      <SelectedNodeSection 
        selectedNode={selectedNode}
        onShowNodeHistory={onShowNodeHistory}
        isTimeTraveling={isTimeTraveling}
      />
      
      <ControlsSection
        pipelineResult={pipelineResult}
        isDiffOpen={isDiffOpen}
        isFollowUpOpen={isFollowUpOpen}
        hasFollowUpData={hasFollowUpData}
        isTimeTraveling={isTimeTraveling}
        {...controlProps}
      />
    </div>
  );
}

export default SidePanel;
