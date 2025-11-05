# Celestial Map View - Stage 1 Planning

## Overview
This document outlines the development plan for adding a third view to the application: the **Celestial Map View**. This view will show the perspective from the satellite's current position, with Earth visible in its relative position and a starmap background showing stars in space.

## Current Implementation Analysis

### 1. Navigation Button System

**Location:** `src/components/Navigation/Navigation.tsx`

The navigation system is straightforward and uses React Router for routing:

```typescript
const Navigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="navigation">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        3D Earth View
      </Link>
      <Link to="/maps" className={`nav-item ${location.pathname === '/maps' ? 'active' : ''}`}>
        Maps View
      </Link>
    </div>
  );
};
```

**Key Features:**
- Uses `react-router-dom`'s `Link` component for navigation
- Uses `useLocation()` hook to determine active route
- Applies `.active` class to current route's button
- Positioned fixed in top-right corner via CSS

**Styling:** `src/components/Navigation/Navigation.css`
- Fixed positioning at `top: 52px; right: 20px` (below TopNavBar)
- Responds to sidebar state (moves when sidebar is open)
- Flexbox layout with 10px gap between buttons
- Semi-transparent black background with blue highlight for active state

### 2. View Structure

**Routes Configuration:** `src/App.tsx`

Routes are defined in the `AppContent` component:

```typescript
<Routes>
  <Route path="/" element={<EarthView isDevViewVisible={isDevViewVisible} />} />
  <Route path="/maps" element={<MapsView />} />
</Routes>
```

**View Page Structure:**

Both existing views follow a consistent pattern:

1. **EarthView** (`src/pages/EarthView/`)
   - `EarthView.tsx` - Main component
   - `EarthView.css` - View-specific styles
   - Uses `@react-three/fiber` Canvas
   - Contains 3D Earth, satellites, trajectories
   - Includes TimeSlider component

2. **MapsView** (`src/pages/MapsView/`)
   - `MapsView.tsx` - Main component
   - `MapsView.css` - View-specific styles
   - Uses `@react-three/fiber` Canvas with OrthographicCamera
   - 2D map visualization with custom controls
   - Includes TimeSlider component

**Common Patterns:**
- Each view is a full-screen container
- Uses React Three Fiber's `<Canvas>` component
- Includes lighting setup (ambient + directional)
- Includes `<TimeSlider />` component
- Background is typically black for space views

### 3. Three.js and React Three Fiber

**Current Stack:**
- `three`: ^0.178.0
- `@react-three/fiber`: ^9.2.0
- `@react-three/drei`: ^10.5.0

**Usage Patterns:**

The project uses React Three Fiber extensively:

```typescript
<Canvas camera={{ position: [20, 20, 20] }}>
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 5]} />
  {/* 3D objects go here */}
  <OrbitControls />
</Canvas>
```

**3D Object Loading:**
- GLB models loaded with `useGLTF` from `@react-three/drei`
- Example: Earth model at `src/assets/earth.glb`
- Textures loaded with `THREE.TextureLoader`

## How to Add the Third Button

### Step 1: Update Navigation Component

**File:** `src/components/Navigation/Navigation.tsx`

Add a third Link element for the Celestial Map:

```typescript
<Link 
  to="/celestial" 
  className={`nav-item ${location.pathname === '/celestial' ? 'active' : ''}`}
>
  Celestial Map
</Link>
```

No CSS changes needed - the flexbox layout will automatically accommodate the third button.

### Step 2: Add Route in App.tsx

**File:** `src/App.tsx`

1. Import the new view component:
```typescript
import CelestialView from './pages/CelestialView/CelestialView';
```

2. Add route to Routes:
```typescript
<Route path="/celestial" element={<CelestialView />} />
```

### Step 3: Create View Component Structure

Create new folder and files:
- `src/pages/CelestialView/`
  - `CelestialView.tsx`
  - `CelestialView.css`

## Three.js Starmap Implementation

### Concept Overview

A starmap in Three.js can be implemented using several approaches:

#### Approach 1: Sphere with Star Texture (Skybox)
The simplest approach - a large sphere with an inverted texture showing stars.

**Pros:**
- Simple to implement
- Good performance
- Easy to find/create textures

**Cons:**
- Stars don't parallax (all at same distance)
- Limited control over individual stars

**Implementation:**
```typescript
const Starmap = () => {
  const texture = useLoader(THREE.TextureLoader, '/path/to/starmap.jpg');
  
  return (
    <mesh>
      <sphereGeometry args={[1000, 64, 64]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide} // Render inside of sphere
        transparent={false}
      />
    </mesh>
  );
};
```

#### Approach 2: Point Cloud
Create individual stars as points in 3D space.

**Pros:**
- Individual control over each star
- Can assign brightness/color per star
- True 3D positioning
- Can use real astronomical data

**Cons:**
- More complex to set up
- Requires generating/loading star data

**Implementation:**
```typescript
const Starfield = ({ count = 5000 }) => {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Random position on sphere surface (distance 500-1000)
      const radius = 500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Star color (mostly white with some variation)
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;
    }
    
    return { positions, colors };
  }, [count]);
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.positions.length / 3}
          array={points.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={points.colors.length / 3}
          array={points.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={2} 
        vertexColors 
        transparent 
        opacity={0.8}
      />
    </points>
  );
};
```

#### Approach 3: Hybrid Approach (Recommended)
Use a skybox for background + point cloud for prominent stars.

**Pros:**
- Best visual quality
- Good performance
- Flexibility

**Cons:**
- Most complex implementation

### Star Positioning Accuracy

For Stage 1, accuracy is not critical. However, for future improvements:

**Simple Random Distribution:**
- Use uniform random distribution on sphere surface
- Quick to implement, looks decent
- No astronomical accuracy

**Real Star Data:**
- Use astronomical catalogs (e.g., Hipparcos, Yale Bright Star Catalog)
- Convert RA/Dec to 3D coordinates
- Requires loading star database
- Can add later for authenticity

**Conversion Formula (RA/Dec to Cartesian):**
```typescript
function raDecToCartesian(ra: number, dec: number, distance: number) {
  const raRad = ra * (Math.PI / 180);
  const decRad = dec * (Math.PI / 180);
  
  return {
    x: distance * Math.cos(decRad) * Math.cos(raRad),
    y: distance * Math.cos(decRad) * Math.sin(raRad),
    z: distance * Math.sin(decRad)
  };
}
```

## Stage 1 Implementation Plan

### Phase 1: Navigation Setup (Simple)

**Goal:** Add the third button and create a dummy page

**Tasks:**
1. ✅ Update `src/components/Navigation/Navigation.tsx` to add Celestial Map button
2. ✅ Create folder structure: `src/pages/CelestialView/`
3. ✅ Create `CelestialView.tsx` with "Hello World" message
4. ✅ Create `CelestialView.css` with basic styling
5. ✅ Update `src/App.tsx` to add `/celestial` route
6. ✅ Test navigation between all three views

**Acceptance Criteria:**
- Third button appears in top-right corner
- Clicking button navigates to new view
- "Hello World" displays in center of screen
- Can navigate back to other views

### Phase 2: Basic Canvas Setup

**Goal:** Set up Three.js canvas with black background

**Tasks:**
1. Replace "Hello World" with React Three Fiber Canvas
2. Add basic camera setup
3. Add ambient lighting
4. Add OrbitControls for testing
5. Include TimeSlider component

**Basic Structure:**
```typescript
const CelestialView: React.FC = () => {
  return (
    <div className="celestial-view-container">
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 10]} intensity={0.5} />
        
        {/* Components will go here */}
        
        <OrbitControls />
      </Canvas>
      <TimeSlider />
    </div>
  );
};
```

### Phase 3: Add Starfield

**Goal:** Implement procedural starfield

**Tasks:**
1. Create `src/components/3D/Starfield.tsx` component
2. Implement point cloud approach with random star positions
3. Add star brightness variation
4. Add subtle color variation (white/blue/yellow tints)
5. Optimize point count for performance (start with ~5000 stars)

**Component Structure:**
```typescript
// File: src/components/3D/Starfield.tsx
interface StarfieldProps {
  count?: number;
}

const Starfield: React.FC<StarfieldProps> = ({ count = 5000 }) => {
  // Implementation as described in Approach 2
};
```

### Phase 4: Add Earth Positioning

**Goal:** Display Earth at its relative position from satellite

**Tasks:**
1. Access satellite context for current satellite position
2. Calculate Earth's relative position from satellite viewpoint
3. Reuse existing `Earth.tsx` component
4. Position Earth correctly in scene
5. Scale Earth appropriately for viewing distance

**Key Considerations:**

**Position Calculation:**
```typescript
// If satellite is at position (x, y, z) in ITRF frame
// Earth is at origin (0, 0, 0) in ITRF frame
// From satellite perspective, Earth appears at (-x, -y, -z)

const getEarthRelativePosition = (satellitePos: {x: number, y: number, z: number}) => {
  return {
    x: -satellitePos.x,
    y: -satellitePos.y,
    z: -satellitePos.z
  };
};
```

**Scaling:**
- Satellite is typically 500-1500 km from Earth surface
- Earth radius is ~6371 km
- May need to adjust scale factor for visual clarity

**Data Access:**
```typescript
const { satellites, focusedSatelliteId } = useSatelliteContext();
const { currentTime } = useTimeContext();

// Get focused satellite
const focusedSatellite = satellites.find(s => s.id === focusedSatelliteId);

// Get current trajectory point based on time
// (Need to implement time-based interpolation)
```

### Phase 5: Hide Satellite Model

**Goal:** Ensure satellite model is not visible (camera is at satellite position)

**Tasks:**
1. Do not render Satellite component in CelestialView
2. Ensure camera is positioned at satellite location
3. Camera looks outward from satellite

**Camera Setup:**
```typescript
// Camera should be at satellite position
// Looking direction should be configurable (or default to Earth direction)

const CameraPositioning = () => {
  const { satellites, focusedSatelliteId } = useSatelliteContext();
  const { camera } = useThree();
  
  useEffect(() => {
    if (focusedSatelliteId) {
      const satellite = satellites.find(s => s.id === focusedSatelliteId);
      if (satellite) {
        // Get current position from trajectory
        const position = getCurrentSatellitePosition(satellite);
        camera.position.set(position.x, position.y, position.z);
        
        // Look at Earth
        camera.lookAt(0, 0, 0);
      }
    }
  }, [focusedSatelliteId, satellites, camera]);
  
  return null;
};
```

### Phase 6: Polish and Testing

**Tasks:**
1. Fine-tune lighting for best visual effect
2. Optimize starfield performance
3. Add loading states
4. Handle edge cases (no satellite selected, etc.)
5. Test with different satellites and times
6. Ensure smooth transitions between views

## Technical Challenges and Solutions

### Challenge 1: Coordinate System Consistency

**Problem:** Need to ensure Earth and starfield use same coordinate system as satellite data (ITRF).

**Solution:**
- Satellite positions are already in ITRF (Cartesian x, y, z)
- Earth model should remain at origin
- Starfield can use same coordinate system
- Camera positioning is relative to satellite

### Challenge 2: Scale Management

**Problem:** Real-world distances are huge (thousands of km), but Three.js works best with reasonable unit scales.

**Solution:**
- Use scale factor throughout the application
- Already exists in the project (e.g., DESCALE_FACTOR in Earth.tsx)
- Apply same scaling to satellite positions and Earth positioning
- Starfield can use arbitrary large distances (500-1000 units)

### Challenge 3: Time Synchronization

**Problem:** Need to get satellite position at current time from trajectory data.

**Solution:**
- Use existing TimeContext for current time (MJD)
- Interpolate between trajectory points
- Can reuse logic from existing components
- May need to create utility function:

```typescript
// File: src/utils/trajectoryUtils.ts (extend existing)
export function getPositionAtTime(
  trajectoryData: Satellite['trajectoryData'],
  currentMJD: number
): { x: number, y: number, z: number } | null {
  if (!trajectoryData) return null;
  
  const { points } = trajectoryData;
  
  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].mjd <= currentMJD && points[i + 1].mjd >= currentMJD) {
      // Linear interpolation
      const fraction = (currentMJD - points[i].mjd) / 
                       (points[i + 1].mjd - points[i].mjd);
      
      if (points[i].cartesian && points[i + 1].cartesian) {
        return {
          x: points[i].cartesian.x + fraction * 
             (points[i + 1].cartesian.x - points[i].cartesian.x),
          y: points[i].cartesian.y + fraction * 
             (points[i + 1].cartesian.y - points[i].cartesian.y),
          z: points[i].cartesian.z + fraction * 
             (points[i + 1].cartesian.z - points[i].cartesian.z)
        };
      }
    }
  }
  
  return null;
}
```

### Challenge 4: Camera Control

**Problem:** OrbitControls may not be ideal for celestial view - might want different interaction.

**Solution:**
- For Stage 1, keep OrbitControls for testing
- Later, can implement custom controls:
  - Pitch/yaw rotation (look around from satellite)
  - Lock position to satellite
  - Follow Earth option

## File Structure Summary

```
my-cesium-app/
├── src/
│   ├── pages/
│   │   ├── EarthView/
│   │   ├── MapsView/
│   │   └── CelestialView/              [NEW]
│   │       ├── CelestialView.tsx       [NEW]
│   │       └── CelestialView.css       [NEW]
│   ├── components/
│   │   ├── Navigation/
│   │   │   └── Navigation.tsx          [MODIFY]
│   │   └── 3D/
│   │       ├── Earth.tsx               [REUSE]
│   │       └── Starfield.tsx           [NEW]
│   ├── utils/
│   │   └── trajectoryUtils.ts          [EXTEND]
│   └── App.tsx                         [MODIFY]
```

## Future Enhancements (Beyond Stage 1)

1. **Accurate Star Positioning**
   - Load real star catalog data
   - Convert RA/Dec to ICRF coordinates
   - Account for proper motion

2. **Constellation Lines**
   - Add lines connecting stars in constellations
   - Toggle visibility

3. **Celestial Grid**
   - Right Ascension / Declination grid
   - Ecliptic plane indicator

4. **Sun and Moon**
   - Add Sun position (primary light source)
   - Add Moon position and phase

5. **Advanced Camera Controls**
   - Gyroscopic controls
   - Target tracking
   - Field of view adjustment

6. **Labels and Information**
   - Star names for bright stars
   - Constellation names
   - Coordinate information overlay

7. **View Modes**
   - Free camera mode
   - Earth-locked mode (always look at Earth)
   - Velocity-aligned mode
   - Nadir-pointing mode

## Success Criteria for Stage 1

✅ **Milestone 1: Navigation**
- Third button visible and functional
- Routes to dummy page successfully

✅ **Milestone 2: Basic View**
- Canvas renders with black background
- Can navigate and return to other views

✅ **Milestone 3: Starfield**
- Stars visible in all directions
- Stars appear at random positions
- Visually appealing distribution

✅ **Milestone 4: Earth Visible**
- Earth appears at correct relative position
- Earth is properly scaled
- Earth maintains proper orientation

✅ **Milestone 5: Satellite Perspective**
- View is from satellite position
- Updates with time changes
- Camera positioned correctly

## Development Timeline Estimate

**Phase 1:** 30 minutes - 1 hour
**Phase 2:** 30 minutes
**Phase 3:** 1-2 hours
**Phase 4:** 2-3 hours (most complex)
**Phase 5:** 30 minutes
**Phase 6:** 1-2 hours

**Total:** ~6-10 hours for complete Stage 1 implementation

## Resources and References

### Three.js Resources
- [Three.js Points Documentation](https://threejs.org/docs/#api/en/objects/Points)
- [BufferGeometry Guide](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [PointsMaterial](https://threejs.org/docs/#api/en/materials/PointsMaterial)

### React Three Fiber
- [R3F Documentation](https://docs.pmnd.rs/react-three-fiber)
- [Drei Components](https://github.com/pmndrs/drei)

### Astronomical Data
- [Hipparcos Catalog](https://www.cosmos.esa.int/web/hipparcos)
- [Yale Bright Star Catalog](http://tdc-www.harvard.edu/catalogs/bsc5.html)
- [Stellarium](https://stellarium.org/) - Reference for visual design

### Coordinate Systems
- [ICRF (Celestial) Reference Frame](https://en.wikipedia.org/wiki/International_Celestial_Reference_Frame)
- [ITRF (Terrestrial) Reference Frame](https://en.wikipedia.org/wiki/International_Terrestrial_Reference_Frame)
- [Coordinate Transformations](https://docs.astropy.org/en/stable/coordinates/)

## Conclusion

This plan provides a comprehensive roadmap for implementing the Celestial Map view. Stage 1 focuses on getting a functional view with:
- Proper navigation integration
- Basic starfield for visual context
- Earth visible from satellite perspective
- Foundation for future astronomical accuracy

The implementation follows existing patterns in the codebase and reuses components where possible, ensuring consistency with the rest of the application.

