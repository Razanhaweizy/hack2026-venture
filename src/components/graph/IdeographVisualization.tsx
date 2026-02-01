/**
 * IdeographVisualization Component
 * Main 3D visualization of the Ideograph dependency graph
 * Connects to Zustand store and renders the graph with React Three Fiber
 */

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { useGraphStore } from '../../store/graphStore';
import type { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '../../types/graph';
import { GraphNode } from './GraphNode';
import { GraphEdge } from './GraphEdge';
import { calculateSemanticLayout, type NodePosition } from './semanticLayout';
import { COLORS } from './constants';

// =============================================================================
// TYPES
// =============================================================================

type HighlightType = 'update' | 'add' | 'connect' | 'contradict' | 'strengthen' | 'weaken';

interface IdeographVisualizationProps {
  onNodeSelect?: (node: GraphNodeType | null) => void;
  onNodeDoubleClick?: (node: GraphNodeType) => void;
  showLabels?: boolean;
  autoRotate?: boolean;
  highlightedNodes?: Record<string, HighlightType>;
}

// =============================================================================
// CAMERA CONTROLLER
// =============================================================================

interface CameraControllerProps {
  targetPosition: THREE.Vector3 | null;
  onAnimationComplete?: () => void;
}

function CameraController({ targetPosition, onAnimationComplete }: CameraControllerProps) {
  useThree(); // Access Three.js context
  const controlsRef = useRef<any>(null);
  const animatingRef = useRef(false);
  const targetRef = useRef<THREE.Vector3 | null>(null);
  
  useEffect(() => {
    if (targetPosition) {
      targetRef.current = targetPosition.clone();
      animatingRef.current = true;
    }
  }, [targetPosition]);
  
  useFrame(() => {
    if (animatingRef.current && targetRef.current && controlsRef.current) {
      // Smoothly animate camera to look at target
      const currentTarget = controlsRef.current.target as THREE.Vector3;
      currentTarget.lerp(targetRef.current, 0.05);
      
      // Check if animation is complete
      if (currentTarget.distanceTo(targetRef.current) < 0.1) {
        animatingRef.current = false;
        onAnimationComplete?.();
      }
    }
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={60}
      maxPolarAngle={Math.PI * 0.85}
    />
  );
}

// =============================================================================
// GRAPH SCENE
// =============================================================================

interface GraphSceneProps {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
  positions: Map<string, NodePosition>;
  sizes: Map<string, number>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  connectedNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
  showLabels: boolean;
  highlightedNodes: Record<string, HighlightType>;
  onNodeClick: (node: GraphNodeType) => void;
  onNodeDoubleClick: (node: GraphNodeType) => void;
  onNodeHover: (node: GraphNodeType | null) => void;
}

function GraphScene({
  nodes,
  edges,
  positions,
  sizes,
  selectedNodeId,
  hoveredNodeId,
  connectedNodeIds,
  connectedEdgeIds,
  showLabels,
  highlightedNodes,
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover,
}: GraphSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={groupRef}>
      {/* Render edges first (behind nodes) */}
      {edges.map((edge) => {
        const sourcePos = positions.get(edge.from);
        const targetPos = positions.get(edge.to);
        
        if (!sourcePos || !targetPos) return null;
        
        const isHighlighted = connectedEdgeIds.has(edge.id);
        
        return (
          <GraphEdge
            key={edge.id}
            edge={edge}
            sourcePos={sourcePos}
            targetPos={targetPos}
            isHighlighted={isHighlighted}
          />
        );
      })}
      
      {/* Render nodes */}
      {nodes.map((node) => {
        const position = positions.get(node.id);
        const size = sizes.get(node.id) || 0.3;
        
        if (!position) return null;
        
        const isSelected = selectedNodeId === node.id;
        const isHighlighted = connectedNodeIds.has(node.id) || hoveredNodeId === node.id;
        
        return (
          <GraphNode
            key={node.id}
            node={node}
            position={position}
            size={size}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            showLabel={showLabels}
            onClick={onNodeClick}
            onDoubleClick={onNodeDoubleClick}
            onHover={onNodeHover}
            diffHighlight={highlightedNodes[node.id]}
          />
        );
      })}
    </group>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IdeographVisualization({
  onNodeSelect,
  onNodeDoubleClick,
  showLabels = false,
  highlightedNodes = {},
  // autoRotate reserved for future use
}: IdeographVisualizationProps) {
  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  
  // Get data from store - subscribe to Maps directly to avoid infinite loops
  const nodesMap = useGraphStore((state) => state.nodes);
  const edgesMap = useGraphStore((state) => state.edges);
  
  // Convert Maps to arrays (memoized based on Map reference)
  const nodes = useMemo(() => Array.from(nodesMap.values()), [nodesMap]);
  const edges = useMemo(() => Array.from(edgesMap.values()), [edgesMap]);
  
  // Get store methods (these are stable references)
  const getConnectedNodes = useGraphStore((state) => state.getConnectedNodes);
  
  // Calculate semantic layout using cosine similarity
  const { positions, sizes } = useMemo(() => {
    const getConnectionCount = (nodeId: string) => {
      return getConnectedNodes(nodeId).length;
    };
    
    // Use semantic layout algorithm with force-directed positioning
    return calculateSemanticLayout(nodes, edges, getConnectionCount);
  }, [nodes, edges, getConnectedNodes]);
  
  // Get connected nodes and edges for highlighting
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    
    const targetId = selectedNodeId || hoveredNodeId;
    if (targetId) {
      const connected = getConnectedNodes(targetId);
      connected.forEach(({ node, edge }) => {
        nodeIds.add(node.id);
        edgeIds.add(edge.id);
      });
    }
    
    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [selectedNodeId, hoveredNodeId, getConnectedNodes]);
  
  // Handlers
  const handleNodeClick = useCallback((node: GraphNodeType) => {
    const newSelectedId = selectedNodeId === node.id ? null : node.id;
    setSelectedNodeId(newSelectedId);
    onNodeSelect?.(newSelectedId ? node : null);
  }, [selectedNodeId, onNodeSelect]);
  
  const handleNodeDoubleClick = useCallback((node: GraphNodeType) => {
    // Focus camera on node
    const position = positions.get(node.id);
    if (position) {
      setCameraTarget(new THREE.Vector3(position.x, position.y, position.z));
    }
    onNodeDoubleClick?.(node);
  }, [positions, onNodeDoubleClick]);
  
  const handleNodeHover = useCallback((node: GraphNodeType | null) => {
    setHoveredNodeId(node?.id || null);
  }, []);
  
  // Clear camera target after animation
  const handleCameraAnimationComplete = useCallback(() => {
    setCameraTarget(null);
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%', background: COLORS.background }}>
      <Canvas
        camera={{ position: [0, 15, 35], fov: 50 }}
        style={{ background: COLORS.background }}
        onPointerMissed={() => {
          setSelectedNodeId(null);
          onNodeSelect?.(null);
        }}
      >
        {/* Background color */}
        <color attach="background" args={[COLORS.background]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <pointLight position={[20, 20, 20]} intensity={1} />
        <pointLight position={[-20, -10, -20]} intensity={0.4} />
        <directionalLight position={[0, 10, 0]} intensity={0.3} />
        
        {/* Graph scene */}
        <GraphScene
          nodes={nodes}
          edges={edges}
          positions={positions}
          sizes={sizes}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          connectedNodeIds={connectedNodeIds}
          connectedEdgeIds={connectedEdgeIds}
          showLabels={showLabels}
          highlightedNodes={highlightedNodes}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeHover={handleNodeHover}
        />
        
        {/* Camera controls */}
        <CameraController
          targetPosition={cameraTarget}
          onAnimationComplete={handleCameraAnimationComplete}
        />
      </Canvas>
    </div>
  );
}

export default IdeographVisualization;
