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