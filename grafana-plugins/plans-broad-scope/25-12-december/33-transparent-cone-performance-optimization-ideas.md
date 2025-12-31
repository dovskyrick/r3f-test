# Transparent Sensor Cone Performance Optimization Ideas

**Date**: December 31, 2025  
**Status**: 📝 Ideas for Future Implementation  
**Current Status**: Feature implemented with performance warning

---

## Current Implementation Status

✅ **Implemented**: Transparent sensor cone rendering with 24 triangular polygons per cone
✅ **Implemented**: Performance warning dialog when enabling feature
✅ **Implemented**: Per-satellite toggle in settings modal

**Known Issue**: Frame rate drops significantly with transparent mode enabled, especially with multiple satellites/sensors.

---

## Performance Impact Analysis

### Current Cost
- **Entities per cone**: 24 polygon entities (one per triangle)
- **For 3 satellites × 3 sensors**: 216 polygon entities
- **For 14 satellites × 3 sensors**: 1,008 polygon entities

### Why It's Slow
1. **Entity Overhead**: Each React component (Entity) has overhead
2. **CallbackProperty Recalculation**: Each triangle's position recalculates every frame
3. **Transparency Sorting**: Cesium sorts transparent objects for correct rendering (expensive)
4. **Polygon Complexity**: Each polygon requires perPositionHeight calculations
5. **No Batching**: 24 separate draw calls per cone

---

## Future Optimization Ideas

### Option 1: Cesium Primitive API (Recommended)
**Effort**: High (4-6 hours)  
**Performance Gain**: 10-20x faster  
**Complexity**: High

Convert from React components to native Cesium Primitive:

```typescript
import { Primitive, GeometryInstance, PerInstanceColorAppearance } from 'cesium';

// Create geometry once
const geometry = new CylinderGeometry({
  topRadius: 0,
  bottomRadius: baseRadius,
  length: coneLength,
  slices: 24
});

// Create primitive (single draw call for all cones)
const primitive = new Primitive({
  geometryInstances: instances.map(instance => new GeometryInstance({
    geometry: geometry,
    modelMatrix: instance.modelMatrix,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(instance.color)
    }
  })),
  appearance: new PerInstanceColorAppearance({
    translucent: true,
    closed: false
  })
});

viewer.scene.primitives.add(primitive);
```

**Pros**:
- Single draw call for all cones
- No React overhead
- Direct GPU rendering
- Can batch multiple cones

**Cons**:
- Must manage primitive lifecycle manually
- Doesn't integrate cleanly with Resium
- Need to handle updates differently
- More complex code

---

### Option 2: Level of Detail (LOD)
**Effort**: Low (1-2 hours)  
**Performance Gain**: 2-3x faster when zoomed out  
**Complexity**: Low

Reduce polygon count based on camera distance:

```typescript
const getConeSegments = (cameraDistance: number): number => {
  if (cameraDistance > 100000000) return 8;  // Far: 8 segments
  if (cameraDistance > 50000000) return 12;  // Medium: 12 segments
  if (cameraDistance > 10000000) return 16;  // Close: 16 segments
  return 24;                                  // Very close: 24 segments
};
```

**Pros**:
- Simple to implement
- Works with existing code
- Graceful degradation

**Cons**:
- Only helps when zoomed out
- Polygons may "pop" when switching LOD levels

---

### Option 3: Frustum Culling
**Effort**: Low (1 hour)  
**Performance Gain**: Variable (depends on viewport)  
**Complexity**: Low

Don't render cones outside camera view:

```typescript
const isInView = (conePosition: Cartesian3, viewer: Viewer): boolean => {
  const cullingVolume = viewer.camera.frustum.computeCullingVolume(
    viewer.camera.position,
    viewer.camera.direction,
    viewer.camera.up
  );
  
  const boundingSphere = new BoundingSphere(conePosition, coneLength);
  return cullingVolume.computeVisibility(boundingSphere) !== Intersect.OUTSIDE;
};

// In render
{isInView(satellitePosition, viewer) && (
  <TransparentConeRenderer ... />
)}
```

**Pros**:
- Easy to implement
- No visual difference
- Helps with many satellites

**Cons**:
- Bounding sphere calculation overhead
- Only helps with off-screen cones

---

### Option 4: Instanced Geometry
**Effort**: Medium (2-3 hours)  
**Performance Gain**: 5-10x faster  
**Complexity**: Medium

Use Cesium's geometry instancing to render all cones in one draw call:

```typescript
import { GeometryInstance, InstancedGeometry } from 'cesium';

const instances = cones.map(cone => new GeometryInstance({
  geometry: coneGeometry,
  modelMatrix: cone.modelMatrix,
  attributes: {
    color: ColorGeometryInstanceAttribute.fromColor(cone.color)
  }
}));

const instancedGeometry = new InstancedGeometry({
  instances: instances
});
```

**Pros**:
- Much faster than individual entities
- Still relatively clean API
- Good middle ground

**Cons**:
- All cones must share same geometry
- Need to manage instances manually

---

### Option 5: Simplified Single Polygon
**Effort**: Very Low (30 minutes)  
**Performance Gain**: 24x faster per cone  
**Complexity**: Very Low

Instead of 24 triangles, render cone as single polygon with base + apex:

```typescript
export function generateSimpleCone(apex, base, numSegments = 24): Cartesian3[] {
  return [apex, ...baseCirclePoints, baseCirclePoints[0]]; // Single polygon
}
```

**Pros**:
- Minimal code change
- Huge performance improvement
- Simple to understand

**Cons**:
- May not render perfectly from all angles
- Potential z-fighting with base
- Less "solid" appearance

---

### Option 6: Texture-Based Cone
**Effort**: Medium (3-4 hours)  
**Performance Gain**: 20x faster  
**Complexity**: High

Use a semi-transparent texture on a simple mesh:

```typescript
const coneGeometry = new CylinderGeometry({
  topRadius: 0,
  bottomRadius: baseRadius,
  length: coneLength,
  slices: 12 // Fewer needed with texture
});

const material = new Material({
  fabric: {
    type: 'Image',
    uniforms: {
      image: 'cone-gradient.png', // Radial gradient texture
      color: sensorColor
    }
  },
  translucent: true
});
```

**Pros**:
- Beautiful gradients possible
- Very fast rendering
- Can add patterns/effects

**Cons**:
- Need to create/manage textures
- May look wrong from certain angles
- Additional asset management

---

### Option 7: Shader-Based Rendering
**Effort**: Very High (8+ hours)  
**Performance Gain**: 30-50x faster  
**Complexity**: Very High

Write custom GLSL shader for cone rendering:

```glsl
// Vertex shader
attribute vec3 position;
uniform mat4 modelViewProjection;
void main() {
  gl_Position = modelViewProjection * vec4(position, 1.0);
}

// Fragment shader
uniform vec4 coneColor;
varying vec3 v_positionEC;
void main() {
  float alpha = 0.3; // Base transparency
  gl_FragColor = vec4(coneColor.rgb, alpha);
}
```

**Pros**:
- Ultimate performance
- Full control over appearance
- Can add cool effects (fresnel, rim lighting)

**Cons**:
- Very complex to implement
- Hard to maintain
- Need deep Cesium knowledge

---

## Recommended Approach (If Optimization Needed)

### Phase 1: Quick Wins (2-3 hours)
1. **Implement LOD** - Easy, helps immediately
2. **Add Frustum Culling** - Simple, no visual impact
3. **Reduce default segments to 16** - Subtle visual difference

**Expected Result**: 2-3x performance improvement

### Phase 2: Medium Investment (4-6 hours)
1. **Switch to Cesium Primitive API** - Big performance win
2. **Add instancing for multiple cones** - Batch rendering

**Expected Result**: 10-15x performance improvement

### Phase 3: Polish (Optional)
1. **Add texture-based rendering** - Visual improvements
2. **Custom shaders for effects** - Advanced features

---

## Alternative: Hybrid Mode

Offer three modes instead of two:

1. **Wireframe** (current grid mode) - Fast, always available
2. **Semi-Transparent** (new) - Single polygon per cone, 24x faster than current
3. **Fully Transparent** (current) - 24 polygons, best quality, slowest

Let users choose their performance/quality trade-off.

---

## Testing Strategy (If Implementing)

### Performance Benchmarks
- [ ] Measure FPS with 1 satellite, 1 sensor
- [ ] Measure FPS with 3 satellites, 3 sensors each
- [ ] Measure FPS with 14 satellites, 3 sensors each
- [ ] Measure FPS at different camera distances
- [ ] Compare memory usage
- [ ] Test on different hardware (integrated vs. dedicated GPU)

### Visual Quality Checks
- [ ] Verify transparency looks correct
- [ ] Check for z-fighting issues
- [ ] Test from various camera angles
- [ ] Ensure color consistency
- [ ] Verify no flickering

---

## Current Decision: Warning Dialog Only

**Rationale**:
- Feature is functional as-is
- Performance impact is acceptable for intended use
- Warning dialog sets user expectations
- Future optimization can be done if needed
- Focus development time on other features

**User Feedback Needed**:
- Is wireframe mode sufficient for most use cases?
- Is transparent mode worth the performance cost?
- What frame rate is acceptable (30 FPS? 15 FPS? 5 FPS)?

---

## Status: Documented for Future Reference

This document serves as a reference if/when performance optimization becomes a priority. The current implementation with warning dialog is sufficient for the v1.0 release.

**Last Updated**: December 31, 2025

