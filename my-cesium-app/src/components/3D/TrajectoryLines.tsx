import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryLinesProps {
  isAlternateView: boolean;
}

const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  
  // Create line points for each visible satellite
  const satelliteLines = useMemo(() => {
    const lines: Array<{
      points: THREE.Vector3[];
      color: string;
      satelliteId: string;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Filter points that have 3D cartesian coordinates
        const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
        
        if (validPoints.length > 1) { // Need at least 2 points to draw a line
          const linePoints = validPoints.map(point => 
            new THREE.Vector3(
              point.cartesian!.x * viewScale,
              point.cartesian!.y * viewScale,
              point.cartesian!.z * viewScale
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
  }, [satellites, isAlternateView]);
  
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