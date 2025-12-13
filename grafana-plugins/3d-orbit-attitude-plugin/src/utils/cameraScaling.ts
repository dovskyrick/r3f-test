import { Cartesian3 } from 'cesium';

/**
 * Calculate scaled length for vectors/cones based on camera distance and tracking mode
 * 
 * @param baseLength Base length in meters (e.g., 50000 for 50km)
 * @param isTracked Whether satellite is being tracked
 * @param viewer Cesium viewer instance
 * @param satellitePosition Current satellite position
 * @returns Scaled length in meters
 */
export function getScaledLength(
  baseLength: number,
  isTracked: boolean,
  viewer: any,
  satellitePosition: Cartesian3
): number {
  if (isTracked) {
    // Tracked mode: very small fixed length (leverages camera zoom)
    return 2; // 2 meters
  }
  
  // Untracked mode: scale with camera distance
  let scaledLength = baseLength;
  
  if (viewer) {
    const cameraPosition = viewer.camera.position;
    const distance = Cartesian3.distance(cameraPosition, satellitePosition);
    const scaleFactor = Math.max(1.0, distance / 1000000); // Scale based on 1000km reference
    scaledLength = baseLength * scaleFactor;
  }
  
  return scaledLength;
}

