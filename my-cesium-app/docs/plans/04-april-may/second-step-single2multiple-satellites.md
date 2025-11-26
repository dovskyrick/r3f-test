# Multi-Satellite Support: Phase 2 - TLE Integration

## Overview

This document outlines the second phase of implementing multi-satellite support, focusing on:

1. Processing TLE data in the frontend
2. Sending TLE data to the backend
3. Receiving trajectories from the backend
4. Automatically adjusting timeline limits

## TLE Processing Flow

### 1. TLE Input Handling

When TLE data is provided to the frontend:

1. Determine if the TLE has 2 or 3 lines
2. If 3 lines are provided, use the first line as the satellite name and the last 2 lines as the TLE data
3. If 2 lines are provided, prompt the user to enter a satellite name
4. Validate TLE format before sending to backend

```typescript
// Basic TLE validation function
function validateTLE(line1: string, line2: string): boolean {
  // TLE line 1 should start with '1 ' and be 69 characters long
  // TLE line 2 should start with '2 ' and be 69 characters long
  return (
    line1.startsWith('1 ') && 
    line2.startsWith('2 ') && 
    line1.length === 69 && 
    line2.length === 69
  );
}
```

### 2. Backend API Integration

Our backend already has an endpoint that accepts TLE data and returns a trajectory. We'll use this endpoint:

```typescript
async function fetchTrajectoryFromTLE(tleLine1: string, tleLine2: string): Promise<TrajectoryData> {
  try {
    const response = await fetch('http://localhost:8000/trajectory/from-tle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tle_line1: tleLine1,
        tle_line2: tleLine2,
        time_interval: 30 // Points every 30 seconds
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch trajectory:', error);
    throw error;
  }
}
```

### 3. Response Handling and Trajectory Visualization

When the trajectory data is received from the backend:

1. Transform the backend format to match our frontend Satellite trajectory format
2. Add the new satellite with the received trajectory
3. Update the color and other properties like normal

```typescript
// In SatelliteContext.tsx, modify the addSatellite function
const addSatelliteFromTLE = async (name: string, tleLine1: string, tleLine2: string) => {
  try {
    // Show loading state
    setIsLoading(true);
    
    // Fetch trajectory from backend
    const trajectoryData = await fetchTrajectoryFromTLE(tleLine1, tleLine2);
    
    // Transform backend response to our format
    const transformedTrajectory = {
      points: trajectoryData.points.map(point => ({
        longitude: point.spherical.longitude,
        latitude: point.spherical.latitude,
        mjd: point.mjd
      })),
      startTime: parseFloat(trajectoryData.start_time.split(' ')[0]),
      endTime: parseFloat(trajectoryData.end_time.split(' ')[0])
    };
    
    // Create new satellite
    const newId = generateId();
    const newSatellite: Satellite = {
      id: newId,
      name,
      isVisible: true,
      color: generateRandomColor(),
      trajectoryData: transformedTrajectory
    };
    
    // Add to state
    setSatellites(prev => [...prev, newSatellite]);
    
    // Update timeline limits
    updateTimelineLimits(transformedTrajectory);
    
    return newId;
  } catch (error) {
    console.error('Error adding satellite from TLE:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Timeline Adjustment

When a new satellite is added, update the timeline limits to match the new trajectory:

```typescript
// In SatelliteContext.tsx
const updateTimelineLimits = (trajectoryData: SatelliteTrajectoryData) => {
  // Only update if trajectory exists
  if (!trajectoryData) return;
  
  // Update the timeline limits
  setMinValue(trajectoryData.startTime.toString());
  setMaxValue(trajectoryData.endTime.toString());
  
  // Set current time to start time
  setCurrentTime(trajectoryData.startTime);
};
```

## Changes Required

1. **SatelliteContext.tsx**
   - Add TLE validation function
   - Implement trajectory fetch from backend API
   - Add timeline limit adjustment logic
   - Create `addSatelliteFromTLE` function

2. **SatelliteAddModal.tsx**
   - Modify to handle both 2-line and 3-line TLE formats
   - Add validation before submission
   - Show appropriate error messages for invalid TLE data
   - Call the new context method for TLE processing

3. **MapTrajectoryVisualization Components**
   - No changes needed - already support visualizing trajectories from satellites

## Implementation Steps

1. **Step 1: Update SatelliteContext**
   - Add loading state for API operations
   - Implement TLE validation
   - Create backend API connection function
   - Implement timeline adjustment

2. **Step 2: Update SatelliteAddModal**
   - Enhance TLE file handling to differentiate between 2 and 3 line formats
   - Add validation before submission
   - Show appropriate error messages for invalid TLE data
   - Call the new context method for TLE processing

3. **Step 3: Testing**
   - Test with valid 2-line TLE data
   - Test with valid 3-line TLE data
   - Test with invalid TLE data
   - Verify timeline adjustment works correctly

## Future Enhancements

For future phases:
1. Add caching of trajectories to reduce backend calls
2. Implement batch loading of multiple TLEs
3. Add error recovery and retry mechanisms
4. Support custom time intervals for trajectories
5. Allow user to maintain timeline settings when adding satellites 