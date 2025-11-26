# Celestial View Camera Control Exploration

**Date:** October 2024  
**Status:** Exploration Phase - No Implementation  
**Objective:** Explore camera control options for intuitive celestial viewing experience

---

## Current Setup Analysis

### How OrbitControls Works (Current Implementation)

```tsx
<OrbitControls
  minDistance={1}
  maxDistance={2}
/>
```

**Behavior:**
1. **Camera orbits around a target point** (default: origin [0, 0, 0])
2. **Mouse drag:** Moves camera position along a sphere surface
3. **Scroll/zoom:** Changes camera's radial distance from target
4. **Target stays fixed:** Camera looks at same point always

**The "Illusion" Created:**
- Very tight zoom limits (minDistance: 1, maxDistance: 2)
- Camera orbits in a tiny sphere (radius 1-2 units)
- Earth is at radius 1, so camera barely moves
- Creates appearance of "looking around" from a fixed point
- **BUT:** Camera is actually moving, just very little

**Problems with Current Approach:**
1. ❌ **Counter-intuitive movement:** Dragging up moves view down (because camera moves down to look up)
2. ❌ **Not truly fixed:** Camera still orbits, just in small radius
3. ❌ **Wrong zoom behavior:** Zoom changes position instead of FOV
4. ❌ **Doesn't match planetarium experience:** Real planetariums don't move camera

---

## Desired Behavior - "Planetarium Camera"

### What You Want to Achieve

**Position:**
- Camera **fixed at satellite's current position**
- Camera does NOT move when dragging mouse
- Camera updates position only when satellite moves through time

**Rotation (Look Direction):**
- Mouse drag rotates camera's **look direction**
- Dragging up → look up
- Dragging down → look down
- Dragging left → look left
- Dragging right → look right
- Natural, intuitive controls

**Zoom:**
- Scroll wheel changes camera's **Field of View (FOV)**
- Zoom in → narrower FOV (like binoculars)
- Zoom out → wider FOV (like wide-angle lens)
- Camera position stays fixed

**Mental Model:**
- You're standing on the satellite
- You can turn your head (rotate)
- You can't walk around (position fixed)
- You can zoom optically (FOV change, not movement)

---

## Exploration of Solutions

### Option 1: Custom Camera Controls (Full Control)

**Approach:** Build custom controls from scratch using Three.js camera API

#### Implementation Concept

```typescript
// Custom hook for fixed-position camera with rotation
const useFixedPositionCamera = (position: Vector3) => {
  const { camera, gl } = useThree();
  
  // Set camera position (fixed at satellite)
  camera.position.copy(position);
  
  // Track mouse drag for rotation
  const handleMouseDrag = (deltaX: number, deltaY: number) => {
    // Rotate camera based on mouse movement
    camera.rotation.y -= deltaX * rotationSpeed;
    camera.rotation.x -= deltaY * rotationSpeed;
  };
  
  // Track scroll for FOV zoom
  const handleScroll = (deltaY: number) => {
    const newFov = camera.fov + deltaY * fovSpeed;
    camera.fov = THREE.MathUtils.clamp(newFov, minFov, maxFov);
    camera.updateProjectionMatrix();
  };
};
```

#### How It Works

**Position Management:**
- Directly set `camera.position` to satellite coordinates
- Update only when satellite moves (via time changes)
- Ignore mouse drag for position

**Rotation Management:**
- Use Euler angles or Quaternions to rotate camera
- `camera.rotation.x` = pitch (up/down)
- `camera.rotation.y` = yaw (left/right)
- `camera.rotation.z` = roll (tilt, usually locked to 0)

**FOV Zoom:**
- Modify `camera.fov` property (default: 50°)
- Typical range: 20° (zoomed in) to 75° (wide angle)
- Must call `camera.updateProjectionMatrix()` after changing FOV

#### Pros & Cons

**Pros:**
- ✅ Full control over every aspect
- ✅ Exactly matches desired behavior
- ✅ No unexpected behaviors from third-party controls
- ✅ Can customize every detail

**Cons:**
- ❌ Need to handle all edge cases manually
- ❌ More code to write and maintain
- ❌ Need to handle mouse events, touch events, pointer lock, etc.
- ❌ No built-in damping/smoothing (would need to add)

**Complexity:** ⭐⭐⭐⭐ (4/5) - Medium-High

---

### Option 2: Modified OrbitControls (Hack Existing Controls)

**Approach:** Use OrbitControls but override/disable certain behaviors

#### Implementation Concept

```typescript
const celestialControlsRef = useRef<OrbitControls>(null);

useEffect(() => {
  if (!celestialControlsRef.current) return;
  
  const controls = celestialControlsRef.current;
  
  // Disable zoom (we'll handle FOV separately)
  controls.enableZoom = false;
  
  // Set extremely tight limits to minimize movement
  controls.minDistance = 0.001;
  controls.maxDistance = 0.001;
  
  // Override update to keep camera fixed
  const originalUpdate = controls.update.bind(controls);
  controls.update = () => {
    originalUpdate();
    // Force camera back to satellite position
    camera.position.copy(satellitePosition);
  };
}, [satellitePosition]);

// Separate FOV zoom handling
const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  camera.fov += event.deltaY * 0.05;
  camera.fov = THREE.MathUtils.clamp(camera.fov, 20, 75);
  camera.updateProjectionMatrix();
};
```

#### How It Works

**Position Locking:**
- Set `minDistance === maxDistance` (effectively locks radius)
- Override `update()` method to reset position each frame
- Camera tries to orbit but gets forced back

**Rotation:**
- OrbitControls handles mouse drag naturally
- Already has smooth damping/inertia built-in
- May need to invert Y-axis for intuitive up/down

**FOV Zoom:**
- Disable built-in zoom (`enableZoom = false`)
- Add custom wheel event listener
- Manually change FOV and update projection matrix

#### Pros & Cons

**Pros:**
- ✅ Leverage existing OrbitControls code
- ✅ Built-in damping and smooth controls
- ✅ Less code to write
- ✅ Proven, battle-tested library

**Cons:**
- ❌ Hacky - fighting against intended behavior
- ❌ Camera still "tries" to orbit (performance waste)
- ❌ May have unexpected behaviors
- ❌ Harder to customize deeply
- ❌ OrbitControls still thinks there's a target

**Complexity:** ⭐⭐⭐ (3/5) - Medium

---

### Option 3: PointerLockControls (First-Person Style)

**Approach:** Use Three.js built-in first-person controls (like FPS games)

#### Implementation Concept

```typescript
import { PointerLockControls } from '@react-three/drei';

<PointerLockControls 
  selector="#celestial-canvas" // Lock pointer on click
  makeDefault
/>
```

#### How It Works

**Position:**
- Camera position stays fixed (PointerLockControls doesn't move position)
- Only rotates camera based on mouse movement

**Rotation:**
- **Pointer Lock API:** Hides cursor, tracks raw mouse movement
- Mouse movement directly rotates camera
- Very smooth, natural feel
- Same controls as FPS games (Minecraft, etc.)

**FOV Zoom:**
- Not built-in, need to add separately
- Can use keyboard shortcuts or mouse wheel when pointer not locked

**User Experience:**
- Click canvas → pointer locks, cursor disappears
- Move mouse → look around
- Press ESC → unlock pointer, cursor returns

#### Pros & Cons

**Pros:**
- ✅ Perfect for fixed-position looking around
- ✅ Very smooth, natural controls
- ✅ No camera position movement at all
- ✅ Built into drei, easy to use
- ✅ Professional FPS-style feel

**Cons:**
- ❌ Requires pointer lock (click to activate)
- ❌ Cursor disappears (may confuse users)
- ❌ Need ESC to exit (not obvious to all users)
- ❌ Mobile/touch support is limited
- ❌ May not match astronomy software conventions

**Complexity:** ⭐⭐ (2/5) - Easy

---

### Option 4: Custom Spherical Rotation Controls

**Approach:** Implement camera rotation using spherical coordinates (like astronomy software)

#### Implementation Concept

```typescript
// Camera uses spherical coordinates for rotation
// Azimuth (horizontal angle) and Altitude (vertical angle)

interface SphericalControls {
  azimuth: number;   // 0-360°, horizontal rotation
  altitude: number;  // -90 to +90°, vertical rotation
  fov: number;       // Field of view for zoom
}

const useSphericalCamera = (position: Vector3) => {
  const [azimuth, setAzimuth] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [fov, setFov] = useState(50);
  
  // Convert spherical coords to camera direction
  useFrame(({ camera }) => {
    camera.position.copy(position);
    
    // Calculate look direction from spherical coords
    const direction = new Vector3(
      Math.cos(altitude) * Math.sin(azimuth),
      Math.sin(altitude),
      Math.cos(altitude) * Math.cos(azimuth)
    );
    
    camera.lookAt(position.clone().add(direction));
    camera.fov = fov;
    camera.updateProjectionMatrix();
  });
  
  // Handle mouse drag
  const onDrag = (deltaX: number, deltaY: number) => {
    setAzimuth(prev => prev + deltaX * sensitivity);
    setAltitude(prev => THREE.MathUtils.clamp(
      prev + deltaY * sensitivity,
      -Math.PI / 2,
      Math.PI / 2
    ));
  };
};
```

#### How It Works

**Coordinate System:**
- **Azimuth:** Horizontal angle (like compass bearing)
  - 0° = North, 90° = East, 180° = South, 270° = West
  - Wraps around: 360° = 0°
- **Altitude:** Vertical angle (like telescope elevation)
  - 0° = Horizon
  - +90° = Zenith (straight up)
  - -90° = Nadir (straight down)

**Camera Direction:**
- Convert spherical coordinates to Cartesian direction vector
- Use `camera.lookAt()` to point camera in that direction
- Camera position remains fixed

**Mouse Mapping:**
- Horizontal drag → change azimuth
- Vertical drag → change altitude
- Clamp altitude to ±90° (can't flip upside down)

**Zoom:**
- Separate FOV control via scroll wheel

#### Pros & Cons

**Pros:**
- ✅ Matches astronomy software (Stellarium, etc.)
- ✅ Intuitive for stargazing (azimuth/altitude)
- ✅ Natural coordinate system for celestial sphere
- ✅ Easy to display coordinates to user
- ✅ Can implement compass/elevation indicators

**Cons:**
- ❌ Need to implement all mouse handling
- ❌ Slightly more complex math
- ❌ Need to handle coordinate wrapping/clamping
- ❌ Gimbal lock at poles (altitude ±90°)

**Complexity:** ⭐⭐⭐⭐ (4/5) - Medium-High

---

## Field of View (FOV) Zoom - Deep Dive

### What is FOV?

**Definition:** The angular extent of the observable world visible through the camera

**In Cameras:**
- Human eye: ~90-120° (peripheral vision)
- Normal camera lens: 40-60°
- Telephoto lens: 10-30° (zoomed in)
- Wide angle lens: 70-110° (zoomed out)

**In Three.js:**
- Default: 50°
- Reasonable range: 20° (tight zoom) to 75° (wide angle)
- Extreme range: 10° (telescope) to 120° (fish-eye)

### How FOV Zoom Works

```typescript
// Current FOV
camera.fov = 50; // degrees

// Zoom in (narrower FOV = magnification)
camera.fov = 30; // Objects appear larger

// Zoom out (wider FOV = more visible)
camera.fov = 70; // Objects appear smaller

// CRITICAL: Must update projection matrix
camera.updateProjectionMatrix();
```

### FOV vs Position Zoom

| Aspect | Position Zoom (OrbitControls) | FOV Zoom (Desired) |
|--------|-------------------------------|---------------------|
| Camera Movement | Yes, moves closer/farther | No, stays fixed |
| Perspective Change | Yes, parallax changes | No, perspective constant |
| Distortion | Minimal | Can distort at extreme FOVs |
| Astronomical Accuracy | Less accurate | More accurate (optical zoom) |
| Performance | Same | Same |
| User Experience | "Moving through space" | "Using binoculars" |

### Implementation Example

```typescript
const [fov, setFov] = useState(50);

const handleWheel = useCallback((event: WheelEvent) => {
  event.preventDefault();
  
  setFov(prevFov => {
    // Calculate new FOV
    const delta = event.deltaY * 0.1; // Sensitivity
    const newFov = prevFov + delta;
    
    // Clamp to reasonable range
    return THREE.MathUtils.clamp(newFov, 20, 75);
  });
}, []);

useEffect(() => {
  camera.fov = fov;
  camera.updateProjectionMatrix();
}, [fov, camera]);

// Attach event listener
useEffect(() => {
  const canvas = gl.domElement;
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  return () => canvas.removeEventListener('wheel', handleWheel);
}, [handleWheel, gl]);
```

### Pros & Cons of FOV Zoom

**Pros:**
- ✅ Camera position stays fixed (perfect for our use case)
- ✅ Natural "optical zoom" feeling
- ✅ Matches real telescope/binocular behavior
- ✅ No parallax changes (objects don't shift relative to each other)
- ✅ Performance identical to position zoom

**Cons:**
- ❌ Can distort at extreme FOVs (<20° or >100°)
- ❌ Doesn't change depth relationships
- ❌ May feel different from traditional 3D navigation

**Recommendation:** FOV zoom is **perfect** for astronomical viewing!

---

## Satellite Position Integration

### Challenge: Camera Follows Satellite Through Time

**Current System:**
- Satellite position updates when time changes (TimeSlider)
- Satellite has trajectory points with cartesian coordinates
- Camera should be at satellite position in Celestial View

**Integration Approach:**

```typescript
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import { getPositionAtTime } from '../../utils/trajectoryUtils';

const CelestialView = () => {
  const { focusedSatellite } = useSatelliteContext();
  const { currentMJD } = useTimeContext();
  
  // Get satellite position at current time
  const satellitePosition = useMemo(() => {
    if (!focusedSatellite?.trajectoryPoints) {
      return new THREE.Vector3(0, 0, 0); // Default to origin
    }
    
    const pos = getPositionAtTime(
      focusedSatellite.trajectoryPoints,
      currentMJD
    );
    
    return pos 
      ? new THREE.Vector3(pos.x, pos.y, pos.z)
      : new THREE.Vector3(0, 0, 0);
  }, [focusedSatellite, currentMJD]);
  
  return (
    <Canvas>
      <CustomCelestialControls position={satellitePosition} />
      {/* ... */}
    </Canvas>
  );
};
```

**Key Considerations:**

1. **Position Updates:**
   - When time changes → satellite moves → camera moves
   - Camera look direction should NOT change (maintain gaze direction)
   - Smooth transition vs instant jump?

2. **No Satellite Selected:**
   - Default position: origin [0, 0, 0]?
   - Or disable celestial view entirely?
   - Show message to user?

3. **Trajectory Gaps:**
   - What if satellite position not available at current time?
   - Fallback to nearest known position?
   - Interpolate between points?

---

## Mouse Movement Direction - Solving the Inversion

### The Problem

**Current Behavior (OrbitControls):**
- Drag mouse UP → Camera moves DOWN → View looks UP
- Drag mouse DOWN → Camera moves UP → View looks DOWN
- This is correct for **orbit** controls but feels wrong for **first-person**

**Why This Happens:**
- OrbitControls moves the **camera**, not the view
- Moving camera down makes it look up at target
- It's like moving your head down to look up

**Desired Behavior:**
- Drag mouse UP → Look UP (like real life)
- Drag mouse DOWN → Look DOWN (like real life)

### Solution Options

#### Option A: Invert Y-Axis

```typescript
// For custom controls
const onMouseDrag = (deltaX: number, deltaY: number) => {
  azimuth += deltaX * sensitivity;
  altitude -= deltaY * sensitivity; // Negative to invert
};
```

#### Option B: Flip OrbitControls

```typescript
// For modified OrbitControls
const controls = new OrbitControls(camera, gl.domElement);

// Three.js r150+ has this option
controls.reverseOrbit = true; // Inverts rotation direction

// Or manually invert in update loop
controls.addEventListener('change', () => {
  // Flip the Y rotation
  camera.rotation.x = -camera.rotation.x;
});
```

#### Option C: Change Mental Model

Instead of "dragging the view", think of it as "dragging the sky":
- Drag sky UP → See lower part of sky
- Drag sky DOWN → See upper part of sky

**Problem:** This is NOT intuitive for most users!

**Recommendation:** Use Option A or B to match expected behavior.

---

## Touch/Mobile Support

### Considerations

**Touch Gestures:**
- **Single finger drag:** Rotate camera (look around)
- **Two finger pinch:** FOV zoom
- **Two finger drag:** Pan? (probably not needed)

**Challenges:**
- PointerLockControls doesn't work on mobile
- Touch events different from mouse events
- Need separate touch handling logic

**Solution:**
- Detect if device supports pointer lock
- Fall back to touch-friendly controls on mobile
- Or use custom controls that handle both

```typescript
const isTouchDevice = 'ontouchstart' in window;

return (
  <Canvas>
    {isTouchDevice ? (
      <TouchCelestialControls position={satellitePosition} />
    ) : (
      <PointerLockControls />
    )}
  </Canvas>
);
```

---

## Comparison Matrix

| Feature | Custom Controls | Modified OrbitControls | PointerLockControls | Spherical Controls |
|---------|----------------|------------------------|---------------------|-------------------|
| **Position Fixed** | ✅ Perfect | ⚠️ Hacky | ✅ Perfect | ✅ Perfect |
| **Intuitive Rotation** | ✅ Customizable | ⚠️ May need inversion | ✅ Natural | ✅ Astronomical |
| **FOV Zoom** | ✅ Easy to add | ✅ Easy to add | ✅ Easy to add | ✅ Easy to add |
| **Smoothing/Damping** | ❌ Manual | ✅ Built-in | ✅ Built-in | ❌ Manual |
| **Mobile Support** | ✅ Good | ✅ Good | ❌ Limited | ✅ Good |
| **Development Time** | 4-6 hours | 2-3 hours | 1-2 hours | 4-6 hours |
| **Maintenance** | ⭐⭐⭐ Medium | ⭐⭐ Easy | ⭐ Very Easy | ⭐⭐⭐ Medium |
| **User Familiarity** | ⭐⭐ Depends | ⭐⭐⭐ Common | ⭐⭐⭐⭐ FPS games | ⭐⭐⭐⭐ Astronomy |
| **Flexibility** | ⭐⭐⭐⭐⭐ Total | ⭐⭐ Limited | ⭐⭐ Limited | ⭐⭐⭐⭐ High |

---

## Recommended Approach

### Phase 1: Quick Win - Modified OrbitControls

**Why:**
- Fastest to implement (2-3 hours)
- Leverages existing, proven code
- Gets you 80% of desired behavior
- Easy to test and iterate

**Implementation:**
1. Lock orbit radius (minDistance === maxDistance)
2. Override update to fix camera position
3. Add custom FOV zoom handler
4. Test and refine

**Limitations:**
- Slightly hacky
- May have edge cases
- Less customizable long-term

---

### Phase 2: Custom Spherical Controls (Long-term)

**Why:**
- Perfect for astronomical application
- Matches industry standards (Stellarium, etc.)
- Full control and flexibility
- Professional result

**Implementation:**
1. Implement azimuth/altitude state management
2. Convert to camera look direction
3. Handle mouse drag events
4. Add FOV zoom
5. Add smooth damping/inertia
6. Polish and optimize

**Benefits:**
- Exactly what you want
- Maintainable and extensible
- Can add features (compass, elevation display, etc.)

---

## Additional Features to Consider

### 1. Compass/Orientation Display

Show current viewing direction:
```tsx
<div className="celestial-compass">
  <span>Azimuth: {azimuth.toFixed(1)}°</span>
  <span>Altitude: {altitude.toFixed(1)}°</span>
</div>
```

### 2. FOV Display

Show current zoom level:
```tsx
<div className="celestial-fov">
  FOV: {fov.toFixed(1)}° ({getFOVDescription(fov)})
</div>

// "Wide Angle" (70°), "Normal" (50°), "Telephoto" (30°), etc.
```

### 3. Reset View Button

Return to default orientation:
```tsx
<button onClick={() => {
  setAzimuth(0);
  setAltitude(0);
  setFov(50);
}}>
  Reset View
</button>
```

### 4. Preset Views

Quick jump to cardinal directions:
```tsx
<button onClick={() => setAzimuth(0)}>North</button>
<button onClick={() => setAzimuth(90)}>East</button>
<button onClick={() => setAzimuth(180)}>South</button>
<button onClick={() => setAzimuth(270)}>West</button>
<button onClick={() => setAltitude(90)}>Zenith</button>
```

### 5. Keyboard Shortcuts

```typescript
// Arrow keys: Look around
// +/- or PgUp/PgDn: Zoom
// Home: Reset view
// N/E/S/W: Cardinal directions
```

### 6. Smooth Transitions

When jumping to preset or following satellite:
```typescript
// Use spring animation
const springConfig = { tension: 120, friction: 14 };
const { azimuth } = useSpring({
  azimuth: targetAzimuth,
  config: springConfig
});
```

---

## Technical Challenges & Solutions

### Challenge 1: Gimbal Lock

**Problem:** At altitude = ±90° (zenith/nadir), rotation becomes unstable

**Solution:**
- Clamp altitude to ±89° (avoid exactly 90°)
- Or use Quaternions instead of Euler angles (more complex)

```typescript
const maxAltitude = Math.PI / 2 - 0.01; // 89.43°
setAltitude(prev => THREE.MathUtils.clamp(prev, -maxAltitude, maxAltitude));
```

### Challenge 2: Coordinate Wrapping

**Problem:** Azimuth goes beyond 360° or below 0°

**Solution:**
```typescript
const normalizeAzimuth = (angle: number) => {
  angle = angle % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
};
```

### Challenge 3: Smooth Damping

**Problem:** Instant stops feel jarring

**Solution:**
- Implement velocity-based damping
- Gradually reduce rotation speed after drag ends

```typescript
const [velocity, setVelocity] = useState({ x: 0, y: 0 });
const dampingFactor = 0.95;

useFrame(() => {
  // Apply velocity
  setAzimuth(prev => prev + velocity.x);
  setAltitude(prev => prev + velocity.y);
  
  // Dampen velocity
  setVelocity(prev => ({
    x: prev.x * dampingFactor,
    y: prev.y * dampingFactor
  }));
});
```

### Challenge 4: Performance

**Problem:** Camera updates every frame

**Solution:**
- Only update when necessary (drag active or damping)
- Use `useFrame` conditionally
- Optimize matrix calculations

```typescript
const isDragging = useRef(false);
const isDecelerating = useRef(false);

useFrame(() => {
  if (!isDragging.current && !isDecelerating.current) return;
  // Update camera...
});
```

---

## Testing Checklist

### Functional Tests
- [ ] Camera stays at satellite position
- [ ] Dragging mouse rotates view (not position)
- [ ] Drag up = look up, drag down = look down
- [ ] Scroll wheel changes FOV (not position)
- [ ] FOV clamped to reasonable range (20-75°)
- [ ] Can look in all directions (360° horizontal)
- [ ] Cannot flip upside down (altitude clamped)

### Integration Tests
- [ ] Camera follows satellite when time changes
- [ ] Camera maintains look direction during satellite movement
- [ ] Works with all satellites
- [ ] Works when no satellite selected
- [ ] Transition from EarthView smooth

### User Experience Tests
- [ ] Controls feel intuitive
- [ ] Movement is smooth (no jitter)
- [ ] Damping feels natural (not too slow/fast)
- [ ] Zoom range is useful (can see details and overview)
- [ ] Works on both mouse and trackpad
- [ ] Mobile/touch controls work (if implemented)

---

## Questions for User

Before proceeding with implementation:

1. **Approach:** Start with Modified OrbitControls (quick) or go straight to Custom Spherical Controls (proper)?

2. **FOV Range:** What zoom range do you want?
   - Conservative: 30° (zoomed) to 70° (wide)
   - Moderate: 20° to 75°
   - Extreme: 10° (telescope) to 90° (very wide)

3. **Damping:** Want smooth deceleration after drag ends? Or instant stop?

4. **UI Indicators:** Show azimuth/altitude/FOV on screen?

5. **Mobile Support:** Important now, or desktop-only for now?

6. **Default View:** Which direction should camera point initially?
   - Earth direction?
   - North (azimuth 0°)?
   - Random/arbitrary?

7. **Reset Function:** Should there be a button to reset view to default?

---

## Implementation Roadmap (When Approved)

### Quick Approach (Modified OrbitControls)
1. Create custom controls wrapper (30 min)
2. Lock camera position at satellite (30 min)
3. Add FOV zoom handler (30 min)
4. Test and adjust sensitivity (30 min)
5. Add UI indicators (optional, 30 min)

**Total:** 2-3 hours

### Proper Approach (Custom Spherical Controls)
1. Create custom hook for spherical camera (1 hour)
2. Implement azimuth/altitude state (30 min)
3. Add mouse drag handlers (1 hour)
4. Implement FOV zoom (30 min)
5. Add smooth damping (1 hour)
6. Integrate with satellite position (30 min)
7. Add UI indicators (30 min)
8. Test and polish (1 hour)

**Total:** 5-6 hours

---

**Ready for your feedback and approval!** Please review and let me know which approach you'd like to pursue.

