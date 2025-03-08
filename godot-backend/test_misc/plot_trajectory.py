#!/usr/bin/env python3
"""
Trajectory Extraction Example

This script extracts XYZ trajectory points from a GODOT trajectory.
Based on the tutorial at: https://godot.io.esa.int/godotpy/tutorials/optimisation/generate_trajectory.html
but simplified to only output coordinate data.
"""

# Load godot and numpy
from godot.core import tempo
from godot import cosmos
import numpy as np
import json
import os

# optionally avoid verbose logging messages
import godot.core.util as util
util.suppressLogger()

def run_trajectory_example():
    print("Starting trajectory point extraction...")
    
    try:
        # Load the universe configuration and create the universe object
        print("Loading universe configuration...")
        uniConfig = cosmos.util.load_yaml('../config/universe_stella.yml')
        uni = cosmos.Universe(uniConfig)
        
        # Load the trajectory configuration and create the trajectory object using the universe object
        print("Loading trajectory configuration...")
        traConfig = cosmos.util.load_yaml('../config/trajectory_stella_2021.yml')
        tra = cosmos.Trajectory(uni, traConfig)
        
        # The trajectory can be evaluated: in this phase the timeline elements are processed 
        # and propagation arcs are computed
        print("Computing trajectory...")
        tra.compute(partials=False)
        
        # Pause and wait for user input
        input("Trajectory computed. Press Enter to continue...")
        
        # After evaluating the trajectory, we can request the solutions of specific timeline elements
        print("Timeline solutions:")
        sol = tra.getTimelineSolution()
        for entry in sol:
            for item in entry:
                print('%24s%15.6f' % (item.name, item.epoch.mjd()))
        

        # Pause and wait for user input
        input("")

        # Extract trajectory points
        print("Extracting trajectory points...")
        
        # Get the start and end epochs
        start_epoch = tra.range().start()
        end_epoch = tra.range().end()
        
        # Create a time grid with 10 points between start and end
        print(f"Creating time grid from {start_epoch} to {end_epoch}")
        time_grid = tempo.EpochRange(start_epoch, end_epoch).createGrid(10)
        

        # Pause and wait for user input
        input("")
        # Extract trajectory points
        trajectory_points = []
        
        for epoch in time_grid:
            try:
                # Get spacecraft position in ICRF frame
                # "SC" is the spacecraft ID from the configuration
                spacecraft_id = "SC_center"  # This ID matches what's in the config
                position = uni.frames.vector3("Earth", spacecraft_id, "ICRF", epoch)
                
                # Extract x, y, z components
                x, y, z = position[0], position[1], position[2]
                
                # Get epoch as string
                epoch_str = str(epoch)
                
                # Store the point
                point = {
                    "epoch": epoch_str,
                    "x": float(x),
                    "y": float(y),
                    "z": float(z),
                    "mjd": epoch.mjd()
                }
                
                trajectory_points.append(point)
                
                # Print every 10th point to console
                if len(trajectory_points) % 10 == 0:
                    print(f"Point {len(trajectory_points)}: Epoch = {epoch_str}, X = {x}, Y = {y}, Z = {z}")
                    
            except Exception as point_error:
                print(f"Error getting position at {epoch}: {point_error}")
        
        # Save the trajectory points to a JSON file
        output_dir = '../data'
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, 'trajectory_points.json')
        with open(output_file, 'w') as f:
            json.dump(trajectory_points, f, indent=2)
        
        print(f"Trajectory points saved to {output_file}")
        
        # Also save as CSV for easy import
        csv_file = os.path.join(output_dir, 'trajectory_points.csv')
        with open(csv_file, 'w') as f:
            f.write("epoch,mjd,x,y,z\n")
            for point in trajectory_points:
                f.write(f"{point['epoch']},{point['mjd']},{point['x']},{point['y']},{point['z']}\n")
        
        print(f"Trajectory points also saved to {csv_file}")
        return True
        
    except Exception as e:
        print(f"Error in trajectory example: {e}")
        
        # Create some dummy trajectory data as fallback
        print("Generating fallback trajectory data...")
        
        fallback_points = []
        # Generate a simple circular orbit with 10 points (changed from 100)
        t = np.linspace(0, 2*np.pi, 10)  # Changed from 100 to 10
        radius = 7000  # LEO orbit radius in km (based on STELLA's position in config file)
        
        for i, angle in enumerate(t):
            x = radius * np.cos(angle)
            y = radius * np.sin(angle)
            z = 0.0  # Planar orbit for simplicity
            
            point = {
                "epoch": f"Point_{i}",
                "mjd": 59500.0 + i/100.0,  # MJD close to STELLA date
                "x": float(x),
                "y": float(y),
                "z": float(z)
            }
            fallback_points.append(point)
            
            # Print every 10th point
            if i % 10 == 0:
                print(f"Fallback Point {i}: X = {x}, Y = {y}, Z = {z}")
        
        # Save the fallback points
        output_dir = '../data'
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, 'fallback_trajectory_points.json')
        with open(output_file, 'w') as f:
            json.dump(fallback_points, f, indent=2)
            
        print(f"Fallback trajectory points saved to {output_file}")
        
        # Also save as CSV
        csv_file = os.path.join(output_dir, 'fallback_trajectory_points.csv')
        with open(csv_file, 'w') as f:
            f.write("epoch,mjd,x,y,z\n")
            for point in fallback_points:
                f.write(f"{point['epoch']},{point['mjd']},{point['x']},{point['y']},{point['z']}\n")
                
        print(f"Fallback trajectory points also saved to {csv_file}")
        return False

def get_example_trajectory():
    """Function to return trajectory points directly (for API use)"""
    run_result = run_trajectory_example()
    
    # Try to load the generated trajectory points
    try:
        if run_result:
            with open('../data/trajectory_points.json', 'r') as f:
                return json.load(f)
        else:
            with open('../data/fallback_trajectory_points.json', 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading trajectory data: {e}")
        # Generate and return minimal fallback data
        return [
            {"epoch": "Fallback_1", "mjd": 59500.0, "x": 7000.0, "y": 0.0, "z": 0.0},
            {"epoch": "Fallback_2", "mjd": 59500.1, "x": 4949.7, "y": 4949.7, "z": 0.0},
            {"epoch": "Fallback_3", "mjd": 59500.2, "x": 0.0, "y": 7000.0, "z": 0.0},
            {"epoch": "Fallback_4", "mjd": 59500.3, "x": -4949.7, "y": 4949.7, "z": 0.0},
            {"epoch": "Fallback_5", "mjd": 59500.4, "x": -7000.0, "y": 0.0, "z": 0.0}
        ]

if __name__ == "__main__":
    run_trajectory_example()
    print("Script execution completed.") 