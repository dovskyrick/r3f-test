from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Optional, List
from pydantic import BaseModel, Field

from .models import TrajectoryResponse
from .trajectory_service import generate_trajectory
from .tle_utils import generate_yaml_from_tle

# Define a TLE request model
class TLERequest(BaseModel):
    tle_line1: str = Field(..., description="First line of the TLE data")
    tle_line2: str = Field(..., description="Second line of the TLE data")
    time_interval: Optional[int] = Field(30, description="Time interval between trajectory points in seconds")

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
    time_interval: Optional[int] = Query(30, description="Time interval between trajectory points in seconds")
):
    """
    Get satellite trajectory data.
    
    Returns a list of points with cartesian and spherical coordinates, sampled at the specified time interval.
    """
    try:
        if time_interval < 1:
            raise HTTPException(status_code=400, detail="Time interval must be at least 1 second")
        
        if time_interval > 86400:
            raise HTTPException(status_code=400, detail="Maximum time interval is 86400 seconds (1 day)")
        
        # Call our trajectory service
        result = generate_trajectory(time_interval=time_interval)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trajectory: {str(e)}")

@app.post("/trajectory/from-tle", response_model=TrajectoryResponse)
async def get_trajectory_from_tle(
    tle_request: TLERequest = Body(...)
):
    """
    Generate a satellite trajectory from TLE (Two-Line Element) data.
    
    This endpoint accepts the two lines of a TLE and generates a trajectory based on the satellite's
    orbit as defined in the TLE. The trajectory is calculated using GODOT's propagation capabilities.
    
    Args:
        tle_line1: First line of the TLE data
        tle_line2: Second line of the TLE data
        time_interval: Time interval between points in seconds (default: 30)
        
    Returns:
        A list of trajectory points with cartesian (XYZ) and spherical (lon/lat) coordinates
    """
    try:
        # Validate time interval
        if tle_request.time_interval < 1:
            raise HTTPException(status_code=400, detail="Time interval must be at least 1 second")
        
        if tle_request.time_interval > 86400:
            raise HTTPException(status_code=400, detail="Maximum time interval is 86400 seconds (1 day)")
        
        # Validate TLE data - basic validation for now
        if not tle_request.tle_line1 or not tle_request.tle_line2:
            raise HTTPException(status_code=400, detail="Both TLE lines are required")
            
        if len(tle_request.tle_line1) < 60 or len(tle_request.tle_line2) < 60:
            raise HTTPException(status_code=400, detail="TLE lines are too short - please provide valid TLE data")
            
        # Step 1: Generate YAML configuration from TLE
        yaml_path = generate_yaml_from_tle(
            tle_request.tle_line1, 
            tle_request.tle_line2
        )
        
        # Step 2: Generate trajectory using the YAML configuration
        result = generate_trajectory(
            time_interval=tle_request.time_interval,
            trajectory_file=yaml_path
        )
        
        return result
        
    except Exception as e:
        # Return a more detailed error for troubleshooting
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating trajectory from TLE: {str(e)}\n\nDetails:\n{error_details}"
        )

# Optional: Add an endpoint for CSV format
@app.get("/trajectory/csv")
async def get_trajectory_csv(
    time_interval: Optional[int] = Query(30, description="Time interval between trajectory points in seconds")
):
    """Get satellite trajectory in CSV format."""
    try:
        from fastapi.responses import PlainTextResponse
        import io
        import csv
        
        result = generate_trajectory(time_interval=time_interval)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["epoch", "mjd", "x", "y", "z", "longitude", "latitude"])
        
        # Write data rows
        for point in result["points"]:
            writer.writerow([
                point.epoch,
                point.mjd,
                point.cartesian.x,
                point.cartesian.y,
                point.cartesian.z,
                point.spherical.longitude,
                point.spherical.latitude
            ])
        
        # Return CSV response
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=trajectory.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating CSV: {str(e)}")

# Optional: Add CSV format for TLE-based trajectories 
@app.post("/trajectory/from-tle/csv")
async def get_trajectory_from_tle_csv(
    tle_request: TLERequest = Body(...)
):
    """Get TLE-based satellite trajectory in CSV format."""
    try:
        from fastapi.responses import PlainTextResponse
        import io
        import csv
        
        # Validate time interval
        if tle_request.time_interval < 1:
            raise HTTPException(status_code=400, detail="Time interval must be at least 1 second")
        
        if tle_request.time_interval > 86400:
            raise HTTPException(status_code=400, detail="Maximum time interval is 86400 seconds (1 day)")
        
        # Step 1: Generate YAML configuration from TLE
        yaml_path = generate_yaml_from_tle(
            tle_request.tle_line1, 
            tle_request.tle_line2
        )
        
        # Step 2: Generate trajectory using the YAML configuration
        result = generate_trajectory(
            time_interval=tle_request.time_interval,
            trajectory_file=yaml_path
        )
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["epoch", "mjd", "x", "y", "z", "longitude", "latitude"])
        
        # Write data rows
        for point in result["points"]:
            writer.writerow([
                point.epoch,
                point.mjd,
                point.cartesian.x,
                point.cartesian.y,
                point.cartesian.z,
                point.spherical.longitude,
                point.spherical.latitude
            ])
        
        # Return CSV response
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=trajectory_from_tle.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating CSV from TLE: {str(e)}") 