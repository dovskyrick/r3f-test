# Projection Plans: Vector & Sensor Footprint Visualization

## Research Objective
Investigate Cesium's capabilities for projecting vectors from a satellite onto Earth's surface, and potentially visualizing sensor FOV (Field of View) footprints.

---

## 🔍 My Research Capabilities - Full Disclosure

### What I Can Do:
1. **Web Search**: I can search the internet for current documentation, tutorials, and discussions
2. **Training Knowledge**: My training data includes Cesium documentation up to early 2025
3. **Code Analysis**: I can read local code and documentation files you provide

### Limitations:
1. **Web Search Quality**: The search tool sometimes returns tangential results (as happened today - kept getting quaternion interpolation instead of ray casting)
2. **No Live API Browsing**: I cannot browse live Cesium documentation pages interactively
3. **Knowledge Cutoff**: My training data may not include the latest Cesium features
4. **No Runtime Testing**: I cannot execute code to verify API behavior

### Best Approach:
- Combine my training knowledge with targeted web searches
- You providing documentation files/screenshots helps significantly
- Testing in actual Cesium environment is the definitive source of truth

---

## 🎯 The Goal: Vector Projection onto Earth Surface

### What We Want:
1. **Basic**: Project a single vector (e.g., Z-axis attitude vector) onto Earth's surface
2. **Intermediate**: Show the intersection point as a marker on the globe
3. **Advanced**: Project entire FOV cones and show the footprint polygon on Earth

---

## 📚 Cesium's Built-in Capabilities

### 1. Ray-Ellipsoid Intersection (Core API)

Cesium provides `IntersectionTests` class for geometric calculations:

```javascript
// Create a ray from satellite position in a direction
var ray = new Cesium.Ray(satellitePosition, directionVector);

// Test intersection with Earth's ellipsoid
var intersection = Cesium.IntersectionTests.rayEllipsoid(
  ray, 
  Cesium.Ellipsoid.WGS84
);

if (intersection) {
  // intersection.start = near intersection point
  // intersection.stop = far intersection point (other side of Earth)
  var pointOnSurface = Cesium.Ray.getPoint(ray, intersection.start);
}
```

**Status**: ✅ AVAILABLE - Core Cesium feature
**Use Case**: Single ray projection to find ground point

---

### 2. Globe Picking with Terrain (Scene API)

For projections that respect terrain elevation:

```javascript
// Pick point on globe including terrain
var cartesian = viewer.scene.globe.pick(ray, viewer.scene);

// Or using camera-based picking
var cartesian = viewer.scene.pickPosition(screenPosition);
```

**Status**: ✅ AVAILABLE - But requires scene/viewer context
**Use Case**: More accurate ground point considering terrain

---

### 3. Drawing on the Surface

Once you have ground points, Cesium can visualize them:

#### Single Point (Marker)
```javascript
viewer.entities.add({
  position: groundPoint,
  point: { pixelSize: 10, color: Cesium.Color.RED }
});
```

#### Footprint Polygon
```javascript
viewer.entities.add({
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray([
      lon1, lat1, lon2, lat2, lon3, lat3, ...
    ]),
    material: Cesium.Color.RED.withAlpha(0.5),
    height: 0,  // Clamp to ground
    outline: true,
    outlineColor: Cesium.Color.RED
  }
});
```

**Status**: ✅ AVAILABLE - Standard entity visualization

---

### 4. Ground-Clamped Polylines

For connecting satellite to ground point visually:

```javascript
viewer.entities.add({
  polyline: {
    positions: [satellitePosition, groundPoint],
    width: 2,
    material: Cesium.Color.YELLOW,
    clampToGround: false  // Line through space
  }
});
```

**Status**: ✅ AVAILABLE

---

## 🔶 What Cesium Does NOT Provide Natively

### 1. Sensor Visualization Library

**History**: There was once a `cesium-sensors` library that provided:
- Conic sensors (cone-shaped FOV)
- Rectangular sensors (pyramid-shaped FOV)
- Custom pattern sensors

**Current Status**: ⚠️ DEPRECATED / UNMAINTAINED
- The library was created for older Cesium versions
- May not work with current Cesium (1.100+)
- Would require significant work to resurrect

### 2. Automatic Footprint Calculation

Cesium does NOT automatically:
- Calculate sensor footprints given FOV parameters
- Handle complex sensor geometries
- Account for Earth curvature in footprint calculation

**This must be computed manually** using ray casting and geometry.

---

## 🛠️ Implementation Approaches

### Approach A: Single Vector Projection (EASIEST)

**Goal**: Show where the attitude Z-axis intersects Earth

**Steps**:
1. Get satellite position and orientation at current time
2. Compute direction vector from orientation (rotate Z-axis by quaternion)
3. Create ray from position in that direction
4. Use `IntersectionTests.rayEllipsoid()` to find ground point
5. Draw a point entity at the ground location
6. Optionally draw a line from satellite to ground

**Complexity**: LOW - ~30-40 lines of code
**Dependencies**: None beyond core Cesium

**Pseudocode**:
```javascript
function computeGroundProjection(position, orientation) {
  // Get Z-axis direction in body frame
  const zBody = new Cartesian3(0, 0, 1);
  
  // Rotate by orientation to get direction in ECEF
  const rotMatrix = Matrix3.fromQuaternion(orientation);
  const direction = Matrix3.multiplyByVector(rotMatrix, zBody, new Cartesian3());
  
  // Create ray
  const ray = new Ray(position, direction);
  
  // Find intersection with Earth
  const intersection = IntersectionTests.rayEllipsoid(ray, Ellipsoid.WGS84);
  
  if (intersection) {
    return Ray.getPoint(ray, intersection.start);
  }
  return null;  // Vector doesn't hit Earth (pointing to space)
}
```

---

### Approach B: Cone FOV Footprint (MEDIUM)

**Goal**: Show the circular/elliptical footprint of a conical sensor

**Steps**:
1. Define cone parameters: half-angle, axis direction
2. Generate multiple rays around the cone edge (e.g., 36 rays at 10° intervals)
3. For each ray, find Earth intersection
4. Connect intersection points to form polygon
5. Handle edge cases (cone partially off Earth)

**Complexity**: MEDIUM - ~100-150 lines of code
**Math Required**: Spherical geometry, rotation matrices

**Considerations**:
- More rays = smoother footprint but slower computation
- Need to handle cases where cone doesn't fully intersect Earth
- Dynamic update as satellite moves requires efficient computation

---

### Approach C: Rectangular FOV Footprint (MEDIUM-HARD)

**Goal**: Show the quadrilateral footprint of a rectangular sensor

**Steps**:
1. Define sensor parameters: horizontal FOV, vertical FOV
2. Compute 4 corner rays (corners of the rectangular pyramid)
3. Find Earth intersections for all 4 corners
4. Draw polygon connecting the 4 points
5. Handle partial intersections

**Complexity**: MEDIUM - Similar to cone but simpler math
**Challenge**: Footprint can become distorted/non-rectangular due to Earth curvature

---

### Approach D: Full Sensor Library (HARD)

**Goal**: Comprehensive sensor visualization with access patterns, constraints, etc.

**This would require**:
- Building or adapting a sensor visualization library
- Complex geometry calculations
- Performance optimization for real-time updates
- UI controls for sensor parameters

**Complexity**: HIGH - Significant development effort
**Recommendation**: Only if this is a core feature requirement

---

## 📐 Mathematical Considerations

### Earth Curvature
- For low-orbit satellites, footprints can be significantly distorted
- A "circular" sensor cone creates an elliptical footprint
- Edge cases when sensor partially "sees over the horizon"

### Reference Frames
- Satellite orientation is in ECEF (Earth-Centered, Earth-Fixed)
- Sensor direction must be transformed from body frame to ECEF
- Time-varying as satellite moves

### Performance
- Ray casting is computationally cheap
- Multiple rays (for footprints) scale linearly
- Dynamic updates need CallbackProperty or manual refresh

---

## 🚀 Recommended Development Path

### Phase 1: Single Point Projection (START HERE)
- Project Z-axis vector to ground
- Show intersection point
- Draw line from satellite to ground
- **Validates the basic approach**

### Phase 2: Simple Cone Footprint
- Circular cone with configurable half-angle
- 16-32 rays for smooth polygon
- Static footprint (doesn't update in real-time initially)

### Phase 3: Dynamic Footprint
- Update footprint as satellite moves
- Efficient computation (cache where possible)
- Handle edge cases (no intersection)

### Phase 4: Multiple Sensors/Axes
- Add X and Y axis projections
- Different colors per axis
- Toggle visibility per sensor

### Phase 5: Advanced Sensors (If Needed)
- Rectangular FOV
- Custom sensor shapes
- Sensor pointing constraints

---

## 🔗 Useful Resources

### Cesium Documentation
- `IntersectionTests`: https://cesium.com/learn/cesiumjs/ref-doc/IntersectionTests.html
- `Ray`: https://cesium.com/learn/cesiumjs/ref-doc/Ray.html
- `Ellipsoid`: https://cesium.com/learn/cesiumjs/ref-doc/Ellipsoid.html

### Community Resources
- Cesium Community Forum: https://community.cesium.com/
- GitHub Cesium Issues: https://github.com/CesiumGS/cesium/issues

### Legacy (May Not Work)
- cesium-sensors (old): https://github.com/AnalyticalGraphicsInc/cesium-sensors
- Note: Likely incompatible with modern Cesium

---

## 💡 Key Insights

1. **Cesium provides the building blocks** (ray casting, polygon rendering) but NOT the complete sensor visualization solution

2. **For basic vector projection, this is straightforward** - we can implement this with existing knowledge

3. **For full FOV footprints, we need to write the math** - Cesium won't do it for us

4. **The old cesium-sensors library is deprecated** - we can look at it for inspiration but likely can't use it directly

5. **Performance is manageable** - even with 32 rays per frame, modern systems handle this easily

---

## ✅ Next Steps Recommendation

1. **Start with Approach A** - Single vector projection
2. **Test the basic ray casting** - Confirm it works with our current setup
3. **Then expand** to cone footprints if basic projection works

---

**Document Created**: December 9, 2024
**Purpose**: Research & planning for projection visualization features
**Status**: Ready for Phase 1 implementation when approved

