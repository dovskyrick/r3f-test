/**
 * StarPoints Component
 * Renders ~9,000 stars as an efficient point cloud using real astronomical data
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { starsData } from '../../utils/starmapData';
import { colorIndexToRGB, magnitudeToSize } from '../../utils/starColorConversion';

interface StarPointsProps {
  minMagnitude?: number; // Filter: only show stars brighter than this (lower = brighter)
  showNames?: boolean;   // Future: show star names (not implemented yet)
}

const StarPoints: React.FC<StarPointsProps> = ({ 
  minMagnitude = 6.5 
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Process star data into Three.js buffers
  const { positions, colors, sizes } = useMemo(() => {
    console.log('[StarPoints] Processing star data...');
    
    // Filter stars by magnitude (only show stars brighter than threshold)
    const filteredStars = starsData.filter(star => star.mag <= minMagnitude);
    
    const count = filteredStars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    filteredStars.forEach((star, i) => {
      const i3 = i * 3;

      // Positions - use existing x, y, z coordinates from JSON
      positions[i3] = star.x;
      positions[i3 + 1] = star.y;
      positions[i3 + 2] = star.z;

      // Colors - convert B-V color index to RGB
      const [r, g, b] = colorIndexToRGB(star.ci);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      // Sizes - based on magnitude (brighter stars are larger)
      sizes[i] = magnitudeToSize(star.mag);
    });

    console.log(`[StarPoints] Rendered ${count} stars (filtered from ${starsData.length} total)`);
    console.log(`[StarPoints] Magnitude threshold: ${minMagnitude}`);

    return { positions, colors, sizes };
  }, [minMagnitude]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

export default StarPoints;

