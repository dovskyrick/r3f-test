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

## Next Steps

1. Implement backend changes to include spherical coordinates
2. Create basic point visualization component
3. Add connecting lines between points
4. Implement data fetching and error handling
5. Add interactive features
6. Optimize performance
7. Add visual enhancements

## Future Enhancements

- Time-based animation of satellite position
- Multiple trajectory support
- Ground track projection
- Altitude visualization
- Velocity vectors
- Orbital parameters display 