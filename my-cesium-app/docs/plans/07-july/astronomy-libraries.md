# Astronomy Libraries Overview

## Time and Date Libraries

### 1. Luxon
**Best for:** General date/time handling with astronomical extensions
- Built-in Julian Date conversions
- Excellent timezone handling
- TypeScript support
- Active maintenance
- Large community
- Example usage:
```typescript
import { DateTime } from 'luxon';

// MJD to DateTime
const mjdToDateTime = (mjd: number): DateTime => {
  const jd = mjd + 2400000.5;
  return DateTime.fromJulianDate(jd);
};
```

## Specialized Astronomy Libraries

### 1. SunCalc
**Best for:** Sun/Moon calculations and day/night visualization
- Calculates sun position (altitude, azimuth)
- Provides all sunlight phases (sunrise, sunset, twilight, etc.)
- Moon position and phase calculations
- Day/night terminator line
- Very lightweight (~5KB)
- Example for terminator:
```typescript
import SunCalc from 'suncalc';

// Get sun position for a specific time and location
const getTerminatorPoints = (date: Date) => {
  const points = [];
  for (let lat = -90; lat <= 90; lat += 1) {
    for (let lng = -180; lng <= 180; lng += 1) {
      const sunPos = SunCalc.getPosition(date, lat, lng);
      if (Math.abs(sunPos.altitude) < 0.01) {
        points.push([lat, lng]);
      }
    }
  }
  return points;
};
```

### 2. Astronomy.js
**Best for:** Complex astronomical calculations
- Orbital calculations
- Coordinate transformations (ICRF, ITRF, etc.)
- Time system conversions
- Planetary positions
- Example for coordinate transformation:
```typescript
import { Coord } from 'astronomy-js';

const transformCoordinates = (x: number, y: number, z: number) => {
  const coord = new Coord({ x, y, z });
  return coord.ecl2equ(23.43929111); // Earth's axial tilt
};
```

### 3. Astro.js
**Best for:** Orbital mechanics and trajectory visualization
- Orbit calculations from orbital elements
- State vector computations
- Coordinate system transformations
- Time system handling
- Example for orbit calculation:
```typescript
import { Orbit } from 'astro.js';

const calculateOrbit = (elements) => {
  const orbit = new Orbit({
    e: elements.eccentricity,
    a: elements.semiMajorAxis,
    i: elements.inclination,
    O: elements.ascendingNode,
    w: elements.argOfPeriapsis,
    M: elements.meanAnomaly
  });
  return orbit.getStateVectors();
};
```

## Earth Rotation and Orientation Libraries

### 1. VSOP87.js
**Best for:** High-precision planetary positions
- Implements VSOP87 theory
- Accurate planetary positions
- Earth orientation parameters
- Example:
```typescript
import VSOP87 from 'vsop87';

const getEarthOrientation = (jd: number) => {
  const earth = new VSOP87.Earth();
  return earth.getPosition(jd);
};
```

### 2. IAU-SOFA.js
**Best for:** Earth orientation and time systems
- Standard IAU algorithms
- Earth Rotation Angle (ERA)
- Precession-nutation models
- Time scale transformations

## Recommendations for Our Project

### 1. For Time Handling
**Recommendation:** Luxon
- Already integrates well with MUI
- Has Julian Date support
- Excellent TypeScript support
- Well-maintained

### 2. For Earth Orientation
**Recommendation:** Combination of SunCalc and custom implementation
1. Use SunCalc for:
   - Basic sun position calculations
   - Day/night terminator visualization
   - Moon phase visualization

2. Implement custom Earth rotation using Three.js:
```typescript
const calculateEarthRotation = (mjd: number) => {
  // Earth rotates 360° in 23h 56m 4s (sidereal day)
  const siderealDay = 86164.0905; // seconds
  const mjdSeconds = mjd * 86400;
  
  // Get rotation in radians
  return (mjdSeconds % siderealDay) * (2 * Math.PI / siderealDay);
};
```

### 3. For Coordinate Transformations
**Recommendation:** Custom implementation using GODOT backend
- Use the backend's coordinate transformation capabilities
- Cache results for common transformations
- Implement simple interpolation for smooth animations

## Implementation Strategy

1. Start with Luxon for time handling:
   - Replace current MJD conversion code
   - Add date/time picker components
   - Implement timezone support

2. Add SunCalc for day/night visualization:
   - Implement terminator line calculation
   - Add sun position indicators
   - Show twilight zones

3. Implement Earth rotation:
   - Use backend for initial axis orientation
   - Apply sidereal time rotation
   - Add smooth interpolation

4. Optimize performance:
   - Cache frequent calculations
   - Use Web Workers for heavy computations
   - Implement level-of-detail for terminator line

## Notes
- Most libraries are relatively small and can be tree-shaken
- Consider bundling only needed functions
- Some libraries may need polyfills for older browsers
- Test timezone handling carefully
- Consider adding debug visualization options 