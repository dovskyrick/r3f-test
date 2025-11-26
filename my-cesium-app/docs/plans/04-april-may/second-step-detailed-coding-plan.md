# Minimal Implementation Plan: TLE File Upload to Backend

## Overview

This document outlines the minimal changes required to implement TLE file upload functionality that sends TLE data to the backend API and uses the returned trajectory for satellite visualization. The focus is on modifying only what's necessary while maintaining the existing application structure.

## Files to Modify

We need to modify only **two files** to achieve our goal:

1. **src/contexts/SatelliteContext.tsx**
2. **src/components/Satellite/SatelliteAddModal.tsx**

## Justification for Changes

### 1. src/contexts/SatelliteContext.tsx

This file needs modification because:

- It contains the core functionality for adding satellites to the application
- It currently generates random trajectories, which we need to replace with API-provided trajectories
- It needs a new method to handle TLE data and communicate with the backend

Specifically, we need to:

- Add a new method `addSatelliteFromTLE(name: string, tleLine1: string, tleLine2: string)` that:
  - Makes an API request to the backend with the TLE data
  - Creates a new satellite with the trajectory data received from the API
  - Does not modify the timeline (as per requirements)
  - Uses the existing structure of the `addSatellite` method

### 2. src/components/Satellite/SatelliteAddModal.tsx

This file needs modification because:

- It contains the `readTLEFile` function that processes uploaded TLE files
- It currently only extracts TLE data but doesn't send it to the backend
- It needs to be updated to use the new `addSatelliteFromTLE` method from the context

Specifically, we need to:

- Modify the `readTLEFile` function to:
  - Extract the last two lines of the TLE file (regardless of 2-line or 3-line format)
  - Skip detailed validation (as per requirements)
- Update the `handleSubmit` function to use the new `addSatelliteFromTLE` method
- Update the `handleNameSubmit` function similarly

## Why Other Files Don't Need Changes

1. **No Timeline Adjustments**: Since we're skipping timeline adjustments, we don't need to modify `TimelineContext.tsx` or any components that use it.

2. **No UI Component Changes**: The satellite visualization components (`MapTrajectoryPath.tsx`, `MapTrajectoryMarker.tsx`, etc.) already support the trajectory data structure and will work with the API-provided data without modifications.

3. **Existing API Structure**: The backend already has an endpoint for TLE processing that returns data in a compatible format.

4. **SatelliteNameModal Unchanged**: This component handles name input correctly and just needs its submit handler updated in `SatelliteAddModal.tsx`.

## Technical Changes

### In SatelliteContext.tsx:

```typescript
// Add a new method to the context
const addSatelliteFromTLE = async (name: string, tleLine1: string, tleLine2: string) => {
  try {
    // Create a new satellite ID
    const newId = generateId();
    const randomColor = generateRandomColor();
    
    // Add a placeholder satellite with loading state
    const newSatellite: Satellite = {
      id: newId,
      name,
      isVisible: true,
      color: randomColor,
      trajectoryData: null,
      isLoading: true,
      error: null
    };
    
    setSatellites(prevSatellites => [...prevSatellites, newSatellite]);
    
    // Make API request to get trajectory data
    const response = await fetch('http://localhost:8000/trajectory/from-tle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tle_line1: tleLine1,
        tle_line2: tleLine2,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to match our trajectory format
    const transformedTrajectory = {
      points: data.points.map(point => ({
        longitude: point.spherical.longitude,
        latitude: point.spherical.latitude,
        mjd: point.mjd
      })),
      startTime: parseFloat(data.start_time.split(' ')[0]),
      endTime: parseFloat(data.end_time.split(' ')[0])
    };
    
    // Update the satellite with the real trajectory data
    setSatellites(prevSatellites => 
      prevSatellites.map(satellite => 
        satellite.id === newId 
          ? { ...satellite, trajectoryData: transformedTrajectory, isLoading: false } 
          : satellite
      )
    );
    
    return newId;
  } catch (error) {
    console.error('Error adding satellite from TLE:', error);
    
    // Update satellite with error state
    setSatellites(prevSatellites => 
      prevSatellites.map(satellite => 
        satellite.id === newId 
          ? { ...satellite, error: error.message, isLoading: false } 
          : satellite
      )
    );
    
    throw error;
  }
};

// Add to context value object
const contextValue = {
  // existing properties...
  addSatelliteFromTLE,
};
```

### In SatelliteAddModal.tsx:

```typescript
// Modify readTLEFile function
const readTLEFile = (file: File) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      if (!content) {
        throw new Error("Could not read file content");
      }
      
      // Split the content into lines and remove empty lines
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      // Always take the last two lines for TLE data
      // For 2-line TLE: both lines are the TLE
      // For 3-line+ TLE: last two lines are the TLE, first line is name
      if (lines.length < 2) {
        setError("Invalid TLE file: The file must contain at least 2 lines");
        return;
      }
      
      if (lines.length === 2) {
        // 2-line TLE without a name
        setTleData({
          line1: lines[0],
          line2: lines[1]
        });
      } else {
        // 3-line or more TLE with a name
        setTleData({
          name: lines[0].trim(),
          line1: lines[lines.length - 2],
          line2: lines[lines.length - 1]
        });
      }
    } catch (err) {
      setError("Failed to read the TLE file. Please ensure it's a valid text file.");
    }
  };
  
  reader.onerror = () => {
    setError("Error reading the file. Please try again.");
  };
  
  reader.readAsText(file);
};

// Modify handleSubmit function
const handleSubmit = () => {
  if (!file || !tleData) {
    setError("Please upload a valid TLE file first");
    return;
  }
  
  if (!tleData.name) {
    // If there's no name in the TLE, open the name modal
    setIsNameModalOpen(true);
  } else {
    // Use the name from the TLE and send TLE data to backend
    addSatelliteFromTLE(tleData.name, tleData.line1, tleData.line2)
      .then(() => onClose())
      .catch(err => setError(err.message));
  }
};

// Modify handleNameSubmit function
const handleNameSubmit = (name: string) => {
  if (tleData) {
    addSatelliteFromTLE(name, tleData.line1, tleData.line2)
      .then(() => {
        setIsNameModalOpen(false);
        onClose();
      })
      .catch(err => setError(err.message));
  }
};
```

## Implementation Strategy

1. First, implement the `addSatelliteFromTLE` method in the SatelliteContext
2. Next, update the `readTLEFile`, `handleSubmit`, and `handleNameSubmit` functions in the SatelliteAddModal
3. Test with various TLE files (2-line, 3-line, and invalid formats)

This approach minimizes changes to the codebase while achieving the goal of sending TLE data to the backend and using the returned trajectory for visualization. 