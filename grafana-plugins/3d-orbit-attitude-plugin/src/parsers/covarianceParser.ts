/**
 * Covariance Parser
 * 
 * Extracts position uncertainty covariance matrices from Grafana DataFrames.
 * Covariance format: 3x3 symmetric matrix in ECEF frame (meters²)
 */

import { DataFrame, Field } from '@grafana/data';

/**
 * Covariance matrix (3x3 position uncertainty in ECEF)
 */
export interface CovarianceMatrix {
  xx: number;  // Variance in X (m²)
  yy: number;  // Variance in Y (m²)
  zz: number;  // Variance in Z (m²)
  xy: number;  // Covariance X-Y (m²)
  xz: number;  // Covariance X-Z (m²)
  yz: number;  // Covariance Y-Z (m²)
}

/**
 * Covariance data associated with a timestamp
 */
export interface CovarianceEpoch {
  timestamp: number;  // Unix timestamp (ms)
  covariance: CovarianceMatrix;
}

/**
 * Parse covariance data from a DataFrame.
 * Returns array of covariance epochs (one per trajectory point).
 */
export function parseCovariance(dataFrame: DataFrame): CovarianceEpoch[] {
  try {
    // Find covariance fields
    const timeField = dataFrame.fields.find((f: Field) => f.name === 'Time');
    const covXXField = dataFrame.fields.find((f: Field) => f.name === 'cov_xx');
    const covYYField = dataFrame.fields.find((f: Field) => f.name === 'cov_yy');
    const covZZField = dataFrame.fields.find((f: Field) => f.name === 'cov_zz');
    const covXYField = dataFrame.fields.find((f: Field) => f.name === 'cov_xy');
    const covXZField = dataFrame.fields.find((f: Field) => f.name === 'cov_xz');
    const covYZField = dataFrame.fields.find((f: Field) => f.name === 'cov_yz');
    
    // If no covariance data, return empty array
    if (!covXXField || !covYYField || !covZZField || !timeField) {
      console.log('ℹ️ No covariance data found in DataFrame');
      return [];
    }
    
    const length = timeField.values.length;
    const epochs: CovarianceEpoch[] = [];
    
    for (let i = 0; i < length; i++) {
      const timestamp = timeField.values[i];
      
      // Extract covariance values
      const covariance: CovarianceMatrix = {
        xx: covXXField.values[i] || 0,
        yy: covYYField.values[i] || 0,
        zz: covZZField.values[i] || 0,
        xy: covXYField?.values[i] || 0,
        xz: covXZField?.values[i] || 0,
        yz: covYZField?.values[i] || 0,
      };
      
      // Basic validation: check if covariance is physically valid (positive variances)
      if (covariance.xx > 0 && covariance.yy > 0 && covariance.zz > 0) {
        epochs.push({
          timestamp,
          covariance,
        });
      } else {
        console.warn(`⚠️ Invalid covariance at index ${i}: negative variance`);
      }
    }
    
    console.log(`✅ Parsed ${epochs.length} covariance epochs`);
    return epochs;
    
  } catch (error) {
    console.warn('❌ Covariance parsing failed:', error);
    return [];
  }
}

/**
 * Find the nearest covariance epoch to a given timestamp.
 * Used for sparse covariance data (not every trajectory point has covariance).
 */
export function findNearestCovariance(
  epochs: CovarianceEpoch[],
  targetTimestamp: number
): { covariance: CovarianceMatrix; deltaTime: number } | null {
  if (epochs.length === 0) {
    return null;
  }
  
  let nearestIndex = 0;
  let minDelta = Math.abs(epochs[0].timestamp - targetTimestamp);
  
  for (let i = 1; i < epochs.length; i++) {
    const delta = Math.abs(epochs[i].timestamp - targetTimestamp);
    if (delta < minDelta) {
      minDelta = delta;
      nearestIndex = i;
    }
  }
  
  return {
    covariance: epochs[nearestIndex].covariance,
    deltaTime: minDelta,  // milliseconds
  };
}

