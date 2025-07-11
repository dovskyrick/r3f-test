# Multi-Satellite Support: Phase 1 Implementation Guide

## Overview

This document outlines the first phase of implementing multi-satellite support in our application. Instead of implementing all features at once, we'll start with a minimal set of changes to ensure the core functionality works properly:

- Associate a trajectory with each satellite
- Visualize multiple trajectories on the 2D map view
- Use random colors for different satellite trajectories

## Scope Limitations for Phase 1

To ensure a focused implementation, we will **exclude** the following features:
- Satellite deletion functionality
- Satellite focus/selection functionality
- Bulk loading of satellites
- 3D Earth view trajectory visualization
- Real trajectory data from the backend server

## Phase 1 Implementation Goals

1. **Enhanced Data Structure**: Modify the `Satellite` interface to include trajectory data
2. **Map Visualization**: Display multiple trajectories with different colors
3. **Simple Trajectory Generation**: Create straight-line trajectories with random angles for testing

## Technical Approach

### 1. Enhanced Satellite Interface

We'll update the `SatelliteContext` to store trajectory data directly with each satellite:

```typescript
// Updated Satellite interface
export interface Satellite {
  id: string;                  // Unique identifier
  name: string;                // Display name
  isVisible: boolean;          // Visibility toggle
  color: string;               // Color for visualization
  trajectoryData: {            // Simple trajectory data
    points: {
      longitude: number;
      latitude: number;
      mjd: number;
    }[];
    startTime: number;         // MJD start time
    endTime: number;           // MJD end time
  } | null;
}
```

### 2. Trajectory Visualization Component

Update the map visualization components to:
- Read trajectories from multiple satellites
- Use the satellite's color for its trajectory
- Only show trajectories for satellites marked as visible

### 3. Random Trajectory Generation

Add a utility function to generate simple straight-line trajectories:

```typescript
// Generate a simple straight-line trajectory with a random angle
const generateSimpleTrajectory = (startMJD: number, endMJD: number): TrajectoryData => {
  // Random starting position near center of map
  const startLon = (Math.random() - 0.5) * 60; // -30 to 30 degrees
  const startLat = (Math.random() - 0.5) * 30; // -15 to 15 degrees
  
  // Random angle for trajectory
  const angle = Math.random() * Math.PI * 2;
  
  // Length of trajectory (in degrees)
  const length = 30 + Math.random() * 60; // 30 to 90 degrees
  
  // End position
  const endLon = startLon + length * Math.cos(angle);
  const endLat = startLat + length * Math.sin(angle);
  
  // Create points along the line
  const numPoints = 20;
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const mjd = startMJD + fraction * (endMJD - startMJD);
    const lon = startLon + fraction * (endLon - startLon);
    const lat = startLat + fraction * (endLat - startLat);
    
    points.push({
      longitude: lon,
      latitude: lat,
      mjd: mjd
    });
  }
  
  return {
    points,
    startTime: startMJD,
    endTime: endMJD
  };
};
```

### 4. Random Color Generation

Add a utility function to generate random, visually distinct colors:

```typescript
// Generate a random color that's visually distinct
const generateRandomColor = (): string => {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 80%, 60%)`;
};
```

## Files to Modify

1. **src/contexts/SatelliteContext.tsx**
   - Update Satellite interface
   - Add trajectory generation
   - Modify addSatellite function to include random trajectory and color

2. **src/components/Map/MapTrajectoryVisualization.tsx**
   - Update to read from multiple satellites
   - Use the satellite's color for its trajectory

3. **src/components/Map/MapTrajectoryPath.tsx**
   - Modify to render a trajectory for each visible satellite
   - Use the satellite's color

4. **src/components/Map/MapTrajectoryMarker.tsx**
   - Update to show markers for all visible satellites
   - Use the satellite's color

## Implementation Steps

### Step 1: Update SatelliteContext.tsx

1. Enhance the Satellite interface to include trajectoryData and color
2. Add utility functions for generating random colors and trajectories
3. Modify the addSatellite function to:
   - Assign a random color to the new satellite
   - Generate a random trajectory based on the current time range
   - Associate the trajectory with the satellite

### Step 2: Update Map Visualization Components

1. Modify MapTrajectoryVisualization to iterate through all satellites
2. Update MapTrajectoryPath to create a separate Line for each satellite's trajectory
3. Use the satellite's color for its trajectory line

### Step 3: Handle Time Controls

1. Ensure the time slider works with multiple trajectories
2. Keep the existing time synchronization for trajectory animation

## Testing Plan

1. Verify that adding multiple satellites creates distinct trajectories
2. Confirm each trajectory has a different color
3. Test that the visibility toggle works for each satellite independently
4. Validate that the time slider properly animates all visible trajectories

## Future Phases

After this minimal implementation is working, we'll implement:

1. Real trajectory data from the backend for each satellite
2. 3D visualization of multiple trajectories
3. Satellite deletion functionality
4. Satellite focusing capabilities
5. Improved trajectory management

## Conclusion

This focused approach allows us to establish the core multi-satellite architecture while minimizing complexity. By starting with simplified trajectories and focusing only on the 2D map view, we can validate the data structures and visualization components before adding more complex features. 