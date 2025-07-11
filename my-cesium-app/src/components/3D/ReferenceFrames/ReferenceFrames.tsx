import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Quaternion, Vector3, Euler } from 'three';
import TerrestrialFrame from './TerrestrialFrame';
import CelestialFrame from './CelestialFrame';
import { useTimeContext } from '../../../contexts/TimeContext';
import { 
  satelliteToThreeMatrix,
  getGMST,
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

  // Reusable objects to avoid garbage collection
  const quaternion = React.useRef(new Quaternion());

  // Debug: Create a reference vector tilted at exactly 23.4 degrees
  const referenceAngle = 23.4 * (Math.PI / 180); // Convert to radians
  const referenceVector = new Vector3(0, 1, 0); // Start with up vector
  referenceVector.applyAxisAngle(new Vector3(1, 0, 0), referenceAngle); // Tilt around X axis

  // Store last date for change detection
  const lastDate = React.useRef<Date | null>(null);

  useFrame(() => {
    if (!terrestrialRef.current || !earthRef.current) return;

    // Convert MJD to Date
    const date = mjdToDate(currentTime);

    // Only log when date changes by at least one day
    const shouldLog = !lastDate.current || 
      Math.abs(date.getTime() - lastDate.current.getTime()) >= 24 * 60 * 60 * 1000;

    if (shouldLog) {
      console.log('=== SATELLITE.JS TRANSFORMATION ===');
      console.log('Date changed to:', date.toISOString());
      lastDate.current = date;
    }

    // Get complete ICRF to ITRF transformation from satellite.js
    const transformMatrix = satelliteToThreeMatrix(date);
    
    if (shouldLog) {
      console.log('Satellite.js transformation matrix:', transformMatrix.elements);
      const gmst = getGMST(date);
      console.log('GMST from satellite.js:', gmst, 'radians');
    }

    // Extract quaternion from the transformation matrix
    quaternion.current.setFromRotationMatrix(transformMatrix);

    // Apply final rotation to both Earth and terrestrial frame
    terrestrialRef.current.quaternion.copy(quaternion.current);
    earthRef.current.quaternion.copy(quaternion.current);

    if (shouldLog) {
      // Extract Euler angles for debugging
      const finalEuler = new Euler().setFromQuaternion(quaternion.current);
      const angles = [finalEuler.x, finalEuler.y, finalEuler.z]
        .map(rad => (rad * 180 / Math.PI).toFixed(2));
      console.log('Final rotation angles (deg):', angles);
      console.log('=== END SATELLITE.JS TRANSFORMATION ===');
    }
  });

  return (
    <>
      {/* Earth model group - rotates with terrestrial frame */}
      <group ref={earthRef}>
        {children}
      </group>

      {/* Celestial (ICRF) frame - static */}
      {showCelestial && (
        <group ref={celestialRef}>
          <CelestialFrame scale={scale} />
        </group>
      )}

      {/* Terrestrial frame - rotates with Earth */}
      {showTerrestrial && (
        <group ref={terrestrialRef}>
          <TerrestrialFrame scale={scale} />
        </group>
      )}

      {/* Static sun direction arrow - always points along ICRF X-axis (C100) */}
      {showCelestial && (
        <arrowHelper 
          args={[
            new Vector3(1, 0, 0), // static along ICRF X-axis
            new Vector3(0, 0, 0),
            scale * 1.25, // slightly longer than axis arrows
            0xffff00,     // yellow
            scale * 0.2,  // head length
            scale * 0.1   // head width
          ]} 
        />
      )}

      {/* Reference 23.4° vector (magenta) */}
      {showCelestial && (
        <arrowHelper 
          args={[
            referenceVector,
            new Vector3(0, 0, 0),
            scale * 1.5, // longer than other arrows
            0xff00ff,    // magenta
            scale * 0.2,
            scale * 0.1
          ]} 
        />
      )}
    </>
  );
};

export default ReferenceFrames; 