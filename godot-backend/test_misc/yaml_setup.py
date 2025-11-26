import yaml
from godot import cosmos
from godot.core import tempo
import numpy as np
import os
import math

from astropy import units as u
from astropy.coordinates import TEME, ITRS, CartesianDifferential, CartesianRepresentation
from astropy.time import Time
from sgp4.api import Satrec

# Function to parse TLE data
def parse_tle(filename):
    with open(filename, 'r') as file:
        lines = file.readlines()
        tle_line1 = lines[0].strip()
        tle_line2 = lines[1].strip()
    return tle_line1, tle_line2

def extract_epoch_from_tle(tle_line1, tle_line2):
    """Extract and create a tempo.Epoch object from TLE data"""
    # Parse the TLE using sgp4
    satellite = Satrec.twoline2rv(tle_line1, tle_line2)


    # Get Julian date components directly
    jd = satellite.jdsatepoch
    jd_fraction = satellite.jdsatepochF

    print(f"JD: {jd}, JD Fraction: {jd_fraction}")
    
    # Use astropy's Time to convert Julian date to ISO format
    # Make sure to use UTC for the time scale
    t_begining = Time(jd + jd_fraction, format='jd', scale='utc')
    t_end = Time(jd + jd_fraction + 1, format='jd', scale='utc')
    
    # Format the time as needed for tempo.Epoch constructor
    # Format: "2018-10-02T19:54:12.123998 UTC"
    formatted_time_begining = t_begining.iso.replace(' ', 'T') + " UTC"
    formatted_time_end = t_end.iso.replace(' ', 'T') + " UTC"
    # Create tempo.Epoch using the formatted string
    e0 = tempo.Epoch(formatted_time_begining)
    
    return e0, formatted_time_begining, formatted_time_end

def TLE_to_pos_vel(tle_line1, tle_line2, jd, jf):
    """Calculate position and velocity from TLE data and Julian date"""
    # Create a satellite object
    satellite = Satrec.twoline2rv(tle_line1, tle_line2)

    # Propagate orbit to the specified Julian date
    e, r, v = satellite.sgp4(jd, jf)

    # Create a CartesianDifferential object with the velocity
    velocity_diff = CartesianDifferential(*v, unit=u.km/u.s)

    # Create a CartesianRepresentation object with the position and velocity
    cart_rep = CartesianRepresentation(*r, unit=u.km, differentials=velocity_diff)

    # Create a TEME coordinate object with the CartesianRepresentation
    teme_p = TEME(cart_rep, obstime=Time(jd+jf, format='jd'))

    # Convert the TEME coordinates to ITRS
    itrf_p = teme_p.transform_to(ITRS(obstime=Time(jd+jf, format='jd')))

    return itrf_p.cartesian.xyz.to(u.km), itrf_p.velocity.d_xyz.to(u.km/u.s)

# Main execution
def main():
    # Path to the TLE file
    tle_file = os.path.join(os.path.dirname(__file__), "testTLE.txt")
    
    # Parse the TLE file
    tle_line1, tle_line2 = parse_tle(tle_file)
    print(f"TLE Line 1: {tle_line1}")
    print(f"TLE Line 2: {tle_line2}")
    
    # Extract and create the epoch from TLE
    e0, formatted_time_begining, formatted_time_end = extract_epoch_from_tle(tle_line1, tle_line2)
    print(f"Epoch: {e0.calStr('UTC')}")
    
    # Get Julian day components for position/velocity calculation
    daysAndFraction = e0.jdPair(tempo.TimeScale.TT, tempo.JulianDay.JD)
    print(f"Julian Day: {daysAndFraction.day}, Fraction: {daysAndFraction.fraction}")
    
    # Compute position and velocity
    pos_vel = TLE_to_pos_vel(tle_line1, tle_line2, daysAndFraction.day, daysAndFraction.fraction)
    
    # Print results
    print("\nPosition (km):")
    print(f"X: {pos_vel[0][0]}")
    print(f"Y: {pos_vel[0][1]}")
    print(f"Z: {pos_vel[0][2]}")
    
    print("\nVelocity (km/s):")
    print(f"X: {pos_vel[1][0].value}")
    print(f"Y: {pos_vel[1][1].value}")
    print(f"Z: {pos_vel[1][2].value}")
    
    # Create a YAML structure that matches trajectory_stella_2021.yml
    yamldata = {
        'settings': {
            'steps': 100000,
            'stepper': {
                'method': 'adams'
            },
            'initialStep': '10 s',
            'relTol': 1e-09,
            'absTol': 1e-09,
            'timeScale': 'UTC'  # Keep TDB as in the example, even though we're using UTC timestamps
        },
        'setup': [
            {
                'name': 'SC',
                'type': 'group',
                'spacecraft': 'SC',
                'input': [
                    {
                        'name': 'center',
                        'type': 'point'
                    }
                ]
            }
        ],
        'timeline': [
            {
                'type': 'control',
                'name': 'start',
                'epoch': formatted_time_begining,
                'state': [
                    {
                        'name': 'SC_center',
                        'body': 'Earth',
                        'axes': 'ITRF',
                        'dynamics': 'EMS_combined',
                        'value': {
                            'pos_x': f"{pos_vel[0][0].value} km",
                            'pos_y': f"{pos_vel[0][1].value} km",
                            'pos_z': f"{pos_vel[0][2].value} km",
                            'vel_x': f"{pos_vel[1][0].value} km/s",
                            'vel_y': f"{pos_vel[1][1].value} km/s",
                            'vel_z': f"{pos_vel[1][2].value} km/s"
                        }
                    }
                ]
            },
            {
                'type': 'point',
                'name': 'end',
                'input': 'SC',
                'point': {
                    'epoch': formatted_time_end
                }
            }
        ]
    }
    
    # Save the YAML data to a file
    output_dir = os.path.join(os.path.dirname(__file__), "../config")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "trajectory_modifiable.yml")
    
    with open(output_file, "w") as out:
        yaml.dump(yamldata, out)
    print(f"\nYAML file saved to: {output_file}")

if __name__ == "__main__":
    main()

# Load the universe configuration and create the universe object
#uniConfig = cosmos.util.load_yaml('config/universe_modifiable.yml')
#uni = cosmos.Universe(uniConfig)

# Load the trajectory configuration and create the trajectory object using the universe object
#traConfig = cosmos.util.load_yaml('config/trajectory_modifiable.yml')
#tra = cosmos.Trajectory(uni, traConfig)