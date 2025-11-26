# Earth Axis Implementation Part 4: Understanding Rotations and Astronomy-Engine Integration

## Current Implementation Analysis

### Rotation Chain

Our current implementation applies rotations in this sequence:

```typescript
// 1. Get Earth's axial tilt from astronomy-engine
const rotation = Astronomy.Rotation_EQJ_EQD(date);
const rotationMatrix = astronomyToThreeMatrix(rotation);

// 2. Convert astronomy-engine matrix to Three.js format
matrix3.current.copy(rotationMatrix);
quaternion.current.setFromRotationMatrix(matrix4.current.setFromMatrix3(matrix3.current));

// 3. Apply daily rotation (GMST)
euler.current.set(0, gmst, 0);
quaternion.current.multiply(new Quaternion().setFromEuler(euler.current));
```

### Issues with Current Implementation

1. **Matrix Conversion**: Our `astronomyToThreeMatrix` function might not be correctly interpreting the astronomy-engine's rotation matrix format:

```typescript
export function astronomyToThreeMatrix(rotation: RotationMatrix): Matrix3 {
  const matrix = new Matrix3();
  
  // Current implementation - might be incorrect
  matrix.set(
    rotation.rot[0][0], rotation.rot[1][0], rotation.rot[2][0],
    rotation.rot[0][1], rotation.rot[1][1], rotation.rot[2][1],
    rotation.rot[0][2], rotation.rot[1][2], rotation.rot[2][2]
  );
  
  return matrix;
}
```

2. **Rotation Order**: We might need to adjust the order of rotations or their axes.

## Understanding Astronomy-Engine's Output

### Rotation_EQJ_EQD Function

The `Rotation_EQJ_EQD` function returns a rotation matrix that transforms from J2000 mean equator (EQJ) to equatorial of-date (EQD). 

Expected format from astronomy-engine:
```typescript
interface RotationMatrix {
  rot: [
    [number, number, number], // First row
    [number, number, number], // Second row
    [number, number, number]  // Third row
  ];
}
```

### Matrix Format Verification

We need to verify:
1. Is the matrix row-major or column-major?
2. What's the exact meaning of each matrix element?
3. What coordinate system transformations are represented?

Expected values for key dates:
- At J2000.0 (January 1, 2000, 12:00 TT):
  ```
  [1.0, 0.0, 0.0]
  [0.0, 0.917, -0.399]  // Approximate values for 23.4° tilt
  [0.0, 0.399, 0.917]
  ```

- At other dates, the matrix should include:
  - Precession of equinoxes
  - Nutation effects
  - Proper 23.4° axial tilt

## Correct Implementation Plan

### 1. Matrix Conversion

We should verify our matrix conversion:

```typescript
function astronomyToThreeMatrix(rotation: RotationMatrix): Matrix3 {
  const matrix = new Matrix3();
  
  // Proposed correction - need to verify
  matrix.set(
    rotation.rot[0][0], rotation.rot[0][1], rotation.rot[0][2],
    rotation.rot[1][0], rotation.rot[1][1], rotation.rot[1][2],
    rotation.rot[2][0], rotation.rot[2][1], rotation.rot[2][2]
  );
  
  return matrix;
}
```

### 2. Rotation Application

We should consider this sequence:

```typescript
// 1. Start with identity orientation
const baseOrientation = new Quaternion();

// 2. Apply axial tilt and precession (from astronomy-engine)
const tiltMatrix = astronomyToThreeMatrix(Astronomy.Rotation_EQJ_EQD(date));
const tiltQuaternion = new Quaternion().setFromRotationMatrix(
  new Matrix4().setFromMatrix3(tiltMatrix)
);

// 3. Apply Earth's daily rotation
const rotationQuaternion = new Quaternion().setFromAxisAngle(
  new Vector3(0, 1, 0),
  gmst
);

// 4. Combine rotations (order matters!)
const finalRotation = baseOrientation
  .multiply(tiltQuaternion)
  .multiply(rotationQuaternion);
```

### 3. Verification Steps

To verify correct implementation:

1. **Axial Tilt Check**:
   - Set time to vernal equinox
   - Earth's axis should be tilted 23.4° relative to ecliptic
   - T010 (green arrow) should point to celestial north

2. **Daily Rotation Check**:
   - At GMST = 0, Greenwich meridian aligns with vernal equinox
   - One full rotation per sidereal day
   - T100 (red arrow) should point to local meridian

3. **Seasonal Check**:
   - Northern hemisphere tilts toward sun at summer solstice
   - Northern hemisphere tilts away from sun at winter solstice
   - Tilt is perpendicular to sun at equinoxes

## Debugging Tools

### 1. Matrix Inspection

Add debug logging:
```typescript
console.log('Astronomy Matrix:', rotation.rot);
console.log('Three.js Matrix:', matrix.elements);
```

### 2. Angle Extraction

Add function to extract Euler angles:
```typescript
function extractEulerAngles(matrix: Matrix4): Vector3 {
  const euler = new Euler().setFromRotationMatrix(matrix);
  return new Vector3(
    euler.x * (180/Math.PI),
    euler.y * (180/Math.PI),
    euler.z * (180/Math.PI)
  );
}
```

### 3. Visual Indicators

Add debug objects:
```typescript
// Ecliptic plane indicator
const eclipticRing = new RingGeometry(0, scale, 64);
eclipticRing.rotateX(23.4 * (Math.PI/180));

// Celestial poles
const northPole = new ArrowHelper(
  new Vector3(0, 1, 0),
  new Vector3(0, 0, 0),
  scale,
  0xffff00
);
```

## Next Steps

1. Verify astronomy-engine's matrix format and meaning
2. Implement correct matrix conversion
3. Test with known astronomical dates
4. Add visual debug helpers
5. Document final rotation sequence

## References

1. [Astronomy-Engine Documentation](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md)
2. [Three.js Matrix3](https://threejs.org/docs/#api/en/math/Matrix3)
3. [Quaternion Rotations](https://threejs.org/docs/#api/en/math/Quaternion)
4. [Earth's Axial Tilt](https://en.wikipedia.org/wiki/Axial_tilt) 