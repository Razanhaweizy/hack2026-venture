/* eslint-disable @typescript-eslint/no-namespace */
import type { Object3DNode, MaterialNode, BufferGeometryNode } from '@react-three/fiber';
import type * as THREE from 'three';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // Groups and Objects
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      line: Object3DNode<THREE.Line, typeof THREE.Line>;
      
      // Geometries
      boxGeometry: BufferGeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>;
      sphereGeometry: BufferGeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>;
      tubeGeometry: BufferGeometryNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>;
      coneGeometry: BufferGeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>;
      ringGeometry: BufferGeometryNode<THREE.RingGeometry, typeof THREE.RingGeometry>;
      
      // Materials
      meshStandardMaterial: MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>;
      meshBasicMaterial: MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;
      lineBasicMaterial: MaterialNode<THREE.LineBasicMaterial, typeof THREE.LineBasicMaterial>;
      
      // Lights
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>;
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      
      // Helpers
      gridHelper: Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>;
      
      // R3F specific
      color: { attach?: string; args?: [string] };
    }
  }
}
