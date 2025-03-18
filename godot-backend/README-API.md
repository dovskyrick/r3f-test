# GODOT Trajectory API

This API provides satellite trajectory data calculated using ESA's GODOT (Generic Orbit Determination and Orbit Analysis Tool).

## Overview

The API exposes trajectory data as a series of points with both 3D Cartesian coordinates (XYZ) and spherical coordinates (longitude/latitude), calculated at specific time intervals using GODOT's propagation capabilities.

## Features

- RESTful API built with FastAPI
- Trajectory data available in both JSON and CSV formats
- Configurable time interval between trajectory points
- Automatic fallback to simplified orbit model if GODOT encounters errors
- Automatic API documentation with Swagger UI

## Running the API

### Prerequisites

- Docker and Docker Compose installed
- GitLab access token for GODOT package repository

### Option 1: Running with Docker Compose

1. Create a `.env` file with your GitLab credentials:

```
GIT_USERNAME=your_username
GIT_TOKEN=your_personal_access_token
```

2. Build the API server:

```bash
docker-compose up --build
```

3. Start the API server:

```bash
docker-compose up -d
```

4. Stop the API server:

```bash
docker-compose down
```


The API will be available at `http://localhost:8000`

### Option 2: Running Directly (Development)

1. Ensure you have the required dependencies installed:

```bash
pip install -r requirements.txt
```

2. Run the server:

```bash
cd godot-backend
python -m src.server
```

Or:

```bash
cd godot-backend
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Available Endpoints

#### `GET /health`

Health check endpoint to verify the API is running.

#### `GET /trajectory`

Get trajectory data in JSON format.

**Parameters:**
- `time_interval` (optional): Time interval between trajectory points in seconds (default: 300 seconds = 5 minutes)

**Example Request:**
```
GET http://localhost:8000/trajectory?time_interval=900
```

**Example Response:**
```json
{
  "points": [
    {
      "epoch": "2021-10-23T19:24:00.000000 TDB",
      "cartesian": {
        "x": 6876.5701861,
        "y": -1975.00094305,
        "z": -660.03339253
      },
      "spherical": {
        "longitude": -16.01234,
        "latitude": 45.67890
      },
      "mjd": 59510.8083333
    },
    // ... more points
  ],
  "start_time": "2021-10-23T19:24:00.000000 TDB",
  "end_time": "2021-10-24T19:24:00.000000 TDB",
  "point_count": 20,
  "status": "success"
}
```

#### `GET /trajectory/csv`

Get trajectory data in CSV format.

**Parameters:**
- `time_interval` (optional): Time interval between trajectory points in seconds (default: 300 seconds = 5 minutes)

**Example Request:**
```
GET http://localhost:8000/trajectory/csv?time_interval=600
```

**Example Response:**
```
epoch,mjd,x,y,z,longitude,latitude
2021-10-23T19:24:00.000000 TDB,59510.8083333,6876.5701861,-1975.00094305,-660.03339253,-16.01234,45.67890
...
```

## Using from Frontend

You can fetch trajectory data from your frontend application using the Fetch API:

```javascript
async function fetchTrajectory(timeInterval = 300) {
  try {
    const response = await fetch(`http://localhost:8000/trajectory?time_interval=${timeInterval}`);
    
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

// Use in React Three Fiber:
fetchTrajectory(600).then(data => {
  if (data) {
    // Access trajectory points
    const points = data.points;
    
    // Use points for visualization...
    console.log(`Loaded ${points.length} trajectory points`);
  }
});
```

## Troubleshooting

If you encounter errors:

1. **Connection errors**: Ensure the API is running and accessible
2. **GODOT errors**: Check if GODOT can initialize and compute trajectories with your configuration files
3. **No response**: Verify that Docker container is healthy
4. **Invalid responses**: Validate your configuration files

For GODOT-specific issues, consult the GODOT documentation and ensure all required data files (ephemeris, etc.) are available. 