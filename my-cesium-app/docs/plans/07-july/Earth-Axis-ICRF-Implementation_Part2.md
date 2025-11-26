# Earth Axis Orientation Implementation Options

## Installation Guide for Astronomy.js

### Step 1: Initial Installation
```bash
# First attempt with npm
npm install astronomy-engine

# If using yarn
yarn add astronomy-engine
```

### Step 2: Dependency Resolution
If the installation fails or TypeScript errors occur:

1. Check for peer dependencies:
```bash
npm info astronomy-engine peerDependencies
```

2. Check for type definitions:
```bash
# Try installing types if they exist
npm install --save-dev @types/astronomy-engine

# If types don't exist, create a basic type declaration file:
# Create file: src/types/astronomy-engine.d.ts
declare module 'astronomy-engine';
```

### Step 3: Verification
Create a test file to verify the installation:

```typescript
// src/test/astronomy-test.ts
import { Astronomy } from 'astronomy-engine';

// Test basic functionality
const date = new Date();
try {
  const obliquity = Astronomy.Obliquity(date);
  console.log('Obliquity:', obliquity);
} catch (error) {
  console.error('Installation issue:', error);
}
```

### Step 4: Troubleshooting Common Issues

1. If you get version conflicts:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall all dependencies
npm install
```

2. If you get TypeScript errors:
```bash
# Check TypeScript version compatibility
npm list typescript

# You might need to update TypeScript
npm install --save-dev typescript@latest
```

3. If you get bundler warnings:
```bash
# Add to your webpack/vite config:
{
  resolve: {
    fallback: {
      "buffer": false,
      "crypto": false
    }
  }
}
```

### Step 5: Version Management
```bash
# Lock the working version in package.json once confirmed working
npm install astronomy-engine@x.x.x
```

## Overview

This document evaluates JavaScript/TypeScript libraries and methods for calculating Earth's axis orientation in our React Three Fiber visualization. Focus is on client-side solutions to ensure responsive performance.

## Available Libraries and Solutions

### 1. Astronomy.js
**Complexity: Low | Dependencies: None | Size: ~50KB**

```typescript
import { Astronomy } from 'astronomy-engine';

const getEarthOrientation = (date: Date) => {
  const obliquity = Astronomy.Obliquity(date);
  const sunPos = Astronomy.SunPosition(date);
  return { obliquity, sunPos };
};
```

#### Advantages:
- Zero dependencies
- Pure JavaScript implementation
- Well-documented
- Includes precession calculations
- MIT License
- Regular updates
- Small bundle size

#### Disadvantages:
- Less precise than some alternatives (±1 arcminute)
- Limited to years 1800-2100

### 2. Satellite.js + Custom Calculations
**Complexity: Medium | Dependencies: None | Size: ~30KB**

```typescript
import { gstime } from 'satellite.js';
import { calculateObliquity } from './custom-calcs';

const getEarthOrientation = (date: Date) => {
  const gmst = gstime(date);
  const obliquity = calculateObliquity(date);
  return { gmst, obliquity };
};
```

#### Advantages:
- Already used in project for TLE calculations
- Very small bundle size
- Fast execution
- No additional dependencies

#### Disadvantages:
- Requires custom implementation of solar position
- Need to maintain own obliquity calculations
- Limited to basic Earth orientation

### 3. Celestial.js
**Complexity: High | Dependencies: D3.js | Size: ~250KB**

```typescript
import { celestial } from 'd3-celestial';

const getEarthOrientation = (date: Date) => {
  return celestial.coordinates([date]);
};
```

#### Advantages:
- Very accurate calculations
- Includes comprehensive astronomical data
- Professional-grade library
- Extensive documentation

#### Disadvantages:
- Large bundle size
- Requires D3.js
- Overkill for simple Earth orientation
- Complex API

### 4. Custom Implementation with VSOP87 Coefficients
**Complexity: Medium | Dependencies: None | Size: ~10KB**

```typescript
const VSOP87_EARTH = {
  // Simplified coefficient set for Earth
  L: [[100013989, 0, 0], [1670700, 3.0984635, 6283.0758500]],
  B: [[0, 0, 0], [27962, 3.14152, 6283.07585]],
  R: [[100013989, 0, 0], [16707, 3.09846, 6283.07585]]
};

const getEarthOrientation = (mjd: number) => {
  // Implementation using VSOP87 coefficients
  // Returns { obliquity, sunLongitude }
};
```

#### Advantages:
- No dependencies
- Smallest possible bundle size
- Full control over precision vs performance
- Can be optimized for our specific use case

#### Disadvantages:
- Requires maintenance
- Need to validate calculations
- Limited to basic Earth/Sun geometry

### 5. Meeus.js
**Complexity: Low | Dependencies: None | Size: ~80KB**

```typescript
import { MeeusJs } from 'meeus';

const getEarthOrientation = (date: Date) => {
  const earth = new MeeusJs.Earth(date);
  return {
    obliquity: earth.obliquity(),
    sunLongitude: earth.sunLongitude()
  };
};
```

#### Advantages:
- Based on well-known astronomical algorithms
- Pure JavaScript
- Good documentation
- Includes many useful astronomical calculations

#### Disadvantages:
- Less active maintenance
- Some methods can be computationally expensive
- Documentation could be better

## Recommendation

For our specific needs, we recommend the following options in order:

1. **Astronomy.js**
   - Best balance of simplicity and functionality
   - Zero dependencies matches our needs
   - Sufficient precision for visualization
   - Easy to integrate with React Three Fiber

2. **Custom Implementation with VSOP87**
   - If we need more control or smaller bundle size
   - Can optimize specifically for Earth orientation
   - Good fallback option

3. **Satellite.js + Custom Calculations**
   - If we want to leverage existing dependency
   - Would need to implement solar position calculations

## Implementation Example with Astronomy.js

```typescript
import { Astronomy } from 'astronomy-engine';

interface EarthOrientation {
  obliquity: number;    // Earth's axial tilt in radians
  sunLongitude: number; // Sun's ecliptic longitude in radians
  gmst: number;         // Greenwich Mean Sidereal Time in radians
}

function getEarthOrientation(mjd: number): EarthOrientation {
  // Convert MJD to Date
  const date = new Date((mjd + 2400000.5 - 2440587.5) * 86400000);
  
  // Get Earth's obliquity
  const obliquity = Astronomy.Obliquity(date) * Math.PI / 180;
  
  // Get Sun's position
  const sun = Astronomy.SunPosition(date);
  const sunLongitude = sun.elon * Math.PI / 180;
  
  // Calculate GMST (Greenwich Mean Sidereal Time)
  const gmst = Astronomy.SiderealTime(date) * Math.PI / 12; // Convert hours to radians
  
  return { obliquity, sunLongitude, gmst };
}

// Usage in Earth component
const { obliquity, sunLongitude, gmst } = getEarthOrientation(currentTime);
const finalRotation = new THREE.Matrix4()
  .makeRotationZ(-sunLongitude)           // Align with Sun
  .multiply(new THREE.Matrix4().makeRotationX(obliquity))  // Apply tilt
  .multiply(new THREE.Matrix4().makeRotationY(gmst));      // Daily rotation
```

## Next Steps

1. Install and test Astronomy.js
2. Implement basic Earth orientation
3. Add visual debug helpers
4. Fine-tune rotation matrices
5. Add seasonal variation visualization

## Performance Considerations

- Cache calculations that change slowly (obliquity)
- Update Sun position less frequently than frame rate
- Consider using Web Workers for heavy calculations
- Implement proper animation interpolation 