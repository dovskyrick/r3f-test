import React, { useMemo } from 'react';
import { useTrajectoryContext, SCALE_FACTOR, TrajectoryPoint } from '../../contexts/TrajectoryContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

// Use the same DESCALE_FACTOR as in AlternateViewObjects
const DESCALE_FACTOR = 0.3;

interface AlternateViewTrajectoryProps {
  isAlternateView: boolean;
}

const AlternateViewTrajectory: React.FC<AlternateViewTrajectoryProps> = ({ isAlternateView }) => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  const { currentTime } = useTimeContext();
  
  // Calculate the trajectory line points with the additional descaling factor
  const linePoints = useMemo(() => {
    if (!isAlternateView || !isTrajectoryVisible || !trajectoryData) return [];
    
    // Map all trajectory points to 3D vectors with additional descaling
    return trajectoryData.points.map(point => 
      new THREE.Vector3(
        point.cartesian.x * SCALE_FACTOR * DESCALE_FACTOR,
        point.cartesian.y * SCALE_FACTOR * DESCALE_FACTOR,
        point.cartesian.z * SCALE_FACTOR * DESCALE_FACTOR
      )
    );
  }, [trajectoryData, isTrajectoryVisible, isAlternateView]);
  
  // Calculate the marker position with linear interpolation
  const markerPosition = useMemo(() => {
    if (!isAlternateView || !isTrajectoryVisible || !trajectoryData) return null;
    
    // Find the two points that surround the current time
    const points = trajectoryData.points;
    
    // Early return for edge cases
    if (!points || points.length === 0) return null;
    
    // If current time is before first point or after last point
    if (currentTime <= points[0].mjd) {
      const p = points[0];
      return new THREE.Vector3(
        p.cartesian.x * SCALE_FACTOR * DESCALE_FACTOR,
        p.cartesian.y * SCALE_FACTOR * DESCALE_FACTOR,
        p.cartesian.z * SCALE_FACTOR * DESCALE_FACTOR
      );
    }
    
    if (currentTime >= points[points.length - 1].mjd) {
      const p = points[points.length - 1];
      return new THREE.Vector3(
        p.cartesian.x * SCALE_FACTOR * DESCALE_FACTOR,
        p.cartesian.y * SCALE_FACTOR * DESCALE_FACTOR,
        p.cartesian.z * SCALE_FACTOR * DESCALE_FACTOR
      );
    }
    
    // Find the two surrounding points
    let beforeIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].mjd <= currentTime && points[i + 1].mjd >= currentTime) {
        beforeIndex = i;
        break;
      }
    }
    
    const beforePoint = points[beforeIndex];
    const afterPoint = points[beforeIndex + 1];
    
    // Calculate the interpolation factor (0 to 1)
    const timeDiff = afterPoint.mjd - beforePoint.mjd;
    const factor = timeDiff === 0 ? 0 : (currentTime - beforePoint.mjd) / timeDiff;
    
    // Linear interpolation between the two points
    const x = beforePoint.cartesian.x + factor * (afterPoint.cartesian.x - beforePoint.cartesian.x);
    const y = beforePoint.cartesian.y + factor * (afterPoint.cartesian.y - beforePoint.cartesian.y);
    const z = beforePoint.cartesian.z + factor * (afterPoint.cartesian.z - beforePoint.cartesian.z);
    
    // Return the interpolated position with correct scaling
    return new THREE.Vector3(
      x * SCALE_FACTOR * DESCALE_FACTOR,
      y * SCALE_FACTOR * DESCALE_FACTOR,
      z * SCALE_FACTOR * DESCALE_FACTOR
    );
  }, [trajectoryData, isTrajectoryVisible, currentTime, isAlternateView]);
  
  // Don't render if not in alternate view or trajectory not visible
  if (!isAlternateView || !isTrajectoryVisible || !trajectoryData) return null;
  
  return (
    <>
      {/* Trajectory line */}
      <Line
        points={linePoints}
        color="#4080ff"
        lineWidth={1.5}
        transparent={true}
        opacity={0.8}
      />
      
      {/* Current position marker */}
      {markerPosition && (
        <mesh position={markerPosition}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial 
            color="#ff0000" 
            emissive="#ff4400"
            emissiveIntensity={0.7} 
          />
        </mesh>
      )}
    </>
  );
};

export default AlternateViewTrajectory; 