# Cesium Camera Modes & Earth-Centered Free Camera

**Date**: December 15, 2025  
**Goal**: Understand Cesium camera modes and implement an Earth-centered free camera view

---

## Current Problem

When not tracking a satellite (free camera mode), the camera can zoom/pan such that Earth goes completely out of view. The user wants a camera mode that:
- ✅ Always keeps Earth centered and in view
- ✅ Allows free rotation around Earth
- ✅ Doesn't affect the existing tracked entity mode (which works well)
- ✅ Behaves like tracked mode, but tracks Earth instead of satellites

---

## Cesium Camera Architecture

### 1. **Camera Object** (`viewer.camera`)

The `Camera` is Cesium's 3D camera controller. Key properties:
- `position` - Cartesian3 position in 3D space
- `direction` - Where camera is pointing
- `up` - Camera's up vector
- `frustum` - Field of view settings

### 2. **Scene Modes**

Cesium has three built-in scene modes (controlled via `viewer.scene.mode`):
- `SceneMode.SCENE3D` - Full 3D globe (what we use)
- `SceneMode.SCENE2D` - Flat 2D map
- `SceneMode.COLUMBUS_VIEW` - 2.5D unwrapped globe

### 3. **Camera Controllers**

Cesium provides different ways to control the camera:

#### a) **Free Camera** (default when no entity is tracked)
```typescript
viewer.trackedEntity = undefined;
```
- User can freely pan, zoom, rotate
- **Problem**: Can zoom/pan away from Earth entirely
- No automatic "home" position enforcement

#### b) **Tracked Entity Mode**
```typescript
viewer.trackedEntity = satelliteEntity;
```
- Camera automatically follows the entity
- Maintains a viewing offset from the entity
- Smooth interpolation as entity moves
- **Works great** for satellites!

#### c) **Locked Mode**
```typescript
viewer.scene.screenSpaceCameraController.enableRotate = false;
viewer.scene.screenSpaceCameraController.enableZoom = false;
// etc.
```
- Disables user camera controls
- Not what we want (too restrictive)

---

## Solution: Earth-Centered Free Camera

### Concept

Create a **"virtual Earth entity"** that acts as the tracked entity when no satellite is selected. This gives us:
- Tracked entity behavior (always centered on target)
- Target is Earth's center (not a moving satellite)
- User can still rotate/zoom around Earth
- Smooth transition between Earth-tracking and satellite-tracking

### Implementation Strategy

#### Option A: Track an Invisible Earth-Centered Entity (RECOMMENDED)

Create a dummy entity at Earth's center:

```typescript
const earthCenterEntity = viewer.entities.add({
  id: 'earth-center-tracker',
  position: Cartesian3.ZERO, // Earth's center in ECEF
  // No graphics (invisible)
});

// When no satellite is selected, track Earth
if (trackedSatelliteId === null) {
  viewer.trackedEntity = earthCenterEntity;
} else {
  viewer.trackedEntity = satelliteEntity;
}
```

**Pros**:
- Uses Cesium's built-in tracking system
- Smooth camera interpolation (built-in)
- Very simple implementation (~10 lines)
- Automatic handling of zoom/rotation constraints

**Cons**:
- Camera might start very close to Earth center (need to set initial view offset)

#### Option B: Custom Camera Controller with Constraints

Implement a custom camera update loop that constrains the view:

```typescript
// On each frame
viewer.scene.postRender.addEventListener(() => {
  if (viewer.trackedEntity === undefined) {
    const earthCenter = Cartesian3.ZERO;
    const cameraPos = viewer.camera.position;
    const distanceFromEarth = Cartesian3.distance(cameraPos, earthCenter);
    
    // Keep camera always pointing at Earth
    const direction = Cartesian3.subtract(earthCenter, cameraPos, new Cartesian3());
    Cartesian3.normalize(direction, direction);
    
    // Constrain distance (don't go too far or too close)
    const minDistance = Ellipsoid.WGS84.maximumRadius * 2;
    const maxDistance = Ellipsoid.WGS84.maximumRadius * 100;
    
    if (distanceFromEarth < minDistance || distanceFromEarth > maxDistance) {
      // Clamp camera distance
      const clampedDistance = Math.max(minDistance, Math.min(maxDistance, distanceFromEarth));
      const newPos = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(cameraPos, new Cartesian3()),
        clampedDistance,
        new Cartesian3()
      );
      viewer.camera.position = newPos;
    }
    
    // Always look at Earth center
    viewer.camera.lookAt(
      earthCenter,
      new HeadingPitchRange(0, -Math.PI / 4, distanceFromEarth)
    );
  }
});
```

**Pros**:
- Full control over camera behavior
- Can add custom constraints (min/max zoom, etc.)

**Cons**:
- More complex (~50 lines)
- Need to handle camera interpolation manually
- Can conflict with user input if not careful

#### Option C: Home Button Fallback

Simply ensure the "Home" button (`viewer.homeButton`) is visible and properly configured:

```typescript
viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
  e.cancel = true; // Cancel default home behavior
  
  // Custom home view
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(0, 0, 20000000), // 20,000 km above equator
    orientation: {
      heading: 0,
      pitch: -Math.PI / 2, // Looking straight down
      roll: 0
    },
    duration: 2
  });
});
```

**Pros**:
- Non-intrusive (only activates when user clicks Home)
- Simple fallback mechanism

**Cons**:
- Doesn't prevent Earth from going out of view
- Requires manual user action

---

## Recommended Implementation: Option A

### Why Option A is Best

1. **Minimal code** (~15 lines total)
2. **Leverages Cesium's built-in tracking** (smooth, well-tested)
3. **Consistent UX** (same behavior as satellite tracking)
4. **No performance overhead** (no per-frame calculations)

### Implementation Details

```typescript
// In SatelliteVisualizer.tsx

// 1. Create Earth-center entity (once, in useEffect)
useEffect(() => {
  if (!viewer) return;
  
  const earthCenterEntity = viewer.entities.add({
    id: 'earth-center-tracker',
    position: Cartesian3.ZERO,
    // No graphics - invisible tracking point
  });
  
  return () => {
    viewer.entities.removeById('earth-center-tracker');
  };
}, [viewer]);

// 2. Update tracking logic
useEffect(() => {
  if (!viewer) return;
  
  if (trackedSatelliteId === null) {
    // Track Earth when no satellite selected
    const earthEntity = viewer.entities.getById('earth-center-tracker');
    viewer.trackedEntity = earthEntity;
    
    // Set initial viewing offset (distance from Earth center)
    viewer.camera.lookAt(
      Cartesian3.ZERO, // Look at Earth center
      new HeadingPitchRange(
        0,                                      // heading: 0 (north)
        CesiumMath.toRadians(-30),              // pitch: -30° (looking down at angle)
        Ellipsoid.WGS84.maximumRadius * 3       // range: 3x Earth radius
      )
    );
  } else {
    // Track selected satellite
    const satelliteEntity = viewer.entities.getById(trackedSatelliteId);
    viewer.trackedEntity = satelliteEntity;
  }
}, [viewer, trackedSatelliteId]);
```

### Camera Offset Configuration

You can adjust the viewing experience with `HeadingPitchRange`:

```typescript
new HeadingPitchRange(
  heading,  // Rotation around Earth (0 = north, π/2 = east)
  pitch,    // Vertical angle (-π/2 = top-down, 0 = horizon)
  range     // Distance from target (in meters)
)
```

**Suggested presets**:

```typescript
// Top-down view (like Google Earth)
new HeadingPitchRange(0, CesiumMath.toRadians(-90), Ellipsoid.WGS84.maximumRadius * 3)

// Oblique view (nice for 3D perspective)
new HeadingPitchRange(0, CesiumMath.toRadians(-30), Ellipsoid.WGS84.maximumRadius * 3)

// Distant overview (see multiple satellites)
new HeadingPitchRange(0, CesiumMath.toRadians(-45), Ellipsoid.WGS84.maximumRadius * 5)
```

---

## Integration Points

### Files to Modify

1. **`src/components/SatelliteVisualizer.tsx`**
   - Add Earth-center entity creation
   - Update tracking logic to use Earth entity when `trackedSatelliteId === null`
   - Set initial camera view offset

### Existing Code Touchpoints

Current tracking logic (around line 300-320):
```typescript
useEffect(() => {
  if (!viewer) return;

  if (trackedSatelliteId === null) {
    viewer.trackedEntity = undefined;  // ← Change this
  } else {
    // ... existing satellite tracking
  }
}, [viewer, trackedSatelliteId, satellites]);
```

**Change to**:
```typescript
if (trackedSatelliteId === null) {
  const earthEntity = viewer.entities.getById('earth-center-tracker');
  viewer.trackedEntity = earthEntity;  // ← Track Earth instead
} else {
  // ... existing satellite tracking (unchanged)
}
```

---

## User Controls

With Earth-centered tracking, users can still:
- ✅ **Rotate** - Click and drag to orbit around Earth
- ✅ **Zoom** - Scroll to move closer/farther from Earth
- ✅ **Pan** - Right-click drag to move view (stays Earth-centered)
- ✅ **Tilt** - Middle-mouse drag to change pitch angle

What users **cannot** do (by design):
- ❌ Pan away from Earth entirely
- ❌ Zoom infinitely far or into Earth's core (Cesium has built-in limits)

---

## Difficulty Assessment

**Implementation Difficulty**: ⭐ Easy (1/5)

**Why it's easy**:
- Uses existing Cesium `trackedEntity` system
- Only ~15 new lines of code
- No new dependencies or complex math
- Leverages built-in camera interpolation
- No performance impact

**Estimated time**: 10-15 minutes

**Confidence**: 95% - This is a well-documented Cesium pattern

---

## Alternative: Panel Setting for Camera Mode

If you want to give users control, add a new panel setting:

```typescript
// In types.ts
export enum CameraMode {
  EarthCentered = 'EarthCentered',  // Default: always look at Earth
  FreeCamera = 'FreeCamera',        // Current behavior: unrestricted
}

export interface SimpleOptions {
  // ...
  cameraMode: CameraMode;
}
```

```typescript
// In module.ts
.addRadio({
  path: 'cameraMode',
  name: '📷 Free Camera Mode',
  description: 'Camera behavior when no satellite is tracked',
  defaultValue: CameraMode.EarthCentered,
  settings: {
    options: [
      { value: CameraMode.EarthCentered, label: 'Earth-Centered (recommended)' },
      { value: CameraMode.FreeCamera, label: 'Unrestricted' },
    ],
  },
})
```

This gives advanced users the option to disable Earth-centering if they want completely free camera movement.

---

## Next Steps

1. ✅ Create Earth-center entity in `SatelliteVisualizer.tsx`
2. ✅ Update tracking logic to use Earth entity when no satellite selected
3. ✅ Set appropriate camera viewing offset
4. ✅ Test camera controls (rotate, zoom, pan)
5. ✅ (Optional) Add panel setting for camera mode selection

---

## References

- [Cesium Camera Tutorial](https://cesium.com/learn/cesiumjs/ref-doc/Camera.html)
- [Cesium Entity Tracking](https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html#trackedEntity)
- [HeadingPitchRange API](https://cesium.com/learn/cesiumjs/ref-doc/HeadingPitchRange.html)
- [Camera.lookAt()](https://cesium.com/learn/cesiumjs/ref-doc/Camera.html#lookAt)

---

## Summary

**Answer**: Yes, this is definitely possible and easy to implement!

**Solution**: Create an invisible entity at Earth's center and track it when no satellite is selected. This gives you the same smooth, constrained camera behavior as satellite tracking, but centered on Earth.

**Effort**: ~15 lines of code, 10-15 minutes
**Difficulty**: Easy (1/5)
**Impact**: Significantly better UX for free camera mode

