import React, { useMemo } from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import * as THREE from 'three';

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
  return [x, y, 0.01];
};

const MapTrajectory: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  // Create array of points mapped to lat/lng coordinates - moved BEFORE the conditional return
  const mapPoints = useMemo(() => {
    if (!isTrajectoryVisible || !trajectoryData) return [];
    
    return trajectoryData.points.map(point => ({
      position: latLngToPosition(
        point.spherical.latitude, 
        point.spherical.longitude
      ),
      epoch: point.epoch,
      mjd: point.mjd
    }));
  }, [trajectoryData, isTrajectoryVisible]);
  
  // Don't render if trajectory is not visible or data is not loaded
  if (!isTrajectoryVisible || !trajectoryData) return null;
  
  return (
    <group>
      {mapPoints.map((point, index) => (
        <mesh 
          key={`map-trajectory-point-${index}`} 
          position={point.position as [number, number, number]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial 
            color="#ff3333" 
            emissive="#ff0000"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};

export default MapTrajectory; 