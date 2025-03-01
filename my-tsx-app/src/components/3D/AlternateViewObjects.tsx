import React, { useRef } from 'react';
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTimeContext } from '../../contexts/TimeContext';

// Constants
const ORBIT_RADIUS = 105; // Satellite orbit radius
const ORBIT_SPEED = 0.02; // Speed of orbit
const DESCALE_FACTOR = 0.3;

interface AlternateViewObjectsProps {
  isAlternateView: boolean;
}

const AlternateViewObjects: React.FC<AlternateViewObjectsProps> = ({ isAlternateView }) => {
  const { currentTime } = useTimeContext();
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    // Calculate position of the marker sphere
    const angle = -currentTime * ORBIT_SPEED;
    const x = ORBIT_RADIUS * DESCALE_FACTOR * Math.cos(angle);
    const y = ORBIT_RADIUS * DESCALE_FACTOR * Math.sin(angle);
    
    // Update marker position
    if (markerRef.current) {
      markerRef.current.position.set(x, 0, y);
    }
  });

  if (!isAlternateView) return null;
  
  return (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ORBIT_RADIUS*DESCALE_FACTOR, ORBIT_RADIUS*DESCALE_FACTOR + 0.5, 64]} />
        <meshBasicMaterial color="white" opacity={0.5} transparent={true} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={markerRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );
};

export default AlternateViewObjects; 