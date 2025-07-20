import React, { useEffect } from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import model from "../../assets/earth.glb";
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

// Constants
const DESCALE_FACTOR = 0.5;

interface EarthProps {
  isAlternateView: boolean;
  showTestMode?: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();

  // Make Earth transparent to see trajectories inside
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.transparent = true;
            mat.opacity = 0.7;
          });
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.7;
        }
      }
    });
  }, [scene]);

  // Calculate Earth's apparent position (only in normal view)
  const earthPosition = isAlternateView || !isInFocusMode 
    ? { x: 0, y: 0, z: 0 } // Normal position - Earth at center
    : getApparentPosition({ x: 0, y: 0, z: 0 }); // Apparent position - Earth relative to focused satellite

  // Earth scale changes between views  
  const earthScale = isAlternateView ? DESCALE_FACTOR : 1;

  // TEST: Log Earth positioning
  console.log('[Earth] Positioning:', {
    isAlternateView,
    isInFocusMode,
    earthPosition,
    earthScale
  });
  
  return (
      <primitive 
        object={scene} 
        position={[earthPosition.x, earthPosition.y, earthPosition.z]}
        scale={earthScale} 
      />
  );
};

export default Earth; 