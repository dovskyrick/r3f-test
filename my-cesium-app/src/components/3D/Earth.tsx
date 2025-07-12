import React from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import model from "../../assets/earth.glb";

// Constants
const DESCALE_FACTOR = 0.3;

interface EarthProps {
  isAlternateView: boolean;
  showTestMode?: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };

  // Earth is always at the center in both views
  // Only the Earth scale changes between views
  const earthScale = isAlternateView ? DESCALE_FACTOR : 1;
  
  return (
    <primitive 
      object={scene} 
      position={[0, 0, 0]}
      scale={earthScale} 
    />
  );
};

export default Earth; 