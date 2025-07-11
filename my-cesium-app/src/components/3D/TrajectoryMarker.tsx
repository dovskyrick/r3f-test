import React, { useMemo } from 'react';
import { useTrajectoryContext, SCALE_FACTOR, TrajectoryPoint } from '../../contexts/TrajectoryContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';

/**
 * Find the two trajectory points that surround the current MJD time
 * and interpolate position between them
 */
const interpolatePosition = (
  points: TrajectoryPoint[], 
  currentMJD: number
): THREE.Vector3 | null => {
  // Early return for edge cases
  if (!points || points.length === 0) return null;
  
  // If current time is before first point, return first point position
  if (currentMJD <= points[0].mjd) {
    const p = points[0];
    return new THREE.Vector3(
      p.cartesian.x * SCALE_FACTOR,
      p.cartesian.y * SCALE_FACTOR,
      p.cartesian.z * SCALE_FACTOR
    );
  }
  
  // If current time is after last point, return last point position
  if (currentMJD >= points[points.length - 1].mjd) {
    const p = points[points.length - 1];
    return new THREE.Vector3(
      p.cartesian.x * SCALE_FACTOR,
      p.cartesian.y * SCALE_FACTOR,
      p.cartesian.z * SCALE_FACTOR
    );
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
  
  // Linear interpolation between the two points
  const x = beforePoint.cartesian.x + factor * (afterPoint.cartesian.x - beforePoint.cartesian.x);
  const y = beforePoint.cartesian.y + factor * (afterPoint.cartesian.y - beforePoint.cartesian.y);
  const z = beforePoint.cartesian.z + factor * (afterPoint.cartesian.z - beforePoint.cartesian.z);
  
  // Return the interpolated position scaled to scene units
  return new THREE.Vector3(
    x * SCALE_FACTOR,
    y * SCALE_FACTOR,
    z * SCALE_FACTOR
  );
};

const TrajectoryMarker: React.FC = () => {
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
    <mesh position={markerPosition}>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshStandardMaterial 
        color="#ff0000" 
        emissive="#ff4400"
        emissiveIntensity={0.7} 
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  );
};

export default TrajectoryMarker; 