# FOV Celestial Sphere Projection Plan

**Date**: December 15, 2025  
**Status**: Implementation

---

## Overview

Project the satellite's sensor FOV cones onto the celestial sphere to visualize what portion of the sky each sensor is observing. This complements the Earth footprint projection by showing the "looking direction" in space.

---

## Requirements

1. **Projection Target**: Celestial sphere at same radius as RA/Dec grid (100× Earth radius)
2. **Visualization**: 
   - Filled polygon with transparency
   - Outline matching line width of celestial grid (width=1)
   - Colors match sensor colors
   - Transparency for fill area
3. **Toggle**: Single setting to show/hide all FOV celestial projections
4. **Design Philosophy**: No Earth occlusion calculation—user zooms in to satellite to see what's blocked naturally

---

## Technical Approach

### 1. Sphere-Ray Intersection

**Simple Case**: Since the sphere is centered at the satellite position:
```
Given:
  - Ray origin: satellite position
  - Ray direction: cone surface direction
  - Sphere radius: R = Ellipsoid.WGS84.maximumRadius * 100

Intersection point = origin + direction * R
```

No complex ellipsoid math needed—perfect sphere intersection.

### 2. Algorithm

```
For each sensor:
  1. Get sensor orientation (body frame → ECEF)
  2. Compute cone axis (sensor Z-axis)
  3. Find perpendicular vectors for cone parameterization
  4. For angle θ ∈ [0, 2π]:
     - Compute direction on cone surface at angle θ
     - Ray origin = satellite position
     - Ray direction = cone surface direction
     - Intersection = origin + direction * celestialRadius
     - Store point
  5. Close the loop (first point = last point)
  6. Return polygon
```

### 3. Rendering

**Cesium Entity Structure**:
```tsx
<Entity key={`sensor-celestial-${sensor.id}`}>
  <PolygonGraphics
    hierarchy={celestialProjectionHierarchy}
    material={sensorColor.withAlpha(0.3)}  // 30% transparency for fill
    outline={true}
    outlineColor={sensorColor}
    outlineWidth={1}  // Match celestial grid
    perPositionHeight={true}
  />
</Entity>
```

---

## Implementation Plan

### Phase 1: Projection Calculation

**File**: `src/utils/projections.ts`

**New Function**:
```typescript
export function computeFOVCelestialProjection(
  position: Cartesian3,
  orientation: Quaternion,
  halfAngleDegrees: number,
  celestialRadius: number,
  numSamples = 36
): Cartesian3[]
```

**Steps**:
1. Extract cone axis from sensor orientation
2. Compute perpendicular vectors
3. Sample cone surface at `numSamples` angles
4. Project each ray to sphere (simple scalar multiplication)
5. Return closed loop of Cartesian3 points

### Phase 2: Component Integration

**File**: `src/components/SatelliteVisualizer.tsx`

**Changes**:
1. Import `computeFOVCelestialProjection`
2. Add rendering loop after Earth FOV footprints
3. Use `CallbackProperty` for dynamic updates (same pattern as Earth footprint)
4. Apply sensor colors with transparency

**Conditional Rendering**:
```tsx
{options.showAttitudeVisualization && 
 options.showCelestialFOV && 
 satelliteAvailability && 
 sensors.map((sensor, idx) => ...)}
```

### Phase 3: Panel Settings

**File**: `src/module.ts`

**New Setting**:
```typescript
.addBooleanSwitch({
  path: 'showCelestialFOV',
  name: '🔭 Show FOV Celestial Projection',
  description: 'Project sensor FOVs onto celestial sphere',
  defaultValue: true,
  category: ['📡 Sensor Visualization'],
})
```

**File**: `src/types.ts`

**Add Property**:
```typescript
export interface SimpleOptions {
  // ... existing options
  showCelestialFOV: boolean;
}
```

---

## Constants & Configuration

### Celestial Sphere Radius
```typescript
const celestialRadius = Ellipsoid.WGS84.maximumRadius * 100;
```
- Same as RA/Dec grid
- Approximately 637,100,000 meters (637,100 km)

### Styling
- **Line Width**: 1 (matches celestial grid)
- **Fill Alpha**: 0.3 (30% transparency)
- **Colors**: Match `SENSOR_COLORS` array

---

## Edge Cases

### 1. **Zero or Negative FOV**
- Validation: Skip rendering if `halfAngleDegrees <= 0`

### 2. **Multiple Overlapping Sensors**
- Transparency naturally handles visual blending
- Distinct colors ensure visibility

### 3. **Satellite Altitude > Celestial Radius**
- Extremely unlikely (satellites at ~400-800 km, sphere at 637,100 km)
- No special handling needed

### 4. **Performance**
- 36 samples × 3 sensors × N time points
- Expected: Negligible impact (simple math, no complex intersections)

---

## Testing Strategy

### Visual Tests
1. **Nadir sensor**: Circle on celestial sphere opposite Earth
2. **Horizon-tangent sensor**: Elliptical projection
3. **Multiple sensors**: Distinct, overlapping projections
4. **Rotation**: Projections rotate with satellite orientation
5. **Zoom in**: Verify Earth naturally occludes parts of projections

### Functional Tests
1. Toggle on/off: `showCelestialFOV` setting
2. Color consistency: Matches sensor cone colors
3. Outline clarity: Width=1 visible against background

---

## Future Enhancements

1. **Earth Horizon Line**: Add dashed line showing where Earth cuts the FOV
2. **Labels**: Display sensor names near projections
3. **Glow Effect**: Optional glow for visibility in dark sky
4. **Individual Toggles**: Per-sensor visibility control

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/utils/projections.ts` | Add `computeFOVCelestialProjection()` |
| `src/components/SatelliteVisualizer.tsx` | Add celestial FOV rendering loop |
| `src/module.ts` | Add `showCelestialFOV` panel setting |
| `src/types.ts` | Add `showCelestialFOV: boolean` to `SimpleOptions` |

---

## Design Decisions

### Why Not Compute Earth Occlusion?
- **User Intent**: Zoomed-in view naturally shows blocking
- **Simplicity**: Avoids complex intersection calculations
- **Performance**: One less computation per frame
- **Visual Clarity**: Transparent projections + Earth geometry = obvious blocking

### Why Transparency?
- Shows overlapping FOVs
- Maintains visibility of celestial grid
- Reduces visual clutter
- Standard for projection visualizations

---

## Implementation Status

- [x] Plan created
- [ ] Add `computeFOVCelestialProjection()` function
- [ ] Update component rendering
- [ ] Add panel setting
- [ ] Update types interface
- [ ] Test with multiple sensors
- [ ] Verify performance

---

## Notes

- Implementation is straightforward (no horizon issues like Earth footprint)
- Reuses existing sensor data parsing
- Consistent with existing visualization patterns
- Minimal code (~50 lines new, ~20 lines modified)

