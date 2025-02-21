import { Canvas , useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from "three";
import './App.css';
import model from './assets/earth.glb'; // Go up one folder from /src/components

const ORBIT_RADIUS = 105; // Define satellite orbit radius
const ORBIT_SPEED = 0.0002; // Speed of orbit
const INITIAL_DISTANCE = 15; // Distance camera stays from satellite


function Earth() {
  const { scene } = useGLTF(model);
  const [angle, setAngle] = useState(0);
  
  useFrame((state, delta) => {
    setAngle((prev) => prev + delta * ORBIT_SPEED);
    
    // Compute Earth position using circular motion
    const x = ORBIT_RADIUS * Math.cos(angle);
    const y = ORBIT_RADIUS * Math.sin(angle);
    
    scene.position.set(x, y, 0);
  });

  return <primitive object={scene} scale={1} />;
}

function Satellite() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
}

export default function App() {
  

  return (
    <Canvas camera={{ position: [20, 20, 20] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      <Earth />
      <Satellite />

      <OrbitControls />
    </Canvas>
  );
}