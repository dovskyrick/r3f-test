# Trajectory Data API Implementation Guide

This guide outlines the implementation of a RESTful API for providing trajectory data from GODOT computations to a frontend application.

## Understanding the SC_center Error

One of the most common errors when working with GODOT is the connection error:

```
Post-condition check failed: err == 0. Help message: Could not connect Point Earth to Point SC at [TIME] TDB
```

### Solution: Understanding GODOT's Naming Conventions

The solution to this error is understanding how GODOT names objects in the trajectory:

- In the trajectory configuration, we set up an object with name "SC" of type "group"
- When GODOT initializes it, it creates a point object called "SC_center" to represent the center position
- Using `spacecraft_id = "SC_center"` instead of just "SC" resolves the error

This naming pattern follows from the trajectory configuration:

```yaml
setup:
  - name: SC # name of the propagated quantity
    type: group # type of propagated quantity
    spacecraft: SC
    input:
    - name: center
      type: point
```

The "SC" group with a "center" point input gets combined to create "SC_center" in GODOT's internal representation.

## FastAPI and RESTful Architecture

### What is RESTful Architecture?

REST (Representational State Transfer) is an architectural style for designing networked applications. RESTful APIs:

- Are stateless
- Use standard HTTP methods (GET, POST, PUT, DELETE)
- Return data in standard formats (typically JSON)
- Have resources identified by URLs
- Support CRUD operations (Create, Read, Update, Delete)

### FastAPI and REST

FastAPI is a modern, high-performance web framework for building RESTful APIs with Python. It's fully compatible with RESTful principles and adds:

- Automatic OpenAPI documentation
- Request validation with Pydantic
- Type hints for better code quality
- Async support for high performance
- Dependency injection for clean code
- Built-in security features

### Why FastAPI for Our Implementation?

FastAPI is an excellent choice for our trajectory API for several reasons:

1. **Performance**: FastAPI is one of the fastest Python frameworks available, crucial for scientific computing applications
2. **Simplicity**: Clean, declarative syntax makes it easy to implement and maintain endpoints
3. **Documentation**: Automatic OpenAPI documentation helps with testing and integration
4. **Type Safety**: Strong typing with Pydantic models prevents errors when handling complex trajectory data
5. **Async Support**: Can handle multiple requests efficiently while GODOT calculations are running
6. **Easy Integration**: Works well with scientific Python libraries like NumPy that we're using with GODOT

## Implementation Steps

Let's break down the steps to implement a trajectory data API using the working `plot_trajectory.py` script.

### 1. Install FastAPI and Dependencies

Ensure these are in your `requirements.txt`:

```
fastapi~=0.68.0
uvicorn~=0.15.0
pydantic~=1.8.2
python-multipart~=0.0.5
godot==1.3.1
```

### 2. Create API Models

First, let's define the data models using Pydantic:

```python
# models.py
from pydantic import BaseModel
from typing import List, Optional

class TrajectoryPoint(BaseModel):
    """A single point in a trajectory"""
    epoch: str
    x: float
    y: float
    z: float
    mjd: float

class TrajectoryResponse(BaseModel):
    """Response containing trajectory data"""
    points: List[TrajectoryPoint]
    start_time: str
    end_time: str
    point_count: int
    status: str
    message: Optional[str] = None
```

### 3. Create a Trajectory Service

Next, adapt the `plot_trajectory.py` script into a service:

```python
# trajectory_service.py
from godot.core import tempo
from godot import cosmos
import numpy as np
import json
import os
import godot.core.util as util

# Suppress verbose logging
util.suppressLogger()

def generate_trajectory(universe_file='../config/universe.yml',
                       trajectory_file='../config/trajectory_stella_2021.yml',
                       num_points=10):
    """Generate trajectory points using GODOT."""
    try:
        # Load the universe configuration and create the universe object
        uniConfig = cosmos.util.load_yaml(universe_file)
        uni = cosmos.Universe(uniConfig)
        
        # Load the trajectory configuration and create the trajectory object
        traConfig = cosmos.util.load_yaml(trajectory_file)
        tra = cosmos.Trajectory(uni, traConfig)
        
        # Compute the trajectory
        tra.compute(partials=False)
        
        # Get the start and end epochs
        start_epoch = tra.range().start()
        end_epoch = tra.range().end()
        
        # Create a time grid with specified number of points
        time_grid = tempo.EpochRange(start_epoch, end_epoch).createGrid(num_points)
        
        # Extract trajectory points
        trajectory_points = []
        
        for epoch in time_grid:
            try:
                # Get spacecraft position in ICRF frame
                # Note the "SC_center" naming - this is crucial
                spacecraft_id = "SC_center"
                position = uni.frames.vector3("Earth", spacecraft_id, "ICRF", epoch)
                
                # Extract x, y, z components
                x, y, z = position[0], position[1], position[2]
                
                # Store the point
                point = {
                    "epoch": str(epoch),
                    "x": float(x),
                    "y": float(y),
                    "z": float(z),
                    "mjd": epoch.mjd()
                }
                
                trajectory_points.append(point)
                
            except Exception as point_error:
                print(f"Error getting position at {epoch}: {point_error}")
        
        return {
            "points": trajectory_points,
            "start_time": str(start_epoch),
            "end_time": str(end_epoch),
            "point_count": len(trajectory_points),
            "status": "success"
        }
        
    except Exception as e:
        # Fallback to generating a simple circular orbit
        print(f"Error in trajectory generation: {e}")
        
        fallback_points = []
        t = np.linspace(0, 2*np.pi, num_points)
        radius = 7000  # LEO orbit radius in km
        
        for i, angle in enumerate(t):
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            z = 0.0  # Planar orbit for simplicity
            
            point = {
                "epoch": f"Point_{i}",
                "mjd": 59500.0 + i/100.0,
                "x": float(x),
                "y": float(y),
                "z": float(z)
            }
            fallback_points.append(point)
        
        return {
            "points": fallback_points,
            "start_time": "Fallback_start",
            "end_time": "Fallback_end",
            "point_count": len(fallback_points),
            "status": "fallback",
            "message": f"Used fallback due to error: {str(e)}"
        }
```

### 4. Implement the FastAPI Application

Now, let's create the main API application:

```python
# main.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Optional, List

from .models import TrajectoryResponse
from .trajectory_service import generate_trajectory

# Initialize FastAPI app
app = FastAPI(
    title="GODOT Trajectory API",
    description="API for retrieving satellite trajectory data calculated with GODOT",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "GODOT Trajectory API",
        "version": "1.0.0",
        "description": "API for retrieving satellite trajectory data"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}

@app.get("/trajectory", response_model=TrajectoryResponse)
async def get_trajectory(
    points: Optional[int] = Query(10, description="Number of points to calculate")
):
    """
    Get satellite trajectory data.
    
    Returns a list of points with x, y, z coordinates in the ICRF frame.
    """
    try:
        if points < 2:
            raise HTTPException(status_code=400, detail="Number of points must be at least 2")
        
        if points > 100:
            raise HTTPException(status_code=400, detail="Maximum number of points is 100")
        
        # Call our trajectory service
        result = generate_trajectory(num_points=points)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trajectory: {str(e)}")

# Optional: Add an endpoint for CSV format
@app.get("/trajectory/csv")
async def get_trajectory_csv(
    points: Optional[int] = Query(10, description="Number of points to calculate")
):
    """Get satellite trajectory in CSV format."""
    try:
        from fastapi.responses import PlainTextResponse
        import io
        import csv
        
        result = generate_trajectory(num_points=points)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["epoch", "mjd", "x", "y", "z"])
        
        # Write data rows
        for point in result["points"]:
            writer.writerow([
                point["epoch"],
                point["mjd"],
                point["x"],
                point["y"],
                point["z"]
            ])
        
        # Return CSV response
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=trajectory.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating CSV: {str(e)}")
```

### 5. Setting Up the Server

To run the server, you need to create an entrypoint script:

```python
# server.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
```

## Running the Server

There are multiple ways to run the API server:

### Option 1: Directly with Python

```bash
cd godot-backend
python -m src.server
```

### Option 2: With Uvicorn CLI

```bash
cd godot-backend
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Via Docker Compose

With the existing Docker setup, update the `CMD` in the Dockerfile:

```dockerfile
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Then run:

```bash
docker-compose up
```

The server will be available at `http://localhost:8000`

## Accessing the API

### API Documentation

FastAPI automatically generates documentation available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Available Endpoints

1. **GET /trajectory** - Returns trajectory data in JSON format
   - Query parameter: `points` (optional, default 10)
   - Example: `http://localhost:8000/trajectory?points=20`

2. **GET /trajectory/csv** - Returns trajectory data in CSV format
   - Query parameter: `points` (optional, default 10)
   - Example: `http://localhost:8000/trajectory/csv?points=20`

### Basic Frontend Access

From your frontend, you can access the API using fetch:

```javascript
// Example: Fetching trajectory data
async function fetchTrajectory(points = 10) {
  try {
    const response = await fetch(`http://localhost:8000/trajectory?points=${points}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trajectory:', error);
    return null;
  }
}

// Use the data
fetchTrajectory(15).then(data => {
  if (data) {
    console.log(`Received ${data.point_count} trajectory points`);
    
    // Access the points
    const points = data.points;
    
    // Example: Create Three.js positions from the data
    const positions = points.map(point => [point.x, point.y, point.z]).flat();
    
    // Now you can use these positions in Three.js...
  }
});
```

## Folder Structure

Here's the recommended folder structure for this implementation:

```
godot-backend/
│
├── config/
│   ├── universe.yml
│   └── trajectory_stella_2021.yml
│
├── data/
│   ├── ephemeris/
│   ├── orientation/
│   ├── gravity/
│   └── atmosphere/
│
├── src/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── models.py        # Pydantic models
│   ├── server.py        # Server entry point
│   └── trajectory_service.py  # GODOT integration
│
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Conclusion

This implementation provides a clean, RESTful API for accessing trajectory data computed with GODOT. By using FastAPI, we benefit from:

1. Type safety and validation with Pydantic
2. Automatic API documentation with Swagger and ReDoc
3. Excellent performance with async support
4. Clean separation of concerns with dependency injection

The frontend can easily consume this API to visualize the trajectory in 3D space, with options for both JSON and CSV formats.

The most important lesson learned is understanding GODOT's naming conventions, particularly the "SC_center" object name which is created from the "SC" group with a "center" point input in the configuration. 