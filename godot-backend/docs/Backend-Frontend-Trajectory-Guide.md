# Implementing a Satellite Trajectory API

This guide explains how to implement a backend API endpoint that provides satellite trajectory data to a frontend map visualization, based on GODOT's capabilities.

## Overview

The system will consist of:

1. **Backend**: A FastAPI server with GODOT that generates trajectory data (latitude/longitude points)
2. **Frontend**: A React application that fetches and displays the trajectory on a map

## Part 1: Backend Implementation

### Step 1: Create a Trajectory Generator Function

First, implement a function in the backend that uses GODOT to generate a sample trajectory:

```python
# This will go in a new file: src/services/trajectory_service.py
from datetime import datetime, timedelta
import numpy as np
from typing import List, Dict, Any

def get_example_trajectory() -> List[Dict[str, float]]:
    """
    Generate an example satellite trajectory using GODOT.
    Returns a list of points with latitude and longitude in degrees.
    
    Based on the Sentinel-1 example from GODOT documentation.
    """
    try:
        # Import GODOT modules
        from godot.core import tempo, astro
        from godot import cosmos
        import godot.core.util as util
        
        # Suppress verbose logging
        util.suppressLogger()
        
        # Create the universe from configuration
        # Note: In a real implementation, you would need to provide the universe.yml file
        uni_config = cosmos.util.load_yaml('config/universe.yml')
        uni = cosmos.Universe(uni_config)
        
        # Get satellite trajectory data
        satellite_id = "Sentinel_1"  # Example satellite
        sent1 = uni.frames.pointId(satellite_id)
        
        # Get time blocks and create a range
        blocks = uni.frames.blocks(sent1, True)
        assert(len(blocks) >= 1)
        
        start = blocks[0].range.start()
        end = start + 1 * tempo.SecondsInDay  # 1 day trajectory
        time_range = tempo.EpochRange(start, end)
        
        # Create grid with points every 15 minutes
        grid = time_range.createGrid(15 * 60)  # 15 minutes in seconds
        
        # Define function to get subsatellite point
        def subsatellite_point(epoch):
            pos = uni.frames.vector3("Earth", satellite_id, "ITRF", epoch)
            pol = astro.sphericalFromCart(pos)  # [radius, longitude, latitude]
            return pol[1:]  # [longitude, latitude]
        
        # Generate all points
        points = []
        from godot.core import num  # For Rad constant (radians to degrees)
        
        for epoch in grid:
            lon_lat = subsatellite_point(epoch)
            points.append({
                "longitude": float(num.Rad * lon_lat[0]),  # Convert to degrees
                "latitude": float(num.Rad * lon_lat[1]),   # Convert to degrees
                "timestamp": epoch.toUTC().jd  # Julian date as timestamp
            })
        
        return points
        
    except Exception as e:
        # In case GODOT is not properly configured or other errors occur
        # Return a fallback trajectory (simple circular pattern)
        print(f"Error generating trajectory with GODOT: {str(e)}")
        return _generate_fallback_trajectory()

def _generate_fallback_trajectory() -> List[Dict[str, float]]:
    """Generate a fallback trajectory if GODOT fails."""
    points = []
    center_lat, center_lon = 0, 0  # Equator, Prime Meridian
    radius = 50  # degrees
    
    # Generate 24 points in a circle (one per hour)
    for i in range(24):
        angle = (i / 24) * 2 * np.pi
        lat = center_lat + radius * np.sin(angle) * 0.5  # Flatten the circle
        lon = center_lon + radius * np.cos(angle)
        
        # Ensure longitude is within [-180, 180]
        if lon > 180:
            lon -= 360
        
        points.append({
            "longitude": float(lon),
            "latitude": float(lat),
            "timestamp": datetime.now().timestamp() + i * 3600  # One point per hour
        })
    
    return points
```

### Step 2: Create an API Endpoint

Next, create a FastAPI endpoint that returns the trajectory data:

```python
# This will go in: src/main.py or a new route file src/routes/trajectory.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from .services.trajectory_service import get_example_trajectory

# If using a separate router file
router = APIRouter(prefix="/trajectory", tags=["trajectory"])

@router.get("/example", response_model=List[Dict[str, float]])
async def get_example_satellite_trajectory():
    """
    Returns an example satellite trajectory as a list of latitude/longitude points.
    """
    try:
        trajectory_points = get_example_trajectory()
        return trajectory_points
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trajectory: {str(e)}")

# If adding directly to main.py, add this instead:
# @app.get("/trajectory/example", response_model=List[Dict[str, float]])
# async def get_example_satellite_trajectory():
#     """code as above"""
```

### Step 3: CORS Configuration

Ensure CORS is properly configured to allow the frontend to access the API:

```python
# In main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Part 2: Frontend Implementation

### Step 1: Create a Hook for Fetching Trajectory Data

```typescript
// This will go in: my-tsx-app/src/hooks/useTrajectory.ts
import { useState, useEffect } from 'react';

interface TrajectoryPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const useTrajectory = () => {
  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrajectory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/trajectory/example');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setTrajectoryPoints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trajectory data');
      console.error('Error fetching trajectory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically fetch on component mount
  useEffect(() => {
    fetchTrajectory();
  }, []);

  return { 
    trajectoryPoints, 
    isLoading, 
    error, 
    refetch: fetchTrajectory 
  };
};
```

### Step 2: Display the Trajectory on the Map

Modify the existing `MapsView.tsx` component to display the trajectory:

```typescript
// In my-tsx-app/src/pages/MapsView/MapsView.tsx
import { useTrajectory } from '../../hooks/useTrajectory';

// Inside the component that renders the map
const SatelliteTrajectory = () => {
  const { trajectoryPoints, isLoading, error } = useTrajectory();
  
  if (isLoading) {
    return <div>Loading trajectory...</div>;
  }
  
  if (error) {
    return <div>Error loading trajectory: {error}</div>;
  }
  
  // Convert trajctory points to 3D coordinates for rendering
  return (
    <>
      {trajectoryPoints.map((point, index) => {
        // Convert lat/long to 3D position
        const position = latLngToPosition(point.latitude, point.longitude);
        
        return (
          <mesh key={index} position={position} renderOrder={10}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
        );
      })}
      
      {/* Connect points with a line */}
      <Line
        points={trajectoryPoints.map(p => latLngToPosition(p.latitude, p.longitude))}
        color="red"
        lineWidth={1}
      />
    </>
  );
};

// Add the SatelliteTrajectory component to your Canvas
// Example:
return (
  <Canvas>
    <OrthographicCamera
      makeDefault
      position={[0, 0, 10]}
      zoom={150}
    />
    <ambientLight intensity={0.8} />
    
    <Suspense fallback={<LoadingFallback />}>
      <MapPlane />
      <GridLines />
      <SatelliteTrajectory />  {/* Add this line */}
    </Suspense>
  </Canvas>
);
```

## Data Format

The API returns trajectory data in the following format:

```json
[
  {
    "longitude": 10.5,    // Degrees, range: -180 to 180
    "latitude": 50.2,     // Degrees, range: -90 to 90
    "timestamp": 1677766800  // Unix timestamp or Julian date
  },
  // ... more points
]
```

## Testing

### Backend Testing

1. Start the backend server:
   ```bash
   cd godot-backend
   docker-compose up
   ```

2. Test the API endpoint using curl:
   ```bash
   curl http://localhost:8000/trajectory/example
   ```

### Frontend Testing

1. Start the React development server:
   ```bash
   cd my-tsx-app
   npm start
   ```

2. Open your browser to `http://localhost:3000` and navigate to the Maps view
3. Verify the trajectory is displayed on the map

## Future Enhancements

1. **Parametrized Trajectories**: Modify the API to accept parameters (satellite ID, time range, etc.)
2. **Real-time Updates**: Implement WebSocket connections for real-time trajectory updates
3. **Multiple Satellites**: Support displaying multiple satellite trajectories simultaneously
4. **Time Controls**: Synchronize the trajectory display with the time slider component

## Configuration Requirements

For the backend to work correctly, you'll need:

1. A proper GODOT configuration file (`universe.yml`)
2. Access to satellite trajectory data through GODOT
3. Proper environment variables for GODOT configuration

If you don't have access to the required GODOT configuration, the fallback trajectory generator will provide sample data for development purposes. 