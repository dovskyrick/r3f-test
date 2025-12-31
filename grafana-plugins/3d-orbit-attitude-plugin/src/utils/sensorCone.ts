import { Cartesian3, Math as CesiumMath } from 'cesium';

/**
 * Generate polyline positions for a sensor FOV cone
 * @param apexPosition Cone apex (satellite position)
 * @param direction Cone axis direction (sensor pointing vector, normalized)
 * @param fovDegrees Field of view in degrees
 * @param length Cone length (distance from apex to base)
 * @param numSegments Number of segments in base circle (default 16)
 * @returns Array of Cartesian3 positions for polylines
 */
export function generateConeMesh(
  apexPosition: Cartesian3,
  direction: Cartesian3,
  fovDegrees: number,
  length: number,
  numSegments = 16
): Cartesian3[] {
  
  const positions: Cartesian3[] = [];
  const halfAngle = CesiumMath.toRadians(fovDegrees / 2);
  const baseRadius = length * Math.tan(halfAngle);
  
  // Create orthonormal basis (right, forward, up)
  // up = direction (normalized)
  const up = Cartesian3.normalize(direction, new Cartesian3());
  
  // Find perpendicular vector for 'right'
  let right = Cartesian3.cross(up, Cartesian3.UNIT_Z, new Cartesian3());
  if (Cartesian3.magnitude(right) < 0.1) {
    // Direction is parallel to Z, use X instead
    right = Cartesian3.cross(up, Cartesian3.UNIT_X, new Cartesian3());
  }
  Cartesian3.normalize(right, right);
  
  // Forward is perpendicular to both up and right
  const forward = Cartesian3.cross(right, up, new Cartesian3());
  Cartesian3.normalize(forward, forward);
  
  // Base center position
  const baseCenter = Cartesian3.add(
    apexPosition,
    Cartesian3.multiplyByScalar(direction, length, new Cartesian3()),
    new Cartesian3()
  );
  
  // Generate lines from apex to base circle
  for (let i = 0; i <= numSegments; i++) {
    const theta = (i / numSegments) * 2 * Math.PI;
    const x = baseRadius * Math.cos(theta);
    const y = baseRadius * Math.sin(theta);
    
    const offset = Cartesian3.add(
      Cartesian3.multiplyByScalar(right, x, new Cartesian3()),
      Cartesian3.multiplyByScalar(forward, y, new Cartesian3()),
      new Cartesian3()
    );
    
    const circlePoint = Cartesian3.add(baseCenter, offset, new Cartesian3());
    
    // Line from apex to circle point
    positions.push(Cartesian3.clone(apexPosition));
    positions.push(circlePoint);
  }
  
  // Generate base circle
  for (let i = 0; i <= numSegments; i++) {
    const theta = (i / numSegments) * 2 * Math.PI;
    const x = baseRadius * Math.cos(theta);
    const y = baseRadius * Math.sin(theta);
    
    const offset = Cartesian3.add(
      Cartesian3.multiplyByScalar(right, x, new Cartesian3()),
      Cartesian3.multiplyByScalar(forward, y, new Cartesian3()),
      new Cartesian3()
    );
    
    positions.push(Cartesian3.add(baseCenter, offset, new Cartesian3()));
  }
  
  return positions;
}

/**
 * Get distinct color for sensor index
 */
export const SENSOR_COLORS = [
  { r: 0, g: 255, b: 255, a: 0.6 },    // Cyan
  { r: 255, g: 0, b: 255, a: 0.6 },    // Magenta
  { r: 255, g: 255, b: 0, a: 0.6 },    // Yellow
  { r: 255, g: 165, b: 0, a: 0.6 },    // Orange
  { r: 0, g: 255, b: 0, a: 0.6 },      // Lime
  { r: 255, g: 192, b: 203, a: 0.6 },  // Pink
  { r: 238, g: 130, b: 238, a: 0.6 },  // Violet
  { r: 127, g: 255, b: 212, a: 0.6 },  // Aqua
  { r: 255, g: 215, b: 0, a: 0.6 },    // Gold
  { r: 255, g: 127, b: 80, a: 0.6 },   // Coral
];

/**
 * Generate solid cone mesh for transparent rendering
 * Creates triangular faces from apex to base circle
 * 
 * @param apexPosition Cone apex (satellite position)
 * @param direction Cone axis direction (sensor pointing vector, normalized)
 * @param fovDegrees Field of view in degrees
 * @param length Cone length (distance from apex to base)
 * @param numSegments Number of segments in base circle (default 32 for smooth appearance)
 * @returns Array of Cartesian3 arrays, each representing a triangular face
 */
export function generateSolidConeMesh(
  apexPosition: Cartesian3,
  direction: Cartesian3,
  fovDegrees: number,
  length: number,
  numSegments = 32
): Cartesian3[][] {
  const triangles: Cartesian3[][] = [];
  const halfAngle = CesiumMath.toRadians(fovDegrees / 2);
  const baseRadius = length * Math.tan(halfAngle);
  
  // Create orthonormal basis
  const up = Cartesian3.normalize(direction, new Cartesian3());
  
  let right = Cartesian3.cross(up, Cartesian3.UNIT_Z, new Cartesian3());
  if (Cartesian3.magnitude(right) < 0.1) {
    right = Cartesian3.cross(up, Cartesian3.UNIT_X, new Cartesian3());
  }
  Cartesian3.normalize(right, right);
  
  const forward = Cartesian3.cross(right, up, new Cartesian3());
  Cartesian3.normalize(forward, forward);
  
  // Base center position
  const baseCenter = Cartesian3.add(
    apexPosition,
    Cartesian3.multiplyByScalar(direction, length, new Cartesian3()),
    new Cartesian3()
  );
  
  // Generate base circle points
  const basePoints: Cartesian3[] = [];
  for (let i = 0; i < numSegments; i++) {
    const theta = (i / numSegments) * 2 * Math.PI;
    const x = baseRadius * Math.cos(theta);
    const y = baseRadius * Math.sin(theta);
    
    const offset = Cartesian3.add(
      Cartesian3.multiplyByScalar(right, x, new Cartesian3()),
      Cartesian3.multiplyByScalar(forward, y, new Cartesian3()),
      new Cartesian3()
    );
    
    basePoints.push(Cartesian3.add(baseCenter, offset, new Cartesian3()));
  }
  
  // Create triangular faces from apex to each base segment
  for (let i = 0; i < numSegments; i++) {
    const nextIndex = (i + 1) % numSegments;
    triangles.push([
      Cartesian3.clone(apexPosition),
      Cartesian3.clone(basePoints[i]),
      Cartesian3.clone(basePoints[nextIndex])
    ]);
  }
  
  return triangles;
}

