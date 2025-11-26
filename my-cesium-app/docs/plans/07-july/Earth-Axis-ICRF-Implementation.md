# Earth Axis Orientation in ICRF Frame

## Overview

This document details how to properly orient Earth's rotation axis in our 3D visualization, taking into account:
1. The International Celestial Reference Frame (ICRF)
2. Earth's axial tilt (obliquity)
3. Integration with our current React Three Fiber setup

## ICRF Coordinate System

### Basic Structure
The International Celestial Reference Frame (ICRF) is the fundamental reference frame used in modern astronomy:

- Origin: Solar System Barycenter
- Principal Plane: Near the Earth's mean equator at J2000.0
- Principal Direction (X/100): Towards the vernal equinox at J2000.0
- Z/001 axis: Perpendicular to principal plane
- Y/010 axis: Completes right-handed system

### Relationship to Our Visualization
Currently in our React Three Fiber scene:
- 100 vector points to the Sun (our reference for local noon)
- 010 vector is Earth's rotation axis
- 001 vector completes the right-handed system

To properly align with ICRF:
1. The 100 direction (currently Sun-pointing) actually represents the vernal equinox direction
2. We need to apply the Sun's apparent position relative to this reference
3. Earth's axis needs to be tilted relative to the ecliptic plane

## Recommended Library: NOVAS (Naval Observatory Vector Astrometry Software)

NOVAS is the best choice for obtaining precise Earth orientation parameters:

### Why NOVAS?
1. Industry standard for high-precision astronomical calculations
2. Used by NASA and major observatories
3. Available in Python (novas-py) with good documentation
4. Provides Earth orientation relative to ICRF directly

### Key NOVAS Functions We Need
```python
from novas.compat import eral
from novas.compat import ee_ct

def get_earth_orientation(jd):
    # Get Earth rotation angle
    theta = eral(jd)
    
    # Get equation of equinoxes
    ee = ee_ct(jd)
    
    # Get mean obliquity
    eps = 23.43929111 # Degrees at J2000.0
    
    return theta, ee, eps
```

## Implementation Strategy

### 1. Earth's Axial Tilt
The mean obliquity (ε) varies slowly:
- ε = 23.43929111° - 0.013004167°T - 0.0000001667°T² + 0.0000005027778°T³
- T = centuries since J2000.0
- For visualization purposes, we can use fixed 23.43929111°

### 2. Coordinate Transformations

To get from our current system to proper ICRF alignment:

1. First rotation: Around 001 axis to account for Sun's position relative to vernal equinox
   ```typescript
   const sunLongitude = getSunEclipticLongitude(mjd); // Need to implement
   const R1 = new THREE.Matrix4().makeRotationZ(sunLongitude);
   ```

2. Second rotation: Tilt Earth's axis by obliquity around 100 axis
   ```typescript
   const obliquity = 23.43929111 * Math.PI / 180;
   const R2 = new THREE.Matrix4().makeRotationX(obliquity);
   ```

3. Third rotation: Daily rotation around tilted axis
   ```typescript
   const dayFraction = mjd % 1;
   const dailyRotation = (dayFraction - 0.5) * 2 * Math.PI;
   const R3 = new THREE.Matrix4().makeRotationY(dailyRotation);
   ```

### 3. Getting Sun's Position

We need the Sun's ecliptic longitude. Options:

1. Using VSOP87 theory (most accurate):
   ```typescript
   import vsop87 from 'vsop87';
   
   function getSunEclipticLongitude(mjd) {
     return vsop87.getSunLongitude(mjd);
   }
   ```

2. Low-precision approximation (simpler but less accurate):
   ```typescript
   function getSunEclipticLongitude(mjd) {
     const T = (mjd - 51544.5) / 36525;  // Centuries since J2000.0
     const M = 357.528 + 35999.050 * T;  // Mean anomaly
     const L = 280.460 + 36000.772 * T;  // Mean longitude
     return L + 1.915 * Math.sin(M) + 0.020 * Math.sin(2 * M);
   }
   ```

## Putting It All Together

The final transformation matrix for Earth and its coordinate system would be:

```typescript
const finalMatrix = new THREE.Matrix4()
  .multiply(R1)  // Sun position relative to vernal equinox
  .multiply(R2)  // Obliquity tilt
  .multiply(R3); // Daily rotation
```

This gives us Earth's orientation in ICRF coordinates while maintaining our current visualization where the 100 axis represents the Sun direction.

## Additional Considerations

1. Precession and Nutation
   - Earth's axis wobbles (nutation) and precesses
   - For visualization, can ignore these small effects
   - If needed, NOVAS provides these corrections

2. Performance
   - Cache Sun position calculations
   - Update obliquity less frequently (changes very slowly)
   - Consider using approximate formulas for non-scientific visualizations

3. Testing
   - Key dates to test:
     - Equinoxes (March 20, September 22)
     - Solstices (June 21, December 21)
   - Verify noon alignment at different latitudes
   - Check axis points to Polaris approximately

## Next Steps

1. Implement Sun position calculation
2. Add obliquity tilt
3. Combine with existing rotation code
4. Add visual indicators for:
   - Ecliptic plane
   - Celestial equator
   - Vernal equinox direction 