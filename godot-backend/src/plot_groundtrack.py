#!/usr/bin/env python3
"""
Sentinel 1 ground track plotting example based on GODOT

This script demonstrates how to generate and plot a satellite ground track
using GODOT. It's based on the groundtrack.txt example but simplified to
just show the trajectory plotting.
"""

# Import necessary libraries
import numpy as np
import matplotlib.pyplot as plt

try:
    # Import GODOT modules
    from godot.core import num, tempo, astro
    from godot import cosmos
    import godot.core.util as util

    # Optionally avoid verbose logging messages
    util.suppressLogger()

    # Create the universe
    print("Loading universe configuration...")
    uni_config = cosmos.util.load_yaml('../config/universe_stella.yml')  # Adjust path as needed
    print(uni_config)
    uni = cosmos.Universe(uni_config)

    # Get satellite trajectory data
    print("Fetching Sentinel 1 trajectory data...")
    sent1 = uni.frames.pointId("Sentinel_1")
    blocks = uni.frames.blocks(sent1, True)
    assert(len(blocks)==1)
    
    # Define time range (1 day)
    start = blocks[0].range.start()
    end = start + 1 * tempo.SecondsInDay
    ran = tempo.EpochRange(start, end)
    print(f"Time range: {start} to {end}")

    # Define function to compute subsatellite point (latitude, longitude)
    def subsat_point(epoch):
        pos = uni.frames.vector3("Earth", "Sentinel_1", "ITRF", epoch)
        pol = astro.sphericalFromCart(pos)  # [radius, longitude, latitude]
        return pol[1:]  # [longitude, latitude]

    # Generate points every 15 seconds
    print("Calculating ground track points...")
    grid = ran.createGrid(15.0)
    points = np.asarray([subsat_point(e) for e in grid])

    # Convert radians to degrees
    lon_points = num.Rad * points[:, 0]  # Longitude in degrees
    lat_points = num.Rad * points[:, 1]  # Latitude in degrees

    # Plot the trajectory
    print("Plotting trajectory...")
    plt.figure(figsize=(10, 6))
    plt.title('Sentinel 1 Ground Track')
    plt.xlabel('Longitude (deg)')
    plt.ylabel('Latitude (deg)')

    # Plot grid lines
    plt.grid(True, linestyle='--', alpha=0.7)

    # Plot trajectory
    plt.plot(lon_points, lat_points, '-', color='blue', linewidth=1.5, label='Ground Track')
    
    # Add some key points (e.g., start and end)
    plt.plot(lon_points[0], lat_points[0], 'go', markersize=8, label='Start')
    plt.plot(lon_points[-1], lat_points[-1], 'ro', markersize=8, label='End')

    # Set plot limits
    plt.xlim([-180, 180])
    plt.ylim([-90, 90])

    # Add graticules (latitude/longitude grid lines)
    plt.xticks(np.linspace(-180, 180, 13))
    plt.yticks(np.linspace(-90, 90, 7))

    plt.legend()
    plt.tight_layout()
    
    print("Showing plot. Close the window to exit.")
    plt.show()

except ImportError as e:
    print(f"Error importing GODOT modules: {e}")
    print("Creating a simplified example trajectory instead...")
    
    # Generate a simple example trajectory (circular orbit)
    theta = np.linspace(0, 2*np.pi, 100)
    lat = 30 * np.sin(theta)  # Max latitude ±30 degrees
    lon = 180 * np.cos(theta)  # Full longitude range
    
    plt.figure(figsize=(10, 6))
    plt.title('Example Satellite Ground Track (Simulated)')
    plt.xlabel('Longitude (deg)')
    plt.ylabel('Latitude (deg)')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.plot(lon, lat, '-', color='blue', linewidth=1.5, label='Ground Track')
    plt.plot(lon[0], lat[0], 'go', markersize=8, label='Start')
    plt.plot(lon[-1], lat[-1], 'ro', markersize=8, label='End')
    plt.xlim([-180, 180])
    plt.ylim([-90, 90])
    plt.xticks(np.linspace(-180, 180, 13))
    plt.yticks(np.linspace(-90, 90, 7))
    plt.legend()
    plt.tight_layout()
    plt.show()

except Exception as e:
    print(f"Error: {e}")
    print("Unable to generate trajectory.") 