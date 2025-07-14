import React from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface TestRulerProps {
  isAlternateView: boolean;
}

const TestRuler: React.FC<TestRulerProps> = ({ isAlternateView }) => {
  // Create ruler markers every 100 units from -500 to +500
  const markers = [];
  const rulerRange = 500;
  const markerInterval = 100;
  
  for (let x = -rulerRange; x <= rulerRange; x += markerInterval) {
    // Skip the center marker to avoid clutter
    if (x === 0) continue;
    
    markers.push({
      position: [x, 0, 0] as [number, number, number],
      label: `${x}`,
      distance: Math.abs(x)
    });
  }

  return (
    <group>
      {/* Main ruler line along X-axis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[rulerRange * 2, 0.2, 0.2]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
      {/* Center marker */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {/* Distance markers */}
      {markers.map((marker, index) => (
        <group key={index} position={marker.position}>
          {/* Vertical marker line */}
          <mesh>
            <boxGeometry args={[0.5, 10, 0.5]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
          
          {/* Distance label */}
          <Text
            position={[0, 12, 0]}
            fontSize={5}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {marker.label}
          </Text>
        </group>
      ))}
      
      {/* Ruler title */}
      <Text
        position={[0, 50, 0]}
        fontSize={8}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Test Ruler (Units: 100)
      </Text>
      
      {/* Earth scale info */}
      <Text
        position={[0, -50, 0]}
        fontSize={6}
        color={isAlternateView ? "cyan" : "orange"}
        anchorX="center"
        anchorY="middle"
      >
        Earth Scale: {isAlternateView ? "0.3 (Alternate View)" : "1.0 (Normal View)"}
      </Text>
      
      {/* Additional scale reference */}
      <Text
        position={[0, -65, 0]}
        fontSize={4}
        color="lightgray"
        anchorX="center"
        anchorY="middle"
      >
        Earth Radius = 6371 km | Scale Factor = 100/6371 ≈ 0.0157
      </Text>
    </group>
  );
};

export default TestRuler; 