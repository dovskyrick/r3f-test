# GODOT Dependency and Connection Troubleshooting Guide

This document outlines common issues with the GODOT (Generic Orbit Determination and Orbit Analysis Tool) library when used in a Docker environment, particularly focusing on dependency issues and connection errors between reference frames.

## Common Connection Errors

### Error: "Could not connect Point Earth to Point SC"

This error indicates that GODOT cannot establish a transformation path between Earth and a spacecraft object. The complete error often looks like:

```
Post-condition check failed: err == 0. Help message: Could not connect Point Earth to Point SC at [TIME] TDB
```

This error can occur due to several reasons:

1. **Ephemeris data doesn't cover the requested time period**
2. **Missing required IPF files for Earth orientation parameters**
3. **Mismatched reference frames or time scales**
4. **Missing C++ dependencies required for coordinate transformations**
5. **Spacecraft state not properly initialized**

### Error: "Timeline element not found"

This can happen when a referenced point in a trajectory file doesn't exist in the universe definition:

```
Exception raised in GODOT: What: Timeline element [NAME] not found
```

### Error: "Cannot alias to an object using a different timescale"

This occurs when trying to connect objects defined with incompatible time scales:

```
Pre-condition check failed: it2->second.timeScaleId() == it->second.timeScaleId(). Help message: In Point collection, cannot alias to an object using a different timescale
```

## Missing Functionality: cosmos.show

If `cosmos.show` module is not available, it typically indicates:

1. An incomplete GODOT installation (visualization components might be optional)
2. Missing Python dependencies for visualization
3. The version of GODOT installed doesn't include this module

## Dependency Requirements

Based on the [GODOT documentation](https://godot.io.esa.int/godotpy/guides/external.html), these are the critical dependencies:

| Dependency | Purpose | Impact if Missing |
|------------|---------|------------------|
| **Eigen** | Linear algebra, matrices, vectors | Computational functions fail |
| **Calceph** | Access to planetary ephemeris files | Cannot determine planetary positions |
| **ERFA** | IAU precession, nutation, polar motion models | Earth orientation calculations fail |
| **Pybind11** | C++ bindings for Python | Python API doesn't work properly |
| **ipf library** | Access to ESOC FD interpolation files | Cannot read nutation/ERP files |
| **Atmosphere models** | nrlmsise00, hwm93 | Drag calculations fail |
| **CelesTrack/SGP4** | TLE propagator | Cannot use TLE propagation |

## Troubleshooting Solutions

### 1. Check GODOT Installation

First, verify which GODOT modules are available:

```python
import godot
print(godot.__version__)
print(dir(godot))  # Shows available modules
```

### 2. Install Required System Dependencies

In your Dockerfile, ensure the necessary C++ libraries are installed:

```dockerfile
# Install system dependencies
RUN apt-get update && apt-get install -y \
    libcalceph-dev \
    liberfa-dev \
    libeigen3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
```

### 3. Verify Required Files

Check if all referenced files in your configuration actually exist:

- Ephemeris files (e.g., `../data/ephemeris/unxp2000.405`)
- Earth orientation files (e.g., `../data/orientation/nutation2000A.ipf`)
- Gravity models (e.g., `../data/gravity/eigen05c_80_sha.tab`)
- Atmosphere models (e.g., `../data/atmosphere/solmag.ipf`)

### 4. Time Scale Consistency

Ensure your `universe.yml` and trajectory files use compatible time scales:

- BCRS spacetime should be used with TDB timescale
- GCRS spacetime should be used with TCG timescale

### 5. Complete Build from Source

If the pip installation is incomplete, consider building GODOT from source:

```dockerfile
# Clone GODOT repo
RUN git clone https://gitlab.esa.int/godot/godotpy.git /tmp/godotpy && \
    cd /tmp/godotpy && \
    python setup.py install && \
    rm -rf /tmp/godotpy
```

## Checking Ephemeris Time Coverage

Ephemeris files cover specific time periods. To check the time coverage of your ephemeris files:

### Using GODOT API

```python
from godot.core import tempo
from godot import cosmos
import godot.core.util as util

# Suppress verbose logging
util.suppressLogger()

def check_ephemeris_coverage(ephemeris_file="../data/ephemeris/unxp2000.405"):
    """Check the time coverage of an ephemeris file."""
    try:
        # Create a simple universe with just the ephemeris
        uni_config = {
            "version": "3.0",
            "ephemeris": [
                {
                    "name": "test_ephem",
                    "files": [ephemeris_file],
                    "cache": False
                }
            ],
            "frames": [
                {
                    "name": "ephem_test",
                    "type": "Ephem",
                    "config": {
                        "source": "test_ephem"
                    }
                }
            ]
        }
        
        # Create the universe
        uni = cosmos.Universe(uni_config)
        
        # Get the frames plugin
        frames = uni.frames
        
        # Try to access Earth at different epochs to find boundaries
        # Start with a known date
        start_epoch = tempo.Epoch("1950-01-01T00:00:00 TDB")
        end_epoch = tempo.Epoch("2050-01-01T00:00:00 TDB")
        
        # Binary search or incremental approach to find boundaries
        # This is a simplified example - a real implementation might use binary search
        try:
            # Check if we can access Earth at the start date
            frames.existsPoint("Earth", start_epoch)
            print(f"Ephemeris covers {start_epoch}")
        except Exception as e:
            print(f"Ephemeris does not cover {start_epoch}")
        
        try:
            # Check if we can access Earth at the end date
            frames.existsPoint("Earth", end_epoch)
            print(f"Ephemeris covers {end_epoch}")
        except Exception as e:
            print(f"Ephemeris does not cover {end_epoch}")
        
        # If you need more precise boundaries, you could implement a binary search here
        
        # For DE405 specifically (if that's what you're using), the coverage is known:
        print("\nReference information:")
        print("DE405: December 9, 1599 (JD 2305424.5) to February 1, 2200 (JD 2525008.5)")
        print("DE430: December 21, 1549 (JD 2287184.5) to January 25, 2650 (JD 2688976.5)")
        print("DE432: December 21, 1549 to January 25, 2650")
        
    except Exception as e:
        print(f"Error checking ephemeris coverage: {e}")

# Run the check
check_ephemeris_coverage()
```

### Direct File Inspection

For JPL ephemeris files, you can use the `calceph` Python package directly:

```python
try:
    from calceph import Calceph
    
    def check_ephemeris_with_calceph(ephemeris_file="../data/ephemeris/unxp2000.405"):
        try:
            ephem = Calceph(ephemeris_file)
            start_jd = ephem.getStartTime()
            end_jd = ephem.getEndTime()
            
            # Convert Julian days to calendar dates
            # Rough conversion for display - not precise
            days_since_j2000 = start_jd - 2451545.0
            start_year = 2000 + days_since_j2000/365.25
            
            days_since_j2000 = end_jd - 2451545.0
            end_year = 2000 + days_since_j2000/365.25
            
            print(f"Ephemeris coverage: {start_jd} to {end_jd} (JD)")
            print(f"Approximate years: {start_year:.1f} to {end_year:.1f}")
            
        except Exception as e:
            print(f"Error with calceph: {e}")
            
    check_ephemeris_with_calceph()
    
except ImportError:
    print("calceph Python package not available")
```

### Command-Line Inspection

If you have SPICE utilities installed (particularly `brief`), you can use them to examine ephemeris files:

```bash
brief -c ../data/ephemeris/unxp2000.405
```

## Time Scale Reference

For reference, these are the time scales available in GODOT:

| Time Scale | Full Name | Reference System |
|------------|-----------|------------------|
| TDB | Barycentric Dynamical Time | BCRS |
| TCB | Barycentric Coordinate Time | BCRS |
| TCG | Geocentric Coordinate Time | GCRS |
| TT | Terrestrial Time | GCRS/Earth |
| TAI | International Atomic Time | Earth |
| UTC | Coordinated Universal Time | Earth |
| UT1 | Universal Time | Earth rotation |
| GPS | GPS Time | GPS system |

## Using Fallback Methods

If you continue to encounter issues with GODOT's transformation capabilities, consider implementing simplified models:

1. Use Keplerian propagation for basic orbit calculations
2. Implement SGP4/SDP4 propagation for TLEs
3. Use simplified rotation matrices for basic transformations

Remember that these simplified approaches will lack the precision of GODOT's full numerical integration capabilities. 