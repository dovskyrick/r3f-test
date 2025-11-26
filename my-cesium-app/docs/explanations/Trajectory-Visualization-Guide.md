# Trajectory Visualization Implementation Guide

## Backend Changes

The trajectory endpoint will now return both Cartesian (XYZ) and spherical (longitude/latitude) coordinates for each point:

```json
{
  "points": [
    {
      "epoch": "2024-01-01T00:00:00Z",
      "cartesian": {
        "x": 6871.123,
        "y": -1975.456,
        "z": -660.789
      },
      "spherical": {
        "longitude": -15.987,  // degrees
        "latitude": 45.123     // degrees
      },
      "mjd": 59580.0
    }
    // ... more points
  ],
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2024-01-02T00:00:00Z",
  "point_count": 96,
  "status": "success"
}
```

## Frontend Implementation Plan

### Phase 1: 3D View Implementation

#### Step 1: Create Trajectory Points Component
```typescript
// Planned structure:
const TrajectoryPoints: React.FC = () => {
  const [trajectoryData, setTrajectoryData] = useState(null);
  
  // 1. Fetch data from backend
  // 2. Create points at each XYZ coordinate
  // 3. Optionally show lat/long in tooltip
}
```

Key features:
- Fetch trajectory data on component mount
- Create small spheres at each point
- Use consistent point size and color
- Add hover effects to show point details

#### Step 2: Add Connecting Lines
```typescript
// Planned structure:
const TrajectoryLines: React.FC = () => {
  // 1. Create line geometry from points array
  // 2. Use LineBasicMaterial with appropriate color
  // 3. Handle line visibility/opacity
}
```

Features:
- Connect consecutive points with lines
- Use appropriate line thickness and color
- Optional: Animate line drawing
- Optional: Gradient color based on altitude

#### Step 3: Combine Points and Lines
```typescript
// Planned structure:
const CompleteTrajectory: React.FC = () => {
  // 1. Manage shared state between points and lines
  // 2. Handle loading states
  // 3. Implement error boundaries
}
```

Features:
- Synchronized display of points and lines
- Loading indicators
- Error handling for failed data fetches
- Controls for visibility of points/lines

### Phase 2: Map View Implementation (Future)

The map view will use the same data but will:
- Use longitude/latitude coordinates instead of XYZ
- Handle date line wrapping
- Project points onto 2D surface
- Handle zoom levels appropriately

## Data Flow

1. **Data Fetching:**
   ```typescript
   const fetchTrajectory = async () => {
     const response = await fetch('/api/trajectory');
     const data = await response.json();
     return data;
   };
   ```

2. **Data Processing:**
   - Convert epoch strings to Date objects
   - Scale coordinates to scene units
   - Calculate additional properties (velocity, altitude, etc.)

3. **Rendering Pipeline:**
   ```
   Fetch Data → Process Points → Create Geometries → Render Scene
   ```

## Implementation Considerations

### Performance
- Use `BufferGeometry` for lines
- Consider point instancing for large datasets
- Implement level-of-detail for different zoom levels
- Cache processed data when appropriate

### Visual Quality
- Use appropriate materials for visibility
- Consider depth testing and transparency
- Add visual aids (axes, reference points)
- Implement smooth camera transitions

### Interaction
- Hover effects on points
- Click to show detailed information
- Time-based playback controls
- Camera controls appropriate for trajectory viewing

## Coordinate Scaling and Toggle Behavior

### Coordinate Scaling
To properly visualize the trajectory in 3D space, we need to scale the real-world coordinates (in kilometers) to our 3D environment units:

```
SCALE_FACTOR = 100 / EARTH_RADIUS_KM  // where 100 units = Earth radius
```

Given that Earth's radius is approximately 6371 km:
```
SCALE_FACTOR ≈ 0.0157  // (100 / 6371)
```

This means:
1. For the 3D view, we multiply every coordinate by this factor:
   ```typescript
   scaledX = point.cartesian.x * SCALE_FACTOR;
   scaledY = point.cartesian.y * SCALE_FACTOR;
   scaledZ = point.cartesian.z * SCALE_FACTOR;
   ```

2. For reference, common orbits after scaling:
   - Low Earth Orbit (LEO): ~110-130 units from Earth center
   - Geostationary orbit: ~420 units from Earth center

3. The Earth model in the 3D view should have a radius of 100 units for consistency

### Toggle Button Behavior

The trajectory toggle button should work as follows:

1. **First Press**: 
   - If trajectory data is not loaded, fetch it from the server
   - Display the trajectory once loaded
   - Show loading indicator during fetch

2. **Subsequent Presses**:
   - Toggle visibility of the already loaded trajectory data
   - No need to re-fetch from server
   - Instant response (hide/show)

3. **State Persistence**:
   - Trajectory visibility state should persist when switching between views
   - The trajectory data should be loaded only once per session

4. **Error Handling**:
   - If data fetch fails, show error message
   - Provide retry option

## Trajectory Toggle Implementation

### Phase 1: Shared State and Button Component

1. **Create Shared Context for Trajectory Data**
```typescript
// contexts/TrajectoryContext.tsx
interface TrajectoryContextType {
  trajectoryData: TrajectoryData | null;
  isTrajectoryVisible: boolean;
  fetchTrajectory: () => Promise<void>;
  toggleTrajectoryVisibility: () => void;
}

const TrajectoryContext = createContext<TrajectoryContextType | undefined>(undefined);

export const TrajectoryProvider: React.FC = ({ children }) => {
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [isTrajectoryVisible, setIsTrajectoryVisible] = useState(false);

  const fetchTrajectory = async () => {
    try {
      const response = await fetch('http://localhost:8000/trajectory');
      const data = await response.json();
      setTrajectoryData(data);
    } catch (error) {
      console.error('Error fetching trajectory:', error);
    }
  };

  const toggleTrajectoryVisibility = () => {
    if (!isTrajectoryVisible && !trajectoryData) {
      fetchTrajectory();
    }
    setIsTrajectoryVisible(!isTrajectoryVisible);
  };

  // ... provide context value
};
```

2. **Create Toggle Button Component**
```typescript
// components/TrajectoryToggle/TrajectoryToggle.tsx
const TrajectoryToggle: React.FC = () => {
  const { isTrajectoryVisible, toggleTrajectoryVisibility } = useTrajectoryContext();

  return (
    <button 
      className="trajectory-toggle"
      onClick={toggleTrajectoryVisibility}
    >
      {isTrajectoryVisible ? 'Hide Trajectory' : 'Show Trajectory'}
    </button>
  );
};
```

**VERIFICATION POINT 1**: 
- Verify that the context is properly set up
- Confirm the button appears in both views
- Test that clicking the button triggers the data fetch
- Check that the state is properly shared between views

### Phase 2: 3D View Implementation

1. **Create Trajectory Points Component for 3D View**
```typescript
// components/3D/TrajectoryPoints.tsx
const TrajectoryPoints: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  if (!isTrajectoryVisible || !trajectoryData) return null;

  return (
    <group>
      {trajectoryData.points.map((point, index) => (
        <mesh key={index} position={[point.cartesian.x, point.cartesian.y, point.cartesian.z]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="yellow" />
        </mesh>
      ))}
    </group>
  );
};
```

2. **Add Line Connections**
```typescript
// components/3D/TrajectoryLines.tsx
const TrajectoryLines: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  if (!isTrajectoryVisible || !trajectoryData) return null;

  // Create line geometry from points
  const points = trajectoryData.points.map(p => 
    new THREE.Vector3(p.cartesian.x, p.cartesian.y, p.cartesian.z)
  );

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial attach="material" color="yellow" linewidth={2} />
    </line>
  );
};
```

**VERIFICATION POINT 2**:
- Verify points appear in 3D view when toggled
- Confirm lines connect the points properly
- Check that the camera automatically zooms out to show the full trajectory
- Test that toggling off removes the visualization

### Phase 3: Map View Implementation

1. **Create Map Trajectory Component**
```typescript
// components/Map/MapTrajectory.tsx
const MapTrajectory: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  if (!isTrajectoryVisible || !trajectoryData) return null;

  return (
    <group>
      {trajectoryData.points.map((point, index) => {
        const position = latLngToPosition(
          point.spherical.latitude,
          point.spherical.longitude
        );
        
        return (
          <mesh key={index} position={position}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="red" />
          </mesh>
        );
      })}
    </group>
  );
};
```

2. **Add Path Lines on Map**
```typescript
// components/Map/MapTrajectoryPath.tsx
const MapTrajectoryPath: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  if (!isTrajectoryVisible || !trajectoryData) return null;

  const points = trajectoryData.points.map(p => 
    latLngToPosition(p.spherical.latitude, p.spherical.longitude)
  );

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial attach="material" color="red" linewidth={2} />
    </line>
  );
};
```

**VERIFICATION POINT 3**:
- Verify points appear on the map when toggled
- Confirm the path is drawn correctly
- Check that points wrap around the date line properly
- Test that toggling off removes the visualization

### Phase 4: Integration and Polish

1. **Add Loading States**
```typescript
// Add to TrajectoryContext
const [isLoading, setIsLoading] = useState(false);

// Update fetch function
const fetchTrajectory = async () => {
  setIsLoading(true);
  try {
    // ... existing fetch code ...
  } finally {
    setIsLoading(false);
  }
};
```

2. **Add Error Handling**
```typescript
// Add to TrajectoryContext
const [error, setError] = useState<string | null>(null);

// Update components to show error states
```

3. **Add Animations**
```typescript
// Fade in/out animations for points and lines
// Smooth transitions for camera movements
```

**FINAL VERIFICATION**:
- Test the complete flow from button click to visualization
- Verify that both views work correctly
- Check all error states and loading indicators
- Confirm that the toggle state persists between view changes

### Next Steps (After Verification)

1. Add hover effects to show point details
2. Implement time-based playback
3. Add filtering options for the trajectory
4. Enhance visual styling of points and lines

Would you like to proceed with implementing any specific phase? We can start with Phase 1 and verify each step before moving forward. 