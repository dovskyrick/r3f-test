/**
 * Coordinate Transformations Utility
 * 
 * CURRENT STATE: Simplified placeholder implementations
 * FUTURE PLAN: Replace with Cesium.js for accurate ICRF↔ITRF transformations
 * 
 * This file currently provides basic coordinate transformation functions
 * that maintain the interface for the application while removing dependencies
 * on astronomy-engine and satellite.js.
 * 
 * CESIUM IMPLEMENTATION PLAN:
 * 1. Replace getIcrfToItrfMatrix() with Cesium.Transforms.computeIcrfToFixedMatrix()
 * 2. Replace getItrfToIcrfMatrix() with Cesium.Transforms.computeFixedToIcrfMatrix()
 * 3. Replace getGMST() with Cesium.Transforms.computeGmstMatrix()
 * 4. Update time handling to use Cesium.JulianDate
 * 5. Remove deprecated functions and placeholders
 * 
 * BENEFITS OF CESIUM IMPLEMENTATION:
 * - Complete ICRF↔ITRF transformation including Earth's axial tilt
 * - Accounts for precession, nutation, and polar motion
 * - Industry-standard precision used by NASA and ESA
 * - No external API dependencies or token requirements
 */

import { Matrix4, Vector3 } from 'three';

/**
 * Converts Modified Julian Date (MJD) to JavaScript Date
 * MJD epoch starts at midnight on November 17, 1858
 */
export function mjdToDate(mjd: number): Date {
  // MJD to Julian Date conversion
  const jd = mjd + 2400000.5;
  
  // Julian Date to Unix timestamp
  const unixTimestamp = (jd - 2440587.5) * 86400000;
  
  return new Date(unixTimestamp);
}

/**
 * Converts JavaScript Date to Modified Julian Date (MJD)
 */
export function dateToMJD(date: Date): number {
  // Unix timestamp to Julian Date
  const jd = (date.getTime() / 86400000) + 2440587.5;
  
  // Julian Date to MJD
  return jd - 2400000.5;
}

/**
 * Placeholder for future Cesium ICRF to ITRF transformation
 * Currently returns identity matrix - will be replaced with Cesium implementation
 */
export function getIcrfToItrfMatrix(date: Date): Matrix4 {
  // TODO: Replace with Cesium.Transforms.computeIcrfToFixedMatrix(julianDate)
  console.warn('getIcrfToItrfMatrix: Using placeholder identity matrix. Implement Cesium transformation.');
  return new Matrix4(); // Identity matrix
}

/**
 * Placeholder for future Cesium ITRF to ICRF transformation
 * Currently returns identity matrix - will be replaced with Cesium implementation
 */
export function getItrfToIcrfMatrix(date: Date): Matrix4 {
  // TODO: Replace with Cesium.Transforms.computeFixedToIcrfMatrix(julianDate)
  console.warn('getItrfToIcrfMatrix: Using placeholder identity matrix. Implement Cesium transformation.');
  return new Matrix4(); // Identity matrix
}

/**
 * Transforms a vector from ICRF to ITRF coordinates
 * Currently uses placeholder - will be replaced with Cesium implementation
 */
export function transformIcrfToItrf(vector: Vector3, date: Date): Vector3 {
  const transformMatrix = getIcrfToItrfMatrix(date);
  return vector.clone().applyMatrix4(transformMatrix);
}

/**
 * Transforms a vector from ITRF to ICRF coordinates
 * Currently uses placeholder - will be replaced with Cesium implementation
 */
export function transformItrfToIcrf(vector: Vector3, date: Date): Vector3 {
  const transformMatrix = getItrfToIcrfMatrix(date);
  return vector.clone().applyMatrix4(transformMatrix);
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in radians
 * Simplified approximation - will be replaced with Cesium implementation
 */
export function getGMST(date: Date): number {
  // TODO: Replace with Cesium.Transforms.computeGmstMatrix(julianDate)
  
  // Simple approximation for now
  const hours = date.getUTCHours() + 
                date.getUTCMinutes() / 60 + 
                date.getUTCSeconds() / 3600;

  // Get day of year (1-366)
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = (date.getTime() - start.getTime());
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Calculate GMST in hours using approximate formula
  const gmst = 6.697374558 + 0.06570982441908 * dayOfYear + 1.00273790935 * hours;
  
  // Convert to radians and normalize to [0, 2π]
  return (gmst * Math.PI / 12) % (2 * Math.PI);
}

/**
 * Simple Earth rotation matrix around Z-axis based on time
 * Placeholder for more accurate Cesium-based transformation
 */
export function getSimpleEarthRotationMatrix(date: Date): Matrix4 {
  const gmst = getGMST(date);
  
  // Create rotation matrix around Z-axis (simplified Earth rotation)
  const rotationMatrix = new Matrix4();
  rotationMatrix.makeRotationZ(gmst);
  
  return rotationMatrix;
}

// Legacy function names for backward compatibility
// These will be removed once all references are updated

/**
 * @deprecated Use getSimpleEarthRotationMatrix instead
 * Placeholder for satellite.js satelliteToThreeMatrix function
 */
export function satelliteToThreeMatrix(date: Date): Matrix4 {
  console.warn('satelliteToThreeMatrix: Using simplified Earth rotation. Replace with Cesium implementation.');
  return getSimpleEarthRotationMatrix(date);
} 