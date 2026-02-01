/**
 * Ideograph - Startup Idea Evaluation Tool
 * Main Application Component
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { IdeographVisualization, COLORS, Node2DView } from './components/graph';
import { DiffPanel } from './components/diff';
import { FollowUpQuestionsPanel } from './components/followup';
import {
  NodeHistoryPanel,
  VersionCompareModal,
  GraphTimeline,
  TimeTravelBanner,
} from './components/version';
import { GapAnalysisPanel } from './components/gaps';
import { OnboardingForm } from './components/onboarding';
import { PitchTraining } from './components/pitch';
import { PathBadge, PlaybookPanel, PathDetectionWizard } from './components/path';
import { 
  useGraphStore, 
  createFreshGraph, 
  isSkeletonInitialized,
  useSkeletonProgress,
  useDiffStore,
  useHighlightedNodes,
  useApiGraphStore,
} from './store';
import { api, ExtractionOperation } from './api';
import type { ProposedChange } from './pipeline/types';
import {
  useVersionStore,
  restoreNodeVersion,
  createSnapshotAfterChanges,
} from './version';
import type { GraphNode, GraphEdge, FrameworkNode, ClaimNode, PmfPath } from './types/graph';
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
// SEQUOIA BRAND STYLES
// =============================================================================

const SEQUOIA_STYLES = {
  // Typography
  fontSerif: '"Georgia", "Times New Roman", serif',
  fontSans: '"Inter", "Helvetica Neue", "Arial", sans-serif',
  
  // Colors
  colors: {
    bg: '#FBF7F0',
    bgCard: '#FFFFFF',
    text: '#1B1916',
    textSecondary: '#4A4640',
    textTertiary: '#8A857A',
    accent: '#007354',
    accentHover: '#005C43',
    accentLight: '#E6F2EE',
    border: '#D1CFC0',
    borderSubtle: '#E8E5DC',
  },
};

// =============================================================================
// SIDE PANEL COMPONENT - Sequoia Redesign
// =============================================================================

interface SidePanelProps {
  selectedNode: GraphNode | null;
  onShowNodeHistory: () => void;
  onView2D: () => void;
  onExtractFromInput: (text: string) => void;
  onOpenGapAnalysis: () => void;
  isDiffOpen: boolean;
  isTimeTraveling: boolean;
  isExtracting: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  pmfPath: PmfPath | null;
}

// =============================================================================
// PRIORITIZATION LOGIC
// =============================================================================

interface PriorityItem {
  id: string;
  title: string;
  category: string;
  reason: string;
  suggestedQuestion: string;
  urgency: 'high' | 'medium' | 'low';
  confidence?: number;
}

function analyzePriorities(nodes: GraphNode[], edges: GraphEdge[], pmfPath: PmfPath | null = null): PriorityItem[] {
  const priorities: PriorityItem[] = [];
  
  // Get framework nodes
  const frameworkNodes = nodes.filter(n => n.type === 'framework');
  const claimNodes = nodes.filter(n => n.type === 'claim');
  const evidenceNodes = nodes.filter(n => n.type === 'evidence');
  
  // Build connection map
  const nodeConnections = new Map<string, number>();
  const nodeIncoming = new Map<string, string[]>();
  
  edges.forEach(edge => {
    nodeConnections.set(edge.from, (nodeConnections.get(edge.from) || 0) + 1);
    nodeConnections.set(edge.to, (nodeConnections.get(edge.to) || 0) + 1);
    
    const incoming = nodeIncoming.get(edge.to) || [];
    incoming.push(edge.from);
    nodeIncoming.set(edge.to, incoming);
  });
  
  // Build text index for keyword search
  const allText = nodes.map(n => `${n.title} ${n.content}`).join(' ').toLowerCase();
  
  // PATH-SPECIFIC PRIORITIES (added first for emphasis)
  if (pmfPath === 'hair_on_fire') {
    // Check for competitor information
    const hasCompetitors = allText.includes('competitor') || allText.includes('competition') || allText.includes('vs ') || allText.includes('versus');
    if (!hasCompetitors) {
      priorities.push({
        id: 'hof-competitors',
        title: 'Map your competitors',
        category: '🔥 Hair on Fire',
        reason: 'Customers are comparing you to alternatives right now',
        suggestedQuestion: 'Who are the top 3 competitors customers compare you to?',
        urgency: 'high',
      });
    }
    
    // Check for differentiation
    const hasDifferentiation = allText.includes('different') || allText.includes('unique') || allText.includes('unfair advantage') || allText.includes('10x');
    if (!hasDifferentiation) {
      priorities.push({
        id: 'hof-differentiation',
        title: 'Define your differentiation',
        category: '🔥 Hair on Fire',
        reason: '"Better" isn\'t enough - what makes you fundamentally DIFFERENT?',
        suggestedQuestion: 'What can you do that competitors structurally cannot?',
        urgency: 'high',
      });
    }
    
    // Check for speed/shipping
    const hasSpeed = allText.includes('ship') || allText.includes('deploy') || allText.includes('iteration') || allText.includes('velocity');
    if (!hasSpeed) {
      priorities.push({
        id: 'hof-speed',
        title: 'Document your shipping speed',
        category: '🔥 Hair on Fire',
        reason: 'Speed wins in competitive markets',
        suggestedQuestion: 'How fast can you ship new features? What\'s your iteration cycle?',
        urgency: 'medium',
      });
    }
  } else if (pmfPath === 'hard_fact') {
    // Check for trigger event
    const hasTrigger = allText.includes('trigger') || allText.includes('breaking point') || allText.includes('when do they') || allText.includes('what makes them');
    if (!hasTrigger) {
      priorities.push({
        id: 'hf-trigger',
        title: 'Identify the trigger event',
        category: '📊 Hard Fact',
        reason: 'Customers won\'t move without a trigger',
        suggestedQuestion: 'What event/pain triggers customers to finally seek change?',
        urgency: 'high',
      });
    }
    
    // Check for workaround understanding
    const hasWorkaround = allText.includes('workaround') || allText.includes('spreadsheet') || allText.includes('manual') || allText.includes('currently use');
    if (!hasWorkaround) {
      priorities.push({
        id: 'hf-workaround',
        title: 'Document their workaround',
        category: '📊 Hard Fact',
        reason: 'Understanding their current process is key',
        suggestedQuestion: 'What workaround do they currently use? Walk through their process.',
        urgency: 'high',
      });
    }
    
    // Check for education strategy
    const hasEducation = allText.includes('educate') || allText.includes('content') || allText.includes('blog') || allText.includes('awareness');
    if (!hasEducation) {
      priorities.push({
        id: 'hf-education',
        title: 'Create education strategy',
        category: '📊 Hard Fact',
        reason: 'They don\'t know they need you yet',
        suggestedQuestion: 'How will you educate them about the problem?',
        urgency: 'medium',
      });
    }
  } else if (pmfPath === 'future_vision') {
    // Check for stepping stone
    const hasSteppingStone = allText.includes('stepping stone') || allText.includes('pit stop') || allText.includes('revenue now') || allText.includes('interim product');
    if (!hasSteppingStone) {
      priorities.push({
        id: 'fv-stepping-stone',
        title: 'Define your stepping stone',
        category: '🔮 Future Vision',
        reason: 'You need revenue while you build the vision',
        suggestedQuestion: 'What product makes money NOW while you build toward the vision?',
        urgency: 'high',
      });
    }
    
    // Check for true believers
    const hasBelievers = allText.includes('believer') || allText.includes('evangelist') || allText.includes('champion') || allText.includes('gets it');
    if (!hasBelievers) {
      priorities.push({
        id: 'fv-believers',
        title: 'Find your true believers',
        category: '🔮 Future Vision',
        reason: 'You need people who see what you see',
        suggestedQuestion: 'Who are the 10 people who truly believe in your vision? Why?',
        urgency: 'high',
      });
    }
    
    // Check for runway
    const hasRunway = allText.includes('runway') || allText.includes('months of cash') || allText.includes('funding') || allText.includes('burn rate');
    if (!hasRunway) {
      priorities.push({
        id: 'fv-runway',
        title: 'Document your runway',
        category: '🔮 Future Vision',
        reason: 'Survival is the game - how long can you last?',
        suggestedQuestion: 'How many months of runway do you have? What extends it?',
        urgency: 'high',
      });
    }
  }
  
  // GENERAL PRIORITIES (existing logic)
  
  // 1. Find framework areas with no evidence
  frameworkNodes.forEach(fw => {
    const connections = nodeConnections.get(fw.id) || 0;
    const incoming = nodeIncoming.get(fw.id) || [];
    const hasEvidence = incoming.some(id => {
      const node = nodes.find(n => n.id === id);
      return node?.type === 'evidence' || node?.type === 'claim';
    });
    
    if (!hasEvidence || connections < 2) {
      priorities.push({
        id: fw.id,
        title: fw.title,
        category: 'Missing Validation',
        reason: `No supporting evidence yet`,
        suggestedQuestion: `What customer feedback or data supports your ${fw.title.toLowerCase()}?`,
        urgency: 'high',
      });
    }
  });
  
  // 2. Find low confidence claims
  claimNodes.forEach(claim => {
    if (claim.confidence < 50) {
      const n = claim.confidence / 100;
      const bandLabel = n >= 0.35 ? 'Weak evidence' : 'Assumption';
      priorities.push({
        id: claim.id,
        title: claim.title,
        category: 'Needs Evidence',
        reason: bandLabel,
        suggestedQuestion: `What evidence can validate: "${claim.title}"?`,
        urgency: claim.confidence < 30 ? 'high' : 'medium',
        confidence: claim.confidence,
      });
    }
  });
  
  // 3. Find isolated nodes (no connections)
  nodes.forEach(node => {
    if (node.type !== 'framework' && node.type !== 'startup_meta') {
      const connections = nodeConnections.get(node.id) || 0;
      if (connections === 0) {
        priorities.push({
          id: node.id,
          title: node.title,
          category: 'Unconnected',
          reason: `Not linked to any framework`,
          suggestedQuestion: `How does "${node.title}" relate to your core value proposition?`,
          urgency: 'medium',
        });
      }
    }
  });
  
  // 4. Check for key missing areas based on framework
  const frameworkTitles = frameworkNodes.map(f => f.title.toLowerCase());
  const keyAreas = [
    { name: 'Problem', question: 'What specific problem are you solving and for whom?' },
    { name: 'Solution', question: 'What is your unique solution approach?' },
    { name: 'Market', question: 'How big is your target market and who are your early adopters?' },
    { name: 'Competition', question: 'Who are your direct and indirect competitors?' },
    { name: 'Business Model', question: 'How will you make money and what are your unit economics?' },
    { name: 'Traction', question: 'What early traction or validation do you have?' },
  ];
  
  keyAreas.forEach(area => {
    const hasArea = frameworkTitles.some(t => 
      t.includes(area.name.toLowerCase()) || 
      area.name.toLowerCase().includes(t)
    );
    const hasRelatedClaims = claimNodes.some(c => 
      c.title.toLowerCase().includes(area.name.toLowerCase())
    );
    
    if (!hasArea && !hasRelatedClaims) {
      priorities.push({
        id: `missing-${area.name.toLowerCase()}`,
        title: area.name,
        category: 'Missing Area',
        reason: `No information about ${area.name.toLowerCase()}`,
        suggestedQuestion: area.question,
        urgency: 'high',
      });
    }
  });
  
  // Sort by urgency (path-specific items will be at top since they were added first)
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  priorities.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  
  // Return top 5
  return priorities.slice(0, 5);
}

function SidePanel({ selectedNode, onShowNodeHistory, onView2D, onExtractFromInput, onOpenGapAnalysis, isDiffOpen, isTimeTraveling, isExtracting, nodes, edges, pmfPath }: SidePanelProps) {
  const [inputText, setInputText] = useState('');
  const [isPrioritiesExpanded, setIsPrioritiesExpanded] = useState(true);
  const S = SEQUOIA_STYLES;
  
  // Calculate priorities based on current graph and PMF path
  const priorities = useMemo(() => analyzePriorities(nodes, edges, pmfPath), [nodes, edges, pmfPath]);
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '340px',
        height: '100%',
        background: S.colors.bg,
        borderLeft: `1px solid ${S.colors.borderSubtle}`,
        fontFamily: S.fontSans,
        color: S.colors.text,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '32px 28px 24px',
        borderBottom: `1px solid ${S.colors.borderSubtle}`,
      }}>
        <h1 style={{ 
          fontFamily: S.fontSerif,
          fontSize: '28px',
          fontWeight: 400,
          letterSpacing: '0.02em',
          marginBottom: '4px',
          color: S.colors.text,
        }}>
          Ideograph
        </h1>
        <p style={{ 
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: S.colors.textTertiary,
        }}>
          Startup Validation
        </p>
      </div>
      
      {/* Scrollable Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '24px 28px',
      }}>
        {/* Input Section */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block',
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: S.colors.textTertiary,
            marginBottom: '12px',
          }}>
            Add Information
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your customer interviews, market insights, or product hypotheses..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '14px 16px',
              borderRadius: '6px',
              border: `1px solid ${S.colors.border}`,
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: S.fontSans,
              color: S.colors.text,
              background: S.colors.bgCard,
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = S.colors.accent;
              e.target.style.boxShadow = `0 0 0 3px ${S.colors.accent}15`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = S.colors.border;
              e.target.style.boxShadow = 'none';
            }}
            disabled={isExtracting}
          />
          <button
            onClick={() => {
              if (inputText.trim()) {
                onExtractFromInput(inputText);
              }
            }}
            disabled={!inputText.trim() || isExtracting || isDiffOpen}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '14px 20px',
              background: (!inputText.trim() || isExtracting || isDiffOpen) 
                ? S.colors.borderSubtle 
                : S.colors.accent,
              color: (!inputText.trim() || isExtracting || isDiffOpen) 
                ? S.colors.textTertiary 
                : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: (!inputText.trim() || isExtracting || isDiffOpen) 
                ? 'not-allowed' 
                : 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (inputText.trim() && !isExtracting && !isDiffOpen) {
                e.currentTarget.style.background = S.colors.accentHover;
              }
            }}
            onMouseLeave={(e) => {
              if (inputText.trim() && !isExtracting && !isDiffOpen) {
                e.currentTarget.style.background = S.colors.accent;
              }
            }}
          >
            {isExtracting ? 'Analyzing...' : 'Extract & Review'}
          </button>
          {isDiffOpen && (
            <p style={{ 
              fontSize: '11px', 
              color: S.colors.textTertiary, 
              marginTop: '8px',
              textAlign: 'center',
            }}>
              Close the review panel to add more
            </p>
          )}
        </div>
        
        {/* Gap Analysis Link */}
        <div style={{ 
          marginBottom: '24px',
        }}>
          <button
            onClick={onOpenGapAnalysis}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'transparent',
              color: S.colors.text,
              border: `1px solid ${S.colors.border}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = S.colors.bgCard;
              e.currentTarget.style.borderColor = S.colors.accent;
              e.currentTarget.style.color = S.colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = S.colors.border;
              e.currentTarget.style.color = S.colors.text;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            View Gap Analysis
          </button>
        </div>
        
        {/* Prioritization Panel */}
        <div style={{ 
          marginBottom: '32px',
          paddingBottom: '32px',
          borderBottom: `1px solid ${S.colors.borderSubtle}`,
        }}>
          <button
            onClick={() => setIsPrioritiesExpanded(!isPrioritiesExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginBottom: isPrioritiesExpanded ? '16px' : 0,
            }}
          >
            <label style={{ 
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: S.colors.textTertiary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              Focus Next
              {priorities.length > 0 && (
                <span style={{
                  background: S.colors.accent,
                  color: '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '10px',
                }}>
                  {priorities.length}
                </span>
              )}
            </label>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={S.colors.textTertiary} 
              strokeWidth="2"
              style={{
                transform: isPrioritiesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          {isPrioritiesExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {priorities.length === 0 ? (
                <div style={{
                  padding: '20px 16px',
                  textAlign: 'center',
                  borderRadius: '6px',
                  border: `1px dashed ${S.colors.border}`,
                }}>
                  <p style={{ 
                    fontSize: '12px', 
                    color: S.colors.textTertiary,
                    margin: 0,
                  }}>
                    Add more data to see priorities
                  </p>
                </div>
              ) : (
                priorities.map((priority, index) => (
                  <div
                    key={priority.id}
                    style={{
                      padding: '14px 0',
                      borderBottom: index < priorities.length - 1 ? `1px solid ${S.colors.borderSubtle}` : 'none',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '8px',
                    }}>
                      {/* Priority Number */}
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: priority.urgency === 'high' ? '#D4442E' :
                                    priority.urgency === 'medium' ? '#E5A826' :
                                    S.colors.accent,
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {index + 1}
                      </span>
                      
                      {/* Category */}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: S.colors.textTertiary,
                      }}>
                        {priority.category}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h4 style={{
                      fontFamily: S.fontSerif,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: S.colors.text,
                      margin: '0 0 4px 28px',
                      lineHeight: 1.4,
                      letterSpacing: '0.01em',
                    }}>
                      {priority.title}
                    </h4>
                    
                    {/* Reason */}
                    <p style={{
                      fontSize: '11px',
                      color: S.colors.textTertiary,
                      margin: '0 0 10px 28px',
                      lineHeight: 1.4,
                    }}>
                      {priority.reason}
                    </p>
                    
                    {/* Suggested Question - Minimal */}
                    <div style={{
                      marginLeft: '28px',
                      paddingLeft: '12px',
                      borderLeft: `2px solid ${S.colors.accent}`,
                    }}>
                      <p style={{
                        fontSize: '11px',
                        color: S.colors.textSecondary,
                        margin: 0,
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}>
                        {priority.suggestedQuestion}
                      </p>
                    </div>
                    
                    {/* Evidence quality indicator if available */}
                    {priority.confidence !== undefined && (() => {
                      const normalized = priority.confidence / 100;
                      const band = normalized >= 0.75 
                        ? { label: 'Strong evidence', color: '#007354' }
                        : normalized >= 0.55 
                        ? { label: 'Some evidence', color: '#E5A826' }
                        : normalized >= 0.35 
                        ? { label: 'Weak evidence', color: '#FB923C' }
                        : { label: 'Assumption', color: '#D4442E' };
                      return (
                        <div style={{
                          marginTop: '10px',
                          marginLeft: '28px',
                        }}>
                          <span style={{
                            fontSize: '10px',
                            color: band.color,
                            padding: '2px 6px',
                            background: `${band.color}15`,
                            borderRadius: '3px',
                          }}>
                            {band.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Selected Node Details */}
        <div>
          <label style={{ 
            display: 'block',
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: S.colors.textTertiary,
            marginBottom: '12px',
          }}>
            Selected
          </label>
          
          {selectedNode ? (
            <div style={{
              background: S.colors.bgCard,
              borderRadius: '6px',
              border: `1px solid ${S.colors.borderSubtle}`,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {/* Card Header with Type Badge */}
              <div style={{
                padding: '16px 18px 14px',
                borderBottom: `1px solid ${S.colors.borderSubtle}`,
                background: `linear-gradient(to bottom, ${S.colors.bgCard}, ${S.colors.bg}15)`,
              }}>
                <div style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '9px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: getNodeTypeColor(selectedNode),
                  background: `${getNodeTypeColor(selectedNode)}10`,
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${getNodeTypeColor(selectedNode)}20`,
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: getNodeTypeColor(selectedNode),
                  }} />
                  {selectedNode.type}
                </div>
              </div>
              
              {/* Card Body */}
              <div style={{ padding: '18px' }}>
                {/* Title */}
                <h3 style={{ 
                  fontFamily: S.fontSerif,
                  fontSize: '17px',
                  fontWeight: 400,
                  lineHeight: 1.35,
                  letterSpacing: '0.01em',
                  marginBottom: '10px',
                  color: S.colors.text,
                }}>
                  {selectedNode.title}
                </h3>
                
                {/* Content */}
                {selectedNode.content && (
                  <p style={{ 
                    fontSize: '12px', 
                    lineHeight: 1.65,
                    color: S.colors.textSecondary,
                    marginBottom: '14px',
                  }}>
                    {selectedNode.content}
                  </p>
                )}
                
                {/* Framework Description */}
                {selectedNode.type === 'framework' && (selectedNode as FrameworkNode).description && (
                  <div style={{
                    padding: '12px 14px',
                    background: S.colors.bg,
                    borderRadius: '4px',
                    marginBottom: '14px',
                    borderLeft: `3px solid ${S.colors.border}`,
                  }}>
                    <p style={{ 
                      fontSize: '11px', 
                      fontStyle: 'italic',
                      color: S.colors.textTertiary,
                      lineHeight: 1.55,
                      margin: 0,
                    }}>
                      {(selectedNode as FrameworkNode).description}
                    </p>
                  </div>
                )}
                
                {/* Confidence Meter */}
                <div style={{
                  padding: '14px 0 0',
                  borderTop: `1px solid ${S.colors.borderSubtle}`,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: S.colors.textTertiary,
                    }}>
                      Confidence
                    </span>
                    {(() => {
                      const normalized = selectedNode.confidence / 100;
                      const band = normalized >= 0.75 
                        ? { label: 'Strong evidence', color: '#007354' }
                        : normalized >= 0.55 
                        ? { label: 'Some evidence', color: '#E5A826' }
                        : normalized >= 0.35 
                        ? { label: 'Weak evidence', color: '#FB923C' }
                        : { label: 'Assumption', color: '#D4442E' };
                      return (
                        <span style={{ 
                          fontSize: '12px', 
                          color: band.color, 
                          fontWeight: 600,
                          fontFamily: S.fontSans,
                          padding: '3px 8px',
                          background: `${band.color}15`,
                          borderRadius: '4px',
                        }}>
                          {band.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Card Footer with Action Buttons */}
              <div style={{
                padding: '14px 18px 16px',
                borderTop: `1px solid ${S.colors.borderSubtle}`,
                background: S.colors.bg,
                display: 'flex',
                gap: '10px',
              }}>
                {/* View 2D Button */}
                <button
                  onClick={onView2D}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    background: S.colors.accent,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    transition: 'all 150ms ease',
                    boxShadow: '0 1px 2px rgba(0,115,84,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = S.colors.accentHover;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,115,84,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = S.colors.accent;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,115,84,0.2)';
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="2" x2="12" y2="5"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/>
                    <line x1="19" y1="12" x2="22" y2="12"/>
                  </svg>
                  View
                </button>
                
                {/* History Button */}
                <button
                  onClick={onShowNodeHistory}
                  disabled={isTimeTraveling}
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    background: S.colors.bgCard,
                    color: isTimeTraveling ? S.colors.textTertiary : S.colors.textSecondary,
                    border: `1px solid ${S.colors.border}`,
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    cursor: isTimeTraveling ? 'not-allowed' : 'pointer',
                    opacity: isTimeTraveling ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTimeTraveling) {
                      e.currentTarget.style.borderColor = S.colors.textTertiary;
                      e.currentTarget.style.color = S.colors.text;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = S.colors.border;
                    e.currentTarget.style.color = isTimeTraveling ? S.colors.textTertiary : S.colors.textSecondary;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  History
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 20px',
              background: S.colors.bgCard,
              borderRadius: '6px',
              border: `1px dashed ${S.colors.border}`,
              textAlign: 'center',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 12px',
                background: S.colors.bg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={S.colors.textTertiary} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: S.colors.textTertiary,
                lineHeight: 1.5,
                margin: 0,
              }}>
                Click a node to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getNodeTypeColor(node: GraphNode): string {
  switch (node.type) {
    case 'framework': return SEQUOIA_STYLES.colors.textTertiary;
    case 'claim': return SEQUOIA_STYLES.colors.accent;
    case 'fact': return SEQUOIA_STYLES.colors.text;
    case 'evidence': return '#4A7C8C';
    default: return SEQUOIA_STYLES.colors.text;
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
  const apiGraphStore = useApiGraphStore();
  const apiNodes = useMemo(() => Array.from(apiGraphStore.nodes.values()), [apiGraphStore.nodes]);
  const apiEdges = useMemo(() => Array.from(apiGraphStore.edges.values()), [apiGraphStore.edges]);
  
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
  
  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastExtractionOperations, setLastExtractionOperations] = useState<ExtractionOperation[]>([]);
  
  // Gap analysis state
  const [isGapAnalysisOpen, setIsGapAnalysisOpen] = useState(false);
  
  // Version dropdown state
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  
  // 2D Node view state
  const [isNode2DViewOpen, setIsNode2DViewOpen] = useState(false);
  
  // Menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true); // Default to true since it's marked as done
  const [selectedPmfPath, setSelectedPmfPath] = useState<PmfPath | null>(null);
  const [showPlaybookPanel, setShowPlaybookPanel] = useState(false);
  const [showPathWizard, setShowPathWizard] = useState(false);
  
  // Pitch Training state
  const [showPitchTraining, setShowPitchTraining] = useState(false);
  
  // Initialize from backend API on mount
  useEffect(() => {
    async function init() {
      try {
        // Initialize from backend API
        await useApiGraphStore.getState().initialize();
        console.log('Graph initialized from backend API');
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize from backend:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load graph data');
        
        // Fallback to local skeleton
        if (!isSkeletonInitialized()) {
          createFreshGraph();
          console.log('Fallback: Skeleton initialized locally');
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
  
  // Handler to extract from user input using the backend AI agent
  const handleExtractFromInput = useCallback(async (text: string) => {
    setIsExtracting(true);
    setPipelineResult(null);
    
    try {
      console.log('[Extraction] Starting extraction for:', text.substring(0, 50) + '...');
      
      const response = await api.extractFromText(text, false); // Don't apply yet, preview first
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        throw new Error('No data returned from extraction');
      }
      
      const { operations, reasoning, raw_nodes, followup_questions, followup_summary } = response.data;
      
      console.log(`[Extraction] Got ${operations.length} operations, ${raw_nodes.length} nodes, ${followup_questions?.length || 0} questions`);
      
      // Store operations for later
      setLastExtractionOperations(operations);
      
      // Convert to ProposedChange format for the Diff system
      const proposedChanges: ProposedChange[] = [];
      
      // Add extracted nodes as ADD changes
      for (const op of operations) {
        if (op.op === 'add_node' && op.node) {
          const nodeOp = op.node;
          
          // Find edges that connect to this node
          const connectedEdges = operations
            .filter(e => e.op === 'add_edge' && e.edge?.source_id === nodeOp.id)
            .map(e => e.edge!);
          
          proposedChanges.push({
            id: nodeOp.id,
            type: 'ADD',
            priority: nodeOp.confidence >= 70 ? 'high' : nodeOp.confidence >= 40 ? 'medium' : 'low',
            newNode: {
              type: nodeOp.type as 'claim' | 'fact' | 'evidence',
              title: nodeOp.title || nodeOp.label,
              content: nodeOp.content,
              confidence: nodeOp.confidence,
            },
            connectTo: connectedEdges.map(edge => ({
              nodeId: edge.target_id,
              edgeType: edge.type as 'supports' | 'contradicts' | 'informs' | 'depends_on' | 'blocks' | 'requires',
            })),
            sourceText: text,
            explanation: `Extracted ${nodeOp.type}: "${nodeOp.title || nodeOp.label}"${nodeOp.source ? ` (source: ${nodeOp.source})` : ''}`,
            timestamp: new Date(),
          });
        }
      }
      
      // Add follow-up questions as SUGGEST changes
      if (followup_questions && followup_questions.length > 0) {
        for (const question of followup_questions) {
          const questionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          proposedChanges.push({
            id: questionId,
            type: 'SUGGEST',
            priority: question.type === 'risk' ? 'high' : question.type === 'validation' ? 'medium' : 'low',
            suggestion: question.question,
            rationale: `[${question.type.toUpperCase()}] ${question.context}`,
            // Store additional data in sourceText for later use
            sourceText: JSON.stringify({
              questionType: question.type,
              targetsNode: question.targets_node,
              frameworkCategory: question.framework_category,
            }),
            explanation: `Follow-up question to ${question.type} your assumptions`,
            timestamp: new Date(),
          });
        }
      }
      
      // Build summary for display
      let summary = `=== AI EXTRACTION ===\n\n`;
      summary += `Found ${raw_nodes.length} nodes:\n`;
      for (const node of raw_nodes) {
        const n = node.confidence / 100;
        const band = n >= 0.75 ? 'Strong' : n >= 0.55 ? 'Some' : n >= 0.35 ? 'Weak' : 'Assumption';
        summary += `• [${node.type.toUpperCase()}] ${node.label} (${band} evidence)\n`;
      }
      summary += `\nReasoning: ${reasoning}`;
      
      if (followup_questions && followup_questions.length > 0) {
        summary += `\n\n=== FOLLOW-UP QUESTIONS (${followup_questions.length}) ===\n`;
        for (const q of followup_questions) {
          summary += `• [${q.type.toUpperCase()}] ${q.question}\n`;
        }
        if (followup_summary) {
          summary += `\n${followup_summary}`;
        }
      }
      
      setPipelineResult(summary);
      setLastPipelineChanges({ changes: proposedChanges } as any);
      setLastParsedInput({ rawText: text } as any);
      
      // Open the diff panel to review
      if (proposedChanges.length > 0) {
        openDiff(text, proposedChanges);
      } else {
        setPipelineResult(summary + '\n\n⚠️ No actionable changes extracted. Try providing more specific details.');
      }
      
    } catch (err) {
      console.error('[Extraction] Error:', err);
      setPipelineResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  }, [openDiff]);
  
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
      const n = stmt.confidence / 100;
      const band = n >= 0.75 ? 'Strong' : n >= 0.55 ? 'Some' : n >= 0.35 ? 'Weak' : 'Assumption';
      output += `[${stmt.type.toUpperCase()}] "${stmt.text.substring(0, 45)}..."\n`;
      output += `  Source: ${stmt.source || 'none'}, Evidence: ${band}\n`;
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
  
  // Handler to show 2D view of node and its connections
  const handleView2D = useCallback(() => {
    if (selectedNode) {
      setIsNode2DViewOpen(true);
    }
  }, [selectedNode]);
  
  // Handler for onboarding completion
  // Handler to process each onboarding answer with AI
  const handleProcessAnswer = useCallback(async (questionLabel: string, answer: string) => {
    if (!answer.trim()) return;
    
    // Format the text with context for the AI
    const contextualText = `[Onboarding - ${questionLabel}]\n${answer}`;
    
    console.log('Processing onboarding answer:', questionLabel);
    
    try {
      // Extract and apply to graph (no refresh yet - we'll do one final refresh at the end)
      await api.extractFromText(contextualText, true);
    } catch (err) {
      console.error('Failed to process onboarding answer:', err);
      throw err; // Re-throw so the form can show error state
    }
  }, []);
  
  // Handler for onboarding completion
  const handleOnboardingComplete = useCallback(async (answers: Record<string, string>, pmfPath: PmfPath | null) => {
    console.log('Onboarding completed with answers:', answers, 'Path:', pmfPath);
    setOnboardingComplete(true);
    setShowOnboarding(false);
    
    // Store the PMF path
    if (pmfPath) {
      setSelectedPmfPath(pmfPath);
    }
    
    // Final graph refresh to show all processed nodes
    try {
      await useApiGraphStore.getState().refresh();
    } catch (err) {
      console.error('Failed to refresh graph after onboarding:', err);
    }
  }, []);
  
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
  
  // Handler for reverting to a specific version from dropdown
  const handleRevertToVersion = useCallback((snapshotId: string) => {
    travelToSnapshot(snapshotId);
    setIsVersionDropdownOpen(false);
  }, [travelToSnapshot]);
  
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
  
  // Toggle labels with 'L' key and save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        setShowLabels(prev => !prev);
      }
      // Ctrl+S or Cmd+S to save snapshot
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        handleCreateSnapshot();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const S = SEQUOIA_STYLES;
  
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
        background: S.colors.bg,
        fontFamily: S.fontSerif,
      }}>
        <h1 style={{ 
          fontSize: '36px',
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: S.colors.text,
          marginBottom: '12px',
        }}>
          Ideograph
        </h1>
        <p style={{ 
          fontFamily: S.fontSans,
          fontSize: '12px',
          color: S.colors.textTertiary,
          letterSpacing: '0.05em',
        }}>
          Loading...
        </p>
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
      background: S.colors.bg,
    }}>
      {/* Top Navigation Bar - Minimal */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: '340px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
        pointerEvents: 'none',
      }}>
        {/* Left - Menu Icon with Dropdown */}
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isMenuOpen ? S.colors.borderSubtle : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              opacity: isMenuOpen ? 1 : 0.4,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => { if (!isMenuOpen) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { if (!isMenuOpen) e.currentTarget.style.opacity = '0.4'; }}
            title="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={S.colors.text} strokeWidth="1.5">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          
          {/* Menu Dropdown */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 99,
                }}
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Dropdown Panel */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  minWidth: '220px',
                  background: S.colors.bgCard,
                  border: `1px solid ${S.colors.borderSubtle}`,
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  zIndex: 100,
                  fontFamily: S.fontSans,
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '14px 16px 12px',
                  borderBottom: `1px solid ${S.colors.borderSubtle}`,
                }}>
                  <h3 style={{
                    fontFamily: S.fontSerif,
                    fontSize: '14px',
                    fontWeight: 400,
                    color: S.colors.text,
                    margin: 0,
                    letterSpacing: '0.01em',
                  }}>
                    Progress
                  </h3>
                </div>
                
                {/* Checklist Items */}
                <div style={{ padding: '8px 0' }}>
                  {/* Onboarding - Clickable */}
                  <div
                    onClick={() => {
                      setShowOnboarding(true);
                      setIsMenuOpen(false);
                    }}
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      background: onboardingComplete ? S.colors.accent : 'transparent',
                      border: onboardingComplete ? 'none' : `2px solid ${S.colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {onboardingComplete && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.text,
                    }}>
                      Onboarding
                    </span>
                    {onboardingComplete && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: S.colors.accent,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Done
                      </span>
                    )}
                  </div>
                  
                  {/* Problem Discovery - In Progress */}
                  <div
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      background: `${S.colors.accent}20`,
                      border: `2px solid ${S.colors.accent}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        background: S.colors.accent,
                      }} />
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.text,
                    }}>
                      Problem Discovery
                    </span>
                  </div>
                  
                  {/* Market Validation - Not Started */}
                  <div
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `2px solid ${S.colors.border}`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.textSecondary,
                    }}>
                      Market Validation
                    </span>
                  </div>
                  
                  {/* Solution Definition - Not Started */}
                  <div
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `2px solid ${S.colors.border}`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.textSecondary,
                    }}>
                      Solution Definition
                    </span>
                  </div>
                  
                  {/* Go-to-Market - Not Started */}
                  <div
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: `2px solid ${S.colors.border}`,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: S.colors.textSecondary,
                    }}>
                      Go-to-Market
                    </span>
                  </div>
                </div>
                
                {/* Footer */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: `1px solid ${S.colors.borderSubtle}`,
                  background: S.colors.bg,
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: S.colors.textTertiary,
                    }}>
                      1 of 5 complete
                    </span>
                    <div style={{
                      width: '60px',
                      height: '4px',
                      background: S.colors.borderSubtle,
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '20%',
                        height: '100%',
                        background: S.colors.accent,
                        borderRadius: '2px',
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Right - Search Icon */}
        <button
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.4,
            pointerEvents: 'auto',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
          title="Search"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={S.colors.text} strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>
      
      {/* 3D Visualization */}
      <div style={{ 
        width: 'calc(100% - 340px)', 
        height: '100%',
        position: 'relative',
      }}>
        <IdeographVisualization
          onNodeSelect={setSelectedNode}
          showLabels={showLabels}
          highlightedNodes={highlightedNodes}
        />
        
        {/* PMF Path Badge - Top Right */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 150,
          }}
        >
          <PathBadge
            path={selectedPmfPath}
            hasBlockers={false}
            hasWarnings={false}
            onClick={() => selectedPmfPath ? setShowPlaybookPanel(true) : setShowPathWizard(true)}
          />
        </div>
        
        {/* Version Dropdown - Top Center */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
          }}
        >
          <button
            onClick={() => setIsVersionDropdownOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: S.fontSans,
              fontSize: '11px',
              fontWeight: 500,
              color: S.colors.text,
              opacity: isVersionDropdownOpen ? 0.8 : 0.4,
              transition: 'opacity 150ms ease',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => { if (!isVersionDropdownOpen) e.currentTarget.style.opacity = '0.4'; }}
            title="Version history"
          >
            <span style={{ fontWeight: 600 }}>V</span>
            <span>{snapshots.length}</span>
            <svg 
              width="10" 
              height="10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ 
                marginLeft: '2px',
                transform: isVersionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {isVersionDropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: -1,
                }}
                onClick={() => setIsVersionDropdownOpen(false)}
              />
              
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '4px',
                  minWidth: '200px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: S.colors.bgCard,
                  border: `1px solid ${S.colors.borderSubtle}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontFamily: S.fontSans,
                }}
              >
                {/* Save New Version Button */}
                <button
                  onClick={() => {
                    handleCreateSnapshot();
                    setIsVersionDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${S.colors.borderSubtle}`,
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: S.colors.accent,
                    textAlign: 'left',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Save new version
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '10px', 
                    color: S.colors.textTertiary,
                    fontWeight: 400,
                  }}>
                    ⌘S
                  </span>
                </button>
                
                {/* Version List */}
                {snapshots.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: S.colors.textTertiary,
                  }}>
                    No saved versions yet
                  </div>
                ) : (
                  <>
                    {/* Current / Present */}
                    {isTimeTraveling && (
                      <button
                        onClick={() => {
                          returnToPresent();
                          setIsVersionDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '2px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${S.colors.borderSubtle}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 100ms ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = S.colors.bg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 500, 
                          color: S.colors.accent,
                        }}>
                          ← Return to Present
                        </span>
                      </button>
                    )}
                    
                    {/* Snapshots in reverse order (newest first) */}
                    {[...snapshots].reverse().map((snapshot, index) => {
                      const versionNum = snapshots.length - index;
                      const isActive = useVersionStore.getState().currentSnapshotId === snapshot.snapshotId;
                      
                      return (
                        <button
                          key={snapshot.snapshotId}
                          onClick={() => handleRevertToVersion(snapshot.snapshotId)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '2px',
                            background: isActive ? S.colors.bg : 'transparent',
                            border: 'none',
                            borderBottom: index < snapshots.length - 1 ? `1px solid ${S.colors.borderSubtle}` : 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 100ms ease',
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = S.colors.bg; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            width: '100%',
                          }}>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: isActive ? S.colors.accent : S.colors.text,
                            }}>
                              V{versionNum}
                            </span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: S.colors.textTertiary,
                            }}>
                              {snapshot.description || 'Snapshot'}
                            </span>
                            {isActive && (
                              <span style={{
                                marginLeft: 'auto',
                                fontSize: '9px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: S.colors.accent,
                                background: `${S.colors.accent}15`,
                                padding: '2px 6px',
                                borderRadius: '3px',
                              }}>
                                Active
                              </span>
                            )}
                          </div>
                          <span style={{ 
                            fontSize: '10px', 
                            color: S.colors.textTertiary,
                          }}>
                            {snapshot.timestamp.toLocaleString()} • {snapshot.nodes.length} nodes
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Side Panel */}
      <SidePanel
        selectedNode={selectedNode}
        onShowNodeHistory={handleShowNodeHistory}
        onView2D={handleView2D}
        onExtractFromInput={handleExtractFromInput}
        onOpenGapAnalysis={() => setIsGapAnalysisOpen(true)}
        isDiffOpen={isDiffOpen}
        isTimeTraveling={isTimeTraveling}
        isExtracting={isExtracting}
        nodes={apiNodes}
        edges={apiEdges}
        pmfPath={selectedPmfPath}
      />
      
      {/* Diff Panel */}
      <DiffPanel />
      
      {/* Follow-up Questions Panel */}
      <FollowUpQuestionsPanel
        onSubmit={handleFollowUpSubmit}
        onClose={handleFollowUpClose}
      />
      
      {/* Gap Analysis Panel */}
      <GapAnalysisPanel
        isOpen={isGapAnalysisOpen}
        onClose={() => setIsGapAnalysisOpen(false)}
      />
      
      {/* 2D Node View */}
      {selectedNode && (
        <Node2DView
          node={selectedNode}
          isOpen={isNode2DViewOpen}
          onClose={() => setIsNode2DViewOpen(false)}
        />
      )}
      
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
      
      {/* Instructional Overlay - Sequoia Style */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: 0,
        right: '340px',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: S.fontSans,
          fontSize: '10px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: S.colors.text,
          opacity: 0.2,
        }}>
          Drag to rotate • Scroll to zoom • Click to select
        </span>
      </div>
      
      {/* Onboarding Form */}
      {showOnboarding && (
        <OnboardingForm 
          onComplete={handleOnboardingComplete} 
          onProcessAnswer={handleProcessAnswer}
          onPathSelected={(path) => setSelectedPmfPath(path)}
        />
      )}
      
      {/* Pitch Training */}
      <PitchTraining 
        isOpen={showPitchTraining} 
        onClose={() => setShowPitchTraining(false)} 
      />
      
      {/* PMF Path Playbook Panel */}
      {selectedPmfPath && (
        <PlaybookPanel
          path={selectedPmfPath}
          playbook={null}
          blockers={[]}
          warnings={[]}
          isOpen={showPlaybookPanel}
          onClose={() => setShowPlaybookPanel(false)}
        />
      )}
      
      {/* Path Detection Wizard */}
      <PathDetectionWizard
        isOpen={showPathWizard}
        onClose={() => setShowPathWizard(false)}
        onPathSelected={(path, confidence) => {
          setSelectedPmfPath(path);
          setShowPathWizard(false);
        }}
      />
      
      {/* Pitch Training Bubble Button - Bottom Left */}
      {!showOnboarding && !showPitchTraining && (
        <button
          onClick={() => setShowPitchTraining(true)}
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '32px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${S.colors.accent} 0%, #005C43 100%)`,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,115,84,0.35)',
            transition: 'all 200ms ease',
            zIndex: 100,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,115,84,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,115,84,0.35)';
          }}
          title="Practice your elevator pitch"
        >
          {/* Microphone icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
