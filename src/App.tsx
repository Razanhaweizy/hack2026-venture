/**
 * Ideograph - Startup Idea Evaluation Tool
 * Main Application Component
 */

import { useEffect, useState } from 'react';
import { IdeographVisualization, COLORS } from './components/graph';
import { 
  useGraphStore, 
  createFreshGraph, 
  isSkeletonInitialized,
  useSkeletonProgress,
} from './store';
import type { GraphNode, FrameworkNode, ClaimNode } from './types/graph';
import { 
  processUserInputLocal,
  quickParseLocal,
  detectFrameworkRelevanceLocal,
} from './pipeline';

// =============================================================================
// SIDE PANEL COMPONENT
// =============================================================================

interface SidePanelProps {
  selectedNode: GraphNode | null;
  progress: { answered: number; total: number; percentage: number };
  onAddTestClaim: () => void;
  onAddSpecificClaim: () => void;
  onTestPipeline: () => void;
  pipelineResult: string | null;
}

function SidePanel({ selectedNode, progress, onAddTestClaim, onAddSpecificClaim, onTestPipeline, pipelineResult }: SidePanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '320px',
        height: '100%',
        background: 'rgba(251, 247, 240, 0.95)',
        borderLeft: `1px solid ${COLORS.taupe}`,
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: COLORS.text,
        overflowY: 'auto',
        boxSizing: 'border-box',
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
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#F3F4F6',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {pipelineResult}
          </div>
        )}
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
  
  // Store hooks
  const progress = useSkeletonProgress();
  
  // Initialize skeleton on mount
  useEffect(() => {
    if (!isSkeletonInitialized()) {
      createFreshGraph();
      console.log('Skeleton initialized');
    }
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
    let output = '=== PIPELINE TEST: Maria Example ===\n\n';
    
    output += `INPUT:\n"${testInput.substring(0, 100)}..."\n\n`;
    
    output += `--- PARSED STATEMENTS (${parsed.statements?.length || 0}) ---\n`;
    for (const stmt of parsed.statements || []) {
      output += `[${stmt.type}] "${stmt.text.substring(0, 50)}..."\n`;
      output += `  Confidence: ${stmt.confidence}%\n`;
      if (stmt.quantitative) {
        output += `  Value: ${stmt.quantitative.value} ${stmt.quantitative.unit}\n`;
      }
    }
    
    output += `\n--- FRAMEWORK MATCHES (${frameworkRelevance.length}) ---\n`;
    for (const r of frameworkRelevance.slice(0, 5)) {
      output += `${r.frameworkTitle}: ${(r.relevance * 100).toFixed(0)}%\n`;
    }
    
    output += `\n--- PROPOSED CHANGES (${result.changes.length}) ---\n`;
    for (const change of result.changes.slice(0, 5)) {
      output += `[${change.priority.toUpperCase()}] ${change.type}\n`;
      output += `  ${change.explanation.substring(0, 60)}...\n`;
    }
    
    output += `\nProcessing time: ${result.processingTimeMs}ms`;
    
    setPipelineResult(output);
    console.log('Pipeline test complete:', result);
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
        height: '100%',
      }}>
        <IdeographVisualization
          onNodeSelect={setSelectedNode}
          showLabels={showLabels}
        />
      </div>
      
      {/* Side Panel */}
      <SidePanel
        selectedNode={selectedNode}
        progress={progress}
        onAddTestClaim={handleAddTestClaim}
        onAddSpecificClaim={handleAddSpecificClaim}
        onTestPipeline={handleTestPipeline}
        pipelineResult={pipelineResult}
      />
      
      {/* Label toggle hint */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        fontSize: '12px',
        color: COLORS.text,
        opacity: 0.5,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        Press 'L' to toggle labels
      </div>
    </div>
  );
}

export default App;
