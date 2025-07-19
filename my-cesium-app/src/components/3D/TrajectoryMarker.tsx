import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';
import { interpolatePosition, SatelliteTrajectoryPoint } from '../../utils/satelliteUtils';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryMarkerProps {
  isAlternateView: boolean;
}

const TrajectoryMarker: React.FC<TrajectoryMarkerProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();
  
  // Calculate the interpolated position for each visible satellite
  const satelliteMarkers = useMemo(() => {
    const markers: Array<{
      position: THREE.Vector3;
      color: string;
      satelliteId: string;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        const position = interpolatePosition(satellite.trajectoryData.points, currentTime, viewScale);
        if (position) {
          markers.push({
            position,
            color: satellite.color,
            satelliteId: satellite.id
          });
        }
      }
    });
    
    return markers;
  }, [satellites, currentTime, isAlternateView]);

  return (
    <group>
      {satelliteMarkers.map((marker) => (
        <mesh 
          key={`trajectory-marker-${marker.satelliteId}`}
          position={marker.position}
        >
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial 
            color={marker.color} 
            emissive={marker.color}
            emissiveIntensity={0.7} 
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
};

export default TrajectoryMarker; 