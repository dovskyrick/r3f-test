import React, { useMemo } from 'react';
import { useTrajectoryContext, SCALE_FACTOR } from '../../contexts/TrajectoryContext';
import * as THREE from 'three';

const TrajectoryPoints: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  // Scale coordinates from km to scene units - moved BEFORE the conditional return
  const scaledPoints = useMemo(() => {
    if (!isTrajectoryVisible || !trajectoryData) return [];
    
    return trajectoryData.points.map(point => ({
      x: point.cartesian.x * SCALE_FACTOR,
      y: point.cartesian.y * SCALE_FACTOR,
      z: point.cartesian.z * SCALE_FACTOR,
      epoch: point.epoch,
      mjd: point.mjd
    }));
  }, [trajectoryData, isTrajectoryVisible]);
  
  // Don't render if trajectory is not visible or data is not loaded
  if (!isTrajectoryVisible || !trajectoryData) return null;
  
  return (
    <group>
      {scaledPoints.map((point, index) => (
        <mesh 
          key={`trajectory-point-${index}`} 
          position={[point.x, point.y, point.z]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial 
            color="#ffcc00" 
            emissive="#ff8800"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};

export default TrajectoryPoints; 