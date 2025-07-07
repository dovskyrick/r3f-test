import React from 'react';
import { ArrowHelper, Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface AxisVisualizationProps {
  scale?: number;
}

const AxisVisualization: React.FC<AxisVisualizationProps> = ({ scale = 2 }) => {
  return (
    <>
      {/* X-axis (red) */}
      <arrowHelper 
        args={[
          new Vector3(1, 0, 0), // direction
          new Vector3(0, 0, 0), // origin
          scale,                // length
          0xff0000,            // color (red)
          scale * 0.2,         // head length
          scale * 0.1          // head width
        ]} 
      />
      <Text
        position={[scale * 1.2, 0, 0]}
        color="red"
        fontSize={scale * 0.15}
        anchorX="left"
      >
        100
      </Text>
      
      {/* Y-axis (green) */}
      <arrowHelper 
        args={[
          new Vector3(0, 1, 0), // direction
          new Vector3(0, 0, 0), // origin
          scale,                // length
          0x00ff00,            // color (green)
          scale * 0.2,         // head length
          scale * 0.1          // head width
        ]} 
      />
      <Text
        position={[0, scale * 1.2, 0]}
        color="green"
        fontSize={scale * 0.15}
        anchorY="bottom"
      >
        010
      </Text>
      
      {/* Z-axis (blue) */}
      <arrowHelper 
        args={[
          new Vector3(0, 0, 1), // direction
          new Vector3(0, 0, 0), // origin
          scale,                // length
          0x0000ff,            // color (blue)
          scale * 0.2,         // head length
          scale * 0.1          // head width
        ]} 
      />
      <Text
        position={[0, 0, scale * 1.2]}
        color="blue"
        fontSize={scale * 0.15}
        anchorX="left"
      >
        001
      </Text>

      {/* XY plane ring (blue normal - Z axis) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={0x0000ff} wireframe={true} opacity={0.5} transparent={true} />
      </mesh>

      {/* XZ plane ring (green normal - Y axis) */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={0x00ff00} wireframe={true} opacity={0.5} transparent={true} />
      </mesh>

      {/* YZ plane ring (red normal - X axis) */}
      <mesh rotation={[0, Math.PI/2, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={0xff0000} wireframe={true} opacity={0.5} transparent={true} />
      </mesh>
    </>
  );
};

export default AxisVisualization; 