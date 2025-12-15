# Test Data Generator: Multi-Satellite JSON Script

**Date**: December 15, 2025  
**Purpose**: Standalone Node.js script to generate test JSON data for multiple satellites  
**Language**: TypeScript/JavaScript (keep it in the same ecosystem!)

---

## Part 1: Why Node.js/TypeScript? 🤔

### Standalone Scripts in Node.js

**YES!** Node.js scripts can run **without a web server or browser**. They're just programs that execute and exit.

```bash
# Run a JavaScript file
node myscript.js

# Run a TypeScript file (with ts-node)
ts-node myscript.ts

# Or compile first, then run
tsc myscript.ts
node myscript.js
```

**Key Difference**:
- **Web app**: Runs forever, serves HTTP, listens for requests
- **Script**: Runs once, does work, exits (like Python scripts!)

---

### Comparison: TypeScript vs Python

| Feature | TypeScript/Node.js | Python |
|---------|-------------------|--------|
| **Already installed?** | ✅ Yes (for Grafana plugin dev) | ❌ Need to install |
| **Same language as plugin** | ✅ Yes (easy to share code) | ❌ Different syntax |
| **JSON handling** | ✅ Native (`JSON.stringify`) | ✅ Native (`json.dumps`) |
| **Type safety** | ✅ TypeScript types | ⚠️ Need type hints |
| **Math libraries** | ⚠️ Basic (but sufficient) | ✅ NumPy/SciPy (overkill) |
| **File I/O** | ✅ `fs` module | ✅ `open()` |
| **Learning curve** | ✅ You already know it! | ⚠️ New syntax |

**Recommendation**: **TypeScript with Node.js** ✅
- Keep everything in one ecosystem
- No new dependencies/environments
- Can evolve alongside plugin code
- Can import/export shared types

---

## Part 2: Script Architecture 📐

### Project Structure

```
grafana-plugins/
├─ test-plugin/
│   └─ test-plans/
│       ├─ generated/                    # Output folder (gitignored)
│       │   ├─ satellite-1.json
│       │   ├─ satellite-2.json
│       │   └─ multi-satellite.json
│       └─ generators/                   # Generator scripts
│           ├─ package.json             # Dependencies (just ts-node, @types/node)
│           ├─ tsconfig.json            # TypeScript config
│           ├─ generate-trajectories.ts  # Main script
│           └─ orbit-math.ts            # Orbital mechanics utilities
```

---

### Dependencies (Minimal)

**File**: `generators/package.json`

```json
{
  "name": "test-data-generators",
  "version": "1.0.0",
  "description": "Generate test JSON data for satellite visualizer",
  "scripts": {
    "generate": "ts-node generate-trajectories.ts",
    "generate:single": "ts-node generate-trajectories.ts --single",
    "generate:multi": "ts-node generate-trajectories.ts --multi"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6"
  }
}
```

**Install once**:
```bash
cd test-plugin/test-plans/generators
npm install
```

**Run script**:
```bash
npm run generate
# or directly:
ts-node generate-trajectories.ts
```

---

## Part 3: Orbital Mechanics Utilities 🛰️

### Simple Orbit Models

**File**: `generators/orbit-math.ts`

```typescript
/**
 * Orbital mechanics utilities for generating realistic satellite trajectories.
 * Uses simplified Keplerian orbits (circular for now, can add elliptical later).
 */

export interface OrbitParams {
  altitude: number;           // km above Earth surface
  inclination: number;        // degrees (0 = equatorial, 90 = polar)
  longitudeOfAN: number;      // Longitude of Ascending Node (degrees)
  startTime: Date;            // Orbit start time
  numPoints: number;          // Number of data points
  duration: number;           // Total duration in seconds
}

export interface TrajectoryPoint {
  time: number;               // Unix timestamp (ms)
  longitude: number;          // degrees
  latitude: number;           // degrees
  altitude: number;           // meters
  qx: number;                 // Quaternion orientation
  qy: number;
  qz: number;
  qs: number;
}

const EARTH_RADIUS_KM = 6371;
const TWO_PI = 2 * Math.PI;

/**
 * Calculate orbital period using Kepler's Third Law (simplified).
 * T = 2π × sqrt(r³ / μ)
 * where μ = GM (Earth's gravitational parameter)
 */
function calculateOrbitalPeriod(altitudeKm: number): number {
  const radiusKm = EARTH_RADIUS_KM + altitudeKm;
  const mu = 398600.4418; // km³/s² (Earth's gravitational parameter)
  const periodSeconds = TWO_PI * Math.sqrt(Math.pow(radiusKm, 3) / mu);
  return periodSeconds;
}

/**
 * Generate a circular orbit trajectory with simplified Keplerian mechanics.
 */
export function generateCircularOrbit(params: OrbitParams): TrajectoryPoint[] {
  const {
    altitude,
    inclination,
    longitudeOfAN,
    startTime,
    numPoints,
    duration,
  } = params;

  const inclinationRad = (inclination * Math.PI) / 180;
  const loanRad = (longitudeOfAN * Math.PI) / 180;
  const period = calculateOrbitalPeriod(altitude);
  
  const points: TrajectoryPoint[] = [];
  const startTimeMs = startTime.getTime();

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * duration; // Time in seconds since start
    const timeMs = startTimeMs + t * 1000;
    
    // Mean anomaly (angle around orbit)
    const meanAnomaly = (t / period) * TWO_PI;
    
    // Simplified position calculation (circular orbit)
    // In orbital plane: x = r*cos(θ), y = r*sin(θ), z = 0
    const x = Math.cos(meanAnomaly);
    const y = Math.sin(meanAnomaly);
    
    // Rotate by inclination (around X-axis)
    const yInc = y * Math.cos(inclinationRad);
    const zInc = y * Math.sin(inclinationRad);
    
    // Rotate by longitude of ascending node (around Z-axis)
    const xFinal = x * Math.cos(loanRad) - yInc * Math.sin(loanRad);
    const yFinal = x * Math.sin(loanRad) + yInc * Math.cos(loanRad);
    const zFinal = zInc;
    
    // Convert to geodetic coordinates
    const latitude = Math.asin(zFinal) * (180 / Math.PI);
    const longitude = Math.atan2(yFinal, xFinal) * (180 / Math.PI);
    
    // Simple nadir-pointing orientation (quaternion pointing Z-axis down)
    // For now, identity quaternion (can add proper LVLH frame later)
    const qx = 0;
    const qy = 0;
    const qz = 0;
    const qs = 1;
    
    points.push({
      time: timeMs,
      longitude: longitude,
      latitude: latitude,
      altitude: altitude * 1000, // Convert km to meters
      qx,
      qy,
      qz,
      qs,
    });
  }

  return points;
}

/**
 * Generate a tumbling satellite (rotating quaternion).
 */
export function generateTumblingOrbit(params: OrbitParams): TrajectoryPoint[] {
  const baseOrbit = generateCircularOrbit(params);
  
  // Add rotation to quaternion
  return baseOrbit.map((point, idx) => {
    const angle = (idx / params.numPoints) * TWO_PI * 5; // 5 full rotations
    return {
      ...point,
      qx: Math.sin(angle / 2),
      qy: 0,
      qz: 0,
      qs: Math.cos(angle / 2),
    };
  });
}

/**
 * Generate random orbit parameters.
 */
export function randomOrbitParams(seed?: number): OrbitParams {
  // Simple seeded random (for reproducibility)
  const random = seed !== undefined 
    ? () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      }
    : Math.random;
  
  return {
    altitude: 400 + random() * 600,           // 400-1000 km
    inclination: random() * 90,                // 0-90 degrees
    longitudeOfAN: random() * 360,             // 0-360 degrees
    startTime: new Date(),
    numPoints: 10 + Math.floor(random() * 20), // 10-30 points
    duration: 60 * 60,                         // 1 hour
  };
}
```

---

## Part 4: Main Generator Script 🎲

**File**: `generators/generate-trajectories.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import {
  generateCircularOrbit,
  generateTumblingOrbit,
  randomOrbitParams,
  TrajectoryPoint,
} from './orbit-math';

/**
 * Sensor definition (matches plugin types).
 */
interface SensorDefinition {
  id: string;
  name: string;
  fov: number;
  orientation: {
    qx: number;
    qy: number;
    qz: number;
    qw: number;
  };
}

/**
 * Generate a satellite JSON object.
 */
function generateSatelliteJSON(
  satelliteId: string,
  satelliteName: string,
  trajectoryPoints: TrajectoryPoint[],
  sensors: SensorDefinition[]
) {
  return {
    satelliteId,
    satelliteName,
    meta: {
      custom: {
        sensors,
      },
    },
    columns: [
      { text: 'Time', type: 'time' },
      { text: 'Longitude', type: 'number' },
      { text: 'Latitude', type: 'number' },
      { text: 'Altitude', type: 'number' },
      { text: 'qx', type: 'number' },
      { text: 'qy', type: 'number' },
      { text: 'qz', type: 'number' },
      { text: 'qs', type: 'number' },
    ],
    rows: trajectoryPoints.map(p => [
      p.time,
      p.longitude,
      p.latitude,
      p.altitude,
      p.qx,
      p.qy,
      p.qz,
      p.qs,
    ]),
  };
}

/**
 * Generate example sensors for a satellite.
 */
function generateSensors(satelliteIdx: number): SensorDefinition[] {
  const sensorConfigs = [
    { name: 'Main Camera', fov: 10, orientation: { qx: 0, qy: 0, qz: 0, qw: 1 } },
    { name: 'Nadir Camera', fov: 15, orientation: { qx: 1, qy: 0, qz: 0, qw: 0 } },
    { name: 'Star Tracker', fov: 20, orientation: { qx: 0, qy: 1, qz: 0, qw: 0 } },
  ];

  return sensorConfigs.map((config, idx) => ({
    id: `sat${satelliteIdx}-sens${idx}`,
    ...config,
  }));
}

/**
 * Main script entry point.
 */
function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--multi'; // Default: generate multiple satellites

  const outputDir = path.join(__dirname, '../generated');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Generating satellite test data...\n');

  if (mode === '--single') {
    // Generate single satellite
    console.log('Mode: Single Satellite');
    const params = randomOrbitParams(12345); // Seeded for reproducibility
    const trajectory = generateCircularOrbit(params);
    const sensors = generateSensors(0);
    
    const satelliteData = generateSatelliteJSON(
      'sat-1',
      'Starlink-4021',
      trajectory,
      sensors
    );

    const outputPath = path.join(outputDir, 'single-satellite.json');
    fs.writeFileSync(outputPath, JSON.stringify(satelliteData, null, 2));
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`   Points: ${trajectory.length}`);
    console.log(`   Sensors: ${sensors.length}`);
    
  } else if (mode === '--multi') {
    // Generate multiple satellites
    console.log('Mode: Multiple Satellites');
    
    const satelliteConfigs = [
      { id: 'sat-1', name: 'Starlink-4021', seed: 12345, type: 'circular' },
      { id: 'sat-2', name: 'Hubble Space Telescope', seed: 67890, type: 'tumbling' },
      { id: 'sat-3', name: 'ISS', seed: 11111, type: 'circular' },
    ];

    const satellitesData = satelliteConfigs.map((config, idx) => {
      const params = randomOrbitParams(config.seed);
      
      // Offset start times so they don't overlap
      params.startTime = new Date(Date.now() + idx * 2 * 60 * 60 * 1000); // 2 hours apart
      
      const trajectory = config.type === 'tumbling'
        ? generateTumblingOrbit(params)
        : generateCircularOrbit(params);
      
      const sensors = generateSensors(idx);
      
      const satData = generateSatelliteJSON(
        config.id,
        config.name,
        trajectory,
        sensors
      );

      console.log(`  ✅ ${config.name}:`);
      console.log(`     Points: ${trajectory.length}`);
      console.log(`     Sensors: ${sensors.length}`);
      console.log(`     Time: ${new Date(trajectory[0].time).toISOString()}`);
      
      return satData;
    });

    // Write combined multi-satellite file
    const outputPath = path.join(outputDir, 'multi-satellite.json');
    fs.writeFileSync(outputPath, JSON.stringify(satellitesData, null, 2));
    
    console.log(`\n✅ Generated: ${outputPath}`);
    console.log(`   Total satellites: ${satellitesData.length}`);
    
    // Also write individual files
    satellitesData.forEach((satData, idx) => {
      const individualPath = path.join(outputDir, `satellite-${idx + 1}.json`);
      fs.writeFileSync(individualPath, JSON.stringify(satData, null, 2));
    });
    
    console.log(`   Individual files: satellite-1.json, satellite-2.json, satellite-3.json`);
  }

  console.log('\n✨ Done!');
}

// Run the script
main();
```

---

## Part 5: TypeScript Config 🔧

**File**: `generators/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Part 6: Usage Examples 💻

### Setup (One-time)

```bash
cd grafana-plugins/test-plugin/test-plans/generators
npm install
```

### Generate Test Data

```bash
# Generate multiple satellites (default)
npm run generate

# Or directly
ts-node generate-trajectories.ts --multi

# Generate single satellite
npm run generate:single

# Output appears in:
# ../generated/multi-satellite.json
# ../generated/satellite-1.json
# ../generated/satellite-2.json
# etc.
```

### Example Output Structure

**File**: `generated/multi-satellite.json`

```json
[
  {
    "satelliteId": "sat-1",
    "satelliteName": "Starlink-4021",
    "meta": {
      "custom": {
        "sensors": [
          {
            "id": "sat0-sens0",
            "name": "Main Camera",
            "fov": 10,
            "orientation": { "qx": 0, "qy": 0, "qz": 0, "qw": 1 }
          }
        ]
      }
    },
    "columns": [...],
    "rows": [
      [1734220800000, -45.23, 23.12, 550000, 0, 0, 0, 1],
      [1734221040000, -43.15, 25.67, 550000, 0, 0, 0, 1],
      ...
    ]
  },
  {
    "satelliteId": "sat-2",
    "satelliteName": "Hubble Space Telescope",
    "meta": { ... },
    "columns": [...],
    "rows": [...]
  }
]
```

---

## Part 7: Future Enhancements 🚀

### Phase 2: More Realistic Orbits

```typescript
// Add elliptical orbits
export function generateEllipticalOrbit(
  params: OrbitParams,
  eccentricity: number
): TrajectoryPoint[] {
  // True anomaly calculation
  // Eccentric anomaly
  // Kepler's equation solving
  // ...
}
```

### Phase 3: Ground Station Coverage

```typescript
// Add ground stations to JSON
export function addGroundStations(
  satelliteData: any,
  stations: GroundStation[]
) {
  return {
    ...satelliteData,
    meta: {
      ...satelliteData.meta,
      custom: {
        ...satelliteData.meta.custom,
        groundStations: stations,
      },
    },
  };
}
```

### Phase 4: Sensor Pointing Modes

```typescript
// Generate sensor orientations that point at targets
export function generateTargetPointingSensor(
  trajectoryPoints: TrajectoryPoint[],
  targetLat: number,
  targetLon: number
): SensorDefinition {
  // Compute quaternions to point at ground target
  // ...
}
```

### Phase 5: Command-Line Args

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .option('-n, --num-satellites <number>', 'Number of satellites', '3')
  .option('-p, --num-points <number>', 'Points per trajectory', '20')
  .option('-d, --duration <seconds>', 'Orbit duration', '3600')
  .option('-o, --output <path>', 'Output file path')
  .parse();

const options = program.opts();
```

---

## Part 8: Advantages of This Approach ✅

### 1. **Same Ecosystem**
- No Python environment
- No conda/pip/venv
- Just `npm install` once

### 2. **Type Safety**
- TypeScript ensures JSON structure matches plugin types
- Can literally import types from plugin: `import { SensorDefinition } from '../src/types/sensorTypes'`
- Compiler catches bugs

### 3. **Evolvable**
- Start simple (circular orbits)
- Add complexity incrementally (elliptical, ground stations, etc.)
- Version controlled alongside plugin code

### 4. **Fast Iteration**
```bash
# Change code
vim generate-trajectories.ts

# Run immediately
ts-node generate-trajectories.ts

# Test in Grafana
# (copy JSON to test data source)
```

### 5. **Sharable Code**
```typescript
// orbit-math.ts can be imported into plugin later!
import { calculateOrbitalPeriod } from '../../test-plans/generators/orbit-math';

// Use in plugin for real-time trajectory prediction
```

---

## Part 9: Alternative: Python (If Needed)

**When Python might be better**:
- Need precise orbital mechanics (SGP4/TLE propagation)
- Complex numerical computation (NumPy)
- Already have Python orbital tools

**Python Script** (for reference):
```python
#!/usr/bin/env python3
import json
import numpy as np
from datetime import datetime, timedelta

def generate_orbit(alt_km, inclination_deg, num_points=20):
    # Similar logic to TypeScript version
    # ...
    return trajectory_points

if __name__ == '__main__':
    satellites = [
        generate_satellite_json('sat-1', 'Starlink', ...),
        generate_satellite_json('sat-2', 'Hubble', ...),
    ]
    
    with open('multi-satellite.json', 'w') as f:
        json.dump(satellites, f, indent=2)
```

**But**: Adds Python dependency, different syntax, not as integrated.

---

## Part 10: Recommended Approach 🎯

### Start with TypeScript
1. Simple script (`generate-trajectories.ts`)
2. Basic circular orbits
3. Random parameters with seeds (reproducible)
4. 10-30 points per satellite
5. Multiple satellites with time offsets

### Evolve as Needed
1. **Phase 1**: Circular orbits ✅
2. **Phase 2**: Elliptical orbits
3. **Phase 3**: TLE/SGP4 integration (can use `satellite.js` npm package!)
4. **Phase 4**: Ground station visibility
5. **Phase 5**: CLI with arguments

### Keep It Standalone
- Lives in `test-plugin/test-plans/generators/`
- Own `package.json` (minimal deps)
- Run with `npm run generate`
- Output to `generated/` folder (gitignored)

---

## Next Steps

1. Create `generators/` folder structure
2. Write `orbit-math.ts` (orbital mechanics)
3. Write `generate-trajectories.ts` (main script)
4. Add `package.json` and `tsconfig.json`
5. Run script: `npm run generate`
6. Test with plugin!

**Ready to implement?** This will save us **tons** of time generating test data! 🚀

