# Attitude Data Simulation - Backend Implementation Plan

## Objective

Extend the GODOT backend to generate simulated attitude data alongside trajectory data. This will provide the frontend with time-varying 3D orientation vectors that represent the satellite's attitude (orientation) in space over a 24-hour period.

## Requirements Summary

### Data Structure Requirements

**Attitude Vector Format (JSON):**
```json
{
  "label": "Body_X_Axis",
  "color": [1.0, 0.0, 0.0],
  "timestamps": [
    {
      "epoch": "2024-11-10T12:00:00.000",
      "mjd": 60258.5,
      "vector": {
        "x": 0.9659,
        "y": 0.2588,
        "z": 0.0
      }
    },
    // ... more timestamps
  ]
}
```

### Key Requirements

1. **Three Orthogonal Vectors**: Generate 3 attitude vectors (representing body axes X, Y, Z)
2. **ICRF Coordinate System**: All vectors in ICRF (inertial) frame
3. **Time Series**: 10-15 data points over 24 hours
4. **Rotation Simulation**: Vectors rotate 360° over the day about a configurable axis
5. **Timestamps**: Each attitude sample has epoch and MJD timestamps
6. **Color Hints**: Suggest visualization colors (frontend can override)
7. **Labels**: Each vector set has descriptive label
8. **Orthonormality**: Vectors remain orthogonal throughout rotation
9. **No API Changes**: Backend enhancement only - no new frontend request parameters needed

### Configuration Parameters (Hardcoded, Programmer-Modifiable)

- `ROTATION_AXIS`: 3D vector defining rotation axis in ICRF (e.g., [0, 0, 1] for Z-axis)
- `INITIAL_ATTITUDE_FRAME`: Initial orientation of body axes (e.g., aligned with ICRF)
- `ATTITUDE_SAMPLE_COUNT`: Number of attitude samples per day (10-15)
- `BODY_AXIS_COLORS`: RGB colors for X, Y, Z body axes

## Current Backend Architecture Analysis

### Existing Structure

**File: `godot-backend/src/main.py`**
- FastAPI application
- Primary endpoint: `POST /trajectory/from-tle`
- Receives TLE lines + time_interval
- Returns `TrajectoryResponse` model

**File: `godot-backend/src/trajectory_service.py`**
- Core function: `generate_trajectory(time_interval, universe_file, trajectory_file)`
- Uses GODOT library for trajectory propagation
- Returns dictionary with trajectory points

**File: `godot-backend/src/models.py`**
- `TrajectoryPoint`: Contains cartesian, spherical, epoch, mjd
- `TrajectoryResponse`: Contains points list + metadata

**Current Response Structure:**
```python
{
    "points": [TrajectoryPoint, ...],
    "start_time": str,
    "end_time": str,
    "point_count": int,
    "status": str,
    "message": Optional[str]
}
```

## Proposed Architecture

### New Data Models

**File: `godot-backend/src/models.py` (additions)**

```python
class Vector3D(BaseModel):
    """3D vector components"""
    x: float
    y: float
    z: float

class AttitudeTimestamp(BaseModel):
    """Attitude vector at a specific timestamp"""
    epoch: str
    mjd: float
    vector: Vector3D

class AttitudeVector(BaseModel):
    """Time series of an attitude vector"""
    label: str                          # e.g., "Body_X_Axis"
    color: List[float]                   # RGB normalized [0-1]
    timestamps: List[AttitudeTimestamp]

class AttitudeData(BaseModel):
    """Complete attitude dataset"""
    vectors: List[AttitudeVector]       # 3 vectors (X, Y, Z body axes)
    rotation_axis: Vector3D              # Axis about which rotation occurs
    total_rotation_degrees: float        # Total rotation (360.0)
    sample_count: int

class TrajectoryResponse(BaseModel):
    """Response containing trajectory data (UPDATED)"""
    points: List[TrajectoryPoint]
    start_time: str
    end_time: str
    point_count: int
    status: str
    message: Optional[str] = None
    attitude: Optional[AttitudeData] = None  # NEW FIELD
```

### New Service Module

**File: `godot-backend/src/attitude_service.py` (NEW FILE)**

This new module will contain all attitude simulation logic.

#### Configuration Constants

```python
# Rotation axis in ICRF coordinates (configurable by programmer)
ROTATION_AXIS = np.array([0.0, 0.0, 1.0])  # Default: rotate about ICRF Z-axis

# Initial body frame orientation (aligned with ICRF by default)
INITIAL_BODY_X = np.array([1.0, 0.0, 0.0])
INITIAL_BODY_Y = np.array([0.0, 1.0, 0.0])
INITIAL_BODY_Z = np.array([0.0, 0.0, 1.0])

# Number of attitude samples per day
ATTITUDE_SAMPLE_COUNT = 12  # 12 samples = every 2 hours

# Visualization color hints (RGB normalized)
BODY_AXIS_COLORS = {
    'X': [1.0, 0.0, 0.0],  # Red
    'Y': [0.0, 1.0, 0.0],  # Green
    'Z': [0.0, 0.0, 1.0],  # Blue
}

# Total rotation per day
ROTATION_PER_DAY_DEGREES = 360.0
```

#### Core Functions

##### 1. `normalize_vector(vec: np.ndarray) -> np.ndarray`
```python
def normalize_vector(vec: np.ndarray) -> np.ndarray:
    """
    Normalize a 3D vector to unit length.
    
    Args:
        vec: 3D numpy array
        
    Returns:
        Normalized unit vector
    """
    # Implementation: vec / ||vec||
```

##### 2. `rotation_matrix_axis_angle(axis: np.ndarray, angle_rad: float) -> np.ndarray`
```python
def rotation_matrix_axis_angle(axis: np.ndarray, angle_rad: float) -> np.ndarray:
    """
    Create a 3x3 rotation matrix for rotation about an arbitrary axis.
    Uses Rodrigues' rotation formula.
    
    Args:
        axis: 3D unit vector defining rotation axis
        angle_rad: Rotation angle in radians
        
    Returns:
        3x3 rotation matrix
        
    Math:
        R = I + sin(θ)K + (1-cos(θ))K²
        where K is the skew-symmetric cross-product matrix of axis
    """
    # Implementation: Rodrigues' formula
```

##### 3. `generate_attitude_time_grid(start_epoch, end_epoch, sample_count: int) -> List`
```python
def generate_attitude_time_grid(start_epoch, end_epoch, sample_count: int) -> List:
    """
    Generate time grid for attitude samples.
    
    Args:
        start_epoch: GODOT epoch object for start time
        end_epoch: GODOT epoch object for end time
        sample_count: Number of samples to generate
        
    Returns:
        List of GODOT epoch objects evenly spaced in time
        
    Note: Uses GODOT's tempo.EpochRange.createGrid() for consistency
    """
    # Implementation: Create uniform time grid
```

##### 4. `rotate_body_frame(body_x: np.ndarray, body_y: np.ndarray, body_z: np.ndarray, rotation_matrix: np.ndarray) -> Tuple`
```python
def rotate_body_frame(
    body_x: np.ndarray, 
    body_y: np.ndarray, 
    body_z: np.ndarray, 
    rotation_matrix: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Apply rotation matrix to a set of body axes.
    
    Args:
        body_x, body_y, body_z: Current body axis vectors
        rotation_matrix: 3x3 rotation matrix
        
    Returns:
        Tuple of rotated (body_x, body_y, body_z) vectors
        
    Note: Maintains orthonormality if input is orthonormal
    """
    # Implementation: Matrix-vector multiplication for each axis
```

##### 5. `generate_attitude_data(start_epoch, end_epoch) -> AttitudeData`
```python
def generate_attitude_data(start_epoch, end_epoch) -> AttitudeData:
    """
    Generate simulated attitude data for a time interval.
    
    This function simulates a satellite rotating 360° over one day about
    a configured rotation axis. It generates three orthogonal body axes
    (X, Y, Z) and tracks their orientation over time in ICRF coordinates.
    
    Args:
        start_epoch: GODOT epoch object for trajectory start
        end_epoch: GODOT epoch object for trajectory end
        
    Returns:
        AttitudeData object containing time series of 3 body axis vectors
        
    Algorithm:
        1. Normalize rotation axis
        2. Create time grid (ATTITUDE_SAMPLE_COUNT samples)
        3. For each timestamp:
            a. Calculate rotation angle (0° to 360° linearly)
            b. Create rotation matrix
            c. Apply rotation to initial body frame
            d. Store rotated vectors
        4. Package as AttitudeData with metadata
    """
    # Implementation details below
```

**Detailed Algorithm for `generate_attitude_data`:**

```python
def generate_attitude_data(start_epoch, end_epoch) -> AttitudeData:
    # Step 1: Normalize rotation axis
    rotation_axis_norm = normalize_vector(ROTATION_AXIS)
    
    # Step 2: Generate time grid
    time_grid = generate_attitude_time_grid(
        start_epoch, 
        end_epoch, 
        ATTITUDE_SAMPLE_COUNT
    )
    
    # Step 3: Initialize data structures for three body axes
    x_axis_timestamps = []
    y_axis_timestamps = []
    z_axis_timestamps = []
    
    # Step 4: Initial body frame
    current_x = INITIAL_BODY_X.copy()
    current_y = INITIAL_BODY_Y.copy()
    current_z = INITIAL_BODY_Z.copy()
    
    # Step 5: Generate attitude at each timestamp
    total_samples = len(time_grid)
    for i, epoch in enumerate(time_grid):
        # Calculate rotation angle (linear progression)
        progress = i / (total_samples - 1) if total_samples > 1 else 0.0
        angle_degrees = progress * ROTATION_PER_DAY_DEGREES
        angle_rad = np.radians(angle_degrees)
        
        # Create rotation matrix for this timestamp
        rot_matrix = rotation_matrix_axis_angle(rotation_axis_norm, angle_rad)
        
        # Apply rotation to initial body frame
        rotated_x, rotated_y, rotated_z = rotate_body_frame(
            INITIAL_BODY_X, 
            INITIAL_BODY_Y, 
            INITIAL_BODY_Z, 
            rot_matrix
        )
        
        # Create timestamp entries
        x_axis_timestamps.append(AttitudeTimestamp(
            epoch=str(epoch),
            mjd=epoch.mjd(),
            vector=Vector3D(x=rotated_x[0], y=rotated_x[1], z=rotated_x[2])
        ))
        
        y_axis_timestamps.append(AttitudeTimestamp(
            epoch=str(epoch),
            mjd=epoch.mjd(),
            vector=Vector3D(x=rotated_y[0], y=rotated_y[1], z=rotated_y[2])
        ))
        
        z_axis_timestamps.append(AttitudeTimestamp(
            epoch=str(epoch),
            mjd=epoch.mjd(),
            vector=Vector3D(x=rotated_z[0], y=rotated_z[1], z=rotated_z[2])
        ))
    
    # Step 6: Package into AttitudeVector objects
    vectors = [
        AttitudeVector(
            label="Body_X_Axis",
            color=BODY_AXIS_COLORS['X'],
            timestamps=x_axis_timestamps
        ),
        AttitudeVector(
            label="Body_Y_Axis",
            color=BODY_AXIS_COLORS['Y'],
            timestamps=y_axis_timestamps
        ),
        AttitudeVector(
            label="Body_Z_Axis",
            color=BODY_AXIS_COLORS['Z'],
            timestamps=z_axis_timestamps
        )
    ]
    
    # Step 7: Create and return AttitudeData
    return AttitudeData(
        vectors=vectors,
        rotation_axis=Vector3D(
            x=rotation_axis_norm[0],
            y=rotation_axis_norm[1],
            z=rotation_axis_norm[2]
        ),
        total_rotation_degrees=ROTATION_PER_DAY_DEGREES,
        sample_count=ATTITUDE_SAMPLE_COUNT
    )
```

### Integration with Existing Code

**File: `godot-backend/src/trajectory_service.py` (MODIFICATION)**

Modify the `generate_trajectory()` function to also generate attitude data:

```python
def generate_trajectory(time_interval=30, universe_file='./config/universe_stella.yml',
                       trajectory_file='./config/trajectory_temp.yml'):
    """
    Generate trajectory points using GODOT.
    
    MODIFIED: Now also generates attitude data
    
    Args:
        time_interval: Time interval between points in seconds (default: 30 seconds)
        universe_file: Path to the universe configuration file
        trajectory_file: Path to the trajectory configuration file (can be generated from TLE)
    
    Returns:
        Dictionary containing trajectory points, metadata, AND attitude data
    """
    try:
        # ... existing trajectory generation code (unchanged) ...
        
        # AFTER trajectory computation, BEFORE return:
        # Import attitude service
        from .attitude_service import generate_attitude_data
        
        # Generate attitude data using same time range
        attitude_data = generate_attitude_data(start_epoch, end_epoch)
        
        return {
            "points": trajectory_points,
            "start_time": str(start_epoch),
            "end_time": str(end_epoch),
            "point_count": len(trajectory_points),
            "status": "success",
            "attitude": attitude_data  # NEW: Add attitude data
        }
        
    except Exception as e:
        # ... existing fallback code ...
        # For fallback, also generate simple attitude data
        # (could use fallback epochs or None)
        
        return {
            "points": fallback_points,
            "start_time": "Fallback_start",
            "end_time": "Fallback_end",
            "point_count": len(fallback_points),
            "status": "fallback",
            "message": f"Used fallback due to error: {str(e)}",
            "attitude": None  # No attitude in fallback mode
        }
```

**File: `godot-backend/src/main.py` (NO CHANGES NEEDED)**

No modifications required! The endpoint already returns `TrajectoryResponse`, and we're just adding an optional field to that model.

### Dependencies

**File: `godot-backend/requirements.txt`**

Check if `numpy` is already present. If not, add:
```
numpy>=1.21.0
```

All other dependencies (GODOT, FastAPI, Pydantic) are already present.

## Implementation Steps

### Phase 1: Create Data Models (30 min)
1. Open `godot-backend/src/models.py`
2. Add `Vector3D`, `AttitudeTimestamp`, `AttitudeVector`, `AttitudeData` classes
3. Modify `TrajectoryResponse` to include optional `attitude` field
4. Test: Validate models can be instantiated and serialized

### Phase 2: Create Attitude Service (1-2 hours)
1. Create new file `godot-backend/src/attitude_service.py`
2. Add configuration constants at top
3. Implement helper functions:
   - `normalize_vector()`
   - `rotation_matrix_axis_angle()` (Rodrigues formula)
   - `generate_attitude_time_grid()`
   - `rotate_body_frame()`
4. Implement main function:
   - `generate_attitude_data()`
5. Test: Create unit tests for rotation math

### Phase 3: Integrate with Trajectory Service (30 min)
1. Open `godot-backend/src/trajectory_service.py`
2. Import `generate_attitude_data` from attitude_service
3. Add attitude generation call after trajectory computation
4. Add attitude data to return dictionary
5. Handle fallback case (set attitude to None)
6. Test: Verify trajectory endpoint still works

### Phase 4: Testing & Validation (1 hour)
1. Start backend server
2. Send TLE request to `/trajectory/from-tle`
3. Verify response includes `attitude` field
4. Validate JSON structure matches specification
5. Verify vectors remain orthogonal across all timestamps
6. Check rotation progresses from 0° to 360°
7. Test with different `ROTATION_AXIS` values
8. Test with different `ATTITUDE_SAMPLE_COUNT` values

## Example Output Structure

```json
{
  "points": [
    {
      "epoch": "2024-11-10T00:00:00.000",
      "cartesian": {"x": 6800.0, "y": 0.0, "z": 0.0},
      "spherical": {"longitude": 0.0, "latitude": 0.0},
      "mjd": 60258.0
    },
    // ... more trajectory points ...
  ],
  "start_time": "2024-11-10T00:00:00.000",
  "end_time": "2024-11-11T00:00:00.000",
  "point_count": 2880,
  "status": "success",
  "attitude": {
    "vectors": [
      {
        "label": "Body_X_Axis",
        "color": [1.0, 0.0, 0.0],
        "timestamps": [
          {
            "epoch": "2024-11-10T00:00:00.000",
            "mjd": 60258.0,
            "vector": {"x": 1.0, "y": 0.0, "z": 0.0}
          },
          {
            "epoch": "2024-11-10T02:00:00.000",
            "mjd": 60258.083333,
            "vector": {"x": 0.9659, "y": 0.2588, "z": 0.0}
          },
          // ... 10 more timestamps ...
        ]
      },
      {
        "label": "Body_Y_Axis",
        "color": [0.0, 1.0, 0.0],
        "timestamps": [
          {
            "epoch": "2024-11-10T00:00:00.000",
            "mjd": 60258.0,
            "vector": {"x": 0.0, "y": 1.0, "z": 0.0}
          },
          {
            "epoch": "2024-11-10T02:00:00.000",
            "mjd": 60258.083333,
            "vector": {"x": -0.2588, "y": 0.9659, "z": 0.0}
          },
          // ... 10 more timestamps ...
        ]
      },
      {
        "label": "Body_Z_Axis",
        "color": [0.0, 0.0, 1.0],
        "timestamps": [
          {
            "epoch": "2024-11-10T00:00:00.000",
            "mjd": 60258.0,
            "vector": {"x": 0.0, "y": 0.0, "z": 1.0}
          },
          {
            "epoch": "2024-11-10T02:00:00.000",
            "mjd": 60258.083333,
            "vector": {"x": 0.0, "y": 0.0, "z": 1.0}
          },
          // ... 10 more timestamps (unchanged for Z-axis rotation) ...
        ]
      }
    ],
    "rotation_axis": {"x": 0.0, "y": 0.0, "z": 1.0},
    "total_rotation_degrees": 360.0,
    "sample_count": 12
  }
}
```

## Configuration Scenarios

### Scenario 1: Rotation about ICRF Z-axis (Default)
```python
ROTATION_AXIS = np.array([0.0, 0.0, 1.0])
```
- Body X and Y axes rotate in XY plane
- Body Z axis remains fixed along ICRF Z
- Simulates satellite spinning like a top

### Scenario 2: Rotation about ICRF X-axis
```python
ROTATION_AXIS = np.array([1.0, 0.0, 0.0])
```
- Body Y and Z axes rotate in YZ plane
- Body X axis remains fixed along ICRF X
- Simulates satellite tumbling end-over-end

### Scenario 3: Rotation about arbitrary axis
```python
ROTATION_AXIS = np.array([1.0, 1.0, 1.0])  # Will be normalized
```
- All three body axes change over time
- More complex rotation pattern
- Simulates satellite with off-axis rotation

### Scenario 4: Different sample rate
```python
ATTITUDE_SAMPLE_COUNT = 24  # One per hour
```
- Higher temporal resolution
- More data for smoother visualization

## Mathematical Notes

### Rodrigues' Rotation Formula

For a unit axis **k** and angle θ, the rotation matrix is:

**R** = **I** + sin(θ)**K** + (1 - cos(θ))**K**²

Where **K** is the skew-symmetric matrix:

```
K = [  0   -kz   ky ]
    [  kz   0   -kx ]
    [ -ky   kx   0  ]
```

### Orthonormality Preservation

Rotation matrices are orthonormal: **R**ᵀ**R** = **I**

Therefore, if initial body axes are orthonormal, rotated axes remain orthonormal.

Verification test:
- ||**x**|| = ||**y**|| = ||**z**|| = 1 (unit vectors)
- **x** · **y** = **x** · **z** = **y** · **z** = 0 (orthogonal)

## Files Summary

### New Files
1. ✨ `godot-backend/src/attitude_service.py` - Complete attitude simulation logic (200-250 lines)

### Modified Files
1. ✏️ `godot-backend/src/models.py` - Add 4 new data models, modify TrajectoryResponse (~40 lines added)
2. ✏️ `godot-backend/src/trajectory_service.py` - Add attitude generation call (~10 lines added)

### Unchanged Files
1. ✅ `godot-backend/src/main.py` - No changes (automatically uses updated TrajectoryResponse)
2. ✅ `godot-backend/src/tle_utils.py` - No changes
3. ✅ `godot-backend/src/server.py` - No changes

### Dependencies
1. ✅ `numpy` - Already in requirements.txt (check and add if missing)

## API Contract Compatibility

### Backward Compatibility: ✅ MAINTAINED

**Existing frontend code will continue to work** because:
1. No changes to API endpoints
2. No changes to request parameters
3. Response structure is **extended**, not changed
4. New `attitude` field is **optional** in Pydantic model
5. Frontend can ignore `attitude` field until ready to process it

**Frontend can migrate gradually:**
```typescript
// Old code (still works)
const points = response.points;

// New code (when ready)
if (response.attitude) {
  const attitudeVectors = response.attitude.vectors;
  // Process attitude data
}
```

## Testing Strategy

### Unit Tests (attitude_service.py)

```python
def test_normalize_vector():
    """Test vector normalization"""
    vec = np.array([3.0, 4.0, 0.0])
    normalized = normalize_vector(vec)
    assert np.isclose(np.linalg.norm(normalized), 1.0)

def test_rotation_matrix_identity():
    """Test rotation by 0° gives identity matrix"""
    axis = np.array([0, 0, 1])
    R = rotation_matrix_axis_angle(axis, 0.0)
    assert np.allclose(R, np.eye(3))

def test_rotation_matrix_90deg():
    """Test rotation by 90° about Z-axis"""
    axis = np.array([0, 0, 1])
    R = rotation_matrix_axis_angle(axis, np.pi/2)
    # X should map to Y, Y to -X, Z to Z
    x = np.array([1, 0, 0])
    rotated_x = R @ x
    assert np.allclose(rotated_x, [0, 1, 0])

def test_orthonormality_preservation():
    """Test that rotation preserves orthonormality"""
    axis = np.array([1, 1, 1])
    axis = axis / np.linalg.norm(axis)
    
    for angle in [0, np.pi/4, np.pi/2, np.pi]:
        R = rotation_matrix_axis_angle(axis, angle)
        x, y, z = rotate_body_frame([1,0,0], [0,1,0], [0,0,1], R)
        
        # Check unit vectors
        assert np.isclose(np.linalg.norm(x), 1.0)
        assert np.isclose(np.linalg.norm(y), 1.0)
        assert np.isclose(np.linalg.norm(z), 1.0)
        
        # Check orthogonality
        assert np.isclose(np.dot(x, y), 0.0)
        assert np.isclose(np.dot(x, z), 0.0)
        assert np.isclose(np.dot(y, z), 0.0)
```

### Integration Tests

```python
def test_attitude_data_structure():
    """Test that generate_attitude_data returns correct structure"""
    # Mock epochs
    start = ...  # Create mock GODOT epoch
    end = ...    # Create mock GODOT epoch
    
    attitude = generate_attitude_data(start, end)
    
    assert len(attitude.vectors) == 3
    assert attitude.vectors[0].label == "Body_X_Axis"
    assert len(attitude.vectors[0].timestamps) == ATTITUDE_SAMPLE_COUNT

def test_full_rotation():
    """Test that rotation progresses correctly over time"""
    attitude = generate_attitude_data(start_epoch, end_epoch)
    
    # First timestamp: initial orientation
    first_x = attitude.vectors[0].timestamps[0].vector
    assert np.isclose(first_x.x, 1.0)
    
    # Last timestamp: should be close to initial (360° rotation)
    last_x = attitude.vectors[0].timestamps[-1].vector
    assert np.isclose(last_x.x, 1.0, atol=0.01)
```

### Manual API Testing

```bash
# Test 1: Basic request
curl -X POST http://localhost:8000/trajectory/from-tle \
  -H "Content-Type: application/json" \
  -d '{
    "tle_line1": "1 25544U 98067A   24310.50000000  .00016717  00000-0  10270-3 0  9005",
    "tle_line2": "2 25544  51.6400 247.4627 0001234 230.5678 129.4321 15.54225995123456"
  }'

# Verify response contains attitude field
# Verify attitude.vectors has 3 elements
# Verify each vector has 12 timestamps (or configured count)
```

## Performance Considerations

### Computational Complexity

**Attitude generation overhead:**
- O(n) where n = ATTITUDE_SAMPLE_COUNT (typically 10-15)
- Each iteration: One matrix multiplication (O(1) for 3x3)
- **Negligible compared to trajectory propagation**

**Memory overhead:**
- 3 vectors × 12 timestamps × ~100 bytes/timestamp ≈ 3.6 KB
- **Negligible compared to trajectory data** (typically 2880 points × ~200 bytes ≈ 576 KB)

**Expected impact:**
- Backend response time: +1-5 ms (< 1% increase)
- Response size: +3-4 KB (< 1% increase)

### Optimization Opportunities (If Needed)

If performance becomes an issue:
1. Cache rotation matrices (if using same angles repeatedly)
2. Reduce ATTITUDE_SAMPLE_COUNT
3. Lazy computation (generate on separate endpoint)

**Recommendation:** Implement straightforward solution first, optimize only if profiling shows issues.

## Future Enhancements (Out of Scope)

Potential future features (not in this implementation):

1. **Real attitude data**: Replace simulation with actual attitude propagation from GODOT
2. **Configurable rotation rate**: Allow different rotation periods (not just 24 hours)
3. **Multiple rotation modes**: Tumbling, sun-pointing, nadir-pointing, etc.
4. **Quaternion output**: Alternative to direction vectors
5. **Separate endpoint**: `/attitude` endpoint for standalone attitude queries
6. **User-configurable axis**: API parameter for rotation axis (not hardcoded)

## Success Criteria

✅ **Implementation is successful when:**

1. ✅ Backend returns valid JSON with `attitude` field
2. ✅ Attitude data contains exactly 3 vectors (Body X, Y, Z)
3. ✅ Each vector has ATTITUDE_SAMPLE_COUNT timestamps
4. ✅ Timestamps span the same time range as trajectory
5. ✅ Vectors remain orthonormal at all timestamps
6. ✅ Rotation progresses smoothly from 0° to 360°
7. ✅ ROTATION_AXIS is easily modifiable in code
8. ✅ Existing API functionality unchanged
9. ✅ No new frontend request parameters required
10. ✅ Backend tests pass

## Risk Assessment

### Low Risks ✅

1. **API compatibility**: Optional field preserves backward compatibility
2. **Performance**: Minimal computational overhead
3. **Dependencies**: Only numpy (already used)
4. **Testing**: Straightforward unit tests for rotation math

### Medium Risks ⚠️

1. **GODOT epoch handling**: Need to ensure time grid creation works correctly
   - **Mitigation**: Reuse existing `tempo.EpochRange.createGrid()` pattern
2. **Rotation math bugs**: Rodrigues formula implementation errors
   - **Mitigation**: Comprehensive unit tests with known results

### Zero Risks 🟢

1. **Frontend breaking**: Zero risk - no frontend changes required
2. **Data corruption**: New field, no modification of existing data
3. **Deployment**: No infrastructure changes needed

## Estimated Implementation Time

- **Phase 1** (Models): 30 minutes
- **Phase 2** (Attitude Service): 1-2 hours
- **Phase 3** (Integration): 30 minutes  
- **Phase 4** (Testing): 1 hour
- **Buffer**: 30 minutes

**Total: 3.5-4.5 hours** for complete implementation and testing

## Conclusion

This implementation plan provides:
- ✅ **Minimal backend extension** - single new file + minor modifications
- ✅ **Zero API changes** - no new parameters, optional response field
- ✅ **Configurable simulation** - easily adjustable rotation parameters
- ✅ **Backward compatible** - existing frontend unaffected
- ✅ **Foundation for frontend** - structured data ready for visualization
- ✅ **Testing strategy** - comprehensive validation approach
- ✅ **Low risk** - isolated new functionality

The attitude data will provide the frontend with time-varying orientation vectors, enabling visualization of satellite attitude evolution over time. The simulation is simple but realistic enough for testing frontend visualization systems.

**Ready for implementation approval! 🚀**

---

**Next Steps After Approval:**
1. Implement Phase 1 (Models)
2. Implement Phase 2 (Attitude Service)
3. Implement Phase 3 (Integration)
4. Run Phase 4 (Testing & Validation)
5. Provide frontend team with example response
6. Document configuration parameters for programmer use

