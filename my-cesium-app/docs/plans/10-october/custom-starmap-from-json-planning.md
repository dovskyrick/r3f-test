# Custom Starmap Implementation Using JSON Data - Planning Document

## Overview
Instead of using the `three-starmap` library, we will implement a custom starmap solution using the JSON data files already downloaded. This approach gives us full control within our React Three Fiber environment without integrating a vanilla THREE.js library.

## Data Files Analysis

### 1. `visibleStarsFormatted.json` - Star Data

**Location:** `src/assets/visibleStarsFormatted.json`

**Structure:** Array of star objects

**Each Star Object Contains:**
```typescript
{
  x: number;              // Cartesian X coordinate
  y: number;              // Cartesian Y coordinate  
  z: number;              // Cartesian Z coordinate
  ra: number;             // Right Ascension (hours)
  dec: number;            // Declination (degrees)
  mag: number;            // Apparent magnitude (brightness)
  ci: number | null;      // Color index (B-V)
  bf: string | null;      // Bayer/Flamsteed designation
  hr: number | null;      // Harvard Revised (HR) catalog number
  proper: string | null;  // Proper name (e.g., "Sirius", "Betelgeuse")
  az: number;             // Azimuth (radians)
  alt: number;            // Altitude (radians)
}
```

**Key Observations:**
- ~8,913 stars total (based on three-starmap documentation)
- Already has 3D Cartesian coordinates (x, y, z) - ready to use!
- Magnitude scale: Lower = brighter (Sirius ~ -1.44, faint stars ~ 6.5)
- Color index provides star color information
- Some stars have proper names (e.g., "Fomalhaut", "Scheat", "Matar")

### 2. `ConstellationLines.json` - Constellation Data

**Location:** `src/assets/ConstellationLines.json`

**Structure:** Object with constellation abbreviations as keys

**Each Constellation Contains:**
```typescript
{
  "And": {                    // Constellation abbreviation (Andromeda)
    "count": 20,             // Number of line segments
    "stars": [               // Array of HR (Harvard Revised) catalog numbers
      8961, 8976, 8965, ...  // Connect these stars in order
    ]
  },
  "Ori": { ... },            // Orion
  "UMa": { ... }             // Ursa Major (Big Dipper)
  // ... 88 constellations total
}
```

**Key Observations:**
- 88 modern constellations
- Stars referenced by HR catalog number
- Lines drawn by connecting stars in array order
- Some constellations have multiple parts (e.g., "Cam1", "Cam2")
- Can look up HR numbers in star data to get coordinates

## Proposed Implementation Architecture

### Component Structure

```
CelestialView/
  ├── Starfield (existing - will be replaced)
  └── CustomStarmap (NEW)
       ├── StarPoints (NEW) - Renders all stars as points
       ├── ConstellationLines (NEW) - Renders constellation lines
       └── StarmapGroup (NEW) - Container for rotation/transformation
```

### Data Flow

```
JSON Files → Parse/Process → TypeScript Types → React Components → Three.js Rendering
```

## Detailed Implementation Plan

### Phase 1: Data Loading and Type Definitions

**Goal:** Load JSON data and create proper TypeScript types

**Tasks:**

1. **Create Type Definitions**

File: `src/types/StarData.ts`

```typescript
export interface StarData {
  x: number;
  y: number;
  z: number;
  ra: number;
  dec: number;
  mag: number;
  ci: number | null;
  bf: string | null;
  hr: number | null;
  proper: string | null;
  az: number;
  alt: number;
}

export interface ConstellationData {
  count: number;
  stars: number[]; // HR catalog numbers
}

export interface ConstellationsData {
  [key: string]: ConstellationData; // Constellation abbreviation as key
}

export interface ProcessedStarData {
  position: [number, number, number];
  magnitude: number;
  color: [number, number, number]; // RGB based on color index
  size: number; // Derived from magnitude
  brightness: number; // Opacity/intensity
  name?: string;
  hrNumber?: number;
}
```

2. **Create Data Loading Utility**

File: `src/utils/starmapData.ts`

```typescript
import starsJson from '../assets/visibleStarsFormatted.json';
import constellationsJson from '../assets/ConstellationLines.json';
import { StarData, ConstellationsData, ProcessedStarData } from '../types/StarData';

// Type assertions for imported JSON
const starsData = starsJson as StarData[];
const constellationsData = constellationsJson as ConstellationsData;

// Create HR number lookup map for fast constellation rendering
const starsByHR: Map<number, StarData> = new Map();
starsData.forEach(star => {
  if (star.hr !== null) {
    starsByHR.set(star.hr, star);
  }
});

export { starsData, constellationsData, starsByHR };
```

**Time Estimate:** 30 minutes  
**Risk:** Low (straightforward type definitions)

### Phase 2: Star Color Conversion

**Goal:** Convert B-V color index to RGB colors

**Color Index to Color Mapping:**
- B-V < 0: Blue-white stars (hot)
- B-V ~ 0: White stars
- B-V ~ 0.6: Yellow stars (like our Sun)
- B-V > 1.5: Red stars (cool)

**Implementation:**

File: `src/utils/starColorConversion.ts`

```typescript
/**
 * Converts B-V color index to RGB color
 * Based on approximate blackbody radiation color
 * 
 * B-V ranges from about -0.4 (blue) to +2.0 (red)
 */
export function colorIndexToRGB(colorIndex: number | null): [number, number, number] {
  if (colorIndex === null) {
    // Default to white if no color index
    return [1.0, 1.0, 1.0];
  }

  // Clamp color index to reasonable range
  const bv = Math.max(-0.4, Math.min(2.0, colorIndex));

  let r, g, b;

  if (bv < 0) {
    // Blue-white stars
    r = 0.7 + (bv + 0.4) * 0.75;
    g = 0.8 + (bv + 0.4) * 0.5;
    b = 1.0;
  } else if (bv < 0.6) {
    // White to yellow stars
    r = 1.0;
    g = 1.0 - (bv * 0.3);
    b = 1.0 - (bv * 0.7);
  } else if (bv < 1.5) {
    // Orange stars
    r = 1.0;
    g = 0.8 - ((bv - 0.6) * 0.4);
    b = 0.6 - ((bv - 0.6) * 0.5);
  } else {
    // Red stars
    r = 1.0;
    g = 0.4;
    b = 0.2;
  }

  return [r, g, b];
}

/**
 * Converts apparent magnitude to star size
 * Lower magnitude = brighter = larger
 */
export function magnitudeToSize(magnitude: number): number {
  // Sirius (brightest) is mag -1.44
  // Faint visible stars are mag ~6.5
  // Size range: 1.0 to 4.0 pixels
  
  // Invert scale: brighter stars get larger size
  const normalized = (6.5 - magnitude) / 8.0; // 0 to 1 range
  const size = 1.0 + (normalized * 3.0); // 1.0 to 4.0
  
  return Math.max(1.0, Math.min(4.0, size));
}

/**
 * Converts apparent magnitude to opacity/brightness
 */
export function magnitudeToBrightness(magnitude: number): number {
  // Brighter stars more opaque
  // Range from 0.3 (faint) to 1.0 (bright)
  
  const normalized = (6.5 - magnitude) / 8.0;
  const brightness = 0.3 + (normalized * 0.7);
  
  return Math.max(0.3, Math.min(1.0, brightness));
}
```

**Time Estimate:** 1 hour  
**Risk:** Low (color conversion formulas well-established)

### Phase 3: Star Points Component

**Goal:** Render all ~9000 stars as an efficient point cloud

**Implementation:**

File: `src/components/3D/StarPoints.tsx`

```typescript
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { starsData } from '../../utils/starmapData';
import { colorIndexToRGB, magnitudeToSize, magnitudeToBrightness } from '../../utils/starColorConversion';

interface StarPointsProps {
  minMagnitude?: number; // Filter: only show stars brighter than this
  showNames?: boolean;   // Future: show star names
}

const StarPoints: React.FC<StarPointsProps> = ({ 
  minMagnitude = 6.5 
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Process star data into Three.js buffers
  const { positions, colors, sizes } = useMemo(() => {
    // Filter stars by magnitude
    const filteredStars = starsData.filter(star => star.mag <= minMagnitude);
    
    const count = filteredStars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    filteredStars.forEach((star, i) => {
      const i3 = i * 3;

      // Positions - use existing x, y, z coordinates
      positions[i3] = star.x;
      positions[i3 + 1] = star.y;
      positions[i3 + 2] = star.z;

      // Colors - convert B-V color index to RGB
      const [r, g, b] = colorIndexToRGB(star.ci);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      // Sizes - based on magnitude
      sizes[i] = magnitudeToSize(star.mag);
    });

    console.log(`[StarPoints] Rendered ${count} stars`);

    return { positions, colors, sizes };
  }, [minMagnitude]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.5}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

export default StarPoints;
```

**Time Estimate:** 1-2 hours  
**Risk:** Low (similar to existing Starfield component)

### Phase 4: Constellation Lines Component

**Goal:** Render constellation lines connecting stars

**Implementation:**

File: `src/components/3D/ConstellationLines.tsx`

```typescript
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { constellationsData, starsByHR } from '../../utils/starmapData';

interface ConstellationLinesProps {
  visible?: boolean;
  lineColor?: string;
  lineWidth?: number;
  constellations?: string[]; // Optional: filter which constellations to show
}

const ConstellationLines: React.FC<ConstellationLinesProps> = ({
  visible = false,
  lineColor = '#d1d9e6',
  lineWidth = 2,
  constellations = [] // Empty = show all
}) => {
  const lineGeometries = useMemo(() => {
    if (!visible) return [];

    const geometries: JSX.Element[] = [];
    const color = new THREE.Color(lineColor);

    // Get list of constellations to render
    const constsToRender = constellations.length > 0 
      ? constellations 
      : Object.keys(constellationsData);

    constsToRender.forEach((constKey, constIndex) => {
      const constellation = constellationsData[constKey];
      if (!constellation) return;

      // Connect stars in order
      const points: THREE.Vector3[] = [];

      for (let i = 0; i < constellation.stars.length; i++) {
        const hrNumber = constellation.stars[i];
        const star = starsByHR.get(hrNumber);

        if (star) {
          points.push(new THREE.Vector3(star.x, star.y, star.z));
        } else {
          // Star not found - break the line here
          if (points.length >= 2) {
            // Create line segment for collected points
            geometries.push(
              <line key={`${constKey}-${i}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial 
                  color={color} 
                  transparent 
                  opacity={0.6}
                  linewidth={lineWidth}
                />
              </line>
            );
          }
          points.length = 0; // Reset for next segment
        }
      }

      // Final segment
      if (points.length >= 2) {
        geometries.push(
          <line key={`${constKey}-final`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={points.length}
                array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial 
              color={color} 
              transparent 
              opacity={0.6}
              linewidth={lineWidth}
            />
          </line>
        );
      }
    });

    console.log(`[ConstellationLines] Rendered ${geometries.length} line segments`);
    return geometries;
  }, [visible, lineColor, lineWidth, constellations]);

  if (!visible) return null;

  return <group>{lineGeometries}</group>;
};

export default ConstellationLines;
```

**Time Estimate:** 2-3 hours  
**Risk:** Medium (constellation line rendering more complex)

**Alternative Simpler Approach:**
Use a single LineSegments object instead of multiple line objects for better performance.

### Phase 5: Starmap Group Container

**Goal:** Group stars and constellations together for unified rotation/transformation

**Key Feature:** This allows rotating the entire star field as one unit!

**Implementation:**

File: `src/components/3D/CustomStarmap.tsx`

```typescript
import React, { useRef } from 'react';
import * as THREE from 'three';
import StarPoints from './StarPoints';
import ConstellationLines from './ConstellationLines';

interface CustomStarmapProps {
  minMagnitude?: number;
  showConstellations?: boolean;
  constellationColor?: string;
  rotation?: [number, number, number]; // Euler angles [x, y, z]
  position?: [number, number, number];
}

const CustomStarmap: React.FC<CustomStarmapProps> = ({
  minMagnitude = 6.5,
  showConstellations = false,
  constellationColor = '#d1d9e6',
  rotation = [0, 0, 0],
  position = [0, 0, 0]
}) => {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group 
      ref={groupRef}
      rotation={rotation}
      position={position}
    >
      {/* Star points */}
      <StarPoints minMagnitude={minMagnitude} />

      {/* Constellation lines */}
      <ConstellationLines
        visible={showConstellations}
        lineColor={constellationColor}
        lineWidth={2}
      />
    </group>
  );
};

export default CustomStarmap;
```

**Benefits of Group Container:**
1. **Single Rotation Point:** Rotate all stars and constellations together
2. **Unified Transformation:** Scale, translate, or rotate the entire sky
3. **Clean API:** Simple props interface
4. **Performance:** Group transformation is GPU-optimized

**Example Usage - Rotate Star Field:**
```typescript
// Rotate 30 degrees around Y axis (horizontal rotation)
<CustomStarmap rotation={[0, Math.PI / 6, 0]} />

// Rotate to match Earth's tilt
<CustomStarmap rotation={[0.4091, 0, 0]} />

// Rotate based on geographic location and time
const lat = 40.7128; // New York latitude
const lon = -74.0060; // New York longitude
<CustomStarmap rotation={[
  THREE.MathUtils.degToRad(lat),
  THREE.MathUtils.degToRad(lon),
  0
]} />
```

**Time Estimate:** 30 minutes  
**Risk:** Low (simple container component)

### Phase 6: Integration into CelestialView

**Goal:** Replace temporary Starfield with CustomStarmap

**Changes to:** `src/pages/CelestialView/CelestialView.tsx`

```typescript
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import CustomStarmap from '../../components/3D/CustomStarmap'; // NEW
import Earth from '../../components/3D/Earth';
import './CelestialView.css';

const CelestialView: React.FC = () => {
  return (
    <div className="celestial-view-container">
      <Canvas 
        camera={{ position: [20, 20, 20] }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        
        {/* Custom starmap with real astronomical data */}
        <CustomStarmap 
          minMagnitude={6.5}
          showConstellations={false} // Can be toggled with UI later
          rotation={[0, 0, 0]} // Can add rotation logic later
        />
        
        {/* Earth */}
        <Earth isAlternateView={false} />
        
        {/* Camera controls */}
        <OrbitControls 
          minDistance={1}
          maxDistance={2}
        />
      </Canvas>
      
      <TimeSlider />
    </div>
  );
};

export default CelestialView;
```

**Time Estimate:** 15 minutes  
**Risk:** Very Low

### Phase 7: Optional Enhancements

**These can be added later:**

1. **UI Toggle for Constellations**
   - Add button to show/hide constellation lines
   - Store state in component or context

2. **Magnitude Filter Slider**
   - UI control to adjust minMagnitude
   - Show more/fewer stars dynamically

3. **Geographic Rotation**
   - Calculate rotation based on lat/lng and time
   - Match star positions to observer location on Earth

4. **Named Star Labels**
   - Render text labels for bright/named stars
   - Use drei's `<Text>` component or HTML overlays

5. **Constellation Names**
   - Display constellation names
   - Only show when constellation lines are visible

6. **Performance Optimization**
   - LOD (Level of Detail) for different zoom levels
   - Instanced rendering for stars
   - Frustum culling

## File Structure Summary

### New Files to Create

```
src/
├── types/
│   └── StarData.ts (NEW)
├── utils/
│   ├── starmapData.ts (NEW)
│   └── starColorConversion.ts (NEW)
└── components/
    └── 3D/
        ├── StarPoints.tsx (NEW)
        ├── ConstellationLines.tsx (NEW)
        └── CustomStarmap.tsx (NEW)
```

### Files to Modify

```
src/
└── pages/
    └── CelestialView/
        └── CelestialView.tsx (MODIFY - replace Starfield with CustomStarmap)
```

### Files to Keep/Remove

```
src/components/3D/
├── Starfield.tsx (REMOVE or KEEP as fallback)
```

## Data Structure for Rotation

### Single Group Rotation

**The key to rotating the entire star sky as one operation:**

```typescript
// The <group> in CustomStarmap acts as the rotation pivot
<group rotation={[x, y, z]}>
  <StarPoints />        // All ~9000 stars
  <ConstellationLines /> // All 88 constellations
</group>

// Rotating the group rotates EVERYTHING inside it!
```

**How to Rotate:**

```typescript
// 1. Static rotation (set once)
<CustomStarmap rotation={[0, Math.PI / 4, 0]} />

// 2. Dynamic rotation (with state)
const [rotation, setRotation] = useState([0, 0, 0]);
<CustomStarmap rotation={rotation} />
// Update with setRotation()

// 3. Animated rotation (with useFrame)
// Inside CustomStarmap component:
useFrame((state, delta) => {
  if (groupRef.current) {
    groupRef.current.rotation.y += delta * 0.1; // Slow rotation
  }
});
```

## Performance Considerations

### Expected Performance

**Star Count:** ~9,000 stars  
**Constellation Lines:** ~500-1000 line segments  
**Total Geometry:** Relatively lightweight

**Optimizations Built-In:**
- BufferGeometry (efficient)
- Single draw call for all stars (points)
- Additive blending (GPU-optimized)
- No textures needed
- depthWrite: false (less GPU work)

**Expected FPS:** 60 FPS on modern hardware

### If Performance Issues Arise

1. **Reduce star count** - Filter by magnitude more aggressively
2. **LOD system** - Show fewer stars when zoomed out
3. **Instanced rendering** - Use THREE.InstancedMesh (more complex)
4. **Frustum culling** - Only render visible stars (automatic in Three.js)

## Advantages of This Approach vs three-starmap Library

### ✅ Advantages

1. **Full React Three Fiber Integration**
   - No wrapper components needed
   - Direct JSX usage
   - React hooks work naturally

2. **Complete Control**
   - Modify any aspect of rendering
   - Customize colors, sizes, opacity
   - Add features as needed

3. **No External Dependencies**
   - Zero npm installs
   - No Vite configuration changes
   - No GLSL loader needed

4. **Type Safety**
   - Full TypeScript support
   - IDE autocomplete
   - Compile-time error checking

5. **Simpler Debugging**
   - All code is ours
   - React DevTools work
   - Console.log anywhere

6. **Easy Rotation/Transformation**
   - Group-based rotation
   - Single operation for entire sky
   - Intuitive API

7. **Data Already Available**
   - JSON files downloaded
   - No API calls needed
   - Instant loading

### ⚠️ Potential Disadvantages

1. **More Development Time**
   - Need to write our own rendering
   - Test and debug ourselves
   - Estimated: 6-8 hours total

2. **Less Features Initially**
   - No built-in debug UI
   - No geographic positioning (yet)
   - Simpler than full library

3. **Maintenance**
   - We own the code
   - Need to fix our own bugs
   - No upstream updates

## Implementation Timeline

### Estimated Time Breakdown

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 1 | Type definitions & data loading | 30 min | Easy |
| 2 | Color conversion utilities | 1 hour | Easy |
| 3 | StarPoints component | 1-2 hours | Easy |
| 4 | ConstellationLines component | 2-3 hours | Medium |
| 5 | CustomStarmap container | 30 min | Easy |
| 6 | Integration into CelestialView | 15 min | Easy |
| 7 | Testing & debugging | 1-2 hours | Medium |

**Total Estimated Time:** 6-9 hours

**Risk Level:** Low to Medium
- Star rendering: Low risk (similar to existing Starfield)
- Constellation rendering: Medium risk (more complex logic)
- Integration: Low risk (straightforward replacement)

## Testing Checklist

### Visual Tests
- [ ] Stars visible in scene
- [ ] Correct number of stars (~9000)
- [ ] Star colors look realistic
- [ ] Brighter stars are larger
- [ ] Stars have appropriate opacity
- [ ] Constellation lines render correctly
- [ ] Lines connect to correct stars
- [ ] No broken line segments

### Functional Tests
- [ ] Toggle constellations on/off
- [ ] Filter stars by magnitude
- [ ] Rotate entire starmap as group
- [ ] No performance issues (60 FPS)
- [ ] No console errors
- [ ] No memory leaks

### Integration Tests
- [ ] Works in CelestialView
- [ ] Earth still visible
- [ ] TimeSlider still works
- [ ] OrbitControls still work
- [ ] Can navigate between views

## Rotation Examples

### Example 1: Static Tilt (Earth's Axial Tilt)

```typescript
<CustomStarmap rotation={[0.4091, 0, 0]} />
// 23.44 degrees in radians
```

### Example 2: Geographic Positioning

```typescript
const latitude = 40.7128;  // New York
const longitude = -74.0060;

<CustomStarmap rotation={[
  THREE.MathUtils.degToRad(latitude),
  THREE.MathUtils.degToRad(longitude),
  0
]} />
```

### Example 3: Time-Based Rotation

```typescript
const hoursFromMidnight = 14; // 2 PM
const rotationPerHour = (2 * Math.PI) / 24;
const timeRotation = hoursFromMidnight * rotationPerHour;

<CustomStarmap rotation={[0, timeRotation, 0]} />
```

### Example 4: Interactive Rotation with State

```typescript
const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

// UI controls
<button onClick={() => setRotation([rotation[0], rotation[1] + 0.1, rotation[2]])}>
  Rotate Right
</button>

<CustomStarmap rotation={rotation} />
```

## Future Enhancement Opportunities

### Phase 8+ (Optional)

1. **Milky Way Band**
   - Add semi-transparent plane/mesh for Milky Way
   - Use texture or procedural shader

2. **Planets**
   - Add Solar System planets to scene
   - Calculate positions based on date

3. **Deep Sky Objects**
   - Add nebulae, galaxies, star clusters
   - Use sprites or small meshes with glow

4. **Search Functionality**
   - Search for stars by name
   - Highlight and center on star

5. **Constellation Info Panel**
   - Click constellation to show info
   - Display constellation mythology

6. **Time Controls**
   - Animate star rotation over time
   - Fast-forward through hours/days

7. **Location Selector**
   - UI to select observer location
   - Rotate stars to match location

## Conclusion

### Summary

This custom JSON-based approach provides:
- ✅ Full control within React Three Fiber
- ✅ No external library integration needed
- ✅ Real astronomical data (~9000 stars + 88 constellations)
- ✅ Realistic star colors and brightnesses
- ✅ Simple group-based rotation for entire star field
- ✅ Type-safe TypeScript implementation
- ✅ Good performance (expected 60 FPS)

### Recommendation

**Proceed with custom implementation** because:
1. Avoids complexity of integrating vanilla THREE.js library
2. Provides exactly what we need, nothing more
3. Full React Three Fiber compatibility
4. Easy to extend and customize
5. Data is already downloaded and ready

### Next Steps

After plan approval:
1. Create type definitions
2. Implement color conversion utilities
3. Build StarPoints component
4. Build ConstellationLines component
5. Create CustomStarmap container
6. Integrate into CelestialView
7. Test and optimize

---

**Ready for your review and approval before implementation!**

