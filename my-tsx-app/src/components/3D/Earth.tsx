import React from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import model from "../../assets/earth.glb";
import { ReferenceFrames } from './ReferenceFrames';

// Constants
const DESCALE_FACTOR = 0.3;
const AXIS_BASE_SCALE = 40; // Base scale for axis visualization

interface EarthProps {
  isAlternateView: boolean;
  showTestMode?: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView, showTestMode = false }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };

  // Earth is always at the center in both views
  // Only the Earth scale changes between views
  const earthScale = isAlternateView ? DESCALE_FACTOR : 1;
  
  // Keep axis visualization at a consistent large size
  const axisScale = AXIS_BASE_SCALE;
  
  return (
    <ReferenceFrames 
      scale={axisScale} 
      showCelestial={showTestMode} 
      showTerrestrial={showTestMode}
    >
      <primitive 
        object={scene} 
        position={[0, 0, 0]}
        scale={earthScale} 
      />
    </ReferenceFrames>
  );
};

export default Earth; 