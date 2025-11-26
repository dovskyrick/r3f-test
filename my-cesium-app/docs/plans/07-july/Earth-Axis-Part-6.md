# Earth Axis Part 6: Satellite.js Implementation Plan

## Overview
Based on the analysis in Part 5, we've identified that satellite.js provides a more direct solution for ICRF to ITRF coordinate transformation through its `ecfToEci()` and `eciToEcf()` functions. This eliminates the need for complex manual astronomy calculations and provides a well-tested, industry-standard implementation.

## What satellite.js Provides

### Key Functions
- **`satellite.eciToEcf(eciCoords, gmst)`**: Transforms from ECI (Earth Centered Inertial / ICRF) to ECF (Earth Centered Fixed / ITRF)
- **`satellite.ecfToEci(ecfCoords, gmst)`**: Transforms from ECF (Earth Centered Fixed / ITRF) to ECI (Earth Centered Inertial / ICRF)
- **`satellite.gstime(date)`**: Calculates Greenwich Mean Sidereal Time (GMST) from a JavaScript Date object

### Coordinate Frame Definitions
- **ECI (Earth Centered Inertial)**: Equivalent to ICRF - inertial frame with origin at Earth's center, X-axis pointing toward vernal equinox, Z-axis toward celestial north pole
- **ECF (Earth Centered Fixed)**: Equivalent to ITRF - Earth-fixed frame rotating with the planet, X-axis through 0° longitude, Z-axis through geographic north pole

## Installation Guide

### Step 1: Install satellite.js
```bash
cd my-tsx-app
npm install satellite.js
npm install @types/satellite.js  # TypeScript definitions if available
```

### Step 2: Verify Installation
Create a test file to verify the installation:
```typescript
import * as satellite from 'satellite.js';

// Test basic functionality
const testDate = new Date();
const gmst = satellite.gstime(testDate);
console.log('GMST:', gmst);
```

### Step 3: Check TypeScript Support
If @types/satellite.js is not available, we'll need to create our own type definitions in `src/types/satellite.d.ts`.

## Implementation Plan

### Phase 1: Create Type Definitions (if needed)

**File**: `src/types/satellite.d.ts`
```typescript
declare module 'satellite.js' {
  export interface Vector3D {
    x: number;
    y: number;
    z: number;
  }

  export function eciToEcf(eciCoords: Vector3D, gmst: number): Vector3D;
  export function ecfToEci(ecfCoords: Vector3D, gmst: number): Vector3D;
  export function gstime(date: Date): number;
}
```

### Phase 2: Update astronomy.ts Utilities

**File**: `src/utils/astronomy.ts`

#### Functions to Add:
1. **`satelliteToThreeMatrix(date: Date): Matrix4`**
   - Uses satellite.js to get the complete ICRF→ITRF transformation matrix
   - Converts satellite.js coordinate system to Three.js coordinate system
   - Handles any axis orientation differences

2. **`getGMST(date: Date): number`**
   - Wrapper around `satellite.gstime(date)`
   - Provides consistent interface for GMST calculations

3. **`transformICRFToITRF(icrfVector: Vector3, date: Date): Vector3`**
   - Direct vector transformation from ICRF to ITRF
   - Uses satellite.js eciToEcf function

4. **`transformITRFToICRF(itrfVector: Vector3, date: Date): Vector3`**
   - Direct vector transformation from ITRF to ICRF
   - Uses satellite.js ecfToEci function

#### Functions to Modify:
1. **`astronomyToThreeMatrix()`** - Replace with satellite.js implementation
2. **`calculateGMST()`** - Replace with satellite.js wrapper
3. **`mjdToDate()`** - Keep as utility for MJD conversion

#### Functions to Remove:
1. All manual astronomy-engine rotation matrix calculations
2. Complex precession/nutation calculations
3. Manual GMST calculations

### Phase 3: Update ReferenceFrames Component

**File**: `src/components/3D/ReferenceFrames/ReferenceFrames.tsx`

#### Key Changes:
1. **Replace astronomy-engine imports** with satellite.js imports
2. **Simplify rotation calculation**:
   ```typescript
   // Old complex approach
   const astronomyMatrix = Astronomy.Rotation_EQJ_EQD(date);
   const threeMatrix = astronomyToThreeMatrix(astronomyMatrix);
   const gmst = calculateGMST(date);
   const dailyRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), gmst);
   
   // New satellite.js approach
   const transformMatrix = satelliteToThreeMatrix(date);
   earthGroup.current.setRotationFromMatrix(transformMatrix);
   ```

3. **Update reference frame calculations**:
   - Terrestrial frame: Apply satellite.js transformation directly
   - Celestial frame: Keep static (no transformation needed)
   - Sun direction: Keep static pointing along ICRF X-axis

### Phase 4: Coordinate System Verification

#### Expected Coordinate System Mapping:
- **satellite.js ECI**: 
  - X-axis → ICRF X (toward vernal equinox)
  - Y-axis → ICRF Y (90° east of vernal equinox in equatorial plane)
  - Z-axis → ICRF Z (toward north celestial pole)

- **satellite.js ECF**:
  - X-axis → ITRF X (through 0° longitude, equatorial plane)
  - Y-axis → ITRF Y (through 90° east longitude, equatorial plane)
  - Z-axis → ITRF Z (through geographic north pole)

- **Three.js Coordinate System**:
  - X-axis → Right
  - Y-axis → Up
  - Z-axis → Toward viewer (negative Z into screen)

#### Potential Axis Mapping Issues:
1. **Y-Z axis swap**: Three.js uses Y-up while many astronomical systems use Z-up
2. **Handedness**: Verify right-handed vs left-handed coordinate systems
3. **Longitude origin**: Ensure 0° longitude alignment with Three.js coordinate system

### Phase 5: Testing and Validation

#### Test Cases:
1. **Static Tests**:
   - At J2000 epoch (Jan 1, 2000 12:00 UTC), ICRF and ITRF should be nearly aligned
   - Verify 23.4° Earth axis tilt is properly represented
   - Check that GMST calculation matches expected values

2. **Dynamic Tests**:
   - Verify smooth rotation as time changes
   - Test date range from past to future
   - Ensure no discontinuities or sudden jumps

3. **Visual Validation**:
   - Reference arrows should maintain proper relationships
   - Sun direction should remain fixed in celestial frame
   - Terrestrial frame should rotate with Earth
   - Earth's axis should maintain correct tilt and orientation

#### Comparison with Previous Implementation:
- Save rotation matrices from both old and new implementations
- Compare at multiple time points
- Document any significant differences
- Verify which implementation produces more accurate results

### Phase 6: Performance Optimization

#### Potential Improvements:
1. **Caching**: Cache transformation matrices for identical timestamps
2. **Interpolation**: For smooth animation, interpolate between calculated matrices
3. **Lazy Calculation**: Only recalculate when timestamp actually changes

### Phase 7: Documentation Updates

#### Files to Update:
1. **README.md**: Add satellite.js dependency information
2. **Component documentation**: Update ReferenceFrames component docs
3. **Type definitions**: Document any custom type definitions created

#### Code Comments:
- Add detailed comments explaining satellite.js coordinate system mapping
- Document any axis transformations or coordinate system conversions
- Explain GMST calculation and its role in the transformation

## Advantages of satellite.js Solution

### Accuracy:
- Industry-standard implementation used in real satellite tracking
- Handles all Earth orientation parameters automatically
- Includes corrections for polar motion, UT1-UTC, etc.

### Simplicity:
- Single function call instead of complex matrix calculations
- Built-in GMST calculation
- No need to understand complex astronomical coordinate transformations

### Maintenance:
- Well-maintained library with regular updates
- Extensive testing and validation
- Used by NASA and other space agencies

### Performance:
- Optimized C-level calculations
- Faster than manual matrix multiplications
- Better numerical stability

## Potential Challenges

### Coordinate System Mapping:
- May need axis transformations between satellite.js and Three.js
- Verify proper orientation of Earth's rotation
- Ensure correct handedness of coordinate systems

### TypeScript Integration:
- May need custom type definitions
- Verify all function signatures
- Handle any missing type information

### Dependency Management:
- Additional package dependency
- Potential version compatibility issues
- Bundle size considerations

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing astronomy-engine code
- Add satellite.js implementation alongside
- Allow switching between implementations via flag

### Phase 2: Validation Period
- Run both implementations in parallel
- Compare results and validate accuracy
- Test across different date ranges

### Phase 3: Final Migration
- Remove astronomy-engine dependencies
- Clean up obsolete code
- Update all documentation

This approach ensures a smooth transition while maintaining the ability to validate the new implementation against the existing one. 