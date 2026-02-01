/**
 * Ideograph - Startup Idea Evaluation Tool
 * Main Application Component
 */

import { useEffect, useState, useCallback } from 'react';
import { IdeographVisualization, COLORS } from './components/graph';
import { DiffPanel } from './components/diff';
import { FollowUpQuestionsPanel } from './components/followup';
import {
  NodeHistoryPanel,
  VersionCompareModal,
  GraphTimeline,
  TimeTravelBanner,
} from './components/version';
import { 
  useGraphStore, 
  createFreshGraph, 
  isSkeletonInitialized,
  useSkeletonProgress,
  useDiffStore,
  useHighlightedNodes,
  initializeFromCSV,
  enableAutoSave,
  exportToCSVFiles,
} from './store';
import {
  useVersionStore,
  restoreNodeVersion,
  createSnapshotAfterChanges,
} from './version';
import type { GraphNode, FrameworkNode, ClaimNode } from './types/graph';
import { 
  processUserInputLocal,
  quickParseLocal,
  detectFrameworkRelevanceLocal,
} from './pipeline';
import { setupTestGraph, createTestChanges } from './tests/testDiffSystem';
import { TEST_VAGUE_INPUT } from './tests/testFollowUpSystem';
import { setupVersionHistoryTest } from './tests/testVersionHistory';
import {
  generateFollowUpQuestionsLocal,
  combineAnswersAsInput,
  useFollowUpStore,
} from './followup';

// =============================================================================
// SIDE PANEL COMPONENT
// =============================================================================

interface SidePanelProps {
  selectedNode: GraphNode | null;
  progress: { answered: number; total: number; percentage: number };
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
  onExportCSV: () => void;
  pipelineResult: string | null;
  isDiffOpen: boolean;
  isFollowUpOpen: boolean;
  hasFollowUpData: boolean;
  isTimeTraveling: boolean;
}

function SidePanel({ selectedNode, progress, onAddTestClaim, onAddSpecificClaim, onTestPipeline, onOpenDiffPanel, onTestDiffSystem, onOpenFollowUp, onTestVagueFollowUp, onShowNodeHistory, onCreateSnapshot, onTestVersionHistory, onExportCSV, pipelineResult, isDiffOpen, isFollowUpOpen, hasFollowUpData, isTimeTraveling }: SidePanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '320px',
        height: 'calc(100% - 80px)', // Account for timeline height
        background: 'rgba(251, 247, 240, 0.98)',
        borderLeft: `1px solid ${COLORS.taupe}`,
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLORS.text,
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 200, // Above timeline
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
      
      {/* Progress */}
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
      
      {/* Selected Node Details */}
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
              Confidence: {selectedNode.confidence}%
            </div>
            
            {/* Show History button */}
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
      
      {/* Controls */}
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
        
        {/* CSV Data Section */}
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
            Data Management
          </h3>
          
          <button
            onClick={onExportCSV}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📥</span>
            <span>Export to CSV</span>
          </button>
          
          <p style={{
            marginTop: '8px',
            fontSize: '10px',
            opacity: 0.5,
            lineHeight: 1.4,
          }}>
            Changes are auto-saved to browser storage. Export to download CSV files.
          </p>
        </div>
      </div>
    </div>
  );
}

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
// MAIN APP COMPONENT
// =============================================================================

function App() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);
  const [lastPipelineChanges, setLastPipelineChanges] = useState<ReturnType<typeof processUserInputLocal> | null>(null);
  const [lastParsedInput, setLastParsedInput] = useState<Partial<import('./pipeline').ParsedInput> | null>(null);
  
  // Store hooks
  const progress = useSkeletonProgress();
  const { isOpen: isDiffOpen, openDiff } = useDiffStore();
  const highlightedNodesFromStore = useHighlightedNodes();
  const { isOpen: isFollowUpOpen, openFollowUp } = useFollowUpStore();
  
  // Version history state
  const { isTimeTraveling, travelToSnapshot, returnToPresent, snapshots } = useVersionStore();
  const [showNodeHistory, setShowNodeHistory] = useState(false);
  const [comparingVersions, setComparingVersions] = useState<{ nodeId: string; v1: number; v2: number } | null>(null);
  const [showTimeline] = useState(true); // Always show timeline for now
  
  // Use empty object when diff is not open to prevent unnecessary renders
  const highlightedNodes = isDiffOpen ? highlightedNodesFromStore : {};
  
  // Loading state for CSV initialization
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Initialize from CSV on mount
  useEffect(() => {
    async function init() {
      try {
        // Try to load from CSV (localStorage first, then files)
        const result = await initializeFromCSV();
        console.log(`Graph initialized from ${result.source}: ${result.nodesLoaded} nodes, ${result.edgesLoaded} edges`);
        
        // Enable auto-save to persist changes
        enableAutoSave();
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize from CSV:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load graph data');
        
        // Fallback to skeleton
        if (!isSkeletonInitialized()) {
          createFreshGraph();
          console.log('Fallback: Skeleton initialized');
        }
        setIsLoading(false);
      }
    }
    
    init();
  }, []);
  
  // Handler to add a test claim
  const handleAddTestClaim = () => {
    const store = useGraphStore.getState();
    const unanswered = store.getUnansweredFrameworkNodes();
    if (unanswered.length === 0) {
      alert('All framework nodes have been addressed!');
      return;
    }
    
    // Pick a random unanswered framework node
    const targetFramework = unanswered[Math.floor(Math.random() * unanswered.length)];
    
    // Create a test claim
    const claim = store.addNode<ClaimNode>({
      type: 'claim',
      title: `Claim for ${targetFramework.title}`,
      content: `This is a test claim addressing "${targetFramework.title}". In a real scenario, this would contain the founder's hypothesis or belief about this aspect of their startup.`,
      confidence: Math.floor(Math.random() * 50) + 30, // Random 30-80
      tested: false,
    });
    
    // Attach to framework
    store.attachToFramework(targetFramework.id, claim.id);
    
    console.log(`Added claim "${claim.title}" attached to "${targetFramework.title}"`);
  };
  
  // Handler to add a specific test claim for testing
  const handleAddSpecificClaim = () => {
    const store = useGraphStore.getState();
    
    // Create the specific claim: "Restaurants lose $2000/mo to waste"
    const claim = store.addNode<ClaimNode>({
      type: 'claim',
      title: 'Restaurants lose $2000/mo to waste',
      content: 'Based on industry surveys, the average restaurant loses approximately $2000 per month due to food waste, inefficient inventory management, and spoilage.',
      confidence: 65,
      tested: false,
    });
    
    // Connect to "framework:problem:pain" with a "supports" edge
    store.addEdge({
      type: 'supports',
      from: claim.id,
      to: 'framework:problem:pain',
      weight: 0.8,
    });
    
    console.log(`Added claim "${claim.title}" supporting "framework:problem:pain"`);
  };
  
  // Handler to test the pipeline with Maria example
  const handleTestPipeline = () => {
    const testInput = `Talked to Maria yesterday, she owns a restaurant in Brooklyn with about 30 seats. She said food waste costs her around $2,500 per month and she's tried a few apps but nothing stuck. She'd pay up to $75/month for something that actually worked.`;
    
    const store = useGraphStore.getState();
    const allNodes = store.getAllNodes();
    const frameworkNodes = store.getFrameworkNodes();
    
    // Quick parse
    const parsed = quickParseLocal(testInput);
    
    // Framework detection
    const frameworkRelevance = detectFrameworkRelevanceLocal(testInput, frameworkNodes);
    
    // Full local processing
    const result = processUserInputLocal(testInput, allNodes, frameworkNodes);
    
    // Build output string
    let output = '=== PIPELINE TEST ===\n\n';
    
    output += `--- STATEMENTS (${parsed.statements?.length || 0}) ---\n`;
    for (const stmt of parsed.statements || []) {
      output += `[${stmt.type.toUpperCase()}] "${stmt.text.substring(0, 45)}..."\n`;
      output += `  Source: ${stmt.source || 'none'}, Conf: ${stmt.confidence}%\n`;
      if (stmt.quantitative) {
        output += `  $${stmt.quantitative.value}${stmt.quantitative.unit}\n`;
      }
    }
    
    output += `\n--- ENTITIES (${parsed.entities?.length || 0}) ---\n`;
    for (const entity of parsed.entities || []) {
      output += `${entity.name} [${entity.type}]\n`;
      output += `  Role: ${entity.role || 'unknown'}\n`;
      const attrs = Object.entries(entity.attributes || {});
      if (attrs.length > 0) {
        output += `  ${attrs.map(([k,v]) => `${k}: ${v}`).join(', ')}\n`;
      }
    }
    
    output += `\n--- FRAMEWORK (${frameworkRelevance.length}) ---\n`;
    for (const r of frameworkRelevance.slice(0, 4)) {
      output += `${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}%\n`;
    }
    
    // Group changes by type
    const adds = result.changes.filter(c => c.type === 'ADD');
    const suggests = result.changes.filter(c => c.type === 'SUGGEST');
    const others = result.changes.filter(c => c.type !== 'ADD' && c.type !== 'SUGGEST');
    
    output += `\n--- CHANGES ---\n`;
    output += `ADD: ${adds.length}, SUGGEST: ${suggests.length}, OTHER: ${others.length}\n\n`;
    
    for (const change of adds.slice(0, 3)) {
      output += `[ADD] ${change.newNode?.title || change.explanation.substring(0, 40)}\n`;
      if (change.connectTo?.length) {
        output += `  → ${change.connectTo[0].nodeId.replace('framework:', '')}\n`;
      }
    }
    
    for (const suggest of suggests.slice(0, 2)) {
      output += `[SUGGEST] ${suggest.suggestion?.substring(0, 50)}...\n`;
    }
    
    output += `\nTime: ${result.processingTimeMs}ms`;
    output += `\n\nClick "Review & Apply Changes" to review`;
    
    setPipelineResult(output);
    setLastPipelineChanges(result);
    setLastParsedInput(parsed);
    console.log('Pipeline test complete:', result);
  };
  
  // Handler to open diff panel with pipeline results
  const handleOpenDiffPanel = () => {
    if (lastPipelineChanges && lastPipelineChanges.changes.length > 0) {
      const testInput = `Talked to Maria yesterday, she owns a restaurant in Brooklyn with about 30 seats. She said food waste costs her around $2,500 per month and she's tried a few apps but nothing stuck. She'd pay up to $75/month for something that actually worked.`;
      openDiff(testInput, lastPipelineChanges.changes);
    }
  };
  
  // Handler to test the diff system with predefined changes
  const handleTestDiffSystem = () => {
    // Setup test graph with existing claim
    setupTestGraph();
    
    // Create test changes
    const testChanges = createTestChanges();
    
    // Open diff panel with test changes
    const testInput = 'Talked to Maria yesterday, she owns a restaurant in Brooklyn with about 30 seats. She said food waste costs her around $2,500 per month and she\'s tried a few apps but nothing stuck. She\'d pay up to $75/month for something that actually worked.';
    
    // Also parse for follow-up questions later
    const parsed = quickParseLocal(testInput);
    setLastParsedInput(parsed as ReturnType<typeof quickParseLocal>);
    setLastPipelineChanges({ success: true, changes: testChanges, processingTimeMs: 0 });
    
    openDiff(testInput, testChanges);
    console.log('Diff system test started with 5 proposed changes');
  };
  
  // Handler to generate and open follow-up questions after diff is completed
  const handleDiffComplete = useCallback(() => {
    if (!lastParsedInput || !lastPipelineChanges) {
      console.log('No pipeline data for follow-up questions');
      return;
    }
    
    const store = useGraphStore.getState();
    const allNodes = store.getAllNodes();
    const frameworkNodes = store.getFrameworkNodes();
    
    // Generate follow-up questions
    const result = generateFollowUpQuestionsLocal({
      parsedInput: lastParsedInput,
      proposedChanges: lastPipelineChanges.changes,
      nodes: allNodes,
      frameworkNodes,
    });
    
    console.log('Generated follow-up questions:', result);
    
    if (result.questions.length > 0) {
      openFollowUp(result.questions);
    }
  }, [lastParsedInput, lastPipelineChanges, openFollowUp]);
  
  // Handler to process follow-up answers and loop back into pipeline
  const handleFollowUpSubmit = useCallback((answers: Record<string, string | number | string[]>) => {
    // Get questions from store
    const questions = useFollowUpStore.getState().questions;
    
    // Convert answers to combined input text
    const combinedInput = combineAnswersAsInput(answers, questions);
    
    console.log('Follow-up answers combined input:', combinedInput);
    
    if (combinedInput.trim()) {
      // Process through pipeline
      const store = useGraphStore.getState();
      const allNodes = store.getAllNodes();
      const frameworkNodes = store.getFrameworkNodes();
      
      const parsed = quickParseLocal(combinedInput);
      const result = processUserInputLocal(combinedInput, allNodes, frameworkNodes);
      
      if (result.changes.length > 0) {
        // Store for potential additional follow-ups
        setLastParsedInput(parsed);
        setLastPipelineChanges(result);
        
        // Open diff panel with new changes
        openDiff(combinedInput, result.changes);
        
        // Update pipeline result display
        setPipelineResult(`Follow-up processed: ${result.changes.length} new changes`);
      } else {
        setPipelineResult('Follow-up answers processed, no new changes needed.');
      }
    }
  }, [openDiff]);
  
  // Handler to close follow-up panel
  const handleFollowUpClose = useCallback(() => {
    // Nothing extra needed, store handles close
  }, []);
  
  // ==========================================================================
  // VERSION HISTORY HANDLERS
  // ==========================================================================
  
  // Handler to show node history panel
  const handleShowNodeHistory = useCallback(() => {
    if (selectedNode) {
      setShowNodeHistory(true);
    }
  }, [selectedNode]);
  
  // Handler to close node history panel
  const handleCloseNodeHistory = useCallback(() => {
    setShowNodeHistory(false);
  }, []);
  
  // Handler to restore a node version
  const handleRestoreVersion = useCallback((nodeId: string, versionNumber: number) => {
    const restored = restoreNodeVersion(nodeId, versionNumber);
    if (restored) {
      console.log(`Restored node ${nodeId} to version ${versionNumber}`);
      // Refresh the selected node to show updated content
      setSelectedNode(restored);
      setShowNodeHistory(false);
      setComparingVersions(null);
    }
  }, []);
  
  // Handler to compare versions
  const handleCompareVersions = useCallback((nodeId: string, v1: number, v2: number) => {
    setComparingVersions({ nodeId, v1, v2 });
  }, []);
  
  // Handler to close compare modal
  const handleCloseCompare = useCallback(() => {
    setComparingVersions(null);
  }, []);
  
  // Handler to create a manual snapshot
  const handleCreateSnapshot = useCallback(() => {
    createSnapshotAfterChanges('Manual checkpoint');
    console.log('Snapshot created!');
    // Show visual feedback in pipeline result
    setPipelineResult('📸 Snapshot created!');
  }, []);
  
  // Handler for timeline navigation
  const handleTimelineNavigate = useCallback((snapshotId: string | null) => {
    if (snapshotId) {
      travelToSnapshot(snapshotId);
    } else {
      returnToPresent();
    }
  }, [travelToSnapshot, returnToPresent]);
  
  // Handler for time travel banner navigation
  const handleTimeTravelPrevious = useCallback(() => {
    const currentIndex = snapshots.findIndex(s => s.snapshotId === useVersionStore.getState().currentSnapshotId);
    if (currentIndex > 0) {
      travelToSnapshot(snapshots[currentIndex - 1].snapshotId);
    }
  }, [snapshots, travelToSnapshot]);
  
  const handleTimeTravelNext = useCallback(() => {
    const currentIndex = snapshots.findIndex(s => s.snapshotId === useVersionStore.getState().currentSnapshotId);
    if (currentIndex < snapshots.length - 1) {
      travelToSnapshot(snapshots[currentIndex + 1].snapshotId);
    } else {
      returnToPresent();
    }
  }, [snapshots, travelToSnapshot, returnToPresent]);
  
  // Handler to test version history (Prompt 7.5 test)
  const handleTestVersionHistory = useCallback(() => {
    const { claimId } = setupVersionHistoryTest();
    if (claimId) {
      // Select the pricing claim node
      const store = useGraphStore.getState();
      const claimNode = store.getNode(claimId);
      if (claimNode) {
        setSelectedNode(claimNode);
        setPipelineResult(`✅ Version history test setup complete. Claim ID: ${claimId.substring(0, 8)}...`);
      }
    }
  }, []);
  
  // Handler to test vague input follow-up (Prompt 6.5 test)
  const handleTestVagueFollowUp = () => {
    // Reset graph to fresh state
    createFreshGraph();
    
    const store = useGraphStore.getState();
    const allNodes = store.getAllNodes();
    const frameworkNodes = store.getFrameworkNodes();
    
    // Parse the vague input
    const parsed = quickParseLocal(TEST_VAGUE_INPUT);
    
    // Process through pipeline
    const result = processUserInputLocal(TEST_VAGUE_INPUT, allNodes, frameworkNodes);
    
    // Store for follow-up
    setLastParsedInput(parsed);
    setLastPipelineChanges(result);
    
    // Generate follow-up questions
    const questions = generateFollowUpQuestionsLocal({
      parsedInput: parsed,
      proposedChanges: result.changes,
      nodes: allNodes,
      frameworkNodes,
    });
    
    console.log('=== VAGUE INPUT FOLLOW-UP TEST ===');
    console.log('Input:', TEST_VAGUE_INPUT);
    console.log('Questions generated:', questions.questions.length);
    questions.questions.forEach((q, i) => {
      console.log(`  ${i + 1}. [${q.priority}] ${q.category}: ${q.question.substring(0, 50)}...`);
    });
    
    // Open follow-up questions directly
    if (questions.questions.length > 0) {
      openFollowUp(questions.questions);
    } else {
      setPipelineResult('No follow-up questions generated from vague input');
    }
  };
  
  // Toggle labels with 'L' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        setShowLabels(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FBF7F0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <h1 style={{ color: COLORS.sequoiaGreen, marginBottom: '16px' }}>Ideograph</h1>
        <p style={{ color: COLORS.text, opacity: 0.7 }}>Loading graph data...</p>
      </div>
    );
  }
  
  // Show error if loading failed (but still render the app with fallback data)
  if (loadError) {
    console.warn('CSV load error (using fallback):', loadError);
  }
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 3D Visualization */}
      <div style={{ 
        width: 'calc(100% - 320px)', 
        height: showTimeline ? 'calc(100% - 80px)' : '100%',
      }}>
        <IdeographVisualization
          onNodeSelect={setSelectedNode}
          showLabels={showLabels}
          highlightedNodes={highlightedNodes}
        />
      </div>
      
      {/* Side Panel */}
      <SidePanel
        selectedNode={selectedNode}
        progress={progress}
        onAddTestClaim={handleAddTestClaim}
        onAddSpecificClaim={handleAddSpecificClaim}
        onTestPipeline={handleTestPipeline}
        onOpenDiffPanel={handleOpenDiffPanel}
        onTestDiffSystem={handleTestDiffSystem}
        onOpenFollowUp={handleDiffComplete}
        onTestVagueFollowUp={handleTestVagueFollowUp}
        onShowNodeHistory={handleShowNodeHistory}
        onCreateSnapshot={handleCreateSnapshot}
        onTestVersionHistory={handleTestVersionHistory}
        onExportCSV={exportToCSVFiles}
        pipelineResult={pipelineResult}
        isDiffOpen={isDiffOpen}
        isFollowUpOpen={isFollowUpOpen}
        hasFollowUpData={!!lastParsedInput && !!lastPipelineChanges}
        isTimeTraveling={isTimeTraveling}
      />
      
      {/* Diff Panel */}
      <DiffPanel />
      
      {/* Follow-up Questions Panel */}
      <FollowUpQuestionsPanel
        onSubmit={handleFollowUpSubmit}
        onClose={handleFollowUpClose}
      />
      
      {/* Node History Panel */}
      {showNodeHistory && selectedNode && (
        <NodeHistoryPanel
          nodeId={selectedNode.id}
          onClose={handleCloseNodeHistory}
          onRestore={handleRestoreVersion}
          onCompare={handleCompareVersions}
        />
      )}
      
      {/* Version Compare Modal */}
      {comparingVersions && (
        <VersionCompareModal
          nodeId={comparingVersions.nodeId}
          version1={comparingVersions.v1}
          version2={comparingVersions.v2}
          onClose={handleCloseCompare}
          onRestore={handleRestoreVersion}
        />
      )}
      
      {/* Time Travel Banner */}
      {isTimeTraveling && (
        <TimeTravelBanner
          onPrevious={handleTimeTravelPrevious}
          onNext={handleTimeTravelNext}
          onReturnToPresent={returnToPresent}
        />
      )}
      
      {/* Graph Timeline */}
      {showTimeline && (
        <GraphTimeline onNavigate={handleTimelineNavigate} />
      )}
      
      {/* Label toggle hint */}
      <div style={{
        position: 'absolute',
        bottom: showTimeline ? 100 : 20,
        left: 20,
        fontSize: '12px',
        color: COLORS.text,
        opacity: 0.5,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'bottom 0.3s',
      }}>
        Press 'L' to toggle labels
      </div>
    </div>
  );
}

export default App;
