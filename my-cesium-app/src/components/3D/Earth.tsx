import React, { useEffect } from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import model from "../../assets/earth.glb";

// Constants
const DESCALE_FACTOR = 0.5;

interface EarthProps {
  isAlternateView: boolean;
  showTestMode?: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };

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