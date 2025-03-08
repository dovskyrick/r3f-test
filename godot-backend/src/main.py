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