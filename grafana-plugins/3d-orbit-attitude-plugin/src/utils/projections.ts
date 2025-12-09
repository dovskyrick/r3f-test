/**
 * Pure projection calculation utilities for satellite visualization.
 * These functions compute ground projections for attitude vectors and FOV footprints.
 */

import {
  Cartesian3,
  Quaternion,
  Matrix3,
  Ray,
  IntersectionTests,
  Ellipsoid,
  PolygonHierarchy,
} from 'cesium';

/**
 * Compute the ground intersection point for the satellite's Z-axis vector.
 * 
 * @param position - Satellite position in ECEF (Cartesian3)
 * @param orientation - Satellite orientation (Quaternion)
 * @returns Ground intersection point (Cartesian3) or null if no intersection
 */
export function computeZAxisGroundIntersection(
  position: Cartesian3,
  orientation: Quaternion
): Cartesian3 | null {
  // Z-axis unit vector in body frame
  const zAxisBody = new Cartesian3(0, 0, 1);
  
  // Rotate Z-axis by satellite orientation to get direction in ECEF
  const rotationMatrix = Matrix3.fromQuaternion(orientation);
  const zAxisECEF = Matrix3.multiplyByVector(rotationMatrix, zAxisBody, new Cartesian3());
  
  // Normalize direction
  const direction = Cartesian3.normalize(zAxisECEF, new Cartesian3());
  
  // Create ray from satellite position along Z-axis direction
  const ray = new Ray(position, direction);
  
  // Find intersection with Earth's ellipsoid
  const intersection = IntersectionTests.rayEllipsoid(ray, Ellipsoid.WGS84);
  
  if (intersection) {
    // Return the ground intersection point
    return Ray.getPoint(ray, intersection.start);
  }
  
  // No intersection (vector pointing away from Earth)
  return null;
}

/**
 * Compute the FOV cone footprint on the Earth's surface.
 * 
 * @param position - Satellite position in ECEF (Cartesian3)
 * @param orientation - Satellite orientation (Quaternion)
 * @param halfAngleDegrees - FOV cone half-angle in degrees (e.g., 5 for a 10° total cone)
 * @param numRays - Number of rays to sample around the cone (more = smoother polygon)
 * @param offsetMeters - Offset above surface to avoid z-fighting (default: 100m)
 * @returns Array of ground points forming the footprint polygon
 */
export function computeFOVFootprint(
  position: Cartesian3,
  orientation: Quaternion,
  halfAngleDegrees: number,
  numRays = 36,
  offsetMeters = 100
): Cartesian3[] {
  // Z-axis (cone axis) in body frame
  const zAxisBody = new Cartesian3(0, 0, 1);
  const rotationMatrix = Matrix3.fromQuaternion(orientation);
  const zAxisECEF = Matrix3.multiplyByVector(rotationMatrix, zAxisBody, new Cartesian3());
  const coneAxis = Cartesian3.normalize(zAxisECEF, new Cartesian3());
  
  // Convert half-angle to radians
  const halfAngleRad = (halfAngleDegrees * Math.PI) / 180;
  
  // Find two perpendicular vectors to the cone axis to define a coordinate frame
  const perp1 = Cartesian3.cross(coneAxis, Cartesian3.UNIT_Z, new Cartesian3());
  if (Cartesian3.magnitude(perp1) < 0.01) {
    // Cone axis is parallel to Z, use X instead
    Cartesian3.cross(coneAxis, Cartesian3.UNIT_X, perp1);
  }
  Cartesian3.normalize(perp1, perp1);
  const perp2 = Cartesian3.cross(coneAxis, perp1, new Cartesian3());
  Cartesian3.normalize(perp2, perp2);
  
  const footprintPoints: Cartesian3[] = [];
  
  // Sample rays around the cone
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * 2 * Math.PI;
    
    // Compute direction on cone surface
    const cosHalf = Math.cos(halfAngleRad);
    const sinHalf = Math.sin(halfAngleRad);
    
    // Direction in the perpendicular plane (circular cross-section of cone)
    const circleDir = Cartesian3.add(
      Cartesian3.multiplyByScalar(perp1, Math.cos(angle) * sinHalf, new Cartesian3()),
      Cartesian3.multiplyByScalar(perp2, Math.sin(angle) * sinHalf, new Cartesian3()),
      new Cartesian3()
    );
    
    // Combine cone axis component and circle component
    const rayDirection = Cartesian3.add(
      Cartesian3.multiplyByScalar(coneAxis, cosHalf, new Cartesian3()),
      circleDir,
      new Cartesian3()
    );
    Cartesian3.normalize(rayDirection, rayDirection);
    
    // Create ray and find Earth intersection
    const ray = new Ray(position, rayDirection);
    const intersection = IntersectionTests.rayEllipsoid(ray, Ellipsoid.WGS84);
    
    if (intersection) {
      const groundPoint = Ray.getPoint(ray, intersection.start);
      
      // Offset above surface to avoid z-fighting with terrain
      const surfaceNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(groundPoint, new Cartesian3());
      const offsetPoint = Cartesian3.add(
        groundPoint,
        Cartesian3.multiplyByScalar(surfaceNormal, offsetMeters, new Cartesian3()),
        new Cartesian3()
      );
      
      footprintPoints.push(offsetPoint);
    }
  }
  
  return footprintPoints;
}

/**
 * Create a dummy triangle PolygonHierarchy for use when data is unavailable.
 * This prevents Cesium rendering errors when no valid data exists.
 * 
 * @param heightMeters - Height above Earth surface (default: 100m)
 * @returns PolygonHierarchy with a tiny triangle at (0,0)
 */
export function createDummyPolygonHierarchy(heightMeters = 100): PolygonHierarchy {
  return new PolygonHierarchy([
    Cartesian3.fromDegrees(0, 0, heightMeters),
    Cartesian3.fromDegrees(0.001, 0, heightMeters),
    Cartesian3.fromDegrees(0, 0.001, heightMeters),
  ]);
}

