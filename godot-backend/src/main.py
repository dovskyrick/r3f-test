from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Define data models
class OrbitParameters(BaseModel):
    """Model for orbital parameters"""
    epoch: str
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    vx: Optional[float] = None
    vy: Optional[float] = None
    vz: Optional[float] = None

class PropagationOptions(BaseModel):
    """Model for propagation options"""
    start_time: str
    end_time: str
    step_size: float = 60.0

class PropagationRequest(BaseModel):
    """Request model for orbit propagation"""
    initial_state: OrbitParameters
    options: PropagationOptions
    
class PropagationResponse(BaseModel):
    """Response model for orbit propagation"""
    trajectory: List[Dict[str, float]]
    events: Optional[List[Dict[str, Any]]] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/propagation/orbit", response_model=PropagationResponse)
async def propagate_orbit(request: PropagationRequest):
    """
    Propagate an orbit using the specified initial state and options.
    Returns a trajectory as a list of state vectors.
    
    Note: This is a placeholder implementation. Actual GODOT integration
    will be implemented once the container is set up.
    """
    try:
        # Placeholder - will be replaced with actual GODOT propagation
        # This is just for testing the API structure
        trajectory = [
            {
                "epoch": request.options.start_time, 
                "x": request.initial_state.x, 
                "y": request.initial_state.y, 
                "z": request.initial_state.z,
                "vx": request.initial_state.vx,
                "vy": request.initial_state.vy,
                "vz": request.initial_state.vz
            }
        ]
        
        return {"trajectory": trajectory, "events": []}
    except Exception as e:
        logger.error(f"Error in orbit propagation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "api": "GODOT Orbit Visualization API",
        "version": "1.0.0",
        "endpoints": [
            {"path": "/health", "method": "GET", "description": "Health check"},
            {"path": "/propagation/orbit", "method": "POST", "description": "Propagate orbit"}
        ]
    } 