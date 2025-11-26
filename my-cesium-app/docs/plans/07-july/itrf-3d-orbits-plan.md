# ITRF 3D Orbits Implementation Plan

## Overview

Currently, the backend generates trajectory data with:
- **Cartesian coordinates (XYZ)**: In ICRF frame (inertial, space-fixed)
- **Spherical coordinates (lat/long)**: In ITRF frame (Earth-fixed)

**Goal**: Modify the system so that:
- **Cartesian coordinates (XYZ)**: In ITRF frame for 3D visualization
- **Spherical coordinates (lat/long)**: In ITRF frame for 2D map (unchanged)
- **Frontend**: Support multiple 3D trajectories similar to existing 2D trajectory support

## Phase 1: Backend Changes

### Step 1: Update `trajectory_service.py`

**File**: `godot-backend/src/trajectory_service.py`

**Current Issue**: Line 86 uses ICRF frame for cartesian coordinates:
```python
# Get spacecraft position in ICRF frame
position = uni.frames.vector3("Earth", spacecraft_id, "ICRF", epoch)
```

**Required Changes**:
1. Change ICRF to ITRF for cartesian coordinates
2. Add optional height/altitude information
3. Ensure consistent coordinate system usage

```python
# OLD CODE (line ~86):
position = uni.frames.vector3("Earth", spacecraft_id, "ICRF", epoch)
x, y, z = float(position[0]), float(position[1]), float(position[2])

# NEW CODE:
position_itrf = uni.frames.vector3("Earth", spacecraft_id, "ITRF", epoch)
x, y, z = float(position_itrf[0]), float(position_itrf[1]), float(position_itrf[2])

# Calculate altitude (distance from Earth center minus Earth radius)
altitude = math.sqrt(x*x + y*y + z*z) - 6371.0  # Earth radius in km
```

### Step 2: Update Data Models

**File**: `godot-backend/src/models.py`

**Changes**:
1. Add optional altitude field to trajectory points
2. Update documentation to reflect ITRF coordinate system

```python
class SphericalPoint(BaseModel):
    longitude: float
    latitude: float
    altitude: Optional[float] = None  # Add altitude in km above Earth surface

class TrajectoryPoint(BaseModel):
    """A single point in a trajectory with ITRF coordinates"""
    epoch: str
    cartesian: CartesianPoint  # Now in ITRF frame
    spherical: SphericalPoint  # Already in ITRF frame
    mjd: float
```

### Step 3: Update TLE Processing

**File**: `godot-backend/src/tle_utils.py`

**Current Status**: Already converts TLE to ITRF coordinates (line 57)
```python
# Convert the TEME coordinates to ITRS
itrf_p = teme_p.transform_to(ITRS(obstime=Time(jd+jf, format='jd')))
```

**Required Changes**: 
1. Ensure YAML generation uses ITRF consistently
2. Update comments to reflect coordinate system

### Step 4: Update API Documentation

**File**: `godot-backend/README-API.md`

**Changes**:
1. Update coordinate system documentation
2. Add altitude field to example responses
3. Clarify that all coordinates are now in ITRF

## Phase 2: Frontend Changes

### Step 1: Update Data Types

**File**: `my-cesium-app/src/contexts/TrajectoryContext.tsx`

**Changes**:
1. Add altitude field to interfaces
2. Update documentation

```typescript
export interface SphericalPoint {
  longitude: number;
  latitude: number;
  altitude?: number; // Optional altitude in km
}

export interface TrajectoryPoint {
  epoch: string;
  cartesian: CartesianPoint; // Now in ITRF frame
  spherical: SphericalPoint; // Already in ITRF frame
  mjd: number;
}
```

### Step 2: Create Multi-Satellite Context

**File**: `my-cesium-app/src/contexts/SatelliteTrajectoryContext.tsx` (NEW)

**Purpose**: Manage multiple satellite trajectories similar to existing 2D trajectory support

```typescript
export interface SatelliteTrajectory {
  id: string;
  name: string;
  tle?: {
    line1: string;
    line2: string;
  };
  trajectoryData: TrajectoryResponse | null;
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
  color: string;
}

export interface SatelliteTrajectoryContextType {
  satellites: SatelliteTrajectory[];
  addSatellite: (satellite: Omit<SatelliteTrajectory, 'id'>) => void;
  removeSatellite: (id: string) => void;
  updateSatellite: (id: string, updates: Partial<SatelliteTrajectory>) => void;
  fetchTrajectoryForSatellite: (id: string) => Promise<void>;
  toggleSatelliteVisibility: (id: string) => void;
}
```

### Step 3: Update 3D Trajectory Components

**Files to Update**:
- `my-cesium-app/src/components/3D/TrajectoryPoints.tsx`
- `my-cesium-app/src/components/3D/TrajectoryLines.tsx`
- `my-cesium-app/src/components/3D/TrajectoryMarker.tsx`

**Changes**:
1. Support multiple satellites with different colors
2. Update coordinate system handling (ITRF coordinates should work directly)
3. Add satellite identification and selection

```typescript
// Example for TrajectoryPoints.tsx
const TrajectoryPoints: React.FC = () => {
  const { satellites } = useSatelliteTrajectoryContext();
  
  return (
    <group>
      {satellites.map(satellite => (
        satellite.isVisible && satellite.trajectoryData && (
          <SatelliteTrajectoryPoints
            key={satellite.id}
            satellite={satellite}
          />
        )
      ))}
    </group>
  );
};
```

### Step 4: Create 3D Trajectory Management UI

**File**: `my-cesium-app/src/components/3D/TrajectoryManager.tsx` (NEW)

**Purpose**: UI for managing multiple 3D trajectories

```typescript
const TrajectoryManager: React.FC = () => {
  const { satellites, addSatellite, removeSatellite, toggleSatelliteVisibility } = useSatelliteTrajectoryContext();
  
  return (
    <div className="trajectory-manager">
      <h3>3D Trajectories</h3>
      {satellites.map(satellite => (
        <div key={satellite.id} className="satellite-item">
          <input
            type="checkbox"
            checked={satellite.isVisible}
            onChange={() => toggleSatelliteVisibility(satellite.id)}
          />
          <span style={{ color: satellite.color }}>{satellite.name}</span>
          <button onClick={() => removeSatellite(satellite.id)}>Remove</button>
        </div>
      ))}
      <button onClick={() => addSatellite({ name: 'New Satellite', isVisible: true, color: '#ff0000' })}>
        Add Satellite
      </button>
    </div>
  );
};
```

### Step 5: Update EarthView Integration

**File**: `my-cesium-app/src/pages/EarthView/EarthView.tsx`

**Changes**:
1. Add SatelliteTrajectoryProvider wrapper
2. Include TrajectoryManager UI
3. Update 3D components to use new context

```typescript
const EarthView: React.FC = () => {
  const [isAlternateView, setIsAlternateView] = useState(false);

  return (
    <SatelliteTrajectoryProvider>
      <div className="earth-view-container">
        <TrajectoryManager />
        <Canvas camera={{ position: [20, 20, 20] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} />

          <CameraManager setIsAlternateView={setIsAlternateView} />
          <Earth isAlternateView={isAlternateView} />
          <Satellite isAlternateView={isAlternateView} />
          <AlternateViewObjects isAlternateView={isAlternateView} />
          <AlternateViewTrajectory isAlternateView={isAlternateView} />
          
          {/* New multi-satellite trajectory components */}
          <TrajectoryPoints />
          <TrajectoryLines />
          <TrajectoryMarkers />

          <OrbitControls />
        </Canvas>
        <TimeSlider />
      </div>
    </SatelliteTrajectoryProvider>
  );
};
```

## Phase 3: Testing and Validation

### Step 1: Backend Testing

**Test Cases**:
1. Verify ITRF coordinates are generated correctly
2. Test with different TLE inputs
3. Validate altitude calculations
4. Check coordinate system consistency

**Test Commands**:
```bash
# Test trajectory generation
curl "http://localhost:8000/trajectory?time_interval=60"

# Test TLE-based trajectory
curl -X POST "http://localhost:8000/trajectory/from-tle" \
  -H "Content-Type: application/json" \
  -d '{
    "tle_line1": "1 25544U 98067A   21001.00000000  .00001000  00000-0  00000-0 0  9990",
    "tle_line2": "2 25544  51.6400 000.0000 0000000  00.0000 000.0000 15.50000000000000",
    "time_interval": 60
  }'
```

### Step 2: Frontend Testing

**Test Cases**:
1. Load multiple satellites
2. Toggle visibility of individual trajectories
3. Verify 3D positioning matches Earth surface
4. Test time-based trajectory markers
5. Validate color coding and identification

### Step 3: Coordinate System Validation

**Validation Steps**:
1. Compare ITRF coordinates with known satellite positions
2. Verify trajectory points align with Earth surface features
3. Check that satellites appear at correct geographic locations
4. Validate altitude calculations

## Phase 4: Future Enhancements

### Step 1: Real-time Sun Position

**Integration with Cesium**:
```typescript
// Get sun position using Cesium
const getSunPosition = (date: Date) => {
  const julianDate = Cesium.JulianDate.fromDate(date);
  const sunPosition = Cesium.Transforms.computeFixedToIcrfMatrix(julianDate);
  // Convert to ITRF coordinates for consistency
  return transformIcrfToItrf(sunPosition);
};
```

### Step 2: Enhanced Visualization

**Features to Add**:
1. Satellite lighting based on sun position
2. Shadow calculations
3. Ground track projections
4. Orbital elements display
5. Collision detection between satellites

### Step 3: Performance Optimization

**Optimizations**:
1. Trajectory data caching
2. Level-of-detail rendering
3. Efficient coordinate transformations
4. Memory management for large datasets

## Implementation Timeline

### Week 1: Backend Changes
- [ ] Update trajectory_service.py to use ITRF coordinates
- [ ] Add altitude calculations
- [ ] Update data models
- [ ] Test coordinate system changes

### Week 2: Frontend Infrastructure
- [ ] Create SatelliteTrajectoryContext
- [ ] Update existing trajectory components
- [ ] Add multi-satellite support
- [ ] Create trajectory management UI

### Week 3: Integration and Testing
- [ ] Integrate new components into EarthView
- [ ] Test multiple satellite scenarios
- [ ] Validate coordinate system accuracy
- [ ] Performance testing

### Week 4: Polish and Documentation
- [ ] Add error handling
- [ ] Update documentation
- [ ] Create user guides
- [ ] Prepare for sun position integration

## Success Criteria

1. **Backend**: All trajectory data uses ITRF coordinates consistently
2. **Frontend**: Multiple 3D trajectories can be displayed simultaneously
3. **Accuracy**: Satellite positions match expected geographic locations
4. **Performance**: Smooth rendering with multiple satellites
5. **Usability**: Intuitive interface for managing trajectories
6. **Foundation**: Ready for sun position integration

## Risk Mitigation

1. **Coordinate System Issues**: Extensive testing with known satellite positions
2. **Performance Problems**: Implement progressive loading and LOD
3. **UI Complexity**: Iterative design with user feedback
4. **Data Consistency**: Comprehensive validation between backend and frontend
5. **Integration Challenges**: Modular implementation with clear interfaces 