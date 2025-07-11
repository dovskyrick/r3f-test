import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Quaternion, Vector3, Euler, Matrix4 } from 'three';
import TerrestrialFrame from './TerrestrialFrame';
import CelestialFrame from './CelestialFrame';
import { useTimeContext } from '../../../contexts/TimeContext';
import { 
  getItrfToIcrfMatrix,
  mjdToDate 
} from '../../../utils/coordinateTransforms';

interface ReferenceFramesProps {
  scale?: number;
  showCelestial?: boolean;
  showTerrestrial?: boolean;
  children?: React.ReactNode;
}

const ReferenceFrames: React.FC<ReferenceFramesProps> = ({
  scale = 2,
  showCelestial = true,
  showTerrestrial = true,
  children
}) => {
  const celestialRef = React.useRef<Group>(null);
  const terrestrialRef = React.useRef<Group>(null);
  const earthRef = React.useRef<Group>(null);
  const { currentTime } = useTimeContext();

  // Reusable quaternion to avoid garbage collection
  const quaternion = React.useRef(new Quaternion());
  
  // Debug: Track previous values for change detection
  const lastMJD = React.useRef<number | null>(null);
  const lastDate = React.useRef<Date | null>(null);
  const frameCount = React.useRef(0);
  const lastLogTime = React.useRef<number>(0);

  useFrame(() => {
    frameCount.current++;
    
    if (!terrestrialRef.current || !earthRef.current) {
      const now = Date.now();
      if (now - lastLogTime.current > 5000) { // Log every 5 seconds
        console.log('DEBUG: Missing refs - terrestrial:', !!terrestrialRef.current, 'earth:', !!earthRef.current);
        lastLogTime.current = now;
      }
      return;
    }

    // Convert MJD to Date
    const date = mjdToDate(currentTime);

    // Check if time has changed and if 5 seconds have passed
    const now = Date.now();
    const timeChanged = lastMJD.current !== currentTime;
    const shouldLog = timeChanged && (now - lastLogTime.current > 5000);

    if (shouldLog) {
      console.log('=== CESIUM TRANSFORMATION DEBUG ===');
      console.log('Frame:', frameCount.current);
      console.log('Current MJD:', currentTime);
      console.log('Previous MJD:', lastMJD.current);
      console.log('Time changed:', timeChanged);
      console.log('Current Date:', date.toISOString());
      console.log('Previous Date:', lastDate.current?.toISOString());
      
      lastMJD.current = currentTime;
      lastDate.current = date;
      lastLogTime.current = now;
    }

    try {
      // Get ITRF to ICRF transformation matrix from Cesium
      const transformMatrix = getItrfToIcrfMatrix(date);
      
      if (shouldLog) {
        console.log('Transform matrix elements:', transformMatrix.elements);
        console.log('Matrix determinant:', transformMatrix.determinant());
        
        // Check if matrix is identity
        const isIdentity = transformMatrix.equals(new Matrix4());
        console.log('Is identity matrix:', isIdentity);
      }
      
      // Extract quaternion from the transformation matrix
      quaternion.current.setFromRotationMatrix(transformMatrix);
      
      if (shouldLog) {
        console.log('Quaternion:', {
          x: quaternion.current.x,
          y: quaternion.current.y,
          z: quaternion.current.z,
          w: quaternion.current.w
        });
        
        // Convert to Euler angles for easier understanding
        const euler = new Euler().setFromQuaternion(quaternion.current);
        console.log('Euler angles (degrees):', {
          x: (euler.x * 180 / Math.PI).toFixed(2),
          y: (euler.y * 180 / Math.PI).toFixed(2),
          z: (euler.z * 180 / Math.PI).toFixed(2)
        });
      }

      // Apply transformation to both Earth and terrestrial frame
      terrestrialRef.current.quaternion.copy(quaternion.current);
      earthRef.current.quaternion.copy(quaternion.current);
      
      if (shouldLog) {
        console.log('Applied quaternion to terrestrial and earth refs');
        console.log('Terrestrial quaternion:', {
          x: terrestrialRef.current.quaternion.x,
          y: terrestrialRef.current.quaternion.y,
          z: terrestrialRef.current.quaternion.z,
          w: terrestrialRef.current.quaternion.w
        });
        console.log('=== END CESIUM TRANSFORMATION DEBUG ===');
      }
      
    } catch (error) {
      console.error('Error in transformation:', error);
    }
  });

  return (
    <>
      {/* Earth model group - rotates with terrestrial frame in ITRF */}
      <group ref={earthRef}>
        {children}
      </group>

      {/* Celestial (ICRF) frame - remains fixed in space */}
      {showCelestial && (
        <group ref={celestialRef}>
          <CelestialFrame scale={scale} />
        </group>
      )}

      {/* Terrestrial (ITRF) frame - rotates with Earth */}
      {showTerrestrial && (
        <group ref={terrestrialRef}>
          <TerrestrialFrame scale={scale} />
        </group>
      )}

      {/* Sun direction arrow - fixed along ICRF X-axis (vernal equinox direction) */}
      {showCelestial && (
        <arrowHelper 
          args={[
            new Vector3(1, 0, 0), // ICRF X-axis (vernal equinox)
            new Vector3(0, 0, 0),
            scale * 1.25,
            0xffff00,     // yellow
            scale * 0.2,
            scale * 0.1
          ]} 
        />
      )}
    </>
  );
};

export default ReferenceFrames; 