import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface StarfieldProps {
  count?: number;
}

const Starfield: React.FC<StarfieldProps> = ({ count = 5000 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate star positions and colors
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random position on sphere surface (distance 500-1000 units)
      const radius = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2; // Azimuthal angle
      const phi = Math.acos(2 * Math.random() - 1); // Polar angle (uniform distribution)

      // Convert spherical to cartesian coordinates
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Star color with variation
      // Most stars are white, some are blue-white, some are yellow-white
      const colorType = Math.random();
      let r, g, b;

      if (colorType < 0.7) {
        // White stars (70%)
        const brightness = 0.8 + Math.random() * 0.2;
        r = brightness;
        g = brightness;
        b = brightness;
      } else if (colorType < 0.85) {
        // Blue-white stars (15%)
        const brightness = 0.7 + Math.random() * 0.3;
        r = brightness * 0.8;
        g = brightness * 0.9;
        b = brightness;
      } else {
        // Yellow-white stars (15%)
        const brightness = 0.7 + Math.random() * 0.3;
        r = brightness;
        g = brightness * 0.95;
        b = brightness * 0.7;
      }

      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      // Variable star sizes for depth perception
      // Brighter stars appear larger, with some random variation
      const averageBrightness = (r + g + b) / 3;
      const baseSize = 0.8 + Math.random() * 0.7;
      sizes[i] = baseSize + averageBrightness * 1.5;
    }

    return { positions, colors, sizes };
  }, [count]);

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
        opacity={1.0}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

export default Starfield;

