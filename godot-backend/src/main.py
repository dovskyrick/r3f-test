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
    time_interval: Optional[int] = Query(300, description="Time interval between trajectory points in seconds")
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

# Optional: Add an endpoint for CSV format
@app.get("/trajectory/csv")
async def get_trajectory_csv(
    time_interval: Optional[int] = Query(300, description="Time interval between trajectory points in seconds")
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