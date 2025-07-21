import { SatelliteTrajectoryPoint } from './satelliteUtils';

/**
 * Configuration for future trajectory preview
 */
export interface FutureTrajectoryConfig {
  segmentCount: number;        // Number of future segments to show (10-15)
  smoothing: boolean;          // Whether to interpolate between segments
  fadeEffect: boolean;         // Whether to fade segments into the future
}

/**
 * Default configuration for future trajectory preview
 */
export const DEFAULT_FUTURE_CONFIG: FutureTrajectoryConfig = {
  segmentCount: 12,            // 12 segments ahead
  smoothing: true,             // Smooth interpolation
  fadeEffect: true             // Fade effect for distant segments
};

/**
 * Find the current trajectory position index for given time
 */
export const findCurrentTrajectoryIndex = (
  points: SatelliteTrajectoryPoint[], 
  currentMJD: number
): number => {
  if (!points || points.length === 0) return -1;
  
  // If current time is before first point
  if (currentMJD <= points[0].mjd) return 0;
  
  // If current time is after last point  
  if (currentMJD >= points[points.length - 1].mjd) return points.length - 1;
  
  // Find the index where current time falls between two points
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].mjd <= currentMJD && points[i + 1].mjd >= currentMJD) {
      return i; // Return the "before" index
    }
  }
  
  return -1;
};

/**
 * Extract future trajectory segments from current time forward
 */
export const getFutureTrajectorySegments = (
  points: SatelliteTrajectoryPoint[],
  currentMJD: number,
  config: FutureTrajectoryConfig = DEFAULT_FUTURE_CONFIG
): SatelliteTrajectoryPoint[] => {
  if (!points || points.length === 0) return [];
  
  const currentIndex = findCurrentTrajectoryIndex(points, currentMJD);
  if (currentIndex === -1) return [];
  
  // Calculate end index for future segments
  const startIndex = currentIndex;
  const endIndex = Math.min(startIndex + config.segmentCount + 1, points.length);
  
  // Extract future segments
  const futureSegments = points.slice(startIndex, endIndex);
  
  // If smoothing is enabled and we have enough points, add interpolated current position
  if (config.smoothing && futureSegments.length > 1 && currentIndex < points.length - 1) {
    // Calculate interpolated current position
    const beforePoint = points[currentIndex];
    const afterPoint = points[currentIndex + 1];
    const timeDiff = afterPoint.mjd - beforePoint.mjd;
    const factor = timeDiff === 0 ? 0 : (currentMJD - beforePoint.mjd) / timeDiff;
    
    // Create interpolated point at current time
    const interpolatedPoint: SatelliteTrajectoryPoint = {
      longitude: beforePoint.longitude + factor * (afterPoint.longitude - beforePoint.longitude),
      latitude: beforePoint.latitude + factor * (afterPoint.latitude - beforePoint.latitude),
      mjd: currentMJD,
      cartesian: beforePoint.cartesian && afterPoint.cartesian ? {
        x: beforePoint.cartesian.x + factor * (afterPoint.cartesian.x - beforePoint.cartesian.x),
        y: beforePoint.cartesian.y + factor * (afterPoint.cartesian.y - beforePoint.cartesian.y),
        z: beforePoint.cartesian.z + factor * (afterPoint.cartesian.z - beforePoint.cartesian.z)
      } : undefined
    };
    
    // Replace first point with interpolated current position
    futureSegments[0] = interpolatedPoint;
  }
  
  return futureSegments;
};

/**
 * Calculate opacity for trajectory segment based on distance into future
 */
export const calculateSegmentOpacity = (
  segmentIndex: number,
  totalSegments: number,
  config: FutureTrajectoryConfig
): number => {
  if (!config.fadeEffect) return 0.7; // Default opacity
  
  // Linear fade from 1.0 (current) to 0.3 (distant future)
  const fadeRatio = 1 - (segmentIndex / totalSegments);
  return 0.3 + (fadeRatio * 0.7); // Range: 0.3 to 1.0
}; 