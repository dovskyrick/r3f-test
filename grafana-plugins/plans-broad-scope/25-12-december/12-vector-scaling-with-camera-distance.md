# Vector Scaling Based on Camera Distance

**Date:** December 11, 2025  
**Goal:** Scale orientation vectors to maintain visibility when zoomed out  
**Current:** Single Z-axis vector (red arrow), fixed 100km length

---

## Requirements

### When Tracking ON (`isTracked = true`):
- **Fixed dimensions:** 2-3× satellite model size
- Small, just for reference near satellite
- Example: 200-300km length (satellite is ~small)

### When Tracking OFF (`isTracked = false`):
- **Dynamic scaling:** Increase length with camera distance
- Maintain minimum apparent pixel size
- Proportional to distance (simple, not rigorous)
- Prevent vectors from becoming invisible when zoomed out

---

## Implementation Approach

### Phase 1: Add Scaling to Existing Z-Axis Vector ⚡
**Why first:**
- Only one vector to deal with
- Test scaling logic in isolation
- Easier to debug

### Phase 2: Expand to X, Y, Z Vectors
**After scaling works:**
- Copy working logic to X and Y
- Add colors: X=red, Y=green, Z=blue (standard)
- All use same scaling logic

---

## Scaling Logic

### Inputs:
- `cameraPosition` - from `viewer.camera.position`
- `satellitePosition` - from position property
- `isTracked` - from state

### Formula:
```typescript
// Distance from camera to satellite
const distance = Cartesian3.distance(cameraPosition, satellitePosition);

// Base length when tracking
const baseLength = 250000; // 250km (2-3x model size)

// Scaling factor when not tracking
const minPixelSize = 50; // Minimum apparent size in pixels
const scaleFactor = isTracked 
  ? 1.0 
  : Math.max(1.0, distance / 1000000); // Scale up with distance

const vectorLength = baseLength * scaleFactor;
```

**Approximation:** Not calculating true pixel size, just proportional to distance.

---

## Implementation Steps

### Step 1: Access Camera in CallbackProperty (5 min)

**Challenge:** `CallbackProperty` callback receives `time`, not `viewer`.

**Solution:** Store `viewerRef` and access camera from it.

```typescript
// In CallbackProperty callback
const viewer = viewerRef.current?.cesiumElement;
if (!viewer) return []; // Fallback

const cameraPosition = viewer.camera.position;
```

### Step 2: Calculate Dynamic Length (5 min)

```typescript
positions={new CallbackProperty((time) => {
  const viewer = viewerRef.current?.cesiumElement;
  const pos = satellitePosition.getValue(time);
  const orient = satelliteOrientation.getValue(time);
  
  if (!viewer || !pos || !orient) return [];
  
  // Calculate distance
  const cameraPos = viewer.camera.position;
  const distance = Cartesian3.distance(cameraPos, pos);
  
  // Dynamic scaling
  const baseLength = 250000; // 250km base
  const scaleFactor = isTracked 
    ? 1.0 
    : Math.max(1.0, distance / 1000000); // 1M meters reference
  
  const vectorLength = baseLength * scaleFactor;
  
  // Rest of vector calculation...
  const zAxisBody = new Cartesian3(0, 0, 1);
  const rotationMatrix = Matrix3.fromQuaternion(orient);
  const zAxisECEF = Matrix3.multiplyByVector(rotationMatrix, zAxisBody, new Cartesian3());
  
  const endPos = Cartesian3.add(
    pos,
    Cartesian3.multiplyByScalar(zAxisECEF, vectorLength, new Cartesian3()),
    new Cartesian3()
  );
  
  return [pos, endPos];
}, false)}
```

### Step 3: Test Scaling (5 min)

**Test cases:**
- Tracking ON, zoom out → vector stays small ✓
- Tracking OFF, zoom out → vector scales up ✓
- Very far distance → vector still visible ✓

### Step 4: Fine-tune Parameters (5 min)

**Adjustable values:**
- `baseLength`: How big when close? (currently 250km)
- `distance / 1000000`: Scale rate (1M meters = 1000km reference)
- `minPixelSize`: Not used directly, but implicit in scaling

**Tweak based on feel:** 
- Too small when far? Increase scale rate
- Too big when tracking? Decrease base length

---

## Phase 2: Expand to X, Y, Z Vectors (10 min)

**After Phase 1 works:**

```typescript
// Helper function to calculate vector endpoint
const calculateVectorEndpoint = (
  pos: Cartesian3,
  orient: Quaternion,
  axisBody: Cartesian3,
  vectorLength: number
): Cartesian3 => {
  const rotationMatrix = Matrix3.fromQuaternion(orient);
  const axisECEF = Matrix3.multiplyByVector(rotationMatrix, axisBody, new Cartesian3());
  return Cartesian3.add(
    pos,
    Cartesian3.multiplyByScalar(axisECEF, vectorLength, new Cartesian3()),
    new Cartesian3()
  );
};

// X-axis (red)
<Entity>
  <PolylineGraphics
    positions={new CallbackProperty((time) => {
      // ... shared scaling logic ...
      const xAxisBody = new Cartesian3(1, 0, 0);
      const endPos = calculateVectorEndpoint(pos, orient, xAxisBody, vectorLength);
      return [pos, endPos];
    }, false)}
    material={new PolylineArrowMaterialProperty(Color.RED)}
  />
</Entity>

// Y-axis (green)
// ... similar with (0, 1, 0) and Color.GREEN ...

// Z-axis (blue)
// ... similar with (0, 0, 1) and Color.BLUE ...
```

**Standard colors:**
- X = Red
- Y = Green  
- Z = Blue (change from current red)

---

## Alternative: Cesium's Built-in Model Scaling

**Note:** Cesium has `minimumPixelSize` for models, but NOT for polylines.

**Our vectors are polylines** → need custom scaling logic.

---

## Expected Behavior

### Scenario 1: Close to Satellite, Tracking ON
```
Camera distance: 10km
Vector length: 250km (base, unscaled)
Vectors visible, small, proportional to model
```

### Scenario 2: Far from Satellite, Tracking OFF
```
Camera distance: 1,000km
Scale factor: 1000km / 1000km = 1.0 (no scale yet)
Vector length: 250km (still base)

Camera distance: 10,000km
Scale factor: 10,000km / 1000km = 10.0
Vector length: 2,500km (10× scaled)
Vectors still visible!
```

### Scenario 3: Very Far, Tracking OFF
```
Camera distance: 100,000km (zoomed way out)
Scale factor: 100.0
Vector length: 25,000km
Vectors remain visible, pointing correctly
```

---

## Implementation Time

**Phase 1 (Z-axis scaling):** ~15 minutes  
**Phase 2 (X, Y, Z expansion):** ~10 minutes  
**Total:** ~25 minutes

---

## Recommendation

**Start with Phase 1:**
1. Implement scaling on existing Z-axis vector
2. Test with tracking toggle at various distances
3. Fine-tune `baseLength` and scale rate
4. Once satisfied, expand to X/Y/Z

**Advantages:**
- ✅ Test scaling logic in isolation
- ✅ Easier to debug
- ✅ Can deploy Phase 1 immediately if Phase 2 takes longer
- ✅ Less code to write initially

---

## Phase 1 Implementation Complete! ✅

**What was added:**

### Dynamic Scaling Logic:
```typescript
// In Z-axis vector CallbackProperty:
const viewer = viewerRef.current?.cesiumElement;
const baseLength = 250000; // 250km base length
let vectorLength = baseLength;

if (viewer) {
  const cameraPosition = viewer.camera.position;
  const distance = Cartesian3.distance(cameraPosition, pos);
  
  // Scale up when not tracking and far away
  if (!isTracked) {
    const scaleFactor = Math.max(1.0, distance / 1000000);
    vectorLength = baseLength * scaleFactor;
  }
}
```

### Behavior:
- **Tracking ON:** Vector stays at 250km (fixed, small)
- **Tracking OFF:** Vector scales with camera distance
  - Close (< 1000km): 250km (scale factor 1.0)
  - Medium (5000km): 1250km (scale factor 5.0)
  - Far (50,000km): 12,500km (scale factor 50.0)
- Always visible, maintains proportional size

### Testing:
- [ ] Build and test in Grafana
- [ ] Toggle tracking ON → vector stays small
- [ ] Toggle tracking OFF, zoom out → vector scales up
- [ ] Very far zoom → vector still visible
- [ ] No errors, smooth rendering

---

## Phase 2 Implementation Complete! ✅

**What was added:**

### Three Attitude Vectors (Standard RGB Color Scheme):

**X-Axis Vector:**
- Color: **RED**
- Direction: (1, 0, 0) in body frame
- Same scaling logic as Z-axis

**Y-Axis Vector:**
- Color: **GREEN**
- Direction: (0, 1, 0) in body frame
- Same scaling logic as Z-axis

**Z-Axis Vector:**
- Color: **BLUE** (changed from red)
- Direction: (0, 0, 1) in body frame
- Same scaling logic as before

### Unified Scaling Behavior (All Axes):

**Tracked Mode:**
- Fixed 2m length
- Camera zoom controls apparent size naturally

**Untracked Mode:**
- Base 50km length
- Scales with distance: `50km × (distance / 1000km)`
- Always visible when far

### Color Convention:
```
Standard 3D coordinate system visualization:
X = Red (pitch/roll axis)
Y = Green (yaw axis)
Z = Blue (nadir pointing)
```

**Total vectors:** 3 (X, Y, Z)  
**All have arrows:** Yes (PolylineArrowMaterialProperty)  
**All scale identically:** Yes (same logic for all three)

---

## Code Refactor: DRY Implementation ✅

**Issue:** Three vectors = 150 lines of repeated code

**Solution:** Array + map pattern

### Refactored Structure:

```typescript
// Define vector configurations (can become settings later)
const attitudeVectors = React.useMemo(() => [
  { axis: new Cartesian3(1, 0, 0), color: Color.RED, name: 'X-axis' },
  { axis: new Cartesian3(0, 1, 0), color: Color.GREEN, name: 'Y-axis' },
  { axis: new Cartesian3(0, 0, 1), color: Color.BLUE, name: 'Z-axis' },
], []);

// Render all three with single block
{attitudeVectors.map((vector, index) => (
  <Entity key={`attitude-vector-${index}`}>
    <PolylineGraphics
      positions={new CallbackProperty((time) => {
        // Shared scaling logic
        // Rotate vector.axis by orientation
        // Return [pos, endPos]
      }, false)}
      material={new PolylineArrowMaterialProperty(vector.color)}
    />
  </Entity>
))}
```

**Benefits:**
- ✅ **150 lines → 50 lines** (3× reduction)
- ✅ Single source of truth for scaling logic
- ✅ Easy to add more vectors (just add to array)
- ✅ Ready for settings integration (colors, toggle per axis, etc.)
- ✅ Maintainable (fix once, applies to all)

**Future enhancement possibility:**
```typescript
// In types.ts
xAxisColor: string;
yAxisColor: string;
zAxisColor: string;

// In component
const attitudeVectors = React.useMemo(() => [
  { axis: new Cartesian3(1, 0, 0), color: Color.fromCssColorString(options.xAxisColor), name: 'X-axis' },
  // ... etc
], [options.xAxisColor, options.yAxisColor, options.zAxisColor]);
```

---

## Code Cleanup: Removed Celestial Test Module ✅

**Deleted:**
- ❌ `src/utils/celestialTest.ts` (entire file)
- ❌ Import from celestialTest
- ❌ `celestialTestCircles` state
- ❌ `useEffect` for generating test circles
- ❌ Rendering code for test circles
- ❌ `showCelestialTest` from types.ts
- ❌ Panel setting for celestial test

**Why:** Test circles were only for debugging celestial grid visibility. Now that RA/Dec grid is working perfectly, they're no longer needed.

**Result:** Cleaner codebase, less clutter in panel settings.

---

**Ready to build and test!** You'll now see a full RGB triad showing satellite orientation! 🚀✨

