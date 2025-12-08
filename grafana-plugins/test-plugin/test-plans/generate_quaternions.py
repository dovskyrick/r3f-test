"""
Quaternion Generator for Satellite Attitude Data
Run this in: Google Colab, repl.it, or local Python

Generates properly normalized quaternions for X-axis rotation.
"""

import math

# Configuration
NUM_POINTS = 100
TOTAL_ROTATIONS = 2  # How many full rotations
START_TIME_MS = 1733097600000  # Unix timestamp in milliseconds
TIME_STEP_MS = 30000  # 30 seconds between points

# Starting position (degrees)
START_LON = 10.0
START_LAT = 45.0
START_ALT = 420000  # meters

# Position change per step (simple linear trajectory)
LON_STEP = 0.2
LAT_STEP = 0.1
ALT_VARIATION = 2000  # oscillate altitude

def generate_quaternion_x_rotation(angle_radians):
    """
    Generate quaternion for rotation around X-axis.
    q = (sin(θ/2), 0, 0, cos(θ/2)) for X-axis rotation
    """
    half_angle = angle_radians / 2
    qx = math.sin(half_angle)
    qy = 0.0
    qz = 0.0
    qw = math.cos(half_angle)
    
    # Normalize (should already be normalized, but ensure it)
    magnitude = math.sqrt(qx*qx + qy*qy + qz*qz + qw*qw)
    qx /= magnitude
    qy /= magnitude
    qz /= magnitude
    qw /= magnitude
    
    return qx, qy, qz, qw

# Generate data
print("Generating quaternion data...")
print("=" * 60)

total_angle = TOTAL_ROTATIONS * 2 * math.pi  # Total rotation in radians
angle_step = total_angle / (NUM_POINTS - 1)

rows = []
for i in range(NUM_POINTS):
    # Time
    time_ms = START_TIME_MS + (i * TIME_STEP_MS)
    
    # Position (simple linear motion with altitude oscillation)
    lon = START_LON + (i * LON_STEP)
    lat = START_LAT + (i * LAT_STEP)
    alt = START_ALT + ALT_VARIATION * math.sin(i * 0.2)
    
    # Quaternion for current rotation angle
    current_angle = i * angle_step
    qx, qy, qz, qw = generate_quaternion_x_rotation(current_angle)
    
    # Format row
    row = f"[{time_ms}, {lon:.1f}, {lat:.1f}, {alt:.0f}, {qx:.6f}, {qy:.6f}, {qz:.6f}, {qw:.6f}]"
    rows.append(row)
    
    # Print progress every 20 points
    if i % 20 == 0:
        print(f"Point {i}: angle={math.degrees(current_angle):.1f}°, qw={qw:.4f}")

print("=" * 60)
print("\n\nCOPY EVERYTHING BELOW THIS LINE INTO YOUR JSON 'rows' ARRAY:\n")
print("=" * 60)

# Output formatted for JSON
for i, row in enumerate(rows):
    if i < len(rows) - 1:
        print(f"        {row},")
    else:
        print(f"        {row}")

print("=" * 60)
print(f"\nGenerated {NUM_POINTS} points with {TOTAL_ROTATIONS} full X-axis rotations")
print(f"Time span: {(NUM_POINTS - 1) * TIME_STEP_MS / 1000 / 60:.1f} minutes")

