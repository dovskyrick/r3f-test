/**
 * Coordinate Transformations Utility
 * 
 * Implements accurate ICRF↔ITRF transformations using Cesium.js
 * 
 * COORDINATE SYSTEMS:
 * - ICRF: International Celestial Reference Frame (inertial, fixed in space)
 * - ITRF: International Terrestrial Reference Frame (Earth-fixed, rotates with Earth)
 * 
 * For Earth rotation visualization:
 * - Earth model rotates in ITRF coordinates
 * - Celestial frame remains fixed in ICRF coordinates
 * - Transform ITRF→ICRF to show Earth's rotation relative to stars
 */

import { Matrix4, Vector3, Matrix3 } from 'three';
import * as Cesium from 'cesium';

// Global variable to track last log time
let lastLogTime = 0;

/**
 * Converts Modified Julian Date 2000.0 (MJD2000) to JavaScript Date
 * MJD2000 epoch starts at January 1, 2000 00:00:00 UTC
 */
export function mjdToDate(mjd: number): Date {
  // MJD2000 0 = January 1, 2000 00:00:00 UTC
  // January 1, 2000 00:00:00 UTC = Unix timestamp 946684800000 ms
  // So: MJD2000 * 86400000 + 946684800000 = Unix timestamp
  
  const unixTimestamp = mjd * 86400000 + 946684800000;
  const date = new Date(unixTimestamp);
  
  // Only log every 5 seconds
  const now = Date.now();
  if (now - lastLogTime > 5000) {
    console.log('DEBUG: MJD2000 conversion - Input MJD:', mjd, 'Output Date:', date.toISOString());
    lastLogTime = now;
  }
  
  return date;
}

/**
 * Converts JavaScript Date to Modified Julian Date 2000.0 (MJD2000)
 */
export function dateToMJD(date: Date): number {
  // Reverse of the above conversion
  const unixTimestamp = date.getTime();
  const mjd = (unixTimestamp - 946684800000) / 86400000;
  
  // Only log every 5 seconds
  const now = Date.now();
  if (now - lastLogTime > 5000) {
    console.log('DEBUG: Date to MJD2000 conversion - Input Date:', date.toISOString(), 'Output MJD:', mjd);
    lastLogTime = now;
  }
  
  return mjd;
}

/**
 * Converts Cesium Matrix3 to Three.js Matrix4
 * Direct conversion without coordinate system transformation
 */
function cesiumMatrix3ToThreeMatrix4(cesiumMatrix: Cesium.Matrix3): Matrix4 {
  const m = cesiumMatrix;
  const threeMatrix = new Matrix4();
  
  // Direct conversion from Cesium Matrix3 to Three.js Matrix4
  // No coordinate system transformation - keep rotation axis as-is
  threeMatrix.set(
    m[0], m[3], m[6], 0,  // Column 0
    m[1], m[4], m[7], 0,  // Column 1  
    m[2], m[5], m[8], 0,  // Column 2
    0,    0,    0,    1   // Column 3
  );
  
  // Only log every 5 seconds
  const now = Date.now();
  if (now - lastLogTime > 5000) {
    console.log('DEBUG: Cesium matrix:', Array.from(m));
    console.log('DEBUG: Three.js matrix (direct conversion):', threeMatrix.elements);
    lastLogTime = now;
  }
  
  return threeMatrix;
}

/**
 * Gets the ITRF to ICRF transformation matrix using Cesium
 * This shows how Earth rotates relative to the fixed celestial frame
 */
export function getItrfToIcrfMatrix(date: Date): Matrix4 {
  // Only log every 5 seconds
  const now = Date.now();
  const shouldLog = now - lastLogTime > 5000;
  
  if (shouldLog) {
    console.log('DEBUG: getItrfToIcrfMatrix called with date:', date.toISOString());
    
    // Check what Cesium functions are available
    console.log('DEBUG: Cesium object:', typeof Cesium);
    console.log('DEBUG: Cesium.Transforms:', typeof Cesium.Transforms);
    
    // More detailed function availability check
    if (Cesium.Transforms) {
      console.log('DEBUG: computeFixedToIcrfMatrix available:', typeof Cesium.Transforms.computeFixedToIcrfMatrix);
      console.log('DEBUG: computeIcrfToFixedMatrix available:', typeof Cesium.Transforms.computeIcrfToFixedMatrix);
      console.log('DEBUG: All Cesium.Transforms functions:', Object.keys(Cesium.Transforms));
    }
    
    lastLogTime = now;
  }
  
  const julianDate = Cesium.JulianDate.fromDate(date);
  if (shouldLog) {
    console.log('DEBUG: Julian date created:', julianDate);
    console.log('DEBUG: Julian date dayNumber:', julianDate.dayNumber);
    console.log('DEBUG: Julian date secondsOfDay:', julianDate.secondsOfDay);
  }
  
  // Try different Cesium transformation functions
  let cesiumMatrix;
  
  if (typeof Cesium.Transforms.computeFixedToIcrfMatrix === 'function') {
    if (shouldLog) console.log('DEBUG: Attempting computeFixedToIcrfMatrix...');
    try {
      cesiumMatrix = Cesium.Transforms.computeFixedToIcrfMatrix(julianDate);
      if (shouldLog) {
        console.log('DEBUG: computeFixedToIcrfMatrix result:', cesiumMatrix);
        console.log('DEBUG: Matrix is defined:', cesiumMatrix !== undefined);
        console.log('DEBUG: Matrix is Matrix3:', cesiumMatrix instanceof Cesium.Matrix3);
      }
    } catch (error) {
      if (shouldLog) console.error('DEBUG: Error in computeFixedToIcrfMatrix:', error);
    }
  } else if (typeof Cesium.Transforms.computeIcrfToFixedMatrix === 'function') {
    if (shouldLog) console.log('DEBUG: Attempting computeIcrfToFixedMatrix (will invert)...');
    try {
      const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(julianDate);
      if (shouldLog) {
        console.log('DEBUG: computeIcrfToFixedMatrix result:', icrfToFixed);
      }
      if (icrfToFixed) {
        // Invert the matrix to get Fixed to ICRF
        cesiumMatrix = Cesium.Matrix3.inverse(icrfToFixed, new Cesium.Matrix3());
        if (shouldLog) {
          console.log('DEBUG: Inverted matrix:', cesiumMatrix);
        }
      }
    } catch (error) {
      if (shouldLog) console.error('DEBUG: Error in computeIcrfToFixedMatrix:', error);
    }
  } else {
    if (shouldLog) console.log('DEBUG: No ICRF transformation functions found, trying GMST rotation');
    // Fallback to simple Earth rotation using GMST
    const gmst = getGMSTFromCesium(date);
    if (gmst !== null) {
      const rotationMatrix = new Matrix4();
      rotationMatrix.makeRotationZ(gmst);
      if (shouldLog) console.log('DEBUG: Using GMST fallback rotation:', gmst, 'radians');
      return rotationMatrix;
    }
  }
  
  if (shouldLog) {
    console.log('DEBUG: Final cesiumMatrix check:', cesiumMatrix);
    console.log('DEBUG: cesiumMatrix type:', typeof cesiumMatrix);
    console.log('DEBUG: cesiumMatrix is truthy:', !!cesiumMatrix);
  }
  
  if (!cesiumMatrix) {
    if (shouldLog) console.warn('DEBUG: Cesium transformation failed, using simple Earth rotation fallback');
    // Fallback to simple Earth rotation
    const gmst = getSimpleGMST(date);
    const rotationMatrix = new Matrix4();
    rotationMatrix.makeRotationZ(gmst);
    if (shouldLog) console.log('DEBUG: Using simple GMST fallback:', gmst, 'radians');
    return rotationMatrix;
  }
  
  const threeMatrix = cesiumMatrix3ToThreeMatrix4(cesiumMatrix);
  if (shouldLog) {
    console.log('DEBUG: Successfully converted to Three.js matrix:', threeMatrix.elements);
  }
  
  return threeMatrix;
}

/**
 * Gets the ICRF to ITRF transformation matrix using Cesium
 * This is the inverse of the above transformation
 */
export function getIcrfToItrfMatrix(date: Date): Matrix4 {
  const julianDate = Cesium.JulianDate.fromDate(date);
  const cesiumMatrix = Cesium.Transforms.computeIcrfToFixedMatrix(julianDate);
  
  if (!cesiumMatrix) {
    console.warn('Cesium.Transforms.computeIcrfToFixedMatrix returned undefined, using identity matrix');
    return new Matrix4();
  }
  
  return cesiumMatrix3ToThreeMatrix4(cesiumMatrix);
}

/**
 * Transforms a vector from ITRF to ICRF coordinates
 */
export function transformItrfToIcrf(vector: Vector3, date: Date): Vector3 {
  const transformMatrix = getItrfToIcrfMatrix(date);
  return vector.clone().applyMatrix4(transformMatrix);
}

/**
 * Transforms a vector from ICRF to ITRF coordinates
 */
export function transformIcrfToItrf(vector: Vector3, date: Date): Vector3 {
  const transformMatrix = getIcrfToItrfMatrix(date);
  return vector.clone().applyMatrix4(transformMatrix);
} 

/**
 * Try to get GMST from Cesium
 */
function getGMSTFromCesium(date: Date): number | null {
  try {
    const julianDate = Cesium.JulianDate.fromDate(date);
    
    // Try different GMST functions using dynamic property access
    const transforms = Cesium.Transforms as any;
    
    if (typeof transforms.computeGmstMatrix === 'function') {
      const gmstMatrix = transforms.computeGmstMatrix(julianDate);
      if (gmstMatrix) {
        // Extract rotation angle from the matrix
        return Math.atan2(gmstMatrix[3], gmstMatrix[0]);
      }
    }
    
    if (typeof transforms.computeGmst === 'function') {
      return transforms.computeGmst(julianDate);
    }
    
    return null;
  } catch (error) {
    console.log('DEBUG: Error getting GMST from Cesium:', error);
    return null;
  }
}

/**
 * Simple GMST calculation as fallback
 */
function getSimpleGMST(date: Date): number {
  const hours = date.getUTCHours() + 
                date.getUTCMinutes() / 60 + 
                date.getUTCSeconds() / 3600;

  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = (date.getTime() - start.getTime());
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const gmst = 6.697374558 + 0.06570982441908 * dayOfYear + 1.00273790935 * hours;
  
  return (gmst * Math.PI / 12) % (2 * Math.PI);
} 