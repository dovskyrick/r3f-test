from godot.core import tempo, astro
from godot import cosmos
import numpy as np
import json
import os
import godot.core.util as util
from typing import Tuple, Optional
from .models import CartesianPoint, SphericalPoint, TrajectoryPoint

# Suppress verbose logging
util.suppressLogger()

def resolve_config_path(relative_path):
    """Try different relative paths to find the config file."""
    # Try different possible paths
    possible_paths = [
        relative_path,                  # As provided
        f"./{relative_path}",           # Current directory
        f"../{relative_path}",          # One directory up
        relative_path.replace("./", ""),  # Without leading ./
        os.path.join(os.path.dirname(os.path.dirname(__file__)), relative_path.replace("./", ""))  # Absolute path
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"Found config at: {path}")
            return path
    
    # If we get here, no path worked
    print(f"Warning: Could not locate {relative_path} in any of the checked paths. Using original path.")
    return relative_path

def cartesian_to_spherical(x: float, y: float, z: float) -> Tuple[float, float]:
    """Convert cartesian coordinates to longitude/latitude in degrees."""
    pos = np.array([x, y, z])
    spherical = astro.sphericalFromCart(pos)  # [radius, longitude, latitude]
    # Convert radians to degrees
    longitude = np.degrees(spherical[1])
    latitude = np.degrees(spherical[2])
    return longitude, latitude

def generate_trajectory(time_interval=30, universe_file='./config/universe_stella.yml',
                       trajectory_file='./config/trajectory_temp.yml'):
    """
    Generate trajectory points using GODOT.
    
    Args:
        time_interval: Time interval between points in seconds (default: 30 seconds)
        universe_file: Path to the universe configuration file
        trajectory_file: Path to the trajectory configuration file (can be generated from TLE)
    
    Returns:
        Dictionary containing trajectory points and metadata
    """
    try:
        # Resolve config paths
        resolved_universe_file = resolve_config_path(universe_file)
        resolved_trajectory_file = resolve_config_path(trajectory_file)
        
        # Debug print
        print(f"Loading universe from: {resolved_universe_file}")
        print(f"Loading trajectory from: {resolved_trajectory_file}")
        
        # Load the universe configuration and create the universe object
        uniConfig = cosmos.util.load_yaml(resolved_universe_file)
        uni = cosmos.Universe(uniConfig)
        
        # Load the trajectory configuration and create the trajectory object
        traConfig = cosmos.util.load_yaml(resolved_trajectory_file)
        tra = cosmos.Trajectory(uni, traConfig)
        
        # Compute the trajectory
        tra.compute(partials=False)
        
        # Get the start and end epochs
        start_epoch = tra.range().start()
        end_epoch = tra.range().end()
        
        # Create a time grid with specified interval in seconds
        time_grid = tempo.EpochRange(start_epoch, end_epoch).createGrid(time_interval)
        
        # Extract trajectory points
        trajectory_points = []
        
        for epoch in time_grid:
            try:
                # Get spacecraft position in ITRF frame
                spacecraft_id = "SC_center"
                # Get position in ITRF (Earth-fixed) frame for both cartesian and spherical coordinates
                position_itrf = uni.frames.vector3("Earth", spacecraft_id, "ITRF", epoch)
                # Extract x, y, z components in ITRF
                x, y, z = float(position_itrf[0]), float(position_itrf[1]), float(position_itrf[2])
                
                
                
                # Convert to spherical coordinates using ITRF position
                longitude, latitude = cartesian_to_spherical(
                    float(position_itrf[0]),
                    float(position_itrf[1]),
                    float(position_itrf[2])
                )
                
                # Store the point with both coordinate systems
                point = TrajectoryPoint(
                    epoch=str(epoch),
                    cartesian=CartesianPoint(x=x, y=y, z=z),
                    spherical=SphericalPoint(longitude=longitude, latitude=latitude),
                    mjd=epoch.mjd()
                )
                
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
        
        # For the fallback, generate a reasonable number of points
        fallback_num_points = 20
        fallback_points = []
        t = np.linspace(0, 2*np.pi, fallback_num_points)
        radius = 7000  # LEO orbit radius in km
        
        for i, angle in enumerate(t):
            # Calculate cartesian coordinates
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            z = 0.0  # Planar orbit for simplicity
            
            # Calculate spherical coordinates
            longitude, latitude = cartesian_to_spherical(x, y, z)
            
            point = TrajectoryPoint(
                epoch=f"Point_{i}",
                cartesian=CartesianPoint(x=x, y=y, z=z),
                spherical=SphericalPoint(longitude=longitude, latitude=latitude),
                mjd=59500.0 + i/100.0
            )
            fallback_points.append(point)
        
        return {
            "points": fallback_points,
            "start_time": "Fallback_start",
            "end_time": "Fallback_end",
            "point_count": len(fallback_points),
            "status": "fallback",
            "message": f"Used fallback due to error: {str(e)}"
        } 