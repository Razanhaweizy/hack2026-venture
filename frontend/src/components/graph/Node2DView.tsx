/**
 * Node2DView Component
 * Displays a 2D visualization of a node and its connected children
 * Styled to match Sequoia Capital brand identity
 */

import { useMemo, useState, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '../../types/graph';
import { useApiGraphStore } from '../../store/apiGraphStore';
import { getConfidenceEdgeColor } from './constants';

// =============================================================================
// SEQUOIA BRAND STYLES
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
    overlay: 'rgba(27, 25, 22, 0.4)',
  },
};

// Node type colors matching Sequoia palette
function getNodeColor(type: string): string {
  switch (type) {
    case 'framework': return S.colors.textTertiary;
    case 'claim': return S.colors.accent;
    case 'fact': return S.colors.text;
    case 'evidence': return '#4A7C8C';
    default: return S.colors.textTertiary;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface Node2DViewProps {
  node: GraphNode;
  isOpen: boolean;
  onClose: () => void;
}

interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
}

interface PositionedEdge {
  edge: GraphEdge;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  sourceConfidence: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Node2DView({ node, isOpen, onClose }: Node2DViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Get connected nodes from store
  const getConnectedNodes = useApiGraphStore((state) => state.getConnectedNodes);
  
  // Calculate layout for the node and its children
  const { positionedNodes, positionedEdges } = useMemo(() => {
    const connected = getConnectedNodes(node.id);
    const nodes: PositionedNode[] = [];
    const edges: PositionedEdge[] = [];
    
    // Canvas dimensions
    const width = 640;
    const height = 480;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Position the main node in the center
    nodes.push({ node, x: centerX, y: centerY });
    
    // Position connected nodes in a circle around the center
    const radius = Math.min(width, height) * 0.35;
    const angleStep = connected.length > 0 ? (2 * Math.PI) / connected.length : 0;
    
    connected.forEach(({ node: connectedNode, edge }, index) => {
      const angle = angleStep * index - Math.PI / 2; // Start from top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      nodes.push({ node: connectedNode, x, y });
      
      // Determine edge direction and source confidence
      const isOutgoing = edge.from === node.id;
      const sourceNode = isOutgoing ? node : connectedNode;
      
      edges.push({
        edge,
        fromX: isOutgoing ? centerX : x,
        fromY: isOutgoing ? centerY : y,
        toX: isOutgoing ? x : centerX,
        toY: isOutgoing ? y : centerY,
        sourceConfidence: sourceNode.confidence,
      });
    });
    
    return { positionedNodes: nodes, positionedEdges: edges };
  }, [node, getConnectedNodes]);
  
  // Handle node click
  const handleNodeClick = useCallback((clickedNode: GraphNode) => {
    console.log('Clicked node:', clickedNode.title);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: S.colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: S.fonts.sans,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: S.colors.bg,
          borderRadius: '8px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: `1px solid ${S.colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            {/* Node Type Badge */}
            <div style={{ 
              display: 'inline-block',
              fontSize: '9px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: getNodeColor(node.type),
              background: `${getNodeColor(node.type)}12`,
              padding: '4px 8px',
              borderRadius: '4px',
              marginBottom: '8px',
            }}>
              {node.type}
            </div>
            
            <h2 style={{
              fontFamily: S.fonts.serif,
              fontSize: '24px',
              fontWeight: 400,
              letterSpacing: '0.01em',
              color: S.colors.text,
              marginBottom: '4px',
              maxWidth: '500px',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
            }}>
              {node.title}
            </h2>
            
            <p style={{
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: S.colors.textTertiary,
            }}>
              {positionedNodes.length - 1} connected node{positionedNodes.length - 1 !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '6px',
              color: S.colors.textTertiary,
              transition: 'all 150ms ease',
              marginLeft: '16px',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = S.colors.borderSubtle;
              e.currentTarget.style.color = S.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = S.colors.textTertiary;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        {/* 2D Canvas */}
        <div style={{ padding: '24px 28px' }}>
          <div
            style={{
              width: '640px',
              height: '480px',
              background: S.colors.bgCard,
              borderRadius: '6px',
              border: `1px solid ${S.colors.borderSubtle}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Render edges */}
              {positionedEdges.map((edge, index) => {
                const color = getConfidenceEdgeColor(edge.sourceConfidence);
                return (
                  <g key={edge.edge.id || index}>
                    {/* Edge line */}
                    <line
                      x1={edge.fromX}
                      y1={edge.fromY}
                      x2={edge.toX}
                      y2={edge.toY}
                      stroke={color}
                      strokeWidth="2.5"
                      strokeOpacity="0.6"
                    />
                    {/* Arrow head */}
                    <ArrowHead
                      fromX={edge.fromX}
                      fromY={edge.fromY}
                      toX={edge.toX}
                      toY={edge.toY}
                      color={color}
                    />
                    {/* Edge type label */}
                    <text
                      x={(edge.fromX + edge.toX) / 2}
                      y={(edge.fromY + edge.toY) / 2 - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="500"
                      fill={S.colors.textTertiary}
                      style={{ fontFamily: S.fonts.sans, letterSpacing: '0.02em' }}
                    >
                      {edge.edge.type}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Render nodes */}
            {positionedNodes.map((pn, index) => {
              const isCenter = index === 0;
              const isHovered = hoveredNodeId === pn.node.id;
              const nodeColor = getNodeColor(pn.node.type);
              
              return (
                <div
                  key={pn.node.id}
                  style={{
                    position: 'absolute',
                    left: pn.x,
                    top: pn.y,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredNodeId(pn.node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => handleNodeClick(pn.node)}
                >
                  {/* Node circle */}
                  {(() => {
                    const n = pn.node.confidence / 100;
                    const bandLabel = n >= 0.75 ? 'Strong' : n >= 0.55 ? 'Some' : n >= 0.35 ? 'Weak' : '?';
                    return (
                      <div
                        style={{
                          width: isCenter ? '72px' : '56px',
                          height: isCenter ? '72px' : '56px',
                          borderRadius: '50%',
                          background: isCenter ? nodeColor : S.colors.bgCard,
                          border: `2px solid ${nodeColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isHovered 
                            ? `0 6px 24px ${nodeColor}30`
                            : '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'all 150ms ease',
                          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                        }}
                      >
                        {/* Evidence band indicator */}
                        <span
                          style={{
                            fontSize: isCenter ? '11px' : '9px',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            color: isCenter ? S.colors.bg : nodeColor,
                            textAlign: 'center',
                          }}
                        >
                          {bandLabel}
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Node label */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      maxWidth: '110px',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: S.colors.text,
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {pn.node.title}
                    </p>
                    <span
                      style={{
                        fontSize: '8px',
                        fontWeight: 500,
                        color: S.colors.textTertiary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {pn.node.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer with Legend */}
        <div style={{
          padding: '16px 28px 24px',
          borderTop: `1px solid ${S.colors.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            display: 'flex',
            gap: '20px',
          }}>
            <LegendItem color={S.colors.accent} label="Strong evidence" />
            <LegendItem color="#E5A826" label="Some evidence" />
            <LegendItem color="#FB923C" label="Weak evidence" />
            <LegendItem color="#D4442E" label="Assumption" />
          </div>
          
          <span style={{
            fontSize: '10px',
            color: S.colors.textTertiary,
            fontStyle: 'italic',
          }}>
            Edge color indicates evidence quality
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ArrowHead({ fromX, fromY, toX, toY, color }: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
}) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLength = 8;
  const arrowAngle = Math.PI / 6;
  
  // Calculate arrow position (slightly before the end to not overlap with node)
  const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const ratio = (distance - 32) / distance;
  const arrowX = fromX + (toX - fromX) * ratio;
  const arrowY = fromY + (toY - fromY) * ratio;
  
  const x1 = arrowX - arrowLength * Math.cos(angle - arrowAngle);
  const y1 = arrowY - arrowLength * Math.sin(angle - arrowAngle);
  const x2 = arrowX - arrowLength * Math.cos(angle + arrowAngle);
  const y2 = arrowY - arrowLength * Math.sin(angle + arrowAngle);
  
  return (
    <polygon
      points={`${arrowX},${arrowY} ${x1},${y1} ${x2},${y2}`}
      fill={color}
      fillOpacity="0.6"
    />
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: '16px',
          height: '3px',
          background: color,
          borderRadius: '1.5px',
        }}
      />
      <span style={{ 
        fontSize: '10px', 
        fontWeight: 500,
        color: '#8A857A',
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>
    </div>
  );
}

export default Node2DView;
