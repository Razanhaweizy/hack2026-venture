/**
 * GraphEdge Component
 * Renders an edge between two nodes with type-based styling
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { GraphEdge as GraphEdgeType } from '../../types/graph';
import { EDGE_COLORS, EDGE_THICKNESS, EDGE_OPACITY } from './constants';
import type { NodePosition } from './layout';

// =============================================================================
// PROPS
// =============================================================================

interface GraphEdgeProps {
  edge: GraphEdgeType;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  isHighlighted: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GraphEdge({
  edge,
  sourcePos,
  targetPos,
  isHighlighted,
}: GraphEdgeProps) {
  // Get visual properties based on edge type
  const color = EDGE_COLORS[edge.type];
  const thickness = EDGE_THICKNESS[edge.type];
  const baseOpacity = EDGE_OPACITY[edge.type];
  
  // Create curve for the edge (slight arc for visual interest)
  const curve = useMemo(() => {
    const start = new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z);
    const end = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    
    // Calculate midpoint with slight offset for curve
    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    
    // Add curve offset perpendicular to the line
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    // Create perpendicular vector for curve offset
    // Use a combination of axes to avoid edge cases
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3()
      .crossVectors(direction, up)
      .normalize();
    
    // If direction is nearly vertical, use a different reference
    if (perpendicular.length() < 0.1) {
      perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
    }
    
    // Curve amount proportional to distance (subtle)
    const curveAmount = Math.min(length * 0.1, 1);
    midPoint.add(perpendicular.multiplyScalar(curveAmount));
    
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [sourcePos, targetPos]);
  
  // Adjusted opacity for highlighted state
  const opacity = isHighlighted ? Math.min(baseOpacity + 0.2, 1) : baseOpacity;
  const adjustedThickness = isHighlighted ? thickness * 1.5 : thickness;
  
  return (
    <group>
      {/* Main edge tube */}
      <mesh>
        <tubeGeometry args={[curve, 20, adjustedThickness, 8, false]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Arrow head at target end */}
      <EdgeArrow
        curve={curve}
        color={color}
        size={adjustedThickness * 3}
        opacity={opacity}
      />
      
      {/* Highlight glow */}
      {isHighlighted && (
        <mesh>
          <tubeGeometry args={[curve, 20, adjustedThickness * 2, 8, false]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.15}
          />
        </mesh>
      )}
    </group>
  );
}

// =============================================================================
// ARROW HEAD COMPONENT
// =============================================================================

interface EdgeArrowProps {
  curve: THREE.QuadraticBezierCurve3;
  color: string;
  size: number;
  opacity: number;
}

function EdgeArrow({ curve, color, size, opacity }: EdgeArrowProps) {
  // Get position and direction at end of curve
  const { position, rotation } = useMemo(() => {
    // Position slightly before the end (so arrow doesn't go inside target node)
    const pos = curve.getPoint(0.92);
    
    // Get tangent at the end for rotation
    const tangent = curve.getTangent(0.92);
    
    // Calculate rotation to align cone with tangent
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, tangent);
    
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    
    return {
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
    };
  }, [curve]);
  
  return (
    <mesh position={position} rotation={rotation}>
      <coneGeometry args={[size, size * 2, 8]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

export default GraphEdge;
