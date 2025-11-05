/**
 * CustomStarmap Component
 * Container for star points and constellation lines
 * Allows rotating the entire star field as a single unit
 */

import React, { useRef } from 'react';
import * as THREE from 'three';
import StarPoints from './StarPoints';
import ConstellationLines from './ConstellationLines';

interface CustomStarmapProps {
  minMagnitude?: number;
  showConstellations?: boolean;
  highlightConstellationStars?: boolean; // Make constellation stars larger
  constellationColor?: string;
  rotation?: [number, number, number]; // Euler angles [x, y, z] in radians
  position?: [number, number, number];
}

const CustomStarmap: React.FC<CustomStarmapProps> = ({
  minMagnitude = 6.5,
  showConstellations = false,
  highlightConstellationStars = false,
  constellationColor = '#d1d9e6',
  rotation = [0, 0, 0],
  position = [0, 0, 0]
}) => {
  const groupRef = useRef<THREE.Group>(null);

  console.log('[CustomStarmap] Rendering with:', {
    minMagnitude,
    showConstellations,
    highlightConstellationStars,
    rotation,
    position
  });

  return (
    <group 
      ref={groupRef}
      rotation={rotation}
      position={position}
    >
      {/* Star points - ~9000 stars */}
      <StarPoints 
        minMagnitude={minMagnitude}
        highlightConstellationStars={highlightConstellationStars}
        constellationStarSizeMultiplier={100000}
      />

      {/* Constellation lines - 88 constellations */}
      <ConstellationLines
        visible={showConstellations}
        lineColor={constellationColor}
        lineWidth={2}
      />
    </group>
  );
};

export default CustomStarmap;

