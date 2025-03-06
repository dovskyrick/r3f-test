# Testing GODOT Functionality in Docker Container

This guide explains how to perform basic tests with the GODOT package inside the Docker container, focusing on time conversion from UTC to TDB (Barycentric Dynamical Time).

## Prerequisites

- Docker container built and running with GODOT installed
- Basic understanding of Python and command line

## Entering the Docker Container

First, you need to enter the Docker container to run interactive tests:

1. Start the container if it's not already running:
   ```bash
   cd godot-backend
   docker-compose up -d
   ```

2. Get the container ID:
   ```bash
   docker ps
   ```

3. Open a shell in the container:
   ```bash
   docker exec -it <container_id_or_name> /bin/bash
   ```

## Creating a Test Script

Once inside the container, create a simple Python script to test GODOT functionality:

1. Create a test file:
   ```bash
   cd /app
   touch test_godot.py
   ```

2. Use a text editor to add code to the file (e.g., `nano test_godot.py`):

```python
import godot
from datetime import datetime

def test_time_conversion():
    # Get current UTC time
    utc_time = datetime.utcnow()
    print(f"Current UTC time: {utc_time}")
    
    try:
        # Import GODOT time module
        from godot.time import TimeScales
        
        # Initialize time scales converter
        time_scales = TimeScales()
        
        # Convert UTC to TDB
        tdb_time = time_scales.utc_to_tdb(utc_time)
        print(f"Converted TDB time: {tdb_time}")
        print(f"Difference (TDB - UTC): {tdb_time - utc_time}")
        
        return True
    except Exception as e:
        print(f"Error converting time: {str(e)}")
        return False

def print_godot_version():
    print(f"GODOT version: {godot.__version__}")

if __name__ == "__main__":
    print("Testing GODOT functionality...")
    print_godot_version()
    
    print("\nTesting time conversion (UTC to TDB):")
    success = test_time_conversion()
    
    print("\nTesting complete.")
    if success:
        print("✓ Time conversion test passed")
    else:
        print("✗ Time conversion test failed")
```

> Note: The exact import path and method names may differ based on GODOT's actual API. Adjust the code according to GODOT documentation.

## Running the Test

Execute the test script:

```bash
python test_godot.py
```

## Alternative: Using Python Interactive Shell

If you prefer to test interactively:

1. Start Python in the container:
   ```bash
   python
   ```

2. Run commands interactively:
   ```python
   import godot
   print(godot.__version__)
   
   # Test time conversion
   from datetime import datetime
   from godot.time import TimeScales  # Adjust import path as needed
   
   utc_time = datetime.utcnow()
   time_scales = TimeScales()
   tdb_time = time_scales.utc_to_tdb(utc_time)
   
   print(f"UTC: {utc_time}")
   print(f"TDB: {tdb_time}")
   print(f"Difference: {tdb_time - utc_time}")
   ```

## Specific Test for a Given Epoch

To test with a specific epoch:

```python
import godot
from datetime import datetime
from godot.time import TimeScales  # Adjust import path as needed

# Define a specific UTC epoch
utc_epoch = datetime(2023, 1, 1, 12, 0, 0)  # 2023-01-01 12:00:00 UTC
print(f"UTC epoch: {utc_epoch}")

# Convert to TDB
time_scales = TimeScales()
tdb_epoch = time_scales.utc_to_tdb(utc_epoch)
print(f"TDB epoch: {tdb_epoch}")
print(f"Difference (TDB - UTC): {tdb_epoch - utc_epoch}")
```

## Troubleshooting

If you encounter errors:

1. **Import errors**: Check if GODOT's module structure is different from what's used in the examples:
   ```python
   # Find all available modules
   import godot
   help(godot)
   dir(godot)
   ```

2. **Method not found**: Check available methods in the time module:
   ```python
   from godot import time  # Or the correct time module path
   dir(time)
   help(time)
   ```

3. **Version incompatibility**: Verify you're using the syntax appropriate for your GODOT version:
   ```python
   import godot
   print(godot.__version__)
   ```

## Next Steps

After basic testing, you can:

1. Explore other GODOT capabilities (orbit propagation, coordinate transformations)
2. Integrate tested functionality into your FastAPI endpoints
3. Develop more comprehensive test suites for your specific use cases

Remember to refer to the official GODOT documentation for detailed API information and examples. 