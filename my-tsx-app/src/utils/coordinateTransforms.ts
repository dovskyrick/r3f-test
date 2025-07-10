import { Matrix3, Matrix4, Quaternion } from 'three';
import { RotationMatrix } from 'astronomy-engine';

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