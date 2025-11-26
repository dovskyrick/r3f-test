import React, { useMemo } from 'react';
import { useTimeContext } from '../../contexts/TimeContext';
import { Satellite } from '../../contexts/SatelliteContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// This function should be imported from MapsView
// but recreating it here for clarity
const latLngToPosition = (lat: number, lng: number) => {
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
  return new THREE.Vector3(x, y, 0.005);
};

interface MapTrajectoryPathProps {
  satellite: Satellite;
}

const MapTrajectoryPath: React.FC<MapTrajectoryPathProps> = ({ satellite }) => {
  // Convert trajectory points to line points
  const linePoints = useMemo(() => {
    if (!satellite.trajectoryData) return [];
    
    const points: THREE.Vector3[] = [];
    let lastLongitude: number | null = null;
    
    // Process all trajectory points for the full path
    satellite.trajectoryData.points.forEach((point) => {
      const { longitude, latitude } = point;
      
      // Handle date line crossing (longitude wrapping)
      if (lastLongitude !== null) {
        // If we cross the date line, don't connect the points
        if (Math.abs(longitude - lastLongitude) > 180) {
          // Add a break in the line by pushing null
          points.push(new THREE.Vector3(NaN, NaN, NaN));
        }
      }
      
      // Add the point
      points.push(latLngToPosition(latitude, longitude));
      lastLongitude = longitude;
    });
    
    return points;
  }, [satellite.trajectoryData]);
  
  // Don't render if no trajectory data or points
  if (!satellite.trajectoryData || linePoints.length === 0) return null;
  
  return (
    <Line
      points={linePoints}
      color={satellite.color}
      lineWidth={1.5}
      transparent
      opacity={0.7}
    />
  );
};

export default MapTrajectoryPath; 