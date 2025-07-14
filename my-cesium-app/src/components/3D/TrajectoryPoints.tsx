import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryPointsProps {
  isAlternateView: boolean;
}

const TrajectoryPoints: React.FC<TrajectoryPointsProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  
  // Scale coordinates from km to scene units for all visible satellites
  const allScaledPoints = useMemo(() => {
    const pointsWithSatelliteInfo: Array<{
      x: number;
      y: number;
      z: number;
      mjd: number;
      color: string;
      satelliteId: string;
      pointIndex: number;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Debug logging for first point of each satellite
        const firstPointWithCartesian = satellite.trajectoryData.points.find(point => point.cartesian);
        if (firstPointWithCartesian && firstPointWithCartesian.cartesian) {
          console.log(`[TrajectoryPoints] Satellite ${satellite.id} first 3D point:`, {
            original: firstPointWithCartesian.cartesian,
            scaled: {
              x: firstPointWithCartesian.cartesian.x * viewScale,
              y: firstPointWithCartesian.cartesian.y * viewScale,
              z: firstPointWithCartesian.cartesian.z * viewScale
            },
            viewScale: viewScale,
            isAlternateView: isAlternateView,
            totalPoints: satellite.trajectoryData.points.length,
            pointsWithCartesian: satellite.trajectoryData.points.filter(p => p.cartesian).length
          });
        }
        
        satellite.trajectoryData.points.forEach((point, index) => {
          // Only render points that have 3D cartesian coordinates
          if (point.cartesian) {
            pointsWithSatelliteInfo.push({
              x: point.cartesian.x * viewScale,
              y: point.cartesian.y * viewScale,
              z: point.cartesian.z * viewScale,
              mjd: point.mjd,
              color: satellite.color,
              satelliteId: satellite.id,
              pointIndex: index
            });
          }
        });
      }
    });
    
    console.log(`[TrajectoryPoints] Total points to render: ${pointsWithSatelliteInfo.length}`);
    return pointsWithSatelliteInfo;
  }, [satellites, isAlternateView]);
  
  return (
    <group>
      {allScaledPoints.map((point, index) => (
        <mesh 
          key={`trajectory-point-${point.satelliteId}-${point.pointIndex}`} 
          position={[point.x, point.y, point.z]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial 
            color={point.color}
            emissive={point.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
};

export default TrajectoryPoints; 