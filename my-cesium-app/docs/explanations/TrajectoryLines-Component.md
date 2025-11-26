# TrajectoryLines Component

## Overview

The `TrajectoryLines` component is a React functional component used within the 3D Earth view of the application. Its purpose is to visualize a satellite trajectory by rendering a continuous line that connects all trajectory points in 3D space. This component is part of the trajectory visualization system and works in conjunction with the `TrajectoryPoints` component.

## File Location

`src/components/3D/TrajectoryLines.tsx`

## Dependencies

The component relies on several key dependencies:

- **React**: For component creation and lifecycle management
- **React Three Fiber/Drei**: For 3D rendering capabilities, specifically the `Line` component
- **Three.js**: For 3D mathematics and vector operations
- **TrajectoryContext**: A custom context that provides trajectory data and visibility state

## Technical Implementation

### Component Structure

The component is a functional component that:

1. Retrieves trajectory data and visibility state from context
2. Processes the data with a memoized calculation
3. Renders a 3D line connecting all trajectory points

```jsx
const TrajectoryLines: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  // Memoized calculations...
  
  // Conditional rendering...
  
  return (
    <Line
      // Line properties...
    />
  );
};
```

### Data Processing

A key aspect of this component is the transformation of trajectory data into a format suitable for the 3D line:

```jsx
const linePoints = useMemo(() => {
  if (!isTrajectoryVisible || !trajectoryData) return [];
  
  return trajectoryData.points.map(point => 
    new THREE.Vector3(
      point.cartesian.x * SCALE_FACTOR,
      point.cartesian.y * SCALE_FACTOR,
      point.cartesian.z * SCALE_FACTOR
    )
  );
}, [trajectoryData, isTrajectoryVisible]);
```

This code:

1. Uses `useMemo` to optimize performance by caching the result and only recalculating when dependencies change
2. Performs an early return with an empty array if trajectory data is not available or not visible
3. Maps each trajectory point to a Three.js Vector3 object
4. Applies a scale factor to convert from kilometers to the scale used in the 3D scene

The `SCALE_FACTOR` constant is imported from the TrajectoryContext and ensures consistent scaling across all trajectory-related components.

### Coordinate Scaling

The component handles scaling of the coordinates from real-world values (kilometers) to scene units:

```jsx
point.cartesian.x * SCALE_FACTOR
```

This scaling ensures that the trajectory appears at the correct size relative to the Earth model in the scene.

### Conditional Rendering

The component includes a guard clause to prevent rendering when the trajectory is not visible:

```jsx
if (!isTrajectoryVisible || !trajectoryData) return null;
```

This optimization prevents unnecessary rendering and ensures the component only appears when needed.

### Line Rendering

The actual rendering uses the `Line` component from react-three-drei:

```jsx
<Line
  points={linePoints}
  color="#ff8800"
  lineWidth={1}
  dashed={false}
  transparent={true}
  opacity={0.7}
/>
```

Key properties:
- `points`: The array of Vector3 points that define the line path
- `color`: An orange color (#ff8800) for the line
- `lineWidth`: The thickness of the line (1 unit)
- `dashed`: Whether the line should be dashed (false = solid line)
- `transparent` and `opacity`: Makes the line semi-transparent (70% opacity)

## Integration with Other Components

The `TrajectoryLines` component is typically used together with:

1. `TrajectoryPoints` - Renders spheres at each point on the trajectory
2. `TrajectoryVisualization` - A container component that combines both lines and points

The separation of concerns between lines and points allows for greater flexibility in styling and rendering, while also making the code more maintainable.

## Performance Considerations

Several performance optimizations are employed:

1. **Memoization**: The `useMemo` hook prevents recalculating the line points on every render
2. **Conditional Rendering**: The component returns null when not needed
3. **Dependency Array**: The memoization only recalculates when relevant data changes

## Customization

The visual appearance of the trajectory line can be customized by modifying:

- `color`: The color of the line
- `lineWidth`: The thickness of the line
- `dashed` and related properties: To create a dashed or dotted line
- `opacity`: The transparency level of the line

## Technical Notes

1. The `Line` component from drei renders a continuous line in 3D space without explicit segments
2. The component assumes trajectory data contains valid Cartesian coordinates
3. The calculation happens before the conditional return to ensure clean code structure 