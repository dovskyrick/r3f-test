from pydantic import BaseModel
from typing import List, Optional

class CartesianPoint(BaseModel):
    """Cartesian coordinates (x, y, z)"""
    x: float
    y: float
    z: float

class SphericalPoint(BaseModel):
    """Spherical coordinates (longitude, latitude)"""
    longitude: float  # in degrees
    latitude: float   # in degrees

class TrajectoryPoint(BaseModel):
    """A single point in a trajectory with both coordinate systems"""
    epoch: str
    cartesian: CartesianPoint
    spherical: SphericalPoint
    mjd: float

class TrajectoryResponse(BaseModel):
    """Response containing trajectory data"""
    points: List[TrajectoryPoint]
    start_time: str
    end_time: str
    point_count: int
    status: str
    message: Optional[str] = None 