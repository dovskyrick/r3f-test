# RA/Dec Grid Labels - Placement & Implementation

**Date:** December 11, 2025  
**Goal:** Add text labels to RA/Dec celestial grid lines for easier navigation  
**Scope:** Explore placement strategies, technical approach, and UX considerations

---

## The Question: Where to Place Labels?

**Current state:**
- RA/Dec grid lines drawn as polylines
- No labels → hard to know which line is which coordinate
- Need labels like "0h RA", "6h RA", "+30° Dec", etc.

**Requirements:**
- ✅ Clearly identify which line corresponds to which coordinate
- ✅ Readable from various viewing angles
- ✅ Don't clutter the view
- ✅ Scale appropriately with zoom level
- ✅ Panel setting to control size

---

## Option 1: Labels at Earth Intersection Points ⭐ (Recommended)

**Concept:** Place labels where grid lines cross the Earth's equator/poles

**For RA lines (meridians):**
- Label at equator intersection (Dec = 0°)
- Text: "0h", "6h", "12h", "18h"
- Position: On the Earth's surface at that RA

**For Dec lines (parallels):**
- Label at a fixed RA (e.g., 0h or current view's center)
- Text: "-60°", "-30°", "0°", "+30°", "+60°"
- Position: On the line at a prominent location

**Pros:**
- ✅ Natural reference point (Earth = origin)
- ✅ Easy to understand (like globe labels)
- ✅ Always visible when Earth is in view
- ✅ Logical placement (celestial coordinates relative to Earth)

**Cons:**
- ⚠️ Can be hidden if Earth blocks view
- ⚠️ Might be too close together when zoomed out
- ⚠️ Need to handle pole singularities

**Visual:**
```
        +90° Dec (North Pole)
            |
    18h --- Earth --- 6h
            |
            0h (Equator, label here)
            |
        -90° Dec (South Pole)
```

---

## Option 2: Labels at Fixed Distance from Earth

**Concept:** Place labels at a consistent radial distance (e.g., 50x Earth radius)

**For RA lines:**
- Label at Dec = 0°, at fixed distance
- Always at same distance regardless of zoom

**For Dec lines:**
- Label at RA = 0h, at fixed distance

**Pros:**
- ✅ Never obscured by Earth
- ✅ Consistent placement
- ✅ Simple math (radial offset)

**Cons:**
- ⚠️ Can be far from lines when zoomed in
- ⚠️ Might feel disconnected from grid
- ⚠️ Fixed distance might not work for all zoom levels

---

## Option 3: Labels Follow Camera View

**Concept:** Place labels where grid lines enter the camera's viewport

**Implementation:**
- Calculate intersection of grid line with viewport edge
- Place label at intersection
- Update position as camera moves

**Pros:**
- ✅ Always visible (at screen edge)
- ✅ Never obscured
- ✅ Familiar pattern (like axis labels in 2D plots)

**Cons:**
- ❌ Complex calculation (viewport edge intersection)
- ❌ Labels jump around as camera moves (jarring UX)
- ❌ Expensive to recalculate every frame
- ⚠️ Can be confusing (labels not on the actual line position)

---

## Option 4: Multiple Labels per Line

**Concept:** Place labels at regular intervals along each line

**For RA lines:**
- Labels at Dec = -60°, 0°, +60° (multiple per line)
- Text shows the RA coordinate

**For Dec lines:**
- Labels at RA = 0h, 6h, 12h, 18h (multiple per line)
- Text shows the Dec coordinate

**Pros:**
- ✅ Always see a label from any angle
- ✅ Grid is well-annotated
- ✅ No ambiguity about which line is which

**Cons:**
- ❌ Too cluttered (many labels)
- ❌ Performance hit (lots of text entities)
- ⚠️ Might overwhelm the view

---

## Recommended Approach: Hybrid Strategy

**Combine Option 1 + Option 2 with smart placement:**

### For RA Lines (Meridians):
```
Place label at:
- Dec = 0° (equator crossing)
- Distance = 1.05 × Earth radius (just above surface)
- Or if Earth blocks: place at 50 × Earth radius

Text: "0h", "1h", "2h", ... "23h"
```

### For Dec Lines (Parallels):
```
Place label at:
- RA = 0h (prime meridian equivalent)
- Distance = 1.05 × Earth radius (just above surface)
- Or if blocked: place at 50 × Earth radius

Text: "-75°", "-60°", "-45°", ... "+75°"
Special: "Celestial Equator" for 0°
```

### Label Orientation:
```
Always face camera (billboard)
Use Cesium's LabelGraphics with:
- horizontalOrigin: CENTER
- verticalOrigin: BOTTOM
- pixelOffset to avoid overlapping line
```

---

## Technical Implementation

### 1. Calculate Label Positions

```typescript
// For RA line at raHours
const raRad = CesiumMath.toRadians(raHours * 15);
const decRad = 0; // Equator
const radius = earthRadius * 1.05; // Just above surface

const labelPos = new Cartesian3(
  radius * Math.cos(decRad) * Math.cos(raRad),
  radius * Math.cos(decRad) * Math.sin(raRad),
  radius * Math.sin(decRad)
);

// Transform from ICRF to ECEF
const labelPosECEF = transformIcrfToEcef(labelPos, time);
```

### 2. Create Label Entities

```typescript
<Entity position={labelPosECEF}>
  <LabelGraphics
    text="6h"
    font={`${options.gridLabelSize}px sans-serif`}
    fillColor={Color.WHITE}
    outlineColor={Color.BLACK}
    outlineWidth={2}
    style={LabelStyle.FILL_AND_OUTLINE}
    pixelOffset={new Cartesian2(0, -10)} // Offset above line
    horizontalOrigin={HorizontalOrigin.CENTER}
    verticalOrigin={VerticalOrigin.BOTTOM}
    disableDepthTestDistance={Number.POSITIVE_INFINITY} // Always visible
  />
</Entity>
```

### 3. Add Panel Settings

```typescript
// types.ts
gridLabelSize: number; // Font size in pixels

// module.ts
.addNumberInput({
  path: 'gridLabelSize',
  name: 'Grid Label Size',
  description: 'Font size for RA/Dec grid labels (px)',
  defaultValue: 14,
  settings: {
    min: 8,
    max: 32,
    step: 2,
  },
})

.addBooleanSwitch({
  path: 'showGridLabels',
  name: 'Show Grid Labels',
  description: 'Display coordinate labels on RA/Dec grid lines',
  defaultValue: true,
})
```

---

## Label Content Recommendations

### RA Labels (Right Ascension):
```
Format: "Xh" where X = 0-23
Examples: "0h", "6h", "12h", "18h"

Optional verbose mode:
"0h RA", "6h RA", etc.
```

### Dec Labels (Declination):
```
Format: "±XX°" 
Examples: "+60°", "+30°", "0°", "-30°", "-60°"

Optional verbose mode:
"+60° Dec", "-30° Dec"

Special cases:
- 0° → "Celestial Equator" (optional)
- +90° → "North Celestial Pole" (optional)
- -90° → "South Celestial Pole" (optional)
```

---

## UX Considerations

### Label Visibility:
- **Always visible option:** `disableDepthTestDistance: Infinity`
- **Fade with distance:** Adjust alpha based on distance to camera
- **Hide when too small:** Don't render if text would be < 5 pixels

### Clutter Prevention:
- Show labels for every Nth line (e.g., every 2nd or 4th line)
- Adaptive: Show more labels when zoomed in
- Panel setting: "Label Density" (All, Half, Quarter)

### Performance:
- **~24 RA labels + ~12 Dec labels = ~36 labels total**
- Very lightweight (Cesium optimizes billboards)
- Update only when `timestamp` changes (ECI → ECEF transform)

---

## Implementation Plan

### Phase 1: Basic Labels (15 min)
1. Create utility function `generateGridLabels()` in `celestialGrid.ts`
2. Return label positions + text for each RA/Dec line
3. Store in state: `raLabels`, `decLabels`
4. Render with `LabelGraphics` in `SatelliteVisualizer.tsx`

### Phase 2: Panel Settings (10 min)
1. Add `showGridLabels: boolean`
2. Add `gridLabelSize: number`
3. Conditional rendering based on `showGridLabels`

### Phase 3: Polish (10 min)
1. Adjust pixel offset to avoid overlapping lines
2. Add outline for readability
3. Test at various zoom levels
4. Adjust label density if needed

**Total time: ~35 minutes**

---

## Alternative: Minimal Labels Only

**If full labels are too cluttered, consider minimal approach:**

**Label only the primary axes:**
- RA: 0h, 6h, 12h, 18h (4 labels)
- Dec: 0° (Celestial Equator), ±30°, ±60° (5 labels)

**Total: 9 labels** (very clean, minimal clutter)

---

## Final Decision ✅

**Chosen approach: Multiple Labels per Line at Grid Distance (Option 4 + Option 2)**

### Configuration:
- **Distance:** Same as grid (100 × Earth radius)
- **Placement:** Multiple labels per line, sparsely distributed
- **Density:** Every 60° or 90° along each line (user preference)

### For RA Lines (Meridians):
```
Labels at: Dec = -60°, 0°, +60° (3 labels per RA line)
Distance: 100 × Earth radius (same as grid)
Text: "0h", "6h", "12h", "18h"
Total: ~3-4 labels per line × 24 lines = ~72-96 labels
```

### For Dec Lines (Parallels):
```
Labels at: RA = 0h, 90°, 180°, 270° (4 labels per Dec line)
Distance: 100 × Earth radius (same as grid)
Text: "-60°", "-30°", "0°", "+30°", "+60°"
Total: ~4 labels per line × 12 lines = ~48 labels
```

**Total labels: ~120-144 (with sparse placement)**

### Why This Works:

**Pros:**
- ✅ Always visible from any viewing angle
- ✅ Labels integrated with grid (same distance)
- ✅ No occlusion by Earth
- ✅ Sparse placement prevents clutter
- ✅ Consistent depth (all at celestial distance)
- ✅ No complex visibility calculations

**Considerations:**
- 🎛️ Panel setting to control label density
- 🎛️ Panel setting to control font size
- 🎛️ Toggle to show/hide all labels

### Implementation Details:

**Label placement logic:**
```typescript
// For RA line at raHours, place labels at multiple declinations
const labelDeclinations = [-60, 0, 60]; // degrees (sparse)

for (const dec of labelDeclinations) {
  const labelPos = calculatePositionOnGrid(raHours, dec, celestialRadius);
  createLabel(labelPos, `${raHours}h`);
}
```

**Advantages of sparse placement:**
- ~3-4 labels per line instead of every 15°
- Still provides excellent coverage
- Manageable performance (~120 labels total)
- Clean visual appearance

---

## Implementation Complete! ✅

**What was implemented:**

### 1. Label Generation (`celestialGrid.ts`)
- Added `GridLabel` interface (position + text)
- Added `generateRADecGridLabels()` function
- RA labels: 3 per line at Dec = -60°, 0°, +60°
- Dec labels: 4 per line at RA = 0°, 90°, 180°, 270°
- All labels at celestial radius (same as grid)
- Transform from ECI to ECEF

### 2. Panel Settings (`types.ts`, `module.ts`)
- Added `showGridLabels: boolean` (default: true)
- Added `gridLabelSize: number` (default: 14px, range: 8-32px)
- Settings only visible when RA/Dec grid is enabled
- Label size setting only visible when labels are enabled

### 3. Component Integration (`SatelliteVisualizer.tsx`)
- Added `gridLabels` state
- Generate labels in same useEffect as grid lines
- Added imports: `LabelStyle`, `HorizontalOrigin`, `VerticalOrigin`
- Render labels with `LabelGraphics`

### 4. Label Features
- **Billboard behavior:** Always face camera
- **Style:** White text with black outline (highly visible)
- **Positioning:** 10px offset above label position
- **Visibility:** `disableDepthTestDistance: Infinity` (always visible)
- **Font:** Sans-serif, user-configurable size

### Test Checklist:
- [ ] Build succeeds
- [ ] RA/Dec grid with labels enabled by default
- [ ] Labels visible from all angles
- [ ] Labels at correct positions on grid
- [ ] Toggle labels on/off via panel settings
- [ ] Adjust label size (8-32px) via panel settings
- [ ] Labels update when grid spacing changes
- [ ] Performance is acceptable (~120-144 labels)
- [ ] Labels hide behind Earth (depth testing enabled)
- [ ] Color coding works: RA white, Dec light brown

**Implementation time:** ~20 minutes

---

## Color Coding Feature ✅

**Added: December 11, 2025**

**Problem:** Hard to distinguish which labels correspond to RA vs Dec lines, especially at vertices.

**Solution:** Color-coded lines and labels:
- **RA (Right Ascension):** White lines, white labels (meridians)
- **Dec (Declination):** Light brown lines, light brown labels (parallels)

**Color choice:**
- Light brown: `Color.fromBytes(200, 180, 160, 255)` - desaturated tan/beige
- Very low saturation to maintain subtle appearance
- Warm tone distinguishes from cool white

**Implementation:**
- Dec lines: Changed from white to light brown
- Labels: Detect label type by text suffix ('h' for RA, '°' for Dec)
- Apply appropriate color based on label type

**Result:** Clear visual distinction between the two coordinate systems while maintaining aesthetic consistency.

**Ready to build and test!** 🏷️✨

