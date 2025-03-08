from godot.core import tempo
from godot import cosmos
import numpy as np
import json
import os
import godot.core.util as util

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

def generate_trajectory(universe_file='./config/universe_stella.yml',
                       trajectory_file='./config/trajectory_stella_2021.yml',
                       num_points=10):
    """Generate trajectory points using GODOT."""
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