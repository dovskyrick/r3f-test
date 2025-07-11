import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { RotationMatrix } from 'astronomy-engine';
import * as satellite from 'satellite.js';
import type { EciVec3, EcfVec3, GMSTime } from 'satellite.js';

/**
 * Converts an astronomy-engine rotation matrix to Three.js Matrix3
 * The astronomy-engine matrix transforms from J2000 mean equator (EQJ) to equatorial of-date (EQD)
 * 
 * The rotation includes:
 * - Precession of the equinoxes
 * - Nutation
 * - Earth's axial tilt
 */
export function astronomyToThreeMatrix(rotation: RotationMatrix): Matrix3 {
  const matrix = new Matrix3();
  
  // astronomy-engine uses row-major order, and we need to transpose it for Three.js
  matrix.set(
    rotation.rot[0][0], rotation.rot[1][0], rotation.rot[2][0],
    rotation.rot[0][1], rotation.rot[1][1], rotation.rot[2][1],
    rotation.rot[0][2], rotation.rot[1][2], rotation.rot[2][2]
  );
  
  return matrix;
}

/**
 * Converts Modified Julian Date (MJD) to JavaScript Date
 */
export function mjdToDate(mjd: number): Date {
  // MJD 0 corresponds to 1858-11-17 00:00:00 UTC
  const mjdZero = new Date(Date.UTC(1858, 10, 17, 0, 0, 0));
  const daysToMilliseconds = 86400000; // 24 * 60 * 60 * 1000
  
  return new Date(mjdZero.getTime() + mjd * daysToMilliseconds);
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in radians
 * This is the angle between the Greenwich meridian and the vernal equinox
 */
export function calculateGMST(date: Date): number {
  // Get UTC hours since midnight
  const hours = date.getUTCHours() + 
                date.getUTCMinutes() / 60 + 
                date.getUTCSeconds() / 3600;

  // Get day of year (1-366)
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = (date.getTime() - start.getTime());
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Calculate GMST in hours using approximate formula
  // Reference: http://aa.usno.navy.mil/faq/docs/GAST.php
  const gmst = 6.697374558 + 0.06570982441908 * dayOfYear + 1.00273790935 * hours;
  
  // Convert to radians and normalize to [0, 2π]
  return (gmst * Math.PI / 12) % (2 * Math.PI);
}

// ============================================================================
// NEW SATELLITE.JS FUNCTIONS
// ============================================================================

/**
 * Wrapper around satellite.js gstime function
 * Calculates Greenwich Mean Sidereal Time (GMST) from a JavaScript Date
 */
export function getGMST(date: Date): GMSTime {
  return (satellite as any).gstime(date);
}

/**
 * Transforms a vector from ICRF (ECI) to ITRF (ECF) using satellite.js
 */
export function transformICRFToITRF(icrfVector: Vector3, date: Date): Vector3 {
  const gmst = (satellite as any).gstime(date);
  
  const eciVec: EciVec3<number> = {
    x: icrfVector.x,
    y: icrfVector.y,
    z: icrfVector.z
  };
  
  const ecfResult = (satellite as any).eciToEcf(eciVec, gmst);
  
  return new Vector3(ecfResult.x, ecfResult.y, ecfResult.z);
}

/**
 * Transforms a vector from ITRF (ECF) to ICRF (ECI) using satellite.js
 */
export function transformITRFToICRF(itrfVector: Vector3, date: Date): Vector3 {
  const gmst = (satellite as any).gstime(date);
  
  const ecfVec: EcfVec3<number> = {
    x: itrfVector.x,
    y: itrfVector.y,
    z: itrfVector.z
  };
  
  const eciResult = (satellite as any).ecfToEci(ecfVec, gmst);
  
  return new Vector3(eciResult.x, eciResult.y, eciResult.z);
}

/**
 * Creates a transformation matrix from ICRF to ITRF using satellite.js
 * Swaps Y and Z axes: satellite.js Z (north pole) → Three.js Y (T010)
 */
export function satelliteToThreeMatrix(date: Date): Matrix4 {
  const gmst = (satellite as any).gstime(date);
  
  // Transform standard basis vectors from ECI to ECF
  const xBasisECF = (satellite as any).eciToEcf({ x: 1, y: 0, z: 0 }, gmst);
  const yBasisECF = (satellite as any).eciToEcf({ x: 0, y: 1, z: 0 }, gmst);
  const zBasisECF = (satellite as any).eciToEcf({ x: 0, y: 0, z: 1 }, gmst);
  
  // Swap Y and Z: satellite.js Z → Three.js Y, satellite.js Y → Three.js Z
  const matrix = new Matrix4();
  matrix.set(
    xBasisECF.x, zBasisECF.x, yBasisECF.x, 0,
    xBasisECF.z, zBasisECF.z, yBasisECF.z, 0,  
    xBasisECF.y, zBasisECF.y, yBasisECF.y, 0,
    0, 0, 0, 1
  );
  
  return matrix;
} 