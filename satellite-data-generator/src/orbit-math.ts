/**
 * Orbital mechanics utilities for generating realistic satellite trajectories.
 * Uses simplified Keplerian orbits (circular for now, can add elliptical later).
 */

export interface OrbitParams {
  altitude: number;           // km above Earth surface
  inclination: number;        // degrees (0 = equatorial, 90 = polar)
  longitudeOfAN: number;      // Longitude of Ascending Node (degrees)
  startTime: Date;            // Orbit start time
  numPoints: number;          // Number of data points
  duration: number;           // Total duration in seconds
  startAnomaly?: number;      // Starting position in orbit (degrees), default 0
}

export interface TrajectoryPoint {
  time: number;               // Unix timestamp (ms)
  longitude: number;          // degrees
  latitude: number;           // degrees
  altitude: number;           // meters
  qx: number;                 // Quaternion orientation
  qy: number;
  qz: number;
  qs: number;
  // Position uncertainty covariance (3x3 symmetric, ECEF frame, m²)
  cov_xx: number;
  cov_yy: number;
  cov_zz: number;
  cov_xy: number;
  cov_xz: number;
  cov_yz: number;
}

const EARTH_RADIUS_KM = 6371;
const TWO_PI = 2 * Math.PI;

/**
 * Generate realistic position uncertainty covariance that grows with time.
 * Simulates sparse measurements:
 * - Fresh data after "measurement" has low uncertainty (~10m)
 * - Uncertainty grows between measurements (~50m max)
 * - Creates 3x3 covariance in ECEF frame
 */
function generateCovarianceForEpoch(
  pointIndex: number,
  totalPoints: number,
  measurementInterval: number = 5 // "measurement" every N points
): {
  cov_xx: number;
  cov_yy: number;
  cov_zz: number;
  cov_xy: number;
  cov_xz: number;
  cov_yz: number;
} {
  // Time since last "measurement" (in point indices)
  const timeSinceMeasurement = pointIndex % measurementInterval;
  
  // Base uncertainty (meters) - grows quadratically
  const baseUncertainty = 10 + (timeSinceMeasurement ** 2) * 2;  // 10m → 50m
  
  // Create diagonal-dominant covariance (realistic for orbit determination)
  // Radial uncertainty is typically larger than transverse
  const radialVar = baseUncertainty ** 2;           // σ_r²
  const transverseVar = (baseUncertainty * 0.7) ** 2;  // σ_t²
  
  // Small random correlations (realistic)
  const correlation = (Math.random() - 0.5) * 0.2 * Math.sqrt(radialVar * transverseVar);
  
  return {
    cov_xx: radialVar,
    cov_yy: transverseVar,
    cov_zz: transverseVar,
    cov_xy: correlation,
    cov_xz: correlation * 0.5,
    cov_yz: correlation * 0.5,
  };
}

/**
 * Calculate orbital period using Kepler's Third Law (simplified).
 * T = 2π × sqrt(r³ / μ)
 * where μ = GM (Earth's gravitational parameter)
 */
function calculateOrbitalPeriod(altitudeKm: number): number {
  const radiusKm = EARTH_RADIUS_KM + altitudeKm;
  const mu = 398600.4418; // km³/s² (Earth's gravitational parameter)
  const periodSeconds = TWO_PI * Math.sqrt(Math.pow(radiusKm, 3) / mu);
  return periodSeconds;
}

/**
 * Generate a circular orbit trajectory with simplified Keplerian mechanics.
 */
export function generateCircularOrbit(params: OrbitParams): TrajectoryPoint[] {
  const {
    altitude,
    inclination,
    longitudeOfAN,
    startTime,
    numPoints,
    duration,
    startAnomaly = 0,
  } = params;

  const inclinationRad = (inclination * Math.PI) / 180;
  const loanRad = (longitudeOfAN * Math.PI) / 180;
  const startAnomalyRad = (startAnomaly * Math.PI) / 180;
  const period = calculateOrbitalPeriod(altitude);
  
  const points: TrajectoryPoint[] = [];
  const startTimeMs = startTime.getTime();

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * duration; // Time in seconds since start
    const timeMs = startTimeMs + t * 1000;
    
    // Mean anomaly (angle around orbit) with starting offset
    const meanAnomaly = startAnomalyRad + (t / period) * TWO_PI;
    
    // Simplified position calculation (circular orbit)
    // In orbital plane: x = r*cos(θ), y = r*sin(θ), z = 0
    const x = Math.cos(meanAnomaly);
    const y = Math.sin(meanAnomaly);
    
    // Rotate by inclination (around X-axis)
    const yInc = y * Math.cos(inclinationRad);
    const zInc = y * Math.sin(inclinationRad);
    
    // Rotate by longitude of ascending node (around Z-axis)
    const xFinal = x * Math.cos(loanRad) - yInc * Math.sin(loanRad);
    const yFinal = x * Math.sin(loanRad) + yInc * Math.cos(loanRad);
    const zFinal = zInc;
    
    // Convert to geodetic coordinates
    const latitude = Math.asin(zFinal) * (180 / Math.PI);
    const longitude = Math.atan2(yFinal, xFinal) * (180 / Math.PI);
    
    // Simple nadir-pointing orientation (quaternion pointing Z-axis down)
    // For now, identity quaternion (can add proper LVLH frame later)
    const qx = 0;
    const qy = 0;
    const qz = 0;
    const qs = 1;
    
    // Generate covariance for this epoch
    const covariance = generateCovarianceForEpoch(i, numPoints);
    
    points.push({
      time: timeMs,
      longitude: longitude,
      latitude: latitude,
      altitude: altitude * 1000, // Convert km to meters
      qx,
      qy,
      qz,
      qs,
      ...covariance,  // Spread cov_xx, cov_yy, etc.
    });
  }

  return points;
}

/**
 * Generate a tumbling satellite (rotating quaternion).
 */
export function generateTumblingOrbit(params: OrbitParams): TrajectoryPoint[] {
  const baseOrbit = generateCircularOrbit(params);
  
  // Add rotation to quaternion (tumbling around X-axis)
  return baseOrbit.map((point, idx) => {
    const angle = (idx / params.numPoints) * TWO_PI * 5; // 5 full rotations
    return {
      ...point,
      qx: Math.sin(angle / 2),
      qy: 0,
      qz: 0,
      qs: Math.cos(angle / 2),
    };
  });
}

/**
 * Generate random orbit parameters.
 */
export function randomOrbitParams(seed?: number): OrbitParams {
  // Simple seeded random (for reproducibility)
  let currentSeed = seed !== undefined ? seed : Date.now();
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };
  
  return {
    altitude: 400 + random() * 600,           // 400-1000 km
    inclination: random() * 90,                // 0-90 degrees
    longitudeOfAN: random() * 360,             // 0-360 degrees
    startTime: new Date(),
    numPoints: 10 + Math.floor(random() * 20), // 10-30 points
    duration: 60 * 60,                         // 1 hour
  };
}

