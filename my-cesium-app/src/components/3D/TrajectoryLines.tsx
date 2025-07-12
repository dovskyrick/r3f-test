import React, { useMemo } from 'react';
import { SCALE_FACTOR } from '../../contexts/TrajectoryContext';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

const TrajectoryLines: React.FC = () => {
  const { satellites } = useSatelliteContext();
  
  // Create line points for each visible satellite
  const satelliteLines = useMemo(() => {
    const lines: Array<{
      points: THREE.Vector3[];
      color: string;
      satelliteId: string;
    }> = [];
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Filter points that have 3D cartesian coordinates
        const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
        
        if (validPoints.length > 1) { // Need at least 2 points to draw a line
          const linePoints = validPoints.map(point => 
            new THREE.Vector3(
              point.cartesian!.x * SCALE_FACTOR,
              point.cartesian!.y * SCALE_FACTOR,
              point.cartesian!.z * SCALE_FACTOR
            )
          );
          
          lines.push({
            points: linePoints,
            color: satellite.color,
            satelliteId: satellite.id
          });
        }
      }
    });
    
    return lines;
  }, [satellites]);
  
  return (
    <group>
      {satelliteLines.map((line, index) => (
        <Line
          key={`trajectory-line-${line.satelliteId}`}
          points={line.points}
          color={line.color}
          lineWidth={1}
          dashed={false}
          transparent={true}
          opacity={0.7}
        />
      ))}
    </group>
  );
};

export default TrajectoryLines; 