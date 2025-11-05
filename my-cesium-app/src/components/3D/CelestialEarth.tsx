import React, { useEffect, useMemo } from 'react';
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import model from "../../assets/earth.glb";
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import { getPositionAtTime } from '../../utils/trajectoryUtils';

// Scale factor to match the rest of the application
// This should match the scale used in other views
const EARTH_SCALE = 0.5;

interface CelestialEarthProps {
  // Optional scale override
  scale?: number;
}

const CelestialEarth: React.FC<CelestialEarthProps> = ({ scale = EARTH_SCALE }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };
  const { satellites, focusedSatelliteId } = useSatelliteContext();
  const { currentTime } = useTimeContext();

  // Make Earth opaque but enhance its material properties
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            // Keep Earth opaque for better visibility in space
            mat.transparent = false;
            mat.opacity = 1.0;
            // Enhance material for better appearance
            if ('metalness' in mat) {
              (mat as any).metalness = 0.1;
              (mat as any).roughness = 0.8;
            }
          });
        } else {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          if ('metalness' in child.material) {
            (child.material as any).metalness = 0.1;
            (child.material as any).roughness = 0.8;
          }
        }
      }
    });
  }, [scene]);

  // Calculate Earth's position relative to the satellite
  const earthPosition = useMemo(() => {
    // Default position if no satellite is focused
    if (!focusedSatelliteId) {
      console.log('[CelestialEarth] No focused satellite, placing Earth at origin');
      return { x: 0, y: 0, z: -20 }; // Place Earth in front of camera
    }

    // Find the focused satellite
    const satellite = satellites.find(s => s.id === focusedSatelliteId);
    if (!satellite || !satellite.trajectoryData) {
      console.log('[CelestialEarth] No satellite or trajectory data found');
      return { x: 0, y: 0, z: -20 };
    }

    // Get satellite position at current time
    const satellitePos = getPositionAtTime(
      satellite.trajectoryData.points,
      currentTime
    );

    if (!satellitePos) {
      console.log('[CelestialEarth] Could not get satellite position at current time');
      return { x: 0, y: 0, z: -20 };
    }

    // Earth is at origin (0, 0, 0) in ITRF frame
    // From satellite's perspective, Earth appears at negative of satellite's position
    // We also scale down for better visualization
    const scaleDownFactor = 0.1; // Scale down the distances for better viewing
    
    const relativePosition = {
      x: -satellitePos.x * scaleDownFactor,
      y: -satellitePos.y * scaleDownFactor,
      z: -satellitePos.z * scaleDownFactor
    };

    console.log('[CelestialEarth] Positioning:', {
      satellitePos,
      relativePosition,
      currentTime
    });

    return relativePosition;
  }, [focusedSatelliteId, satellites, currentTime]);

  return (
    <primitive 
      object={scene} 
      position={[earthPosition.x, earthPosition.y, earthPosition.z]}
      scale={scale} 
    />
  );
};

export default CelestialEarth;

