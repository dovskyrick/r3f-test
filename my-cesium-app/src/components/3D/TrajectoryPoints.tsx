import React, { useMemo } from 'react';
import { SCALE_FACTOR } from '../../contexts/TrajectoryContext';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';

const TrajectoryPoints: React.FC = () => {
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
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Debug logging for first point of each satellite
        const firstPointWithCartesian = satellite.trajectoryData.points.find(point => point.cartesian);
        if (firstPointWithCartesian && firstPointWithCartesian.cartesian) {
          console.log(`[TrajectoryPoints] Satellite ${satellite.id} first 3D point:`, {
            original: firstPointWithCartesian.cartesian,
            scaled: {
              x: firstPointWithCartesian.cartesian.x * SCALE_FACTOR,
              y: firstPointWithCartesian.cartesian.y * SCALE_FACTOR,
              z: firstPointWithCartesian.cartesian.z * SCALE_FACTOR
            },
            totalPoints: satellite.trajectoryData.points.length,
            pointsWithCartesian: satellite.trajectoryData.points.filter(p => p.cartesian).length
          });
        }
        
        satellite.trajectoryData.points.forEach((point, index) => {
          // Only render points that have 3D cartesian coordinates
          if (point.cartesian) {
            pointsWithSatelliteInfo.push({
              x: point.cartesian.x * SCALE_FACTOR,
              y: point.cartesian.y * SCALE_FACTOR,
              z: point.cartesian.z * SCALE_FACTOR,
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
  }, [satellites]);
  
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