/**
 * StarPoints Component
 * Renders ~9,000 stars as an efficient point cloud using real astronomical data
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { starsData, constellationStarHRNumbers } from '../../utils/starmapData';
import { colorIndexToRGB, magnitudeToSize } from '../../utils/starColorConversion';

interface StarPointsProps {
  minMagnitude?: number; // Filter: only show stars brighter than this (lower = brighter)
  showNames?: boolean;   // Future: show star names (not implemented yet)
  highlightConstellationStars?: boolean; // Make constellation stars larger
  constellationStarSizeMultiplier?: number; // How much larger (default 10x)
}

const StarPoints: React.FC<StarPointsProps> = ({ 
  minMagnitude = 6.5,
  highlightConstellationStars = false,
  constellationStarSizeMultiplier = 1000
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Create a circular texture for star sprites
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Create circular gradient
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }, []);

  // Process star data into Three.js buffers
  const { positions, colors, sizes } = useMemo(() => {
    console.log('[StarPoints] Processing star data...');
    
    // Filter stars by magnitude (only show stars brighter than threshold)
    const filteredStars = starsData.filter(star => star.mag <= minMagnitude);
    
    const count = filteredStars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    let constellationStarCount = 0;

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
      let size = magnitudeToSize(star.mag);
      
      // Check if this star is part of a constellation
      if (highlightConstellationStars && star.hr !== null && constellationStarHRNumbers.has(star.hr)) {
        size *= constellationStarSizeMultiplier; // Make constellation stars much larger
        constellationStarCount++;
      }
      
      sizes[i] = size;
    });

    if (highlightConstellationStars) {
      console.log(`[StarPoints] Highlighted ${constellationStarCount} constellation stars (${constellationStarSizeMultiplier}x larger)`);
    }

    console.log(`[StarPoints] Rendered ${count} stars (filtered from ${starsData.length} total)`);
    console.log(`[StarPoints] Magnitude threshold: ${minMagnitude}`);

    return { positions, colors, sizes };
  }, [minMagnitude, highlightConstellationStars, constellationStarSizeMultiplier]);

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
        map={starTexture}
        size={3.0}
        vertexColors
        transparent
        opacity={1.0}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        alphaTest={0.01}
      />
    </points>
  );
};

export default StarPoints;

