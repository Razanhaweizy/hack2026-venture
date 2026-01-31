/**
 * GraphNode Component
 * Renders a single node in the 3D graph with type-based appearance
 */

import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode as GraphNodeType, FrameworkNode, EvidenceNode } from '../../types/graph';
import { NODE_COLORS, EVIDENCE_VALENCE_COLORS, COLORS } from './constants';
import type { NodePosition } from './layout';

// =============================================================================
// PROPS
// =============================================================================

interface GraphNodeProps {
  node: GraphNodeType;
  position: NodePosition;
  size: number;
  isSelected: boolean;
  isHighlighted: boolean;
  showLabel: boolean;
  onClick: (node: GraphNodeType) => void;
  onDoubleClick?: (node: GraphNodeType) => void;
  onHover?: (node: GraphNodeType | null) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GraphNode({
  node,
  position,
  size,
  isSelected,
  isHighlighted,
  showLabel,
  onClick,
  onDoubleClick,
  onHover,
}: GraphNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Determine color based on node type
  const color = useMemo(() => {
    if (node.type === 'evidence') {
      const evidenceNode = node as EvidenceNode;
      return EVIDENCE_VALENCE_COLORS[evidenceNode.valence];
    }
    return NODE_COLORS[node.type];
  }, [node]);
  
  // Animation: subtle floating and pulse when selected
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime * 0.5 + position.x) * 0.05;
      meshRef.current.position.y = position.y + floatOffset;
      
      // Pulse when selected
      if (isSelected) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        meshRef.current.scale.setScalar(size * pulse);
      } else {
        meshRef.current.scale.setScalar(hovered ? size * 1.15 : size);
      }
    }
  });
  
  // Event handlers
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(node);
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
    onHover?.(null);
  };
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(node);
  };
  
  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onDoubleClick?.(node);
  };
  
  // Determine emissive intensity based on state
  const emissiveIntensity = useMemo(() => {
    if (isSelected) return 0.4;
    if (isHighlighted) return 0.3;
    if (hovered) return 0.25;
    return 0.1;
  }, [isSelected, isHighlighted, hovered]);
  
  // Get display label
  const label = node.title;
  const isFramework = node.type === 'framework';
  const showPersistentLabel = isFramework && (node as FrameworkNode).position?.level !== 2;
  
  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main mesh */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Geometry based on node type */}
        {isFramework ? (
          <boxGeometry args={[1, 1, 1]} />
        ) : (
          <sphereGeometry args={[1, 32, 32]} />
        )}
        
        {/* Material */}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={isFramework ? 0.6 : 0.4}
          metalness={isFramework ? 0.1 : 0.3}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.3, size * 1.5, 32]} />
          <meshBasicMaterial
            color={COLORS.selection}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Glow effect on hover */}
      {(hovered || isHighlighted) && (
        <mesh>
          {isFramework ? (
            <boxGeometry args={[size * 1.4, size * 1.4, size * 1.4]} />
          ) : (
            <sphereGeometry args={[size * 1.3, 16, 16]} />
          )}
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
          />
        </mesh>
      )}
      
      {/* Label - using Text for 3D labels */}
      {(showLabel || showPersistentLabel || hovered) && (
        <Text
          position={[0, size + 0.3, 0]}
          fontSize={isFramework ? 0.4 : 0.3}
          color={COLORS.text}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor={COLORS.background}
          maxWidth={3}
        >
          {label}
        </Text>
      )}
      
      {/* HTML tooltip on hover for detailed info */}
      {hovered && (
        <Html
          position={[size + 0.5, 0, 0]}
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              background: 'rgba(27, 25, 22, 0.9)',
              color: '#FBF7F0',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              maxWidth: '200px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              opacity: 0.7,
              marginBottom: '4px',
            }}>
              {node.type}
              {node.type === 'evidence' && ` (${(node as EvidenceNode).valence})`}
            </div>
            {node.content && (
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.9,
                whiteSpace: 'normal',
              }}>
                {node.content.substring(0, 100)}
                {node.content.length > 100 && '...'}
              </div>
            )}
            {isFramework && (node as FrameworkNode).description && (
              <div style={{ 
                fontSize: '11px', 
                opacity: 0.9,
                whiteSpace: 'normal',
                fontStyle: 'italic',
              }}>
                {(node as FrameworkNode).description.substring(0, 100)}...
              </div>
            )}
            <div style={{ 
              fontSize: '10px', 
              marginTop: '4px',
              opacity: 0.6,
            }}>
              Confidence: {node.confidence}%
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default GraphNode;
