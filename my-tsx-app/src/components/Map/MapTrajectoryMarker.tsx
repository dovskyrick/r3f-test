import React, { useMemo } from 'react';
import { useTrajectoryContext, TrajectoryPoint } from '../../contexts/TrajectoryContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';

// This function should be imported from MapsView
// but recreating it here for clarity
const latLngToPosition = (lat: number, lng: number): [number, number, number] => {
  // Map dimensions (these values should match those in MapsView)
  const planeWidth = 10;
  const MAP_ASPECT_RATIO = 2521 / 1260; // Width / Height
  const planeHeight = planeWidth / MAP_ASPECT_RATIO;
  
  // Convert lat/long to position on plane
  // Longitude: -180 to 180 maps to -width/2 to width/2
  // Latitude: -90 to 90 maps to -height/2 to height/2
  const x = (lng / 180) * (planeWidth / 2);
  const y = (lat / 90) * (planeHeight / 2);
  
  // Z is slightly above plane to avoid z-fighting
  return [x, y, 0.02]; // Higher Z than the trajectory line
};

/**
 * Find the two trajectory points that surround the current MJD time
 * and interpolate spherical coordinates between them
 */
const interpolatePosition = (
  points: TrajectoryPoint[], 
  currentMJD: number
): [number, number, number] | null => {
  // Early return for edge cases
  if (!points || points.length === 0) return null;
  
  // If current time is before first point, return first point position
  if (currentMJD <= points[0].mjd) {
    const p = points[0];
    return latLngToPosition(p.spherical.latitude, p.spherical.longitude);
  }
  
  // If current time is after last point, return last point position
  if (currentMJD >= points[points.length - 1].mjd) {
    const p = points[points.length - 1];
    return latLngToPosition(p.spherical.latitude, p.spherical.longitude);
  }
  
  // Find the two points that surround the current time
  let beforeIndex = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].mjd <= currentMJD && points[i + 1].mjd >= currentMJD) {
      beforeIndex = i;
      break;
    }
  }
  
  const beforePoint = points[beforeIndex];
  const afterPoint = points[beforeIndex + 1];
  
  // Calculate the interpolation factor (0 to 1)
  const timeDiff = afterPoint.mjd - beforePoint.mjd;
  const factor = timeDiff === 0 ? 0 : (currentMJD - beforePoint.mjd) / timeDiff;
  
  // Special case for crossing the international date line
  let longitude1 = beforePoint.spherical.longitude;
  let longitude2 = afterPoint.spherical.longitude;
  
  // Adjust longitudes for date line crossing to ensure proper interpolation
  if (Math.abs(longitude2 - longitude1) > 180) {
    if (longitude1 < 0) {
      longitude1 += 360;
    } else {
      longitude2 += 360;
    }
  }
  
  // Linear interpolation between the two points
  const lat = beforePoint.spherical.latitude + factor * (afterPoint.spherical.latitude - beforePoint.spherical.latitude);
  const lng = longitude1 + factor * (longitude2 - longitude1);
  
  // Normalize longitude back to -180 to 180 range
  const normalizedLng = (lng > 180) ? lng - 360 : (lng < -180) ? lng + 360 : lng;
  
  // Return the interpolated position
  return latLngToPosition(lat, normalizedLng);
};

const MapTrajectoryMarker: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  const { currentTime } = useTimeContext();
  
  // Calculate the interpolated position of the marker
  const markerPosition = useMemo(() => {
    if (!isTrajectoryVisible || !trajectoryData) return null;
    return interpolatePosition(trajectoryData.points, currentTime);
  }, [trajectoryData, isTrajectoryVisible, currentTime]);
  
  // Don't render if position couldn't be determined
  if (!markerPosition) return null;
  
  return (
    <mesh position={markerPosition as [number, number, number]}>
      <circleGeometry args={[0.15, 32]} />
      <meshBasicMaterial 
        color="#ff0000" 
        transparent
        opacity={0.8}
      />
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.15, 0.22, 32]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent
          opacity={0.6}
        />
      </mesh>
    </mesh>
  );
};

export default MapTrajectoryMarker; 