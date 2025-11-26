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

# Function to extract epoch and time information from TLE
def extract_epoch_from_tle(tle_line1, tle_line2):
    """Extract and create a tempo.Epoch object from TLE data"""
    # Parse the TLE using sgp4
    satellite = Satrec.twoline2rv(tle_line1, tle_line2)

    # Get Julian date components directly
    jd = satellite.jdsatepoch
    jd_fraction = satellite.jdsatepochF
    
    # Use astropy's Time to convert Julian date to ISO format
    t_beginning = Time(jd + jd_fraction, format='jd', scale='tdb')
    t_end = Time(jd + jd_fraction + 1, format='jd', scale='tdb')
    
    # Format the time as needed for tempo.Epoch constructor
    formatted_time_beginning = t_beginning.iso.replace(' ', 'T') + " TDB"
    formatted_time_end = t_end.iso.replace(' ', 'T') + " TDB"
    
    # Create tempo.Epoch using the formatted string
    e0 = tempo.Epoch(formatted_time_beginning)
    
    return e0, formatted_time_beginning, formatted_time_end

# Function to calculate position and velocity from TLE
def tle_to_pos_vel(tle_line1, tle_line2, jd, jf):
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

# Main function to generate YAML configuration from TLE
def generate_yaml_from_tle(tle_line1, tle_line2, output_path=None):
    """
    Generate a GODOT-compatible YAML configuration file from TLE data.
    
    Args:
        tle_line1 (str): First line of the TLE
        tle_line2 (str): Second line of the TLE
        output_path (str, optional): Path where to save the YAML file.
            If None, uses a default path in the config directory.
            
    Returns:
        str: Path to the generated YAML file
    """
    # Extract and create the epoch from TLE
    e0, formatted_time_beginning, formatted_time_end = extract_epoch_from_tle(tle_line1, tle_line2)
    
    # Get Julian day components for position/velocity calculation
    days_and_fraction = e0.jdPair(tempo.TimeScale.TT, tempo.JulianDay.JD)
    
    # Compute position and velocity
    pos_vel = tle_to_pos_vel(tle_line1, tle_line2, days_and_fraction.day, days_and_fraction.fraction)
    
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
            'timeScale': 'TDB'  # Using UTC as requested
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
                'epoch': formatted_time_beginning,
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
    
    # Determine output path if not provided
    if output_path is None:
        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, "trajectory_temp.yml")
    
    # Save the YAML data to the file
    with open(output_path, "w") as out:
        yaml.dump(yamldata, out)
    
    return output_path

# For testing/CLI usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 2:
        # Use command line arguments if provided
        tle_file = sys.argv[1]
        with open(tle_file, 'r') as file:
            lines = file.readlines()
            tle_line1 = lines[0].strip()
            tle_line2 = lines[1].strip()
    else:
        # Default test TLE if no arguments
        tle_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_misc", "testTLE.txt")
        with open(tle_file, 'r') as file:
            lines = file.readlines()
            tle_line1 = lines[0].strip()
            tle_line2 = lines[1].strip()
    
    yaml_path = generate_yaml_from_tle(tle_line1, tle_line2)
    print(f"YAML configuration saved to: {yaml_path}") 