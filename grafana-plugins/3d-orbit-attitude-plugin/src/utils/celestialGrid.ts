/**
 * RA/Dec celestial grid generation utilities.
 * Generates Right Ascension and Declination reference lines in the inertial (ECI) frame,
 * transformed to ECEF for rendering in Cesium.
 */

import {
  Cartesian3,
  Matrix3,
  Transforms,
  JulianDate,
  Math as CesiumMath,
} from 'cesium';

export interface RADecGridOptions {
  raSpacing: number;         // Hours (1-6)
  decSpacing: number;        // Degrees (10-30)
  celestialRadius: number;   // Distance from Earth center (in meters)
  referenceTime: JulianDate; // Time for ECI→ECEF transform
  numSamplesPerLine?: number; // Detail (default: 180)
}

export interface RADecGrid {
  raLines: Cartesian3[][];   // Right Ascension meridians (great circles through poles)
  decLines: Cartesian3[][];  // Declination parallels (circles parallel to equator)
}

/**
 * Generate RA/Dec celestial grid in ECEF frame for rendering.
 */
export function generateRADecGrid(options: RADecGridOptions): RADecGrid {
  const {
    raSpacing,
    decSpacing,
    celestialRadius,
    referenceTime,
    numSamplesPerLine = 180,
  } = options;

  // Get ECI to ECEF transformation matrix
  const icrfToFixed = Transforms.computeIcrfToFixedMatrix(referenceTime);

  // Generate lines in ECI frame
  const decLinesECI = generateDeclinationLines(decSpacing, celestialRadius, numSamplesPerLine);
  const raLinesECI = generateRightAscensionLines(raSpacing, celestialRadius, numSamplesPerLine);

  // Transform to ECEF
  const decLines = decLinesECI.map(line => transformLineToECEF(line, icrfToFixed));
  const raLines = raLinesECI.map(line => transformLineToECEF(line, icrfToFixed));

  return { raLines, decLines };
}

/**
 * Generate declination lines (parallels) in ECI frame.
 * These are circles parallel to the celestial equator at various declination angles.
 */
function generateDeclinationLines(
  decSpacing: number,
  radius: number,
  numSamples: number
): Cartesian3[][] {
  const lines: Cartesian3[][] = [];

  // Skip poles (-90° and +90°) as they're degenerate (single points)
  for (let dec = -90 + decSpacing; dec < 90; dec += decSpacing) {
    const decRad = CesiumMath.toRadians(dec);
    const circleRadius = radius * Math.cos(decRad);
    const z = radius * Math.sin(decRad);

    const line: Cartesian3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const angle = (i / numSamples) * 2 * Math.PI;
      const x = circleRadius * Math.cos(angle);
      const y = circleRadius * Math.sin(angle);
      line.push(new Cartesian3(x, y, z));
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Generate right ascension lines (meridians) in ECI frame.
 * These are great circles passing through both celestial poles.
 */
function generateRightAscensionLines(
  raSpacing: number,
  radius: number,
  numSamples: number
): Cartesian3[][] {
  const lines: Cartesian3[][] = [];
  const raSpacingDegrees = raSpacing * 15; // Convert hours to degrees (1h = 15°)

  for (let ra = 0; ra < 360; ra += raSpacingDegrees) {
    const raRad = CesiumMath.toRadians(ra);

    const line: Cartesian3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const dec = -90 + (i / numSamples) * 180; // From -90° to +90°
      const decRad = CesiumMath.toRadians(dec);

      const x = radius * Math.cos(decRad) * Math.cos(raRad);
      const y = radius * Math.cos(decRad) * Math.sin(raRad);
      const z = radius * Math.sin(decRad);

      line.push(new Cartesian3(x, y, z));
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Transform a line from ECI to ECEF frame.
 */
function transformLineToECEF(
  lineECI: Cartesian3[],
  icrfToFixed: Matrix3
): Cartesian3[] {
  return lineECI.map(point =>
    Matrix3.multiplyByVector(icrfToFixed, point, new Cartesian3())
  );
}

