/**
 * ConstellationLines Component
 * Renders lines connecting stars to form the 88 modern constellations
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { constellationsData, starsByHR } from '../../utils/starmapData';

interface ConstellationLinesProps {
  visible?: boolean;
  lineColor?: string;
  lineWidth?: number;
  constellations?: string[]; // Optional: filter which constellations to show (empty = all)
}

const ConstellationLines: React.FC<ConstellationLinesProps> = ({
  visible = false,
  lineColor = '#d1d9e6',
  lineWidth = 2,
  constellations = [] // Empty array means show all
}) => {
  // Generate all constellation line geometries
  const lineSegments = useMemo(() => {
    if (!visible) return null;

    console.log('[ConstellationLines] Generating constellation lines...');

    // Collect all line segments
    const allPoints: number[] = [];
    let lineCount = 0;
    let skippedStars = 0;

    // Get list of constellations to render
    const constsToRender = constellations.length > 0 
      ? constellations 
      : Object.keys(constellationsData);

    constsToRender.forEach((constKey) => {
      const constellation = constellationsData[constKey];
      if (!constellation) return;

      // Connect stars in order
      for (let i = 0; i < constellation.stars.length - 1; i++) {
        const hrNumber1 = constellation.stars[i];
        const hrNumber2 = constellation.stars[i + 1];
        
        const star1 = starsByHR.get(hrNumber1);
        const star2 = starsByHR.get(hrNumber2);

        if (star1 && star2) {
          // Add line segment (two points)
          allPoints.push(star1.x, star1.y, star1.z);
          allPoints.push(star2.x, star2.y, star2.z);
          lineCount++;
        } else {
          // Star not found in database
          skippedStars++;
        }
      }
    });

    console.log(`[ConstellationLines] Created ${lineCount} line segments`);
    console.log(`[ConstellationLines] Rendered ${constsToRender.length} constellations`);
    if (skippedStars > 0) {
      console.warn(`[ConstellationLines] Skipped ${skippedStars} missing star references`);
    }

    if (allPoints.length === 0) {
      return null;
    }

    return new Float32Array(allPoints);
  }, [visible, constellations]);

  if (!visible || !lineSegments) {
    return null;
  }

  const color = new THREE.Color(lineColor);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={lineSegments.length / 3}
          array={lineSegments}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={0.6}
        linewidth={lineWidth}
        depthTest={true}
        depthWrite={false}
      />
    </lineSegments>
  );
};

export default ConstellationLines;

