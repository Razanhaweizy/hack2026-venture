import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'

// Sample knowledge graph data
const graphData = {
  nodes: [
    { id: 'ai', label: 'Artificial Intelligence', position: [0, 0, 0] },
    { id: 'ml', label: 'Machine Learning', position: [4, 2, 1] },
    { id: 'dl', label: 'Deep Learning', position: [6, 4, -1] },
    { id: 'nlp', label: 'NLP', position: [5, 0, 3] },
    { id: 'cv', label: 'Computer Vision', position: [5, -2, -2] },
    { id: 'nn', label: 'Neural Networks', position: [3, 4, -3] },
    { id: 'data', label: 'Data Science', position: [-4, 2, 1] },
    { id: 'stats', label: 'Statistics', position: [-6, 0, 2] },
    { id: 'python', label: 'Python', position: [-5, -2, -1] },
    { id: 'tensorflow', label: 'TensorFlow', position: [2, -4, 2] },
    { id: 'pytorch', label: 'PyTorch', position: [0, -4, -2] },
    { id: 'transformers', label: 'Transformers', position: [7, 2, 2] },
    { id: 'llm', label: 'LLMs', position: [8, 0, 0] },
    { id: 'robotics', label: 'Robotics', position: [-3, -3, 3] },
    { id: 'automation', label: 'Automation', position: [-5, -4, 0] },
  ],
  edges: [
    { source: 'ai', target: 'ml' },
    { source: 'ai', target: 'nlp' },
    { source: 'ai', target: 'cv' },
    { source: 'ai', target: 'robotics' },
    { source: 'ml', target: 'dl' },
    { source: 'ml', target: 'nn' },
    { source: 'ml', target: 'data' },
    { source: 'dl', target: 'nn' },
    { source: 'dl', target: 'transformers' },
    { source: 'nlp', target: 'transformers' },
    { source: 'nlp', target: 'llm' },
    { source: 'transformers', target: 'llm' },
    { source: 'data', target: 'stats' },
    { source: 'data', target: 'python' },
    { source: 'python', target: 'tensorflow' },
    { source: 'python', target: 'pytorch' },
    { source: 'tensorflow', target: 'dl' },
    { source: 'pytorch', target: 'dl' },
    { source: 'cv', target: 'dl' },
    { source: 'robotics', target: 'automation' },
    { source: 'robotics', target: 'cv' },
  ]
}

// Node component (vertex)
function Node({ position, label, color, onHover }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1
    }
  })
  
  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[hovered ? 0.45 : 0.35, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      
      {/* Label */}
      <Text
        position={[0, 0.7, 0]}
        fontSize={0.3}
        color="#1B1916"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#FBF7F0"
      >
        {label}
      </Text>
      
      {/* Glow effect on hover */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.2}
          />
        </mesh>
      )}
    </group>
  )
}

// Edge component (line between nodes)
function Edge({ start, end, color }) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ]
  }, [start, end])
  
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [points])
  
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.6} />
    </line>
  )
}

// Animated tube edge for better visibility
function TubeEdge({ start, end, color }) {
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    
    // Create a slight curve for visual interest
    const midPoint = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5)
    
    // Add slight offset to midpoint for curve
    const direction = new THREE.Vector3().subVectors(endVec, startVec)
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z * 0.5).normalize()
    midPoint.add(perpendicular.multiplyScalar(0.2))
    
    return new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec)
  }, [start, end])
  
  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.03, 8, false]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.8}
        metalness={0.1}
        transparent
        opacity={0.7}
      />
    </mesh>
  )
}

// Main Knowledge Graph component
function KnowledgeGraph({ colors }) {
  const groupRef = useRef()
  
  // Create a map of node positions for edge rendering
  const nodePositions = useMemo(() => {
    const map = {}
    graphData.nodes.forEach(node => {
      map[node.id] = node.position
    })
    return map
  }, [])
  
  // Gentle rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })
  
  return (
    <group ref={groupRef}>
      {/* Render edges first (behind nodes) */}
      {graphData.edges.map((edge, index) => (
        <TubeEdge
          key={`edge-${index}`}
          start={nodePositions[edge.source]}
          end={nodePositions[edge.target]}
          color={colors.edges}
        />
      ))}
      
      {/* Render nodes */}
      {graphData.nodes.map((node) => (
        <Node
          key={node.id}
          position={node.position}
          label={node.label}
          color={colors.vertices}
        />
      ))}
    </group>
  )
}

export default KnowledgeGraph
