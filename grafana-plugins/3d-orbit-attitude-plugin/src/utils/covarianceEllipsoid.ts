/**
 * Covariance Ellipsoid Utilities
 * 
 * Converts 3x3 position covariance matrices into ellipsoid visualization parameters.
 * Uses simplified eigen-decomposition for 3D visualization.
 */

import { Cartesian3, Quaternion, Matrix3 } from 'cesium';

/**
 * Covariance matrix (3x3 symmetric)
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
 * Ellipsoid parameters for Cesium rendering
 */
export interface EllipsoidParameters {
  radii: Cartesian3;      // Semi-axis lengths (meters, scaled for sigma)
  orientation: Quaternion; // Orientation quaternion
}

/**
 * Simple power iteration for largest eigenvalue/eigenvector
 */
function powerIteration(matrix: Matrix3, maxIter = 100): { value: number; vector: Cartesian3 } {
  // Start with random vector
  let v = new Cartesian3(Math.random(), Math.random(), Math.random());
  v = Cartesian3.normalize(v, new Cartesian3());
  
  let eigenvalue = 0;
  
  for (let i = 0; i < maxIter; i++) {
    // v = M * v
    const vNew = Matrix3.multiplyByVector(matrix, v, new Cartesian3());
    
    // Compute eigenvalue estimate
    eigenvalue = Cartesian3.dot(vNew, v);
    
    // Normalize
    v = Cartesian3.normalize(vNew, v);
  }
  
  return { value: eigenvalue, vector: v };
}

/**
 * Compute ellipsoid parameters from covariance matrix.
 * 
 * Uses simplified eigen-decomposition (power iteration) to extract:
 * - Principal axes (eigenvectors)
 * - Semi-axis lengths (sqrt of eigenvalues, scaled by confidence)
 * 
 * @param covariance - 3x3 position covariance matrix (ECEF frame, m²)
 * @param sigmaScale - Confidence interval scale (1.0 = 1-sigma ~68%, 2.0 = 2-sigma ~95%, 3.0 = 3-sigma ~99.7%)
 * @returns Ellipsoid radii and orientation for Cesium
 */
export function covarianceToEllipsoid(
  covariance: CovarianceMatrix,
  sigmaScale = 1.0
): EllipsoidParameters {
  // Construct 3x3 symmetric covariance matrix
  const covMatrix = new Matrix3(
    covariance.xx, covariance.xy, covariance.xz,
    covariance.xy, covariance.yy, covariance.yz,
    covariance.xz, covariance.yz, covariance.zz
  );
  
  // Extract largest eigenvalue and eigenvector
  const eigen1 = powerIteration(covMatrix);
  
  // Deflate matrix: M' = M - λ₁ * v₁ * v₁ᵀ
  const outer1 = Matrix3.fromScale(new Cartesian3(
    eigen1.vector.x * eigen1.vector.x,
    eigen1.vector.y * eigen1.vector.y,
    eigen1.vector.z * eigen1.vector.z
  ));
  const deflated1 = Matrix3.subtract(
    covMatrix,
    Matrix3.multiplyByScalar(outer1, eigen1.value, new Matrix3()),
    new Matrix3()
  );
  
  // Extract second eigenvalue and eigenvector
  const eigen2 = powerIteration(deflated1);
  
  // Third eigenvector is orthogonal to first two
  const eigen3Vector = Cartesian3.cross(eigen1.vector, eigen2.vector, new Cartesian3());
  Cartesian3.normalize(eigen3Vector, eigen3Vector);
  
  // Third eigenvalue (approximate)
  const v3Transformed = Matrix3.multiplyByVector(covMatrix, eigen3Vector, new Cartesian3());
  const eigen3Value = Math.abs(Cartesian3.dot(v3Transformed, eigen3Vector));
  
  // Compute semi-axis lengths (sqrt of eigenvalues, scaled)
  const a = Math.sqrt(Math.abs(eigen1.value)) * sigmaScale;
  const b = Math.sqrt(Math.abs(eigen2.value)) * sigmaScale;
  const c = Math.sqrt(Math.abs(eigen3Value)) * sigmaScale;
  
  // Clamp to reasonable bounds (avoid degenerate ellipsoids)
  const minRadius = 10;     // 10 meters minimum
  const maxRadius = 100000; // 100 km maximum
  
  const radii = new Cartesian3(
    Math.max(minRadius, Math.min(maxRadius, a)),
    Math.max(minRadius, Math.min(maxRadius, b)),
    Math.max(minRadius, Math.min(maxRadius, c))
  );
  
  // Construct rotation matrix from eigenvectors (column-wise)
  const rotationMatrix = new Matrix3(
    eigen1.vector.x, eigen2.vector.x, eigen3Vector.x,
    eigen1.vector.y, eigen2.vector.y, eigen3Vector.y,
    eigen1.vector.z, eigen2.vector.z, eigen3Vector.z
  );
  
  // Convert to quaternion
  const orientation = Quaternion.fromRotationMatrix(rotationMatrix, new Quaternion());
  
  return { radii, orientation };
}

/**
 * Get opacity value based on data quality mode
 */
export function getOpacityForQuality(qualityMode: string): number {
  switch (qualityMode) {
    case 'High (70%)':
      return 0.7;
    case 'Medium (30%)':
      return 0.3;
    case 'Low (10%)':
      return 0.1;
    default:
      return 0.3; // Default to medium
  }
}

