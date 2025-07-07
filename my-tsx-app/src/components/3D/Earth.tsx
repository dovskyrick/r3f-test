import React from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useTimeContext } from '../../contexts/TimeContext';
import model from "../../assets/earth.glb";
import AxisVisualization from './AxisVisualization';

// Constants
const DESCALE_FACTOR = 0.3;
const AXIS_BASE_SCALE = 40; // Base scale for axis visualization
const SUN_ARROW_SCALE = 50; // Slightly longer than axis arrows

interface EarthProps {
  isAlternateView: boolean;
  showTestMode?: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView, showTestMode = false }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };
  const { currentTime } = useTimeContext();

  // Earth is always at the center in both views
  // Only the Earth scale changes between views
  const earthScale = isAlternateView ? DESCALE_FACTOR : 1;
  
  // Keep axis visualization at a consistent large size
  const axisScale = AXIS_BASE_SCALE;

  // Calculate rotation based on MJD
  // At MJD X.5 (noon), Greenwich meridian should face the sun (100 axis)
  const dayFraction = currentTime % 1;  // Get decimal part
  const rotationAngle = (dayFraction - 0.5) * 2 * Math.PI;  // Convert to radians with noon offset
  
  return (
    <>
      {/* Earth and coordinate system arrows rotate together around Y axis (010) */}
      <group rotation={[0, rotationAngle, 0]}>
        <primitive 
          object={scene} 
          position={[0, 0, 0]}
          scale={earthScale} 
        />
        {showTestMode && <AxisVisualization scale={axisScale} />}
      </group>

      {/* Static sun-pointing arrow (always points along 100) */}
      {showTestMode && (
        <arrowHelper 
          args={[
            new THREE.Vector3(1, 0, 0), // direction (always points along 100)
            new THREE.Vector3(0, 0, 0), // origin
            SUN_ARROW_SCALE,     // length
            0xffff00,            // color (yellow)
            SUN_ARROW_SCALE * 0.2, // head length
            SUN_ARROW_SCALE * 0.1  // head width
          ]} 
        />
      )}
    </>
  );
};

export default Earth; 