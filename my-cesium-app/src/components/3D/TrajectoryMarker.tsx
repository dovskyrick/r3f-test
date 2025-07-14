import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

// Define trajectory point type for satellites
interface SatelliteTrajectoryPoint {
  longitude: number;
  latitude: number;
  mjd: number;
  cartesian?: {
    x: number;
    y: number;
    z: number;
  };
}

interface TrajectoryMarkerProps {
  isAlternateView: boolean;
}

/**
 * Find the two trajectory points that surround the current MJD time
 * and interpolate position between them
 */
const interpolatePosition = (
  points: SatelliteTrajectoryPoint[], 
  currentMJD: number,
  viewScale: number
): THREE.Vector3 | null => {
  // Filter points that have cartesian coordinates
  const validPoints = points.filter(point => point.cartesian);
  
  // Early return for edge cases
  if (!validPoints || validPoints.length === 0) return null;
  
  // If current time is before first point, return first point position
  if (currentMJD <= validPoints[0].mjd) {
    const p = validPoints[0];
    return new THREE.Vector3(
      p.cartesian!.x * viewScale,
      p.cartesian!.y * viewScale,
      p.cartesian!.z * viewScale
    );
  }
  
  // If current time is after last point, return last point position
  if (currentMJD >= validPoints[validPoints.length - 1].mjd) {
    const p = validPoints[validPoints.length - 1];
    return new THREE.Vector3(
      p.cartesian!.x * viewScale,
      p.cartesian!.y * viewScale,
      p.cartesian!.z * viewScale
    );
  }
  
  // Find the two points that surround the current time
  let beforeIndex = 0;
  for (let i = 0; i < validPoints.length - 1; i++) {
    if (validPoints[i].mjd <= currentMJD && validPoints[i + 1].mjd >= currentMJD) {
      beforeIndex = i;
      break;
    }
  }
  
  const beforePoint = validPoints[beforeIndex];
  const afterPoint = validPoints[beforeIndex + 1];
  
  // Calculate the interpolation factor (0 to 1)
  const timeDiff = afterPoint.mjd - beforePoint.mjd;
  const factor = timeDiff === 0 ? 0 : (currentMJD - beforePoint.mjd) / timeDiff;
  
  // Linear interpolation between the two points
  const x = beforePoint.cartesian!.x + factor * (afterPoint.cartesian!.x - beforePoint.cartesian!.x);
  const y = beforePoint.cartesian!.y + factor * (afterPoint.cartesian!.y - beforePoint.cartesian!.y);
  const z = beforePoint.cartesian!.z + factor * (afterPoint.cartesian!.z - beforePoint.cartesian!.z);
  
  // Return the interpolated position scaled to scene units
  return new THREE.Vector3(
    x * viewScale,
    y * viewScale,
    z * viewScale
  );
};

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