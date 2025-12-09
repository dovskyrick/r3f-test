# RA/Dec Celestial Grid - Focused Implementation Plan

**Date:** December 9, 2025  
**Feature:** Right Ascension / Declination celestial coordinate grid  
**Complexity:** High (coordinate transformations, celestial sphere)  
**Priority:** TBD by user

---

## What is RA/Dec Grid?

**Right Ascension (RA)** and **Declination (Dec)** form a celestial coordinate system:

- **Declination (Dec):** Like latitude, from -90° (south celestial pole) to +90° (north celestial pole)
- **Right Ascension (RA):** Like longitude, but measured in hours (0h to 24h) or degrees (0° to 360°)
  - Increases eastward
  - Fixed relative to the **stars**, not Earth
  - 1 hour = 15 degrees (360° / 24h)

**Key characteristic:** The RA/Dec grid is **inertial** - it doesn't rotate with Earth. As Earth spins, the grid appears stationary relative to the stars.

---

## The Coordinate System Problem

### What We Currently Have: ECEF
**ECEF = Earth-Centered, Earth-Fixed**
- Origin: Earth's center
- Rotates WITH Earth
- X-axis: Points to 0° latitude, 0° longitude (Prime Meridian at Equator)
- Z-axis: Points to North Pole
- **This is what Cesium uses by default** for positions like `Cartesian3.fromDegrees()`

### What We Need: ECI/J2000
**ECI = Earth-Centered Inertial**
**J2000 = Julian 2000.0 epoch (standard astronomical reference)**
- Origin: Earth's center (same as ECEF)
- Does NOT rotate with Earth
- Fixed relative to distant stars
- X-axis: Points to the vernal equinox (March equinox direction)
- Z-axis: Parallel to Earth's rotation axis (but doesn't spin)

**Transformation needed:** ECEF → ECI (depends on time, due to Earth's rotation)

### Cesium's Support for ECI

**Good news:** Cesium has built-in support!

```typescript
import { Transforms, JulianDate } from 'cesium';

// Transform matrix from ECEF to ICRF (International Celestial Reference Frame, essentially J2000)
const time = JulianDate.now();
const icrfToFixed = Transforms.computeIcrfToFixedMatrix(time);
const fixedToIcrf = Matrix3.transpose(icrfToFixed, new Matrix3());

// Now can transform positions
const positionECEF = new Cartesian3(x, y, z);
const positionECI = Matrix3.multiplyByVector(fixedToIcrf, positionECEF, new Cartesian3());
```

**But:** This transforms individual points. We need to draw lines in the ECI frame.

---

## The "Celestial Sphere" Problem

### Problem: Where to Draw the Lines?

The celestial sphere is conceptually at **infinity** - infinitely far from Earth. Obviously, we can't place geometry at infinity.

### Options:

#### Option 1: Very Large Finite Distance ✅ (Recommended)
**Approach:** Place lines at a large but finite radius

```typescript
const celestialSphereRadius = Ellipsoid.WGS84.maximumRadius * 100; // 100x Earth radius
// OR
const celestialSphereRadius = 637813700; // ~100 Earth radii in meters
```

**Pros:**
- ✅ Simple to implement
- ✅ Works with existing `PolylineGraphics`
- ✅ Cesium handles rendering fine at large distances
- ✅ Lines appear "at infinity" from typical satellite viewing distances

**Cons:**
- ⚠️ Lines are NOT actually at infinity (parallax if you get close enough)
- ⚠️ Need to choose an appropriate radius

**Verdict:** This is the standard approach used in most 3D astronomy software.

#### Option 2: Skybox with Grid Texture ❌
**Approach:** Use Cesium's skybox with a custom texture showing grid lines

**Pros:**
- ✅ Truly at "infinity" (rendered as background)
- ✅ No geometry overhead

**Cons:**
- ❌ Static texture (can't adjust grid spacing, colors dynamically)
- ❌ Fixed resolution
- ❌ Can't toggle individual lines
- ❌ Hard to generate texture programmatically

**Verdict:** Not flexible enough for interactive visualization.

#### Option 3: Custom Shader/Material ❌
**Approach:** Custom Cesium primitive with shader that draws grid

**Pros:**
- ✅ Can be truly infinite
- ✅ Perfect performance

**Cons:**
- ❌ Very complex (GLSL shaders, Cesium primitive API)
- ❌ Hard to maintain
- ❌ Overkill for this use case

**Verdict:** Too complex, not worth it.

#### Option 4: Cesium's Scene.skyBox ⚠️
**Approach:** Cesium allows setting a custom skybox

**Pros:**
- ✅ Actually at infinity
- ✅ Could overlay grid on stars

**Cons:**
- ❌ Still requires texture generation
- ❌ Not interactive/dynamic

**Verdict:** Similar issues to Option 2.

---

## Recommended Approach: Finite Celestial Sphere

**Use Option 1:** Draw polylines at 100x Earth radius

### Why This Works

1. **From satellite orbit (~400-800 km):**
   - Earth radius: ~6,378 km
   - Celestial sphere: ~637,800 km (100x)
   - Parallax: Negligible for satellite tracking

2. **From typical viewing distances:**
   - User views from ~3-10 Earth radii
   - Celestial grid at 100 Earth radii
   - Lines appear essentially at infinity

3. **Precedent:**
   - This is how Stellarium, Celestia, and other astronomy software do it
   - Standard practice in 3D space visualization

---

## Implementation Plan

### Phase 1: Basic RA/Dec Grid Lines

#### Step 1.1: Create ECI Grid Geometry

```typescript
// In utils/celestialGrid.ts

import {
  Cartesian3,
  Math as CesiumMath,
  Ellipsoid,
  Matrix3,
  Transforms,
  JulianDate,
} from 'cesium';

export interface RADecGridOptions {
  raSpacing: number;         // Hours (e.g., 1h, 2h, 6h)
  decSpacing: number;        // Degrees (e.g., 15°, 30°)
  celestialRadius: number;   // Distance from Earth center
  numSamplesPerLine: number; // Detail/smoothness
  referenceTime: JulianDate; // Time for ECEF→ECI transform
}

/**
 * Generate RA/Dec grid lines in ECI (inertial) frame
 */
export function generateRADecGrid(options: RADecGridOptions): {
  raLines: Cartesian3[][];      // Right Ascension meridians
  decLines: Cartesian3[][];     // Declination parallels
} {
  const raLines: Cartesian3[][] = [];
  const decLines: Cartesian3[][] = [];
  
  const radius = options.celestialRadius;
  
  // === Declination Lines (Parallels of celestial latitude) ===
  // These are circles parallel to the celestial equator
  
  for (let dec = -90; dec <= 90; dec += options.decSpacing) {
    if (dec === -90 || dec === 90) continue; // Skip poles (degenerate circles)
    
    const line: Cartesian3[] = [];
    const decRad = CesiumMath.toRadians(dec);
    const circleRadius = radius * Math.cos(decRad);
    const z = radius * Math.sin(decRad);
    
    for (let ra = 0; ra <= 360; ra += 360 / options.numSamplesPerLine) {
      const raRad = CesiumMath.toRadians(ra);
      const x = circleRadius * Math.cos(raRad);
      const y = circleRadius * Math.sin(raRad);
      
      line.push(new Cartesian3(x, y, z));
    }
    
    decLines.push(line);
  }
  
  // === Right Ascension Lines (Meridians from pole to pole) ===
  // These are great circles passing through both celestial poles
  
  const raSpacingDegrees = options.raSpacing * 15; // Convert hours to degrees
  
  for (let ra = 0; ra < 360; ra += raSpacingDegrees) {
    const line: Cartesian3[] = [];
    const raRad = CesiumMath.toRadians(ra);
    
    for (let dec = -90; dec <= 90; dec += 180 / options.numSamplesPerLine) {
      const decRad = CesiumMath.toRadians(dec);
      const circleRadius = radius * Math.cos(decRad);
      const z = radius * Math.sin(decRad);
      const x = circleRadius * Math.cos(raRad);
      const y = circleRadius * Math.sin(raRad);
      
      line.push(new Cartesian3(x, y, z));
    }
    
    raLines.push(line);
  }
  
  return { raLines, decLines };
}
```

**Key Detail:** This generates lines in a **local ECI-like coordinate system** where:
- X-axis points to RA=0h (vernal equinox direction)
- Y-axis points to RA=6h
- Z-axis points to celestial north pole

#### Step 1.2: Transform to Cesium's ECEF Frame

The lines are generated in ECI, but Cesium renders in ECEF. We need to transform them:

```typescript
/**
 * Transform RA/Dec grid from ECI to ECEF for a given time
 */
export function transformGridToECEF(
  gridLines: Cartesian3[][],
  referenceTime: JulianDate
): Cartesian3[][] {
  // Get the transformation matrix from ICRF (ECI) to ECEF
  const icrfToFixed = Transforms.computeIcrfToFixedMatrix(referenceTime);
  
  return gridLines.map(line => 
    line.map(point => 
      Matrix3.multiplyByVector(icrfToFixed, point, new Cartesian3())
    )
  );
}
```

**Important:** The transformation depends on **time** because Earth is rotating. The grid should stay fixed relative to stars, so we need to pick a reference time.

#### Step 1.3: Render in SatelliteVisualizer

```typescript
// In SatelliteVisualizer.tsx

import { generateRADecGrid, transformGridToECEF } from 'utils/celestialGrid';

// State for grid lines
const [celestialGridRA, setCelestialGridRA] = useState<Cartesian3[][]>([]);
const [celestialGridDec, setCelestialGridDec] = useState<Cartesian3[][]>([]);

// Generate grid when component mounts or settings change
useEffect(() => {
  if (!options.showRADecGrid || !timestamp) {
    setCelestialGridRA([]);
    setCelestialGridDec([]);
    return;
  }
  
  const celestialRadius = Ellipsoid.WGS84.maximumRadius * 100; // 100x Earth
  
  const { raLines, decLines } = generateRADecGrid({
    raSpacing: options.raSpacing,           // e.g., 1 hour
    decSpacing: options.decSpacing,         // e.g., 15 degrees
    celestialRadius: celestialRadius,
    numSamplesPerLine: 180,                 // Smooth lines
    referenceTime: timestamp,                // Use current time
  });
  
  // Transform from ECI to ECEF
  const raLinesECEF = transformGridToECEF(raLines, timestamp);
  const decLinesECEF = transformGridToECEF(decLines, timestamp);
  
  setCelestialGridRA(raLinesECEF);
  setCelestialGridDec(decLinesECEF);
  
}, [options.showRADecGrid, options.raSpacing, options.decSpacing, timestamp]);

// Render the lines
return (
  <Viewer>
    {/* ... other entities ... */}
    
    {/* RA Lines (meridians) */}
    {options.showRADecGrid && celestialGridRA.map((line, index) => (
      <Entity name={`RA Line ${index}`} key={`ra-${index}`}>
        <PolylineGraphics
          positions={line}
          width={1}
          material={Color.fromCssColorString(options.raDecGridColor).withAlpha(0.5)}
          arcType={ArcType.NONE} // Straight lines in 3D space (not geodesic)
        />
      </Entity>
    ))}
    
    {/* Dec Lines (parallels) */}
    {options.showRADecGrid && celestialGridDec.map((line, index) => (
      <Entity name={`Dec Line ${index}`} key={`dec-${index}`}>
        <PolylineGraphics
          positions={line}
          width={1}
          material={Color.fromCssColorString(options.raDecGridColor).withAlpha(0.5)}
          arcType={ArcType.NONE}
        />
      </Entity>
    ))}
  </Viewer>
);
```

---

## Critical Design Decisions

### Decision 1: Static vs Dynamic Grid

**Option A: Static Grid (Fixed Reference Time)**
- Generate grid once at a specific time (e.g., J2000.0 epoch)
- Grid doesn't update as animation plays
- Simpler implementation

**Option B: Dynamic Grid (Updates with Current Time)**
- Regenerate grid whenever `timestamp` changes
- Grid stays aligned with ECI frame as Earth rotates
- More accurate, but more complex

**Recommendation:** Start with **Static** (use `timestamp` at data load time), make dynamic if needed.

### Decision 2: What Reference Time to Use?

**Option A: J2000.0 Epoch (Jan 1, 2000, 12:00 TT)**
```typescript
const j2000 = new JulianDate(2451545.0, 0.0, TimeStandard.TAI);
```
- Standard astronomical reference
- Grid is "canonical" and unchanging

**Option B: Current Data Start Time**
```typescript
const referenceTime = timestamp; // Use first data point time
```
- Grid aligned with data time
- More intuitive for users

**Option C: Current Animation Time**
```typescript
// Update grid every frame
```
- Most accurate
- Performance cost (regenerating 24+ lines every frame)

**Recommendation:** **Option B** (data start time) - good balance of accuracy and simplicity.

### Decision 3: How Many Lines?

**RA Spacing Options:**
- 24 lines (every 1 hour)
- 12 lines (every 2 hours)
- 6 lines (every 4 hours)
- 4 lines (every 6 hours)

**Dec Spacing Options:**
- Every 10° = 18 lines
- Every 15° = 12 lines
- Every 30° = 6 lines

**Recommendation:** 
- **RA: 1 hour (24 lines)**
- **Dec: 15° (12 lines)**
- **Total: 36 lines**
- Make it configurable in settings

**Performance:** 36 lines × 180 points each = 6,480 points total (totally fine for modern GPUs)

---

## Panel Settings

```typescript
// In module.ts

.addBooleanSwitch({
  path: 'showRADecGrid',
  name: 'Show RA/Dec Celestial Grid',
  description: 'Display Right Ascension and Declination reference lines (inertial frame)',
  defaultValue: false,
})

.addNumberInput({
  path: 'raSpacing',
  name: 'RA Spacing (hours)',
  description: 'Spacing between Right Ascension meridians',
  defaultValue: 1,
  settings: {
    min: 1,
    max: 6,
    step: 1,
  },
  showIf: (config) => config.showRADecGrid,
})

.addNumberInput({
  path: 'decSpacing',
  name: 'Dec Spacing (degrees)',
  description: 'Spacing between Declination parallels',
  defaultValue: 15,
  settings: {
    min: 10,
    max: 30,
    step: 5,
  },
  showIf: (config) => config.showRADecGrid,
})

.addColorPicker({
  path: 'raDecGridColor',
  name: 'Grid Color',
  description: 'Color of the celestial grid lines',
  defaultValue: 'white',
  showIf: (config) => config.showRADecGrid,
})

.addNumberInput({
  path: 'raDecGridOpacity',
  name: 'Grid Opacity',
  description: 'Transparency of the celestial grid',
  defaultValue: 0.5,
  settings: {
    min: 0.1,
    max: 1.0,
    step: 0.1,
  },
  showIf: (config) => config.showRADecGrid,
})

.addNumberInput({
  path: 'celestialSphereRadius',
  name: 'Celestial Sphere Radius (Earth radii)',
  description: 'Distance of grid from Earth center (typically 50-200)',
  defaultValue: 100,
  settings: {
    min: 10,
    max: 500,
    step: 10,
  },
  showIf: (config) => config.showRADecGrid,
})
```

---

## Types to Add

```typescript
// In types.ts

export interface SimpleOptions {
  // ... existing options ...
  
  // RA/Dec Celestial Grid
  showRADecGrid: boolean;
  raSpacing: number;              // Hours (1-6)
  decSpacing: number;             // Degrees (10-30)
  raDecGridColor: string;
  raDecGridOpacity: number;
  celestialSphereRadius: number;  // Multiple of Earth radius
}
```

---

## Visual Examples & Expected Behavior

### What the User Will See

1. **From far away (3-5 Earth radii):**
   - Grid appears as a large sphere surrounding Earth
   - Lines are thin and subtle
   - Grid does NOT rotate with Earth
   - Satellite moves through the grid

2. **From satellite orbit:**
   - Grid lines visible in the background
   - Earth rotates inside the grid
   - Grid stays fixed relative to stars

3. **As animation plays:**
   - **Option A (Static):** Grid stays fixed, Earth rotates
   - **Option B (Dynamic):** Grid appears fixed, but updates with time

### Comparison with Other Grids

| Grid Type | Rotates with Earth? | Fixed to Stars? | Use Case |
|-----------|---------------------|-----------------|----------|
| **Lat/Lon (Graticule)** | ✅ Yes | ❌ No | Geographic reference |
| **RA/Dec (Celestial)** | ❌ No | ✅ Yes | Astronomical reference |

---

## Testing Strategy

### Visual Tests
1. **Grid appears at correct distance:**
   - Should surround Earth visibly
   - Lines should not be clipped at screen edges
   
2. **Grid doesn't rotate with Earth:**
   - Play animation, observe Earth spinning inside grid
   - Grid lines should stay fixed relative to camera (if camera is inertial)

3. **Lines are correctly spaced:**
   - Count RA lines (should be 24 for 1-hour spacing)
   - Count Dec lines (should be 12 for 15° spacing)

4. **Toggle on/off works smoothly:**
   - No timeline reset (already fixed!)
   - No camera reset

### Accuracy Tests
1. **RA=0h line aligns with vernal equinox direction**
   - At March equinox, RA=0h should point toward Sun
   - This is hard to verify visually, but could check mathematically

2. **Dec=0° line is perpendicular to Earth's rotation axis**
   - Should form a great circle in plane of celestial equator

3. **Celestial North Pole direction**
   - Dec=+90° should point toward Polaris (North Star)
   - Could add a marker for verification

---

## Known Limitations

### Limitation 1: Grid is Not Truly at Infinity
**Impact:** At extreme zoom levels, parallax becomes visible  
**Mitigation:** Use 100x+ Earth radius, rarely an issue in practice  
**User control:** Make radius configurable

### Limitation 2: Precession Not Included
**Impact:** RA/Dec coordinate system shifts slowly over decades (precession of equinoxes)  
**Mitigation:** Use current epoch (not J2000), update automatically  
**Reality:** For short-duration satellite tracking, precession is negligible

### Limitation 3: Performance with Many Lines
**Impact:** 36+ lines might slow rendering on older hardware  
**Mitigation:** Allow users to increase spacing (fewer lines)  
**Optimization:** Could use `PolylineCollection` for bulk rendering (advanced)

### Limitation 4: No Labels
**Impact:** User can't easily identify which line is which RA/Dec value  
**Mitigation:** Could add labels at intersections (future enhancement)

---

## Advanced Enhancements (Future)

### 1. Add Labels
- Display "0h", "6h", "12h", "18h" at RA lines
- Display "-30°", "0°", "+30°" at Dec lines
- Use `LabelGraphics` at grid intersections

### 2. Highlight Special Lines
- **Celestial Equator** (Dec=0°) in brighter color
- **Ecliptic** (plane of Earth's orbit, ~23.5° tilt)
- **Vernal Equinox** (RA=0h) marker

### 3. Dynamic Grid (Updates Every Frame)
- Grid rotates to stay aligned with ECI frame
- More accurate but higher performance cost
- Could use `CallbackProperty` for dynamic positions

### 4. Other Coordinate Systems
- **Horizontal (Az/Alt):** Observer-specific, requires ground station position
- **Galactic:** Aligned with Milky Way galactic plane
- **Supergalactic:** Large-scale cosmic structures

---

## Effort Estimate

**Total Implementation Time:** 3-4 hours

**Breakdown:**
1. Create `utils/celestialGrid.ts` (1 hour)
   - Grid generation functions
   - ECI to ECEF transformation
   
2. Integrate into `SatelliteVisualizer.tsx` (1 hour)
   - State management
   - useEffect for grid generation
   - Rendering with PolylineGraphics
   
3. Add panel settings to `module.ts` (30 minutes)
   - 5 new settings (toggle, spacing, color, opacity, radius)
   
4. Testing & debugging (1-1.5 hours)
   - Visual verification
   - Performance testing
   - Edge cases (no data, very large radius, etc.)

---

## Summary

**Coordinate System Needed:**
- Generate in **ECI (Earth-Centered Inertial)** / **ICRF** frame
- Transform to **ECEF** for Cesium rendering
- Use `Transforms.computeIcrfToFixedMatrix()` for conversion

**Celestial Sphere Solution:**
- Draw lines at **finite distance** (100x Earth radius)
- Standard practice in astronomy software
- Appears "at infinity" from typical viewing distances
- Configurable radius for flexibility

**Implementation Approach:**
1. Generate grid geometry in ECI frame
2. Transform to ECEF using Cesium's built-in functions
3. Render as `PolylineGraphics` with `ArcType.NONE`
4. Make spacing, color, opacity configurable
5. Use static grid (reference time = data start time)

**Complexity:**
- Medium-High (coordinate transforms, 3D geometry)
- Not as hard as it sounds (Cesium provides the tools)
- Well-defined problem with established solutions

**Ready to implement when you give the go-ahead!** 🌌✨

