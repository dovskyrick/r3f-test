# Transparent Sensor Cone Rendering - Implementation Plan

**Date**: December 31, 2025  
**Feature**: Add transparent/solid cone rendering mode as alternative to wireframe grid  
**Status**: 📋 Planning Phase

---

## Overview

Add a per-satellite toggle to switch between two FOV cone rendering modes:
1. **Wireframe/Grid Mode** (current) - Lines only, grid-like structure
2. **Transparent/Solid Mode** (new) - Filled transparent cone with no visible edges

---

## Current Implementation Analysis

### Existing Cone Rendering
**Location**: `src/utils/sensorCone.ts` → `generateConeMesh()`

**Current Approach**:
```typescript
// Creates a cone mesh using polylines in a grid pattern
// Lines form latitude/longitude grid on cone surface
// Result: Wireframe appearance
```

**Current Rendering** (in `SensorVisualizationRenderer`):
- Uses `PolylineGraphics` for each grid line
- Each line is a separate Cesium entity
- Color: From `SENSOR_COLORS` array
- Visibility: Controlled by `options.showSensorCones`

### Key Files
1. `src/utils/sensorCone.ts` - Cone mesh generation
2. `src/components/entities/CesiumEntityRenderers.tsx` - `SensorVisualizationRenderer`
3. `src/types/satelliteTypes.ts` - Satellite data structure
4. `src/components/SatelliteVisualizer.tsx` - Per-satellite settings state

---

## Proposed Implementation

### Phase 1: Data Structure (Storage)

#### Option A: Per-Satellite Setting (Recommended)
Store the render mode in component state alongside existing per-satellite data:

```typescript
// In SatelliteVisualizer.tsx
const [satelliteRenderSettings, setSatelliteRenderSettings] = useState<Map<string, {
  coneRenderMode: 'wireframe' | 'transparent';
  // Future settings go here
}>>(new Map());
```

**Pros**:
- Independent settings per satellite
- Flexible for future expansion
- Easy to reset/default

**Cons**:
- More state management
- Not persisted across reloads (unless we add localStorage)

#### Option B: Global Setting
Single toggle affecting all satellites:

**Pros**:
- Simpler state management
- Consistent visualization

**Cons**:
- Less flexibility
- Users can't compare modes on different satellites

**Recommendation**: Go with **Option A** for maximum flexibility.

---

### Phase 2: Rendering Implementation

#### Wireframe Mode (Current - No Changes Needed)
```typescript
// Keep existing PolylineGraphics rendering
{options.showSensorCones && coneRenderMode === 'wireframe' && (
  // Existing polyline rendering code
)}
```

#### Transparent Mode (New)
Two possible approaches:

##### Approach 1: PolygonGraphics (Simpler, Recommended)
Use Cesium's `PolygonGraphics` with `PolygonHierarchy` to create a filled cone:

```typescript
import { PolygonGraphics, PolygonHierarchy } from 'resium';
import { Cartesian3, Color } from 'cesium';

// Generate cone surface as triangular mesh
const conePolygons = generateConeSolidMesh(
  satellitePos,
  sensorAxis,
  fovAngle,
  numSegments = 32  // More segments = smoother cone
);

// Render as transparent polygon
<PolygonGraphics
  hierarchy={new PolygonHierarchy(conePolygons)}
  material={Color.fromCssColorString(sensorColor).withAlpha(0.3)}
  outline={false}  // Hide edges for smooth appearance
  perPositionHeight={true}
/>
```

**Pros**:
- Native Cesium support
- Good performance
- Easy to control transparency

**Cons**:
- Need to generate different mesh structure
- May not look perfect at all angles

##### Approach 2: Custom Primitive with Material (More Complex)
Create a custom Cesium primitive with a transparent material:

```typescript
import { Primitive, Material } from 'cesium';

// Use Cesium's Primitive API for custom geometry
const conePrimitive = new Primitive({
  geometryInstances: new GeometryInstance({
    geometry: new CylinderGeometry({
      // Convert cone to cylinder geometry
      topRadius: 0,
      bottomRadius: Math.tan(fovAngle) * coneLength,
      length: coneLength,
      slices: 32
    })
  }),
  appearance: new MaterialAppearance({
    material: Material.fromType('Color', {
      color: sensorColor.withAlpha(0.3)
    }),
    translucent: true,
    closed: false
  })
});
```

**Pros**:
- More control over appearance
- Better performance for many cones
- Smoother rendering

**Cons**:
- More complex code
- Harder to integrate with Resium's React paradigm
- Need to manage primitive lifecycle

**Recommendation**: Start with **Approach 1 (PolygonGraphics)** for simplicity.

---

### Phase 3: Utility Function

Create a new utility function in `src/utils/sensorCone.ts`:

```typescript
/**
 * Generate a solid cone mesh for transparent rendering
 * 
 * @param origin - Cone apex (satellite position)
 * @param axis - Cone axis direction (sensor pointing)
 * @param halfAngle - Half-angle FOV in radians
 * @param length - Cone length (meters)
 * @param segments - Number of circular segments (default: 32)
 * @returns Array of Cartesian3 points forming cone surface
 */
export function generateSolidConeMesh(
  origin: Cartesian3,
  axis: Cartesian3,
  halfAngle: number,
  length: number,
  segments: number = 32
): Cartesian3[] {
  const points: Cartesian3[] = [];
  
  // Add apex
  points.push(origin);
  
  // Generate base circle
  const baseRadius = length * Math.tan(halfAngle);
  const baseCenter = Cartesian3.add(
    origin,
    Cartesian3.multiplyByScalar(axis, length, new Cartesian3()),
    new Cartesian3()
  );
  
  // Create perpendicular vectors for base circle
  const perpA = Cartesian3.cross(axis, Cartesian3.UNIT_Z, new Cartesian3());
  if (Cartesian3.magnitude(perpA) < 0.001) {
    Cartesian3.cross(axis, Cartesian3.UNIT_X, perpA);
  }
  Cartesian3.normalize(perpA, perpA);
  
  const perpB = Cartesian3.cross(axis, perpA, new Cartesian3());
  Cartesian3.normalize(perpB, perpB);
  
  // Generate points around base circle
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const point = Cartesian3.add(
      baseCenter,
      Cartesian3.add(
        Cartesian3.multiplyByScalar(perpA, baseRadius * cos, new Cartesian3()),
        Cartesian3.multiplyByScalar(perpB, baseRadius * sin, new Cartesian3()),
        new Cartesian3()
      ),
      new Cartesian3()
    );
    
    points.push(point);
  }
  
  return points;
}

/**
 * Convert solid cone mesh to PolygonHierarchy for rendering
 */
export function coneToPolygonHierarchy(
  coneMesh: Cartesian3[]
): PolygonHierarchy[] {
  const hierarchies: PolygonHierarchy[] = [];
  const apex = coneMesh[0];
  
  // Create triangular faces from apex to each base segment
  for (let i = 1; i < coneMesh.length - 1; i++) {
    hierarchies.push(new PolygonHierarchy([
      apex,
      coneMesh[i],
      coneMesh[i + 1]
    ]));
  }
  
  return hierarchies;
}
```

---

### Phase 4: Integration into Renderer

Update `SensorVisualizationRenderer` in `CesiumEntityRenderers.tsx`:

```typescript
export interface SensorVisualizationProps {
  // ... existing props ...
  renderMode?: 'wireframe' | 'transparent'; // Add this
}

export const SensorVisualizationRenderer: React.FC<SensorVisualizationProps> = ({
  satellite,
  sensor,
  options,
  isTracked,
  viewerRef,
  sensorIndex,
  renderMode = 'wireframe'  // Default to current behavior
}) => {
  // ... existing setup ...
  
  // Wireframe rendering (existing code)
  {options.showSensorCones && renderMode === 'wireframe' && (
    <>
      {lines.map((line, idx) => (
        <PolylineGraphics
          key={`cone-line-${idx}`}
          positions={line}
          width={2}
          material={new Color(...sensorColor)}
        />
      ))}
    </>
  )}
  
  // Transparent rendering (new code)
  {options.showSensorCones && renderMode === 'transparent' && (
    <>
      {(() => {
        const solidMesh = generateSolidConeMesh(
          sensorPosition,
          sensorAxis,
          sensor.fov * (Math.PI / 180),
          coneLength,
          32  // Segments
        );
        const polygons = coneToPolygonHierarchy(solidMesh);
        
        return polygons.map((hierarchy, idx) => (
          <Entity key={`cone-solid-${idx}`}>
            <PolygonGraphics
              hierarchy={hierarchy}
              material={sensorColor.withAlpha(0.3)}
              outline={false}
              perPositionHeight={true}
            />
          </Entity>
        ));
      })()}
    </>
  )}
};
```

---

### Phase 5: UI Integration

#### Settings Modal (Already Being Added)
```typescript
// In SatelliteVisualizer.tsx modal rendering
<div className={styles.settingRow}>
  <label>
    <input
      type="checkbox"
      checked={satelliteRenderSettings.get(selectedSatelliteForSettings)?.coneRenderMode === 'transparent'}
      onChange={(e) => {
        const newSettings = new Map(satelliteRenderSettings);
        newSettings.set(selectedSatelliteForSettings!, {
          ...newSettings.get(selectedSatelliteForSettings!),
          coneRenderMode: e.target.checked ? 'transparent' : 'wireframe'
        });
        setSatelliteRenderSettings(newSettings);
      }}
    />
    Transparent Sensor Cones
  </label>
  <span className={styles.settingDescription}>
    Show filled transparent cones instead of wireframe
  </span>
</div>
```

#### Passing to Renderer
```typescript
// In SatelliteVisualizer.tsx where sensors are rendered
{satellite.sensors.map((sensor, idx) => (
  <SensorVisualizationRenderer
    key={`${satellite.id}-sensor-${sensor.id}`}
    satellite={satellite}
    sensor={sensor}
    options={options}
    isTracked={isThisSatelliteTracked}
    viewerRef={viewerRef}
    sensorIndex={idx}
    renderMode={satelliteRenderSettings.get(satellite.id)?.coneRenderMode || 'wireframe'}
  />
))}
```

---

## Performance Considerations

### Wireframe Mode (Current)
- **Entities**: 10-20 polylines per cone (depending on grid density)
- **Performance**: Good for 1-10 satellites
- **Memory**: Low

### Transparent Mode (Proposed)
- **Entities**: 32-64 polygons per cone (depending on segments)
- **Performance**: Slightly heavier due to transparency sorting
- **Memory**: Moderate

### Optimization Strategies
1. **LOD (Level of Detail)**: Reduce polygon count when camera is far
2. **Culling**: Don't render cones for hidden satellites
3. **Batching**: Combine multiple polygons into single primitive (advanced)
4. **Memoization**: Cache mesh generation in useMemo

---

## Alternative Visual Designs

### Option 1: Gradient Transparency
Make cone more transparent at edges, more opaque at center:
```typescript
material: new Material({
  fabric: {
    type: 'Gradient',
    uniforms: {
      color1: sensorColor.withAlpha(0.1),
      color2: sensorColor.withAlpha(0.5)
    }
  }
})
```

### Option 2: Animated Pulse
Pulse transparency to draw attention:
```typescript
const alpha = 0.3 + 0.2 * Math.sin(JulianDate.secondsDifference(clock, epoch));
material: sensorColor.withAlpha(alpha)
```

### Option 3: Outline + Fill
Show both edges and fill:
```typescript
<PolygonGraphics
  hierarchy={hierarchy}
  material={sensorColor.withAlpha(0.2)}
  outline={true}
  outlineColor={sensorColor}
  outlineWidth={2}
/>
```

---

## Testing Strategy

### Visual Testing Checklist
- [ ] Cone appears at correct position
- [ ] Cone orientation matches sensor pointing
- [ ] Cone half-angle matches FOV setting
- [ ] Transparency level is appropriate (visible but not obstructive)
- [ ] No z-fighting with other transparent objects
- [ ] Smooth rendering at all camera angles
- [ ] Toggle switches between modes correctly
- [ ] Multiple satellites with different modes work

### Performance Testing
- [ ] Measure FPS with 3 satellites, wireframe mode
- [ ] Measure FPS with 3 satellites, transparent mode
- [ ] Measure FPS with 14 satellites, transparent mode
- [ ] Check memory usage increase
- [ ] Verify no memory leaks on mode switching

---

## Future Enhancements

1. **Hybrid Mode**: Show both wireframe and transparent
2. **Color Customization**: Per-sensor color picker
3. **Transparency Slider**: User-adjustable alpha value
4. **Texture Mapping**: Apply patterns or gradients to cone surface
5. **Animation Effects**: Scanning beam, pulsing edges, etc.

---

## Implementation Timeline

### Phase 1: Core Rendering (Est. 2-3 hours)
- [ ] Create `generateSolidConeMesh()` utility
- [ ] Create `coneToPolygonHierarchy()` helper
- [ ] Add transparent rendering to `SensorVisualizationRenderer`
- [ ] Test with single satellite

### Phase 2: State Management (Est. 1 hour)
- [ ] Add `satelliteRenderSettings` state
- [ ] Wire up settings to renderer props
- [ ] Implement mode switching

### Phase 3: Polish & Optimization (Est. 1-2 hours)
- [ ] Adjust transparency/color for best visibility
- [ ] Add LOD if needed
- [ ] Performance testing
- [ ] Bug fixes

**Total Estimate**: 4-6 hours

---

## Technical Challenges

### Challenge 1: Cone Geometry Accuracy
- **Issue**: Cone must account for Earth curvature for long ranges
- **Solution**: Use geodetic calculations for base circle points

### Challenge 2: Transparency Sorting
- **Issue**: Cesium may not sort transparent objects correctly
- **Solution**: Use `depthFailMaterial` or adjust render order

### Challenge 3: Performance with Many Cones
- **Issue**: 14 satellites × 3 sensors × 64 polygons = 2,688 entities
- **Solution**: Implement culling and LOD

### Challenge 4: Smooth Base Circle
- **Issue**: Too few segments = jagged cone
- **Solution**: Use 32-64 segments, with LOD reduction at distance

---

## Decision: Recommended Approach

**For Initial Implementation**:
1. Use **PolygonGraphics** approach (simpler)
2. Use **32 segments** for smooth appearance
3. Use **alpha = 0.3** for transparency
4. **No outline** by default (can add as third mode later)
5. Store as **per-satellite setting** in component state

**Rationale**: This gives the quickest path to a working feature with good visual quality and room for future enhancement.

---

## Status: Ready for Implementation

This plan is complete and ready to proceed once the UI toggle is in place.

**Next Step**: Implement scrollable modal with toggles (being done now), then return to implement transparent rendering.

