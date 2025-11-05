import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import { getPositionAtTime } from '../../utils/trajectoryUtils';

/**
 * Component that positions the camera at the satellite's current location
 * This creates a first-person view from the satellite's perspective
 */
const CelestialCamera: React.FC = () => {
  const { camera } = useThree();
  const { satellites, focusedSatelliteId } = useSatelliteContext();
  const { currentTime } = useTimeContext();

  useEffect(() => {
    // If no satellite is focused, use default camera position
    if (!focusedSatelliteId) {
      console.log('[CelestialCamera] No focused satellite, using default position');
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      return;
    }

    // Find the focused satellite
    const satellite = satellites.find(s => s.id === focusedSatelliteId);
    if (!satellite || !satellite.trajectoryData) {
      console.log('[CelestialCamera] No satellite or trajectory data found');
      return;
    }

    // Get satellite position at current time
    const satellitePos = getPositionAtTime(
      satellite.trajectoryData.points,
      currentTime
    );

    if (!satellitePos) {
      console.log('[CelestialCamera] Could not get satellite position at current time');
      return;
    }

    // Since we're viewing FROM the satellite's perspective,
    // and Earth positioning is relative (negative satellite position scaled),
    // the camera stays at origin (0, 0, 0)
    // This makes the satellite the center of the coordinate system
    
    // Keep camera at origin in this coordinate system
    camera.position.set(0, 0, 0);
    
    // Calculate direction to look at Earth
    // Earth appears at -satellitePos (scaled)
    const scaleDownFactor = 0.1;
    const earthDirection = {
      x: -satellitePos.x * scaleDownFactor,
      y: -satellitePos.y * scaleDownFactor,
      z: -satellitePos.z * scaleDownFactor
    };
    
    // Look towards Earth by default
    camera.lookAt(earthDirection.x, earthDirection.y, earthDirection.z);

    console.log('[CelestialCamera] Camera positioned at satellite location:', {
      satellitePos,
      earthDirection,
      currentTime
    });
  }, [camera, focusedSatelliteId, satellites, currentTime]);

  return null; // This component doesn't render anything
};

export default CelestialCamera;

