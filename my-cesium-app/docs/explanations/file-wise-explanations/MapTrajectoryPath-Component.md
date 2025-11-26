# MapTrajectoryPath Component

## Overview

The `MapTrajectoryPath` component is a React functional component designed specifically for the 2D map view of the application. It renders a path line connecting trajectory points on a flat map representation using spherical coordinates (longitude/latitude). This component handles the visualization of satellite movement across the world map, including special handling for crossing the International Date Line.

## File Location

`src/components/Map/MapTrajectoryPath.tsx`

## Dependencies

The component relies on several key dependencies:

- **React**: For component creation and lifecycle management
- **React Three Fiber/Drei**: For the `Line` component that renders the trajectory path
- **Three.js**: For 3D geometry and vector mathematics
- **TrajectoryContext**: A custom context that provides trajectory data and visibility state

## Technical Implementation

### Coordinate Conversion Function

The component includes a utility function that converts geographic coordinates to scene positions:

```jsx
const latLngToPosition = (lat: number, lng: number) => {
  // Map dimensions (these values should match those in MapsView)
  const planeWidth = 10;
  const MAP_ASPECT_RATIO = 2521 / 1260; // Width / Height
  const planeHeight = planeWidth / MAP_ASPECT_RATIO;
  
  // Convert lat/long to position on plane
  // Longitude: -180 to 180 maps to -width/2 to width/2
  // Latitude: -90 to 90 maps to -height/2 to height/2
  const x = (lng / 180) * (planeWidth / 2);
  const y = (lat / 90) * (planeHeight / 2);
  
  // Z is slightly above plane to avoid z-fighting
  return new THREE.Vector3(x, y, 0.005);
};
```

This function:
1. Uses predefined map dimensions that match the map plane in the scene
2. Maps longitude (-180° to 180°) to the X-axis of the plane
3. Maps latitude (-90° to 90°) to the Y-axis of the plane
4. Sets a small Z value (0.005) to ensure the line appears slightly above the map plane, preventing z-fighting (visual artifacts when two surfaces occupy nearly the same space)

### Component Structure

The component follows this logical flow:
1. Retrieves trajectory data and visibility from context
2. Uses memoization to efficiently convert trajectory points to line points
3. Handles the edge case of crossing the International Date Line
4. Renders a line connecting these points or returns null if nothing to display

### Line Points Generation

A key feature is how the component generates the points for the line:

```jsx
const linePoints = useMemo(() => {
  if (!isTrajectoryVisible || !trajectoryData) return [];
  
  const points: THREE.Vector3[] = [];
  let lastLongitude: number | null = null;
  
  trajectoryData.points.forEach((point, index) => {
    const { longitude, latitude } = point.spherical;
    
    // Handle date line crossing (longitude wrapping)
    if (lastLongitude !== null) {
      // If we cross the date line, don't connect the points
      if (Math.abs(longitude - lastLongitude) > 180) {
        // Add a break in the line by pushing null
        points.push(new THREE.Vector3(NaN, NaN, NaN));
      }
    }
    
    // Add the point
    points.push(latLngToPosition(latitude, longitude));
    lastLongitude = longitude;
  });
  
  return points;
}, [trajectoryData, isTrajectoryVisible]);
```

This code:
1. Creates an array to hold the points for the line
2. Tracks the last longitude to detect crossing the International Date Line
3. For each trajectory point:
   - Extracts spherical coordinates (longitude/latitude)
   - Checks if the longitude difference exceeds 180°, indicating a date line crossing
   - Inserts a special point with NaN values to create a visual break in the line when crossing the date line
   - Converts the coordinates to a position on the map plane
4. Returns the array of points for rendering the line

### International Date Line Handling

A sophisticated aspect of this component is how it handles the International Date Line (180° longitude). When a satellite trajectory crosses this line, it would normally create a line that incorrectly spans the entire map (from -180° to 180°). The component avoids this by:

```jsx
if (Math.abs(longitude - lastLongitude) > 180) {
  // Add a break in the line by pushing null
  points.push(new THREE.Vector3(NaN, NaN, NaN));
}
```

This creates a discontinuity in the line by inserting a point with NaN (Not a Number) values, which the Line component interprets as a break. This prevents an unwanted line spanning across the map when the trajectory wraps around the edges.

### Line Rendering

The actual rendering uses the `Line` component from react-three-drei:

```jsx
<Line
  points={linePoints}
  color="#ff3333"
  lineWidth={1.5}
  transparent
  opacity={0.7}
/>
```

Key properties:
- `points`: The array of Vector3 points defining the path, including any breaks
- `color`: A red color (#ff3333) to distinguish it from the 3D view's orange trajectory
- `lineWidth`: Slightly thicker than the 3D view's line for better visibility on the map
- `transparent` and `opacity`: Makes the line semi-transparent (70% opacity)

## Integration with Other Components

The `MapTrajectoryPath` component is used alongside:

1. `MapTrajectory` - Renders points/markers along the path
2. `MapTrajectoryVisualization` - A container component that combines both the path and points

The component is typically rendered as part of the `MapsView` page, which provides the 2D map plane that this path is drawn onto.

## Performance Considerations

The component implements several optimizations:

1. **Memoization**: `useMemo` prevents recalculating the line points on every render
2. **Conditional Rendering**: The component returns null when the trajectory is not visible
3. **Dependency Array**: The memoization only recalculates when trajectory data or visibility changes
4. **Coordinate Conversion**: The latLngToPosition function efficiently maps coordinates to the plane

## Technical Challenges

The main technical challenges addressed by this component include:

1. **Date Line Crossing**: Implementing a clean solution for trajectory paths that cross the International Date Line
2. **Coordinate Mapping**: Correctly mapping spherical coordinates to the flat map
3. **Visual Appearance**: Ensuring the line appears above the map plane without z-fighting
4. **Performance**: Efficiently handling potentially hundreds of trajectory points

## Customization Possibilities

The appearance of the trajectory path can be customized by modifying:

1. The `color` property for different color schemes
2. The `lineWidth` for thinner or thicker lines
3. The `opacity` for more or less transparency
4. The Z position value (0.005) to adjust how far above the map the line appears 