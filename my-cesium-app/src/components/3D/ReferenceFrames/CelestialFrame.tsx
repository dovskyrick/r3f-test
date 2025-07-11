import React from 'react';
import { ArrowHelper, Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface CelestialFrameProps {
  scale?: number;
}

const CelestialFrame: React.FC<CelestialFrameProps> = ({ scale = 2 }) => {
  // Using different shades of orange for better visibility
  const colors = {
    x: 0xff8c00, // dark orange
    y: 0xffa500, // orange
    z: 0xffd700  // golden orange
  };

  return (
    <>
      {/* X-axis (dark orange) - C100 */}
      <arrowHelper 
        args={[
          new Vector3(1, 0, 0),
          new Vector3(0, 0, 0),
          scale,
          colors.x,
          scale * 0.2,
          scale * 0.1
        ]} 
      />
      <Text
        position={[scale * 1.2, 0, 0]}
        color="#ff8c00"
        fontSize={scale * 0.15}
        anchorX="left"
      >
        C100
      </Text>
      
      {/* Y-axis (orange) - C010 */}
      <arrowHelper 
        args={[
          new Vector3(0, 1, 0),
          new Vector3(0, 0, 0),
          scale,
          colors.y,
          scale * 0.2,
          scale * 0.1
        ]} 
      />
      <Text
        position={[0, scale * 1.2, 0]}
        color="#ffa500"
        fontSize={scale * 0.15}
        anchorY="bottom"
      >
        C010
      </Text>
      
      {/* Z-axis (golden orange) - C001 */}
      <arrowHelper 
        args={[
          new Vector3(0, 0, 1),
          new Vector3(0, 0, 0),
          scale,
          colors.z,
          scale * 0.2,
          scale * 0.1
        ]} 
      />
      <Text
        position={[0, 0, scale * 1.2]}
        color="#ffd700"
        fontSize={scale * 0.15}
        anchorX="left"
      >
        C001
      </Text>

      {/* XY plane ring (golden orange normal - Z axis) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={colors.z} wireframe={true} opacity={0.3} transparent={true} />
      </mesh>

      {/* XZ plane ring (orange normal - Y axis) */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={colors.y} wireframe={true} opacity={0.3} transparent={true} />
      </mesh>

      {/* YZ plane ring (dark orange normal - X axis) */}
      <mesh rotation={[0, Math.PI/2, 0]}>
        <ringGeometry args={[scale * 0.95, scale, 64]} />
        <meshBasicMaterial color={colors.x} wireframe={true} opacity={0.3} transparent={true} />
      </mesh>
    </>
  );
};

export default CelestialFrame; 