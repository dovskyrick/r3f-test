import React from 'react';
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useTimeContext } from '../../contexts/TimeContext';
import model from "../../assets/earth.glb";

// Constants
const ORBIT_RADIUS = 105; // Satellite orbit radius
const ORBIT_SPEED = 0.02; // Speed of orbit
const DESCALE_FACTOR = 0.3;

interface EarthProps {
  isAlternateView: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const { currentTime } = useTimeContext();
  const { scene } = useGLTF(model) as { scene: THREE.Group };

  useFrame(() => {
    if (!isAlternateView) {
      const angle = -currentTime * ORBIT_SPEED;

      // Compute Earth position using circular motion
      const x = ORBIT_RADIUS * Math.cos(angle);
      const y = ORBIT_RADIUS * Math.sin(angle);

      scene.position.set(-x, 0, -y);
    } else {
      scene.position.set(0, 0, 0);
    }
  });

  return <primitive object={scene} scale={isAlternateView ? DESCALE_FACTOR : 1} />;
};

export default Earth; 