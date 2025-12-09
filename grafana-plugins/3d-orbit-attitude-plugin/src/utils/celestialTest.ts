/**
 * Test utility to verify visibility of lines at celestial sphere distance.
 * Creates 6 circles at 100x Earth radius, one perpendicular to each axis direction.
 */

import { Cartesian3, Ellipsoid } from 'cesium';

export interface CelestialTestCircles {
  circles: Cartesian3[][];
  labels: string[];
}

/**
 * Generate 6 test circles at celestial sphere distance to verify visibility.
 * Each circle is centered at 100x Earth radius along an axis direction,
 * perpendicular to that radial direction.
 */
export function generateCelestialTestCircles(
  distanceMultiplier = 100,
  circleRadiusMultiplier = 20,
  numPoints = 64
): CelestialTestCircles {
  const earthRadius = Ellipsoid.WGS84.maximumRadius;
  const celestialDistance = earthRadius * distanceMultiplier;
  const circleRadius = earthRadius * circleRadiusMultiplier;

  const circles: Cartesian3[][] = [];
  const labels = ['+X axis', '-X axis', '+Y axis', '-Y axis', '+Z axis (North)', '-Z axis (South)'];

  // +X axis: center at (celestialDistance, 0, 0), circle in Y-Z plane
  circles.push(createCircleInPlane(
    new Cartesian3(celestialDistance, 0, 0),
    new Cartesian3(1, 0, 0), // normal to circle = radial direction
    circleRadius,
    numPoints
  ));

  // -X axis: center at (-celestialDistance, 0, 0), circle in Y-Z plane
  circles.push(createCircleInPlane(
    new Cartesian3(-celestialDistance, 0, 0),
    new Cartesian3(-1, 0, 0),
    circleRadius,
    numPoints
  ));

  // +Y axis: center at (0, celestialDistance, 0), circle in X-Z plane
  circles.push(createCircleInPlane(
    new Cartesian3(0, celestialDistance, 0),
    new Cartesian3(0, 1, 0),
    circleRadius,
    numPoints
  ));

  // -Y axis: center at (0, -celestialDistance, 0), circle in X-Z plane
  circles.push(createCircleInPlane(
    new Cartesian3(0, -celestialDistance, 0),
    new Cartesian3(0, -1, 0),
    circleRadius,
    numPoints
  ));

  // +Z axis (North): center at (0, 0, celestialDistance), circle in X-Y plane
  circles.push(createCircleInPlane(
    new Cartesian3(0, 0, celestialDistance),
    new Cartesian3(0, 0, 1),
    circleRadius,
    numPoints
  ));

  // -Z axis (South): center at (0, 0, -celestialDistance), circle in X-Y plane
  circles.push(createCircleInPlane(
    new Cartesian3(0, 0, -celestialDistance),
    new Cartesian3(0, 0, -1),
    circleRadius,
    numPoints
  ));

  return { circles, labels };
}

/**
 * Create a circle in 3D space given center, normal, and radius.
 */
function createCircleInPlane(
  center: Cartesian3,
  normal: Cartesian3,
  radius: number,
  numPoints: number
): Cartesian3[] {
  // Normalize the normal vector
  const n = Cartesian3.normalize(normal, new Cartesian3());

  // Find two perpendicular vectors to the normal (form a basis for the plane)
  // Use cross product with a non-parallel vector
  let u: Cartesian3;
  if (Math.abs(n.x) < 0.9) {
    // Normal is not close to X axis, use X as reference
    u = Cartesian3.cross(n, Cartesian3.UNIT_X, new Cartesian3());
  } else {
    // Normal is close to X axis, use Y as reference
    u = Cartesian3.cross(n, Cartesian3.UNIT_Y, new Cartesian3());
  }
  Cartesian3.normalize(u, u);

  // Get the second perpendicular vector
  const v = Cartesian3.cross(n, u, new Cartesian3());
  Cartesian3.normalize(v, v);

  // Generate circle points
  const points: Cartesian3[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Point on circle = center + radius * (cos * u + sin * v)
    const point = new Cartesian3(
      center.x + radius * (cos * u.x + sin * v.x),
      center.y + radius * (cos * u.y + sin * v.y),
      center.z + radius * (cos * u.z + sin * v.z)
    );
    points.push(point);
  }

  return points;
}

