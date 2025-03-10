import React, { useMemo } from 'react';
import { useTrajectoryContext, SCALE_FACTOR } from '../../contexts/TrajectoryContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

const TrajectoryLines: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  // Create an array of Vector3 points for the line - moved BEFORE the conditional return
  const linePoints = useMemo(() => {
    if (!isTrajectoryVisible || !trajectoryData) return [];
    
    return trajectoryData.points.map(point => 
      new THREE.Vector3(
        point.cartesian.x * SCALE_FACTOR,
        point.cartesian.y * SCALE_FACTOR,
        point.cartesian.z * SCALE_FACTOR
      )
    );
  }, [trajectoryData, isTrajectoryVisible]);
  
  // Don't render if trajectory is not visible or data is not loaded
  if (!isTrajectoryVisible || !trajectoryData) return null;
  
  return (
    <Line
      points={linePoints}
      color="#ff8800"
      lineWidth={1}
      dashed={false}
      transparent={true}
      opacity={0.7}
    />
  );
};

export default TrajectoryLines; 