# RA/Dec Grid - Concrete Implementation Steps

**Date:** December 9, 2025  
**Status:** Ready to implement (test circles confirmed visible!)  
**Prerequisite:** ✅ Verified that lines at 100× Earth radius are visible

---

## Math Required (Simplified)

### Yes, It's Similar to the Test Circles!

The RA/Dec grid is basically:
1. **Declination lines (parallels):** Circles parallel to the celestial equator
   - Just like latitude lines, but at 100× Earth radius
   - Already proved this works with the test circles!
   
2. **Right Ascension lines (meridians):** Great circles through the celestial poles
   - Like longitude lines, but in the inertial (non-rotating) frame
   - Need to generate as circles and rotate them

**Key difference from test circles:**
- Test circles were in ECEF frame (rotates with Earth)
- RA/Dec grid must be in ECI frame (fixed relative to stars)
- Need to transform ECI → ECEF for rendering

---

## The Math Explained Simply

### Declination Lines (Easier)
```
For each declination angle (e.g., -60°, -30°, 0°, +30°, +60°):
  1. dec_radians = degrees_to_radians(dec)
  2. circle_radius = celestial_radius * cos(dec_radians)
  3. z_height = celestial_radius * sin(dec_radians)
  4. For each angle around the circle (0° to 360°):
       x = circle_radius * cos(angle)
       y = circle_radius * sin(angle)
       z = z_height
       point = (x, y, z)  // in ECI frame
```

**This is EXACTLY what we did for the test circle at Z=0!**

### Right Ascension Lines (Slightly Harder)
```
For each RA angle (e.g., 0h, 1h, 2h, ..., 23h):
  1. ra_radians = hours_to_radians(ra)  // 1 hour = 15 degrees
  2. For each declination from -90° to +90°:
       x = celestial_radius * cos(dec) * cos(ra)
       y = celestial_radius * cos(dec) * sin(ra)
       z = celestial_radius * sin(dec)
       point = (x, y, z)  // in ECI frame
```

**This is like creating a meridian (great circle through poles).**

### The Transformation Step
```
For each point in ECI:
  1. Get transformation matrix: icrfToFixed = Transforms.computeIcrfToFixedMatrix(time)
  2. point_ECEF = Matrix3.multiplyByVector(icrfToFixed, point_ECI)
  3. Render point_ECEF in Cesium
```

**Cesium provides this transformation built-in!**

---

## Implementation Steps

### Step 1: Create Grid Generation Function (30 min)

**File:** `src/utils/celestialGrid.ts` (new file)

**What to do:**
```typescript
// Copy the structure from celestialTest.ts
// Replace the 6 axis-aligned circles with:
//   - N declination circles (parallels)
//   - M right ascension circles (meridians)
// Use the math formulas above
```

**Inputs:**
- `raSpacing`: hours (e.g., 1h = 24 lines, 2h = 12 lines)
- `decSpacing`: degrees (e.g., 15° = 12 lines)
- `celestialRadius`: distance (e.g., 100× Earth)
- `referenceTime`: JulianDate for ECI→ECEF transform

**Outputs:**
- Array of RA lines (in ECEF)
- Array of Dec lines (in ECEF)

### Step 2: Add Panel Settings (10 min)

**File:** `src/module.ts`

**Add settings:**
```typescript
.addBooleanSwitch({
  path: 'showRADecGrid',
  name: 'Show RA/Dec Celestial Grid',
  defaultValue: false,
})
.addNumberInput({
  path: 'raSpacing',
  name: 'RA Spacing (hours)',
  defaultValue: 1,
  min: 1, max: 6,
  showIf: (config) => config.showRADecGrid,
})
.addNumberInput({
  path: 'decSpacing',
  name: 'Dec Spacing (degrees)',
  defaultValue: 15,
  min: 10, max: 30,
  showIf: (config) => config.showRADecGrid,
})
```

**File:** `src/types.ts`

**Add to SimpleOptions:**
```typescript
showRADecGrid: boolean;
raSpacing: number;
decSpacing: number;
```

### Step 3: Generate Grid in Component (15 min)

**File:** `src/components/SatelliteVisualizer.tsx`

**Add state:**
```typescript
const [raLines, setRALines] = useState<Cartesian3[][]>([]);
const [decLines, setDecLines] = useState<Cartesian3[][]>([]);
```

**Add useEffect:**
```typescript
useEffect(() => {
  if (!options.showRADecGrid || !timestamp) {
    setRALines([]);
    setDecLines([]);
    return;
  }

  const { raLines, decLines } = generateRADecGrid({
    raSpacing: options.raSpacing,
    decSpacing: options.decSpacing,
    celestialRadius: Ellipsoid.WGS84.maximumRadius * 100,
    referenceTime: timestamp,
  });

  setRALines(raLines);
  setDecLines(decLines);
}, [options.showRADecGrid, options.raSpacing, options.decSpacing, timestamp]);
```

### Step 4: Render Grid (10 min)

**File:** `src/components/SatelliteVisualizer.tsx`

**Add rendering (similar to test circles):**
```typescript
{/* RA Lines */}
{options.showRADecGrid && raLines.map((line, index) => (
  <Entity name={`RA Line ${index}`} key={`ra-${index}`}>
    <PolylineGraphics
      positions={line}
      width={1}
      material={Color.WHITE.withAlpha(0.5)}
      arcType={ArcType.NONE}
    />
  </Entity>
))}

{/* Dec Lines */}
{options.showRADecGrid && decLines.map((line, index) => (
  <Entity name={`Dec Line ${index}`} key={`dec-${index}`}>
    <PolylineGraphics
      positions={line}
      width={1}
      material={Color.WHITE.withAlpha(0.5)}
      arcType={ArcType.NONE}
    />
  </Entity>
))}
```

### Step 5: Test & Iterate (15 min)

1. Build and run
2. Toggle RA/Dec grid ON
3. Verify lines appear
4. Test different spacings
5. Adjust colors/opacity for visibility

---

## Detailed Code for Step 1

### Create `src/utils/celestialGrid.ts`

```typescript
import {
  Cartesian3,
  Ellipsoid,
  Matrix3,
  Transforms,
  JulianDate,
  Math as CesiumMath,
} from 'cesium';

export interface RADecGridOptions {
  raSpacing: number;         // Hours (1-6)
  decSpacing: number;        // Degrees (10-30)
  celestialRadius: number;   // Distance from Earth center
  referenceTime: JulianDate; // Time for ECI→ECEF transform
  numSamplesPerLine: number; // Detail (default: 180)
}

export interface RADecGrid {
  raLines: Cartesian3[][];   // Right Ascension meridians
  decLines: Cartesian3[][];  // Declination parallels
}

/**
 * Generate RA/Dec celestial grid in ECEF frame for rendering.
 */
export function generateRADecGrid(options: RADecGridOptions): RADecGrid {
  const {
    raSpacing,
    decSpacing,
    celestialRadius,
    referenceTime,
    numSamplesPerLine = 180,
  } = options;

  // Get ECI to ECEF transformation matrix
  const icrfToFixed = Transforms.computeIcrfToFixedMatrix(referenceTime);

  // Generate lines in ECI frame, then transform to ECEF
  const decLines = generateDeclinationLines(
    decSpacing,
    celestialRadius,
    numSamplesPerLine
  ).map(line => transformLineToECEF(line, icrfToFixed));

  const raLines = generateRightAscensionLines(
    raSpacing,
    celestialRadius,
    numSamplesPerLine
  ).map(line => transformLineToECEF(line, icrfToFixed));

  return { raLines, decLines };
}

/**
 * Generate declination lines (parallels) in ECI frame.
 */
function generateDeclinationLines(
  decSpacing: number,
  radius: number,
  numSamples: number
): Cartesian3[][] {
  const lines: Cartesian3[][] = [];

  for (let dec = -90 + decSpacing; dec < 90; dec += decSpacing) {
    const decRad = CesiumMath.toRadians(dec);
    const circleRadius = radius * Math.cos(decRad);
    const z = radius * Math.sin(decRad);

    const line: Cartesian3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const angle = (i / numSamples) * 2 * Math.PI;
      const x = circleRadius * Math.cos(angle);
      const y = circleRadius * Math.sin(angle);
      line.push(new Cartesian3(x, y, z));
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Generate right ascension lines (meridians) in ECI frame.
 */
function generateRightAscensionLines(
  raSpacing: number,
  radius: number,
  numSamples: number
): Cartesian3[][] {
  const lines: Cartesian3[][] = [];
  const raSpacingDegrees = raSpacing * 15; // Convert hours to degrees

  for (let ra = 0; ra < 360; ra += raSpacingDegrees) {
    const raRad = CesiumMath.toRadians(ra);

    const line: Cartesian3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const dec = -90 + (i / numSamples) * 180; // -90° to +90°
      const decRad = CesiumMath.toRadians(dec);

      const x = radius * Math.cos(decRad) * Math.cos(raRad);
      const y = radius * Math.cos(decRad) * Math.sin(raRad);
      const z = radius * Math.sin(decRad);

      line.push(new Cartesian3(x, y, z));
    }
    lines.push(line);
  }

  return lines;
}

/**
 * Transform a line from ECI to ECEF frame.
 */
function transformLineToECEF(
  lineECI: Cartesian3[],
  icrfToFixed: Matrix3
): Cartesian3[] {
  return lineECI.map(point =>
    Matrix3.multiplyByVector(icrfToFixed, point, new Cartesian3())
  );
}
```

---

## Expected Result

**When you toggle "Show RA/Dec Celestial Grid" ON:**

1. **Grid appears at 100× Earth radius**
2. **Declination lines** (parallels):
   - Horizontal circles at -75°, -60°, -45°, -30°, -15°, 0°, +15°, +30°, +45°, +60°, +75°
   - (If 15° spacing)

3. **Right Ascension lines** (meridians):
   - Vertical great circles through poles
   - 24 lines if 1-hour spacing
   - 12 lines if 2-hour spacing

4. **Grid doesn't rotate with Earth**
   - As Earth spins, grid stays fixed relative to stars
   - Satellite moves through the grid

5. **Subtle appearance**
   - White lines, 50% transparency
   - Width: 1 pixel
   - Adjustable via settings

---

## Testing Checklist

- [ ] Build succeeds without errors
- [ ] Toggle appears in panel settings
- [ ] Grid renders when toggled ON
- [ ] Grid disappears when toggled OFF
- [ ] Count lines: 24 RA + 12 Dec = 36 lines (1h + 15° spacing)
- [ ] Grid stays fixed as Earth rotates
- [ ] Adjust RA spacing (1h, 2h, 6h) - line count changes
- [ ] Adjust Dec spacing (10°, 15°, 30°) - line count changes
- [ ] Lines visible from satellite view
- [ ] Lines visible from zoomed-out view
- [ ] No timeline reset when toggling (already fixed!)

---

## Potential Issues & Solutions

### Issue 1: Lines Not Visible
**Solution:** Increase width or decrease opacity

### Issue 2: Too Many Lines (Performance)
**Solution:** Increase spacing (fewer lines)

### Issue 3: Grid Rotates with Earth
**Solution:** Check ECI→ECEF transform is being applied

### Issue 4: Lines Appear Curved
**Solution:** Verify `arcType={ArcType.NONE}` (not GEODESIC)

---

## Total Time Estimate

- **Step 1:** 30 min (grid generation)
- **Step 2:** 10 min (panel settings)
- **Step 3:** 15 min (component integration)
- **Step 4:** 10 min (rendering)
- **Step 5:** 15 min (testing)

**Total: ~1.5 hours** (could be faster now that test circles are proven!)

---

## Why This Will Work

✅ **Test circles proved the concept** - lines at 100× Earth radius ARE visible  
✅ **Math is simple** - just circles and great circles  
✅ **Cesium provides ECI→ECEF** - no manual transforms needed  
✅ **Similar to test circles** - reuse the same rendering approach  
✅ **Performance tested** - 36 lines won't cause issues  

---

## Next Steps

1. **Verify thin lines are visible** (width 2.9 test)
2. **If visible:** Proceed with Step 1 (create `celestialGrid.ts`)
3. **If not visible:** Increase width back to 3
4. **Then:** Follow steps 2-5 sequentially

**Ready to implement when you give the green light!** 🌌✨

