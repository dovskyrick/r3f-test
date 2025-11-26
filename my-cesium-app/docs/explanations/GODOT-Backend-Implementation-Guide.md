# GODOT Backend Implementation Guide

## Introduction to GODOT by ESA

GODOT (Generic Orbit Determination and Orbit Analysis Tool) is a powerful software suite developed by the European Space Agency (ESA) for orbit determination, orbit prediction, and spacecraft trajectory analysis. It provides a comprehensive set of algorithms and models for:

- High-precision orbit propagation
- Orbit determination from various measurement types
- Complex mission analysis scenarios
- Maneuver planning and optimization
- Collision risk assessment
- Re-entry predictions

GODOT is designed as a programmable library that allows for both script-based automation and integration into larger software systems, making it ideal for our visualization frontend.

## Implementation Choice: Python vs C++

### Python Implementation (Recommended)

**Advantages:**
- Simpler API development with frameworks like FastAPI or Flask
- Easier to read, maintain, and debug
- Faster development cycle
- Rich ecosystem of libraries for scientific computing (NumPy, SciPy)
- Better documentation and more examples available for the Python bindings
- Containerization is straightforward

**Disadvantages:**
- Slightly lower performance compared to C++
- Memory management for large datasets may require attention

### C++ Implementation

**Advantages:**
- Maximum performance and efficiency
- Direct access to all GODOT functionality without binding overhead
- Better memory control for very large simulations

**Disadvantages:**
- More complex to develop and maintain
- Steeper learning curve
- Harder to containerize correctly
- More potential for memory-related bugs
- API development is more involved

**Recommendation:** Unless the application requires extreme performance optimization or deals with massive datasets that would hit Python's limitations, the Python implementation provides a better balance of readability, maintainability, and developer productivity while still offering good performance when properly optimized.

## GODOT Capabilities Relevant to Visualization

GODOT offers numerous capabilities that can be leveraged for visualization purposes:

### 1. Orbit Propagation

- **Numerical Propagation:** GODOT can perform high-precision numerical propagation of spacecraft orbits using various force models, including:
  - Earth gravitational field (various models available)
  - Third-body gravitational effects (Sun, Moon, planets)
  - Solar radiation pressure
  - Atmospheric drag
  - Solid Earth and ocean tides
  - General relativistic effects

- **Output Formats:**
  - Earth-Centered Inertial (ECI) coordinates (X, Y, Z, Vx, Vy, Vz)
  - Earth-Centered Earth-Fixed (ECEF) coordinates
  - Geodetic coordinates (Latitude, Longitude, Height)
  - Keplerian orbital elements
  - Modified equinoctial elements

### 2. Ground Track Generation

- Generate ground tracks of satellites over time
- Output as series of latitude/longitude points for map display
- Configurable time step and duration

### 3. Visibility Analysis

- Compute satellite visibility from ground stations
- Determine line-of-sight visibility between satellites
- Calculate eclipse periods (Earth shadow, Moon shadow)

### 4. Constellation Analysis

- Simulate full constellations of satellites
- Analyze coverage and revisit times
- Inter-satellite distances and relative geometries

### 5. Orbit Events

- Detect and report orbit events like:
  - Ascending/descending node crossings
  - Apogee/perigee passes
  - Eclipse entry/exit
  - Station visibility start/end

### 6. Maneuver Planning

- Compute delta-V requirements for orbit changes
- Optimize maneuvers for fuel efficiency
- Predict post-maneuver trajectories

## Backend Architecture

### Overview

We'll create a backend service that:
1. Runs GODOT in a Docker container
2. Exposes a RESTful API for the frontend to consume
3. Processes requests for different types of orbital calculations
4. Returns results in formats ready for visualization

### High-Level Architecture

```
┌─────────────┐     ┌─────────────────────────────────┐     ┌────────────┐
│             │     │           Docker Container      │     │            │
│   Frontend  │────▶│  ┌─────────┐      ┌─────────┐   │────▶│  Database  │
│  React App  │◀────│  │  API    │◀────▶│  GODOT  │   │◀────│ (Optional) │
│             │     │  │ Server  │      │ Engine  │   │     │            │
└─────────────┘     │  └─────────┘      └─────────┘   │     └────────────┘
                    └─────────────────────────────────┘
```

## Implementation Steps

### 1. Environment Setup

#### Prerequisites

- Docker and Docker Compose installed
- Python 3.8+ (if using Python implementation)
- Git for version control
- Access to GODOT installation files from ESA

#### Directory Structure

```
godot-backend/
├── api/                # API server code
│   ├── main.py         # Entry point for the API
│   ├── routes/         # API routes
│   ├── models/         # Data models
│   └── utils/          # Utility functions
├── godot/              # GODOT interface
│   ├── client.py       # Python client for GODOT
│   ├── models.py       # Models for GODOT data
│   └── converters.py   # Data conversion utilities
├── tests/              # Test cases
├── scripts/            # Helper scripts
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Container orchestration
├── requirements.txt    # Python dependencies
└── README.md           # Project documentation
```

### 2. Docker Configuration

Create a `Dockerfile` for the GODOT backend:

```dockerfile
# Use a Python base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by GODOT
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libfftw3-dev \
    libeigen3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy GODOT installation files
COPY ./godot_installation /app/godot

# Install GODOT
# (This step will depend on the exact installation method provided by ESA)
RUN cd /app/godot && \
    ./install.sh

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 8000

# Start the API server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - GODOT_DATA_DIR=/app/data
      - LOG_LEVEL=INFO
    restart: unless-stopped
```

### 3. Python API Implementation

We'll use FastAPI for our API server due to its performance, automatic documentation, and ease of use.

#### Install Dependencies

Create a `requirements.txt` file:

```
fastapi>=0.68.0
uvicorn>=0.15.0
pydantic>=1.8.2
numpy>=1.21.2
scipy>=1.7.1
matplotlib>=3.4.3
python-multipart>=0.0.5
aiofiles>=0.7.0
# Add any other dependencies your project needs
```

#### Create the API Server

Create `api/main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

# Import GODOT client (to be implemented)
from godot.client import GODOTClient

# Initialize FastAPI
app = FastAPI(
    title="GODOT Orbit Visualization API",
    description="API for orbit calculations and visualization using ESA's GODOT",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize GODOT client
godot_client = GODOTClient(
    data_dir=os.environ.get("GODOT_DATA_DIR", "/app/data")
)

# Import routes
from api.routes import propagation, groundtrack, visualization

# Include routers
app.include_router(propagation.router)
app.include_router(groundtrack.router)
app.include_router(visualization.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
```

#### Create API Routes

Create `api/routes/propagation.py`:

```python
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from godot.client import godot_client
from godot.models import OrbitParameters, PropagationOptions

router = APIRouter(prefix="/propagation", tags=["propagation"])

class PropagationRequest(BaseModel):
    """Request model for orbit propagation"""
    initial_state: OrbitParameters
    options: PropagationOptions
    
class PropagationResponse(BaseModel):
    """Response model for orbit propagation"""
    trajectory: List[Dict[str, float]]
    events: Optional[List[Dict[str, Any]]] = None

@router.post("/orbit", response_model=PropagationResponse)
async def propagate_orbit(request: PropagationRequest):
    """
    Propagate an orbit using the specified initial state and options.
    Returns a trajectory as a list of state vectors.
    """
    try:
        result = godot_client.propagate_orbit(
            initial_state=request.initial_state,
            options=request.options
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Create similar route files for other functionalities (groundtrack.py, visualization.py, etc.)

### 4. GODOT Integration

Create `godot/client.py` to interface with GODOT:

```python
import os
import subprocess
import numpy as np
import json
from typing import List, Dict, Any, Optional, Union
from .models import OrbitParameters, PropagationOptions

class GODOTClient:
    """Client to interact with GODOT"""
    
    def __init__(self, data_dir: str = "/app/data"):
        self.data_dir = data_dir
        # Validate GODOT installation
        self._validate_installation()
        
    def _validate_installation(self):
        """Check if GODOT is correctly installed"""
        # This will depend on how GODOT is integrated with Python
        try:
            # Example: Check if a GODOT module can be imported
            # import godot_module
            pass
        except ImportError:
            raise RuntimeError("GODOT is not properly installed or configured")
            
    def propagate_orbit(
        self,
        initial_state: OrbitParameters,
        options: PropagationOptions
    ) -> Dict[str, Any]:
        """
        Propagate an orbit using GODOT
        
        Args:
            initial_state: Initial orbital parameters
            options: Propagation options
            
        Returns:
            Dict containing trajectory and events
        """
        # Convert inputs to GODOT format
        godot_inputs = self._prepare_propagation_inputs(initial_state, options)
        
        # Execute GODOT propagation
        trajectory, events = self._execute_godot_propagation(godot_inputs)
        
        # Format results for API response
        result = {
            "trajectory": trajectory,
            "events": events
        }
        
        return result
        
    def _prepare_propagation_inputs(
        self,
        initial_state: OrbitParameters,
        options: PropagationOptions
    ) -> Dict[str, Any]:
        """Format inputs for GODOT"""
        # This will depend on GODOT's specific input format
        # The implementation details will vary based on how GODOT is integrated
        return {
            "initial_state": initial_state.dict(),
            "options": options.dict()
        }
        
    def _execute_godot_propagation(self, inputs: Dict[str, Any]) -> tuple:
        """
        Execute GODOT propagation with the given inputs
        
        Returns:
            tuple: (trajectory_points, events)
        """
        # Here you would call GODOT's API to perform the propagation
        # This is a placeholder implementation
        
        # Example with direct Python bindings (if available):
        # import godot
        # result = godot.propagate(inputs)
        
        # Example with command-line execution:
        # result = subprocess.run(
        #     ["godot_propagate", "--input", json.dumps(inputs)],
        #     capture_output=True,
        #     text=True
        # )
        # parsed_result = json.loads(result.stdout)
        
        # For now, return a placeholder:
        trajectory = []
        events = []
        
        # The actual implementation would populate these from GODOT's output
        
        return trajectory, events
    
    def generate_ground_track(
        self,
        trajectory: List[Dict[str, float]]
    ) -> List[Dict[str, float]]:
        """
        Generate ground track points from a trajectory
        
        Args:
            trajectory: List of state vectors in ECI
            
        Returns:
            List of lat/lon/height points
        """
        # Convert ECI coordinates to lat/lon/alt
        ground_track = []
        
        # Implementation depends on how GODOT handles coordinate transformations
        # Either call GODOT directly or use built-in conversion functions
        
        return ground_track
    
    # Add more methods for other GODOT capabilities as needed
```

Create `godot/models.py` for data models:

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class OrbitParameters(BaseModel):
    """Model for orbital parameters"""
    
    # Common fields for different orbit representations
    epoch: str = Field(..., description="Epoch in ISO format")
    frame: str = Field("ECI", description="Reference frame")
    
    # Fields for Cartesian state vector
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    vx: Optional[float] = None
    vy: Optional[float] = None
    vz: Optional[float] = None
    
    # Fields for Keplerian elements
    semi_major_axis: Optional[float] = None
    eccentricity: Optional[float] = None
    inclination: Optional[float] = None
    raan: Optional[float] = None  # Right Ascension of Ascending Node
    arg_perigee: Optional[float] = None
    true_anomaly: Optional[float] = None
    
    # Fields for TLE representation
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None

class PropagationOptions(BaseModel):
    """Model for propagation options"""
    
    start_time: str = Field(..., description="Start time in ISO format")
    end_time: str = Field(..., description="End time in ISO format")
    step_size: float = Field(60.0, description="Step size in seconds")
    
    # Force model options
    gravity_degree: int = Field(10, description="Gravity model degree")
    gravity_order: int = Field(10, description="Gravity model order")
    include_sun: bool = Field(True, description="Include solar gravity")
    include_moon: bool = Field(True, description="Include lunar gravity")
    include_srp: bool = Field(True, description="Include solar radiation pressure")
    include_drag: bool = Field(False, description="Include atmospheric drag")
    
    # Output options
    output_frame: str = Field("ECI", description="Output reference frame")
    output_format: Literal["cartesian", "keplerian", "geodetic"] = Field(
        "cartesian", description="Output format"
    )
    
    # Additional options
    detect_events: bool = Field(False, description="Detect orbital events")
    event_types: List[str] = Field([], description="Types of events to detect")
```

### 5. API Documentation and Examples

The FastAPI framework automatically generates interactive documentation. Once the server is running, you can access it at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 6. Frontend Integration

#### Example React Hook for API Communication

Here's how you might integrate with the backend in your React application:

```typescript
// hooks/useGodotAPI.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const useOrbitPropagation = (
  initialState: any,
  options: any
) => {
  const [trajectory, setTrajectory] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrajectory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/propagation/orbit`, {
          initial_state: initialState,
          options: options
        });
        
        setTrajectory(response.data.trajectory);
        setEvents(response.data.events || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch trajectory');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrajectory();
  }, [initialState, options]);

  return { trajectory, events, loading, error };
};

export const useGroundTrack = (trajectoryId: string) => {
  const [groundTrack, setGroundTrack] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trajectoryId) return;
    
    const fetchGroundTrack = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(
          `${API_BASE_URL}/groundtrack/${trajectoryId}`
        );
        
        setGroundTrack(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch ground track');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroundTrack();
  }, [trajectoryId]);

  return { groundTrack, loading, error };
};
```

#### Usage in Components

```tsx
// components/OrbitDisplay.tsx
import React from 'react';
import { useOrbitPropagation } from '../hooks/useGodotAPI';

const OrbitDisplay: React.FC = () => {
  const initialState = {
    epoch: '2023-01-01T00:00:00Z',
    x: 7000000, // meters
    y: 0,
    z: 0,
    vx: 0,
    vy: 7500, // m/s
    vz: 0,
  };
  
  const options = {
    start_time: '2023-01-01T00:00:00Z',
    end_time: '2023-01-02T00:00:00Z',
    step_size: 60, // seconds
    output_format: 'cartesian',
  };
  
  const { trajectory, events, loading, error } = useOrbitPropagation(
    initialState,
    options
  );
  
  if (loading) return <div>Loading orbit data...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Orbit Visualization</h2>
      {/* Render your 3D visualization using Three.js */}
      <div>Trajectory points: {trajectory.length}</div>
      {/* Display events */}
      <div>
        <h3>Orbital Events</h3>
        <ul>
          {events.map((event, index) => (
            <li key={index}>
              {event.type} at {event.time}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrbitDisplay;
```

## Common API Endpoints for Visualization

### 1. Orbit Propagation

```
POST /propagation/orbit
```

**Request Body:**
```json
{
  "initial_state": {
    "epoch": "2023-01-01T00:00:00Z",
    "x": 7000000,
    "y": 0,
    "z": 0,
    "vx": 0,
    "vy": 7500,
    "vz": 0
  },
  "options": {
    "start_time": "2023-01-01T00:00:00Z",
    "end_time": "2023-01-02T00:00:00Z",
    "step_size": 60,
    "output_format": "cartesian"
  }
}
```

**Response:**
```json
{
  "trajectory": [
    {
      "epoch": "2023-01-01T00:00:00Z",
      "x": 7000000,
      "y": 0,
      "z": 0,
      "vx": 0,
      "vy": 7500,
      "vz": 0
    },
    {
      "epoch": "2023-01-01T00:01:00Z",
      "x": 6999773.72,
      "y": 450000.12,
      "z": 0,
      "vx": -449.81,
      "vy": 7499.55,
      "vz": 0
    },
    // ... more points
  ],
  "events": [
    {
      "type": "apogee",
      "time": "2023-01-01T00:45:12Z",
      "position": {
        "x": 7000000,
        "y": 0,
        "z": 0
      }
    }
    // ... more events
  ]
}
```

### 2. Ground Track Generation

```
POST /visualization/groundtrack
```

**Request Body:**
```json
{
  "trajectory_id": "12345",  // Reference to a saved trajectory
  "options": {
    "start_time": "2023-01-01T00:00:00Z",
    "end_time": "2023-01-02T00:00:00Z",
    "step_size": 60
  }
}
```

**Response:**
```json
{
  "points": [
    {
      "time": "2023-01-01T00:00:00Z",
      "lat": 0,
      "lon": 0,
      "alt": 600000
    },
    {
      "time": "2023-01-01T00:01:00Z",
      "lat": 0.12,
      "lon": 0.15,
      "alt": 600012
    },
    // ... more points
  ]
}
```

### 3. Satellite Visibility

```
POST /analysis/visibility
```

**Request Body:**
```json
{
  "satellite": {
    "trajectory_id": "12345"
  },
  "ground_station": {
    "lat": 40.7128,
    "lon": -74.0060,
    "alt": 0
  },
  "start_time": "2023-01-01T00:00:00Z",
  "end_time": "2023-01-02T00:00:00Z",
  "min_elevation": 10  // Minimum elevation in degrees
}
```

**Response:**
```json
{
  "passes": [
    {
      "start": "2023-01-01T02:15:30Z",
      "end": "2023-01-01T02:25:45Z",
      "max_elevation": 65.2,
      "max_elevation_time": "2023-01-01T02:20:12Z"
    },
    // ... more passes
  ]
}
```

## Advanced Features and Future Enhancements

### 1. Real-time Positioning

- Implement WebSocket endpoints for real-time updates
- Stream satellite positions as they change
- Update visualizations without constant API polling

### 2. Multiple Satellite Support

- Track and visualize multiple satellites simultaneously
- Analyze conjunctions and relative positions
- Filter and group satellites for selective visualization

### 3. Historical Data Storage

- Store propagated orbits in a database
- Allow retrieving historical trajectories
- Compare planned vs. actual orbits

### 4. Mission Planning Interface

- Design and optimize satellite maneuvers
- Simulate complex multi-satellite operations
- Evaluate mission scenarios

## Troubleshooting

### Common Issues

1. **GODOT Installation Problems**
   - Ensure all dependencies are installed in the Docker container
   - Check GODOT configuration files for correct paths
   - Verify environment variables are properly set

2. **API Communication Errors**
   - Check CORS settings if frontend fails to connect
   - Verify network connectivity between frontend and backend
   - Look for firewall or proxy issues

3. **Propagation Errors**
   - Validate input parameters (e.g., ensure orbital elements are physically valid)
   - Check time step sizes aren't too small or too large
   - Verify force models are appropriately configured

## Conclusion

This guide has provided a comprehensive roadmap for implementing a GODOT-based backend service that can perform sophisticated orbital calculations and provide the results to your frontend visualization system. By following these steps, you'll create a powerful system that leverages ESA's orbital dynamics expertise while providing a clean, modern API for your visualization needs.

Remember that the exact implementation details may need to be adjusted based on the specific version of GODOT you receive from ESA and your particular visualization requirements. The modular architecture described here should be flexible enough to accommodate most variations with minimal changes. 