# Per-Sensor Color Customization - Implementation Plan

**Date**: December 31, 2025  
**Feature**: Allow users to customize sensor colors with export capability  
**Status**: 📋 Planning Phase - Updated with Export & Future DT Integration

---

## Feature Requirements

### User Story
As a user, I want to:
- See default sensor colors from the data JSON
- Customize colors via satellite settings UI
- Have my color choices persist across sessions
- Export the complete configuration (data + colors) as JSON
- Future: Sync color changes with Digital Twin backend

### Complete Workflow
1. Load satellite data (with optional default colors in JSON)
2. Customize colors in satellite settings modal
3. Colors persist via localStorage (browser session)
4. Export complete JSON with current colors
5. Import that JSON in another system → colors are preserved
6. **[Future]** Color changes notify Digital Twin API for storage

---

## Architecture Overview

### Three-Layer Color Priority System

```typescript
Priority 1: User Override (localStorage)
   ↓ (if not found)
Priority 2: Sensor JSON Default (from data)
   ↓ (if not found)
Priority 3: Built-in Defaults (SENSOR_COLORS array)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Changes Color                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Update State   │
                    └─────────────────┘
                              ↓
                 ┌────────────────────────┐
                 │  Save to localStorage  │  ← Session persistence
                 └────────────────────────┘
                              ↓
                 ┌────────────────────────┐
                 │ [Future] Notify DT API │  ← Digital Twin sync
                 └────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ Re-render 3D    │
                    └─────────────────┘
```

---

## Export Functionality Design

### Export Button Location
**In Satellite Settings Modal** - Add export button in modal header

```typescript
┌──────────────────────────────────────────────┐
│ ⚙️ Starlink-4021 Settings    [Export] [✕]  │
├──────────────────────────────────────────────┤
│                                               │
│ ☐ Transparent Sensor Cones                   │
│                                               │
│ ─────── Sensor Colors ──────────             │
│ Main Camera      [🔵] #00FFFF                │
│ ...                                           │
└──────────────────────────────────────────────┘
```

### What Gets Exported

**Complete satellite configuration JSON:**
```json
{
  "satelliteId": "sat-1",
  "satelliteName": "Starlink-4021",
  "exportedAt": "2025-12-31T12:00:00Z",
  "meta": {
    "custom": {
      "sensors": [
        {
          "id": "sensor-1",
          "name": "Main Camera",
          "fov": 15,
          "orientation": { "qx": 0, "qy": 0, "qz": 0, "qw": 1 },
          "color": "#FF0000"  // ← Current color (override or default)
        }
      ]
    }
  },
  "columns": [...],
  "rows": [...]
}
```

### Export Implementation

```typescript
const exportSatelliteConfig = (satellite: ParsedSatellite) => {
  // Merge current colors into sensor definitions
  const enrichedSensors = satellite.sensors.map((sensor, idx) => ({
    ...sensor,
    color: getSensorColor(satellite.id, sensor.id, idx)
  }));
  
  const exportData = {
    satelliteId: satellite.id,
    satelliteName: satellite.name,
    exportedAt: new Date().toISOString(),
    meta: {
      custom: {
        sensors: enrichedSensors
      }
    },
    // Include trajectory data
    columns: originalData.columns,
    rows: originalData.rows
  };
  
  // Create download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${satellite.name.replace(/\s+/g, '-')}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## Future Digital Twin Integration

### Architecture Consideration

**Current** (Phase 1-4):
```typescript
const updateSensorColor = (satId, sensorId, color) => {
  // Update state
  setSensorColors(newColors);
  
  // Save to localStorage
  localStorage.setItem('sensorColors', JSON.stringify(newColors));
  
  // [PLACEHOLDER] Future DT notification will go here
};
```

**Future** (Phase 5+):
```typescript
const updateSensorColor = async (satId, sensorId, color) => {
  // Update state
  setSensorColors(newColors);
  
  // Save to localStorage (immediate feedback)
  localStorage.setItem('sensorColors', JSON.stringify(newColors));
  
  // Notify Digital Twin API
  try {
    await digitalTwinAPI.updateSensorColor({
      satelliteId: satId,
      sensorId: sensorId,
      color: color,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('DT sync failed, using local storage only', error);
  }
};
```

### DT Integration Points (Future)

**Where DT integration will be added:**
1. **Color Change** → `updateSensorColor()` - Notify DT of change
2. **Initial Load** → `loadSensorColors()` - Fetch from DT API
3. **Export** → Include DT session metadata
4. **Import** → Push to DT backend

**API Contract (Future Spec)**
```typescript
interface DigitalTwinAPI {
  // Update single sensor color
  updateSensorColor(params: {
    satelliteId: string;
    sensorId: string;
    color: string;
    timestamp: number;
  }): Promise<void>;
  
  // Fetch all colors for a session
  getSensorColors(sessionId: string): Promise<Record<string, Record<string, string>>>;
  
  // Batch update (for import)
  bulkUpdateColors(colors: any): Promise<void>;
}
```

---

## Implementation Phases

### ✅ Phase 0: Preparation (15 minutes)
- [x] Add `color?: string` to `SensorDefinition` type
- [x] Update test data generator to include sample colors
- [x] Document default color format (hex strings)

### 📋 Phase 1: Read Default Colors from JSON (30 minutes)
**Goal**: Support color field in sensor definitions

**Tasks**:
1. Update `sensorParser.ts` to parse `color` field
2. Add to `SensorDefinition` TypeScript interface
3. Test with sample data that has colors
4. Verify colors display correctly in 3D view

**Files**:
- `src/types/sensorTypes.ts`
- `src/parsers/sensorParser.ts`
- `satellite-data-generator/src/generate.ts`

### 📋 Phase 2: Color Override System (1 hour)
**Goal**: Allow color customization with localStorage persistence

**Tasks**:
1. Add `sensorColors` state to `SatelliteVisualizer`
2. Implement `getSensorColor()` with 3-tier priority
3. Implement `updateSensorColor()` with localStorage
4. Load from localStorage on component mount
5. Add helper functions (hex/rgb conversion)

**State Structure**:
```typescript
const [sensorColors, setSensorColors] = useState<Map<string, Map<string, string>>>(
  new Map() // satelliteId -> sensorId -> hexColor
);
```

**localStorage Key**: `grafana_satelliteVisualizer_sensorColors`

### 📋 Phase 3: UI - Color Display in Settings Modal (45 minutes)
**Goal**: Show sensor list with current colors

**Tasks**:
1. Add sensor list section to settings modal
2. Display sensor names
3. Show color swatches (clickable boxes)
4. Style sensor color rows
5. Handle satellites with 0 sensors (edge case)

**UI Additions**:
```typescript
{satellite.sensors.map((sensor, idx) => (
  <div key={sensor.id} className={styles.sensorColorRow}>
    <span className={styles.sensorName}>{sensor.name}</span>
    <div 
      className={styles.colorSwatch}
      style={{ backgroundColor: getSensorColor(satellite.id, sensor.id, idx) }}
      onClick={() => /* Phase 4 */}
    />
  </div>
))}
```

### 📋 Phase 4: UI - Color Picker Integration (1 hour)
**Goal**: Allow interactive color selection

**Tasks**:
1. Import Grafana's `ColorPicker` component
2. Wrap color swatch with ColorPicker
3. Handle color change events
4. Update localStorage on change
5. Add "Reset to Default" button
6. Show indicator when color is overridden

**Code**:
```typescript
import { ColorPicker } from '@grafana/ui';

<ColorPicker
  color={getSensorColor(satellite.id, sensor.id, idx)}
  onChange={(color) => {
    updateSensorColor(satellite.id, sensor.id, color);
  }}
>
  <div 
    className={styles.colorSwatch}
    style={{ backgroundColor: currentColor }}
  />
</ColorPicker>

{hasOverride(satellite.id, sensor.id) && (
  <button 
    className={styles.resetButton}
    onClick={() => resetToDefault(satellite.id, sensor.id)}
  >
    ↺ Reset
  </button>
)}
```

### 📋 Phase 5: Export Functionality (45 minutes)
**Goal**: Allow users to download complete configuration

**Tasks**:
1. Add "Export" button to modal header
2. Implement `exportSatelliteConfig()` function
3. Merge current colors into sensor definitions
4. Generate JSON blob
5. Trigger browser download
6. Add filename with timestamp

**Export Button**:
```typescript
<button
  className={styles.exportButton}
  onClick={() => exportSatelliteConfig(satellite)}
  title="Export satellite configuration with current colors"
>
  ↓ Export JSON
</button>
```

### 📋 Phase 6: Pass Colors to Renderer (30 minutes)
**Goal**: Apply custom colors in 3D visualization

**Tasks**:
1. Update `SensorVisualizationRenderer` props to accept custom color
2. Modify color usage in cone, footprint, celestial projections
3. Convert hex to Cesium Color format
4. Verify all visualizations use custom color

**Renderer Update**:
```typescript
// In SatelliteVisualizer.tsx
<SensorVisualizationRenderer
  // ... existing props ...
  customColor={getSensorColor(satellite.id, sensor.id, idx)}
/>

// In CesiumEntityRenderers.tsx
export interface SensorVisualizationProps {
  // ... existing ...
  customColor?: string; // Hex color override
}

// Use customColor if provided, otherwise use SENSOR_COLORS
const effectiveColor = props.customColor 
  ? hexToRgb(props.customColor)
  : SENSOR_COLORS[sensorIndex % SENSOR_COLORS.length];
```

### 📋 Phase 7: Testing & Polish (30 minutes)
**Goal**: Ensure everything works smoothly

**Tasks**:
1. Test with 0 sensors
2. Test with 10+ sensors (scrolling)
3. Test color persistence across page reload
4. Test export/import workflow
5. Verify colors match between UI and 3D view
6. Test reset functionality
7. Polish CSS styling
8. Add loading states if needed

---

## Total Effort Estimate

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 0: Prep | 15 min | 🟢 Easy |
| Phase 1: Read Defaults | 30 min | 🟢 Easy |
| Phase 2: Override System | 1 hour | 🟡 Medium |
| Phase 3: UI Display | 45 min | 🟢 Easy |
| Phase 4: Color Picker | 1 hour | 🟢 Easy |
| Phase 5: Export | 45 min | 🟢 Easy |
| Phase 6: Renderer | 30 min | 🟢 Easy |
| Phase 7: Testing | 30 min | 🟢 Easy |
| **TOTAL** | **~5 hours** | **🟡 Medium** |

---

## File Changes Required

### New/Modified Files
1. `src/types/sensorTypes.ts` - Add `color?: string`
2. `src/parsers/sensorParser.ts` - Parse color field
3. `src/components/SatelliteVisualizer.tsx` - Color state, UI, export
4. `src/components/entities/CesiumEntityRenderers.tsx` - Accept custom color
5. `src/utils/colorHelpers.ts` - **NEW**: hex/rgb conversion utilities
6. `satellite-data-generator/src/generate.ts` - Add color field to output

### No Changes Required
- No new dependencies (Grafana UI already has ColorPicker)
- No changes to data schema (color is optional)
- No breaking changes

---

## localStorage Schema

```typescript
// Key: grafana_satelliteVisualizer_sensorColors
// Value:
{
  "sat-1": {
    "sensor-1": "#FF0000",
    "sensor-2": "#00FF00"
  },
  "sat-2": {
    "sensor-1": "#0000FF"
  }
}
```

**Size**: ~50 bytes per override, ~5KB for 100 overrides (well within localStorage limits)

---

## Export JSON Format

```json
{
  "satelliteId": "starlink-4021",
  "satelliteName": "Starlink-4021",
  "exportedAt": "2025-12-31T15:30:00.000Z",
  "exportVersion": "1.0",
  "meta": {
    "custom": {
      "sensors": [
        {
          "id": "sat1-cam",
          "name": "Main Camera",
          "fov": 15,
          "orientation": { "qx": 0, "qy": 0, "qz": 0, "qw": 1 },
          "color": "#FF0000"
        }
      ]
    }
  },
  "columns": [
    { "text": "time", "type": "time" },
    { "text": "longitude", "type": "number" },
    ...
  ],
  "rows": [
    [1734450000000, -120.5, 37.2, 550000, 0, 0, 0, 1],
    ...
  ]
}
```

---

## Future Digital Twin Integration (Phase 8+)

### Code Structure for Future DT
```typescript
// src/services/digitalTwinAPI.ts (Future)
export class DigitalTwinAPI {
  private baseUrl: string;
  private sessionId: string;
  
  async updateSensorColor(params: UpdateColorParams): Promise<void> {
    // Will be implemented when DT backend is ready
  }
  
  async getSensorColors(sessionId: string): Promise<ColorMap> {
    // Will fetch from DT backend
  }
}

// Graceful fallback
const dtAPI = new DigitalTwinAPI({
  enabled: false // Toggle this when DT is ready
});
```

### Integration Points (Marked in Code)
```typescript
const updateSensorColor = async (satId, sensorId, color) => {
  // 1. Update local state (immediate UI feedback)
  setSensorColors(newColors);
  localStorage.setItem('sensorColors', JSON.stringify(newColors));
  
  // 2. [DT-INTEGRATION-POINT] Notify Digital Twin
  // if (dtAPI.isEnabled()) {
  //   await dtAPI.updateSensorColor({ satId, sensorId, color });
  // }
};
```

### Why This Approach
- ✅ Code is DT-ready without implementing it yet
- ✅ Clear markers for future integration
- ✅ localStorage provides immediate value
- ✅ No wasted effort - localStorage stays as fallback
- ✅ Easy to test with mock DT API later

---

## Dependencies

### Already Available ✅
- `@grafana/ui` - ColorPicker component
- `react` - State management
- `@emotion/css` - Styling
- Browser localStorage API

### No Installation Required ✅
All tools are already in place!

---

## Success Criteria

### Phase 1-7 Complete When:
- [x] Colors can be defined in sensor JSON
- [x] Colors can be customized via UI
- [x] Colors persist across page reloads
- [x] Export creates complete JSON file
- [x] Exported JSON can be re-imported
- [x] 3D view reflects custom colors
- [x] Reset to default works
- [x] Works with multiple satellites
- [x] Code has DT integration placeholders

---

## Next Steps

1. **User Approval**: Confirm this approach meets your needs
2. **Implementation**: Execute phases 1-7
3. **Testing**: Verify all functionality
4. **Documentation**: Update README with color customization guide
5. **[Future]**: Implement DT backend integration

---

## Status: ✅ Plan Complete - Ready for Implementation

**Recommended Approach**: Implement phases sequentially, test after each phase.

**Start with**: Phase 1 (Read default colors) - Easiest to test and validate.

**Last Updated**: December 31, 2025

---

## Feature Requirements

### User Story
As a user, I want to customize the color of each sensor FOV cone so that I can:
- Distinguish between sensors more easily
- Match organizational color schemes
- Highlight important sensors
- Create consistent visualizations across dashboards

### UI Flow
1. Open satellite settings modal (via gear icon in sidebar)
2. See list of all sensors for that satellite
3. Each sensor shows:
   - Sensor name (e.g., "Main Camera")
   - Current color (as a colored box/swatch)
   - Click the color swatch to open color picker
4. Choose new color from picker
5. Color updates immediately in 3D view
6. Settings persist across page reloads (localStorage)

---

## Color Picker Options Analysis

### Option 1: Grafana UI Components (✅ RECOMMENDED)
**Library**: `@grafana/ui` (Already installed!)  
**Component**: `ColorPicker` or `ColorPickerInput`  
**Effort**: Very Low (30 minutes)  
**Quality**: High (matches Grafana's native UI)

```typescript
import { ColorPicker } from '@grafana/ui';

<ColorPicker
  color={sensorColor}
  onChange={(color) => updateSensorColor(sensor.id, color)}
/>
```

**Pros**:
- ✅ Already in dependencies
- ✅ Matches Grafana's design language
- ✅ Well-tested and maintained
- ✅ Supports all standard formats (hex, rgb, rgba)
- ✅ Includes preset color swatches
- ✅ Accessible keyboard navigation
- ✅ TypeScript definitions included

**Cons**:
- Limited customization (but that's fine, consistency is good)

**Verdict**: **USE THIS** - Perfect fit for our needs!

---

### Option 2: react-colorful
**Library**: `react-colorful` (Would need installation)  
**Size**: ~3KB (very lightweight)  
**Effort**: Low (1 hour including installation)  
**Quality**: High

```bash
npm install react-colorful
```

```typescript
import { HexColorPicker } from 'react-colorful';

<HexColorPicker 
  color={sensorColor} 
  onChange={(color) => updateSensorColor(sensor.id, color)} 
/>
```

**Pros**:
- Very lightweight
- Beautiful modern UI
- Fast performance
- Good TypeScript support
- Multiple picker variants (hex, rgb, hsl)

**Cons**:
- Doesn't match Grafana UI
- Extra dependency
- Need to style to fit our modal

**Verdict**: Good option if Grafana's picker doesn't exist, but not needed.

---

### Option 3: react-color
**Library**: `react-color` (Popular, but larger)  
**Size**: ~100KB
**Effort**: Medium (1-2 hours)  
**Quality**: High (lots of features)

**Pros**:
- Very feature-rich
- Multiple picker styles (Sketch, Chrome, Photoshop, etc.)
- Widely used

**Cons**:
- Much larger bundle size
- Overkill for our needs
- Older library (less maintained)

**Verdict**: Too heavy for this use case.

---

### Option 4: Native HTML5 Input Color
**Library**: None (native browser API)  
**Size**: 0KB
**Effort**: Very Low (15 minutes)  
**Quality**: Low to Medium (browser-dependent)

```typescript
<input
  type="color"
  value={sensorColor}
  onChange={(e) => updateSensorColor(sensor.id, e.target.value)}
/>
```

**Pros**:
- No dependencies
- Works everywhere
- Simple to implement

**Cons**:
- Inconsistent UI across browsers
- Limited features (just basic hex picker)
- Doesn't match Grafana aesthetic
- No presets or recent colors

**Verdict**: Too basic, doesn't fit premium plugin UI.

---

## Final Recommendation

### ✅ USE GRAFANA'S ColorPicker

**Rationale**:
1. Already installed (zero bundle size increase)
2. Perfect UI consistency with Grafana
3. Proven reliability
4. Familiar to Grafana users
5. Maintained by Grafana Labs

**Implementation**: Use `@grafana/ui` components

---

## Data Structure Design

### Current State (Hard-coded colors)
```typescript
// In utils/sensorCone.ts
export const SENSOR_COLORS = [
  { r: 0, g: 255, b: 255, a: 0.6 },    // Cyan
  { r: 255, g: 0, b: 255, a: 0.6 },    // Magenta
  { r: 255, g: 255, b: 0, a: 0.6 },    // Yellow
  // ... etc
];

// Usage in renderer
const sensorColor = SENSOR_COLORS[sensorIndex % SENSOR_COLORS.length];
```

### Proposed State (Customizable per satellite/sensor)
```typescript
// In SatelliteVisualizer.tsx
const [sensorColors, setSensorColors] = useState<Map<string, Map<string, string>>>(
  // satelliteId -> sensorId -> hexColor
  new Map()
);

// Helper to get color (with fallback to default)
const getSensorColor = (satelliteId: string, sensorId: string, defaultIndex: number): string => {
  const satelliteColors = sensorColors.get(satelliteId);
  if (satelliteColors?.has(sensorId)) {
    return satelliteColors.get(sensorId)!;
  }
  // Fallback to default color
  const defaultColor = SENSOR_COLORS[defaultIndex % SENSOR_COLORS.length];
  return rgbToHex(defaultColor.r, defaultColor.g, defaultColor.b);
};

// Update color
const updateSensorColor = (satelliteId: string, sensorId: string, color: string) => {
  const newColors = new Map(sensorColors);
  if (!newColors.has(satelliteId)) {
    newColors.set(satelliteId, new Map());
  }
  newColors.get(satelliteId)!.set(sensorId, color);
  setSensorColors(newColors);
  
  // Persist to localStorage
  localStorage.setItem('satelliteVisualizer_sensorColors', JSON.stringify(Array.from(newColors.entries())));
};
```

### Helper Functions
```typescript
// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Convert Hex to RGB
const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};
```

---

## Implementation Steps

### Phase 1: Add Color Display (No Editing Yet)
**Effort**: 30 minutes  
**Goal**: Show current sensor colors in settings modal

1. Import sensor data in settings modal
2. Display list of sensors with names
3. Show color swatch next to each sensor name
4. Use default colors from `SENSOR_COLORS`

**UI Mockup**:
```
┌─────────────────────────────────────┐
│ ⚙️ Starlink-4021 Settings           │
├─────────────────────────────────────┤
│                                      │
│ ☐ Transparent Sensor Cones          │
│   (Performance warning...)           │
│                                      │
│ ─────── Sensor Colors ─────────      │
│                                      │
│ Main Camera        [🔵] Cyan        │
│ Nadir Sensor       [🟣] Magenta     │
│ Side Look Sensor   [🟡] Yellow      │
│                                      │
└─────────────────────────────────────┘
```

### Phase 2: Add Color Picker Integration
**Effort**: 1 hour  
**Goal**: Allow color selection

1. Import Grafana's `ColorPicker` component
2. Make color swatches clickable
3. Show color picker on click
4. Update state when color changes
5. Pass custom colors to renderer

**Code Example**:
```typescript
import { ColorPicker } from '@grafana/ui';

// In modal
{satellite.sensors.map((sensor, idx) => {
  const currentColor = getSensorColor(
    satellite.id, 
    sensor.id, 
    idx
  );
  
  return (
    <div key={sensor.id} className={styles.sensorColorRow}>
      <span>{sensor.name}</span>
      <ColorPicker
        color={currentColor}
        onChange={(color) => {
          updateSensorColor(satellite.id, sensor.id, color);
        }}
      >
        {/* Trigger button */}
        <div 
          className={styles.colorSwatch}
          style={{ backgroundColor: currentColor }}
        />
      </ColorPicker>
    </div>
  );
})}
```

### Phase 3: Persistence
**Effort**: 30 minutes  
**Goal**: Save colors across sessions

1. Save to localStorage on color change
2. Load from localStorage on component mount
3. Merge with defaults for new satellites/sensors

### Phase 4: Pass to Renderer
**Effort**: 30 minutes  
**Goal**: Use custom colors in 3D view

1. Update `SensorVisualizationRenderer` to accept custom color
2. Convert hex to Cesium Color format
3. Apply to all sensor visualizations (cone, footprint, celestial)

---

## UI Design Details

### Color Swatch Component
```typescript
const ColorSwatch = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }
`;
```

### Sensor Color Row
```typescript
const styles = {
  sensorColorRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    
    &:last-child {
      border-bottom: none;
    }
  `,
  sensorName: css`
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    flex: 1;
  `,
  colorControl: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  colorSwatch: css`
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.05);
    }
  `,
  resetButton: css`
    font-size: 12px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }
  `,
};
```

---

## Additional Features (Nice to Have)

### 1. Reset to Default Button
Add a small "Reset" button next to each color picker:
```typescript
<button 
  onClick={() => resetSensorColor(satellite.id, sensor.id)}
  className={styles.resetButton}
>
  Reset
</button>
```

### 2. Copy Color Between Sensors
Add a "Copy from..." dropdown to replicate colors:
```typescript
<select onChange={(e) => copySensorColor(e.target.value, sensor.id)}>
  <option>Copy color from...</option>
  {otherSensors.map(s => (
    <option value={s.id}>{s.name}</option>
  ))}
</select>
```

### 3. Preset Color Schemes
Offer predefined color sets:
```typescript
const COLOR_SCHEMES = {
  default: ['#00FFFF', '#FF00FF', '#FFFF00'],
  pastel: ['#FFB3BA', '#BAE1FF', '#FFFFBA'],
  neon: ['#FF10F0', '#00FF00', '#00F0FF'],
  // etc.
};
```

### 4. Alpha/Opacity Control
Add slider to control transparency:
```typescript
<input
  type="range"
  min="0"
  max="1"
  step="0.1"
  value={opacity}
  onChange={(e) => updateOpacity(sensor.id, parseFloat(e.target.value))}
/>
```

---

## Testing Strategy

### Manual Testing
- [ ] Open settings for satellite with 1 sensor
- [ ] Open settings for satellite with 3 sensors
- [ ] Click color swatch, verify picker opens
- [ ] Change color, verify 3D view updates immediately
- [ ] Reload page, verify colors persist
- [ ] Test with multiple satellites
- [ ] Verify default colors for new satellites

### Edge Cases
- [ ] What happens with 0 sensors? (should show nothing)
- [ ] What happens with 10+ sensors? (scrolling in modal?)
- [ ] Colors conflict with background/earth?
- [ ] Reset functionality works correctly
- [ ] LocalStorage size limits (unlikely issue)

---

## Performance Considerations

### Rendering Impact
- Minimal: Just passing different color values
- No new entities created
- Same rendering path as default colors

### State Management
- Use `Map` for O(1) lookups
- Only re-render affected sensors
- Debounce localStorage writes if needed

### Memory
- ~20 bytes per color (hex string + map overhead)
- For 10 satellites × 3 sensors = 600 bytes
- Negligible impact

---

## Implementation Complexity Assessment

### Overall Difficulty: 🟢 LOW to MEDIUM

**Breakdown**:
- **UI Layout**: 🟢 Easy (just add rows to existing modal)
- **ColorPicker Integration**: 🟢 Easy (Grafana component, well documented)
- **State Management**: 🟡 Medium (Map<Map> structure, but straightforward)
- **Persistence**: 🟢 Easy (localStorage is simple)
- **Renderer Integration**: 🟢 Easy (just pass prop, convert hex to RGB)

**Total Effort Estimate**: 2-3 hours
- Phase 1: 30 min (display colors)
- Phase 2: 1 hour (color picker)
- Phase 3: 30 min (persistence)
- Phase 4: 30 min (renderer integration)
- Testing/Polish: 30 min

---

## Dependencies

### Already Installed ✅
- `@grafana/ui` - Contains `ColorPicker` component
- `react` - For state management
- `@emotion/css` - For styling

### Need to Install ❌
- **NONE!** - Everything we need is already available

---

## Recommended Approach

### ✅ Proceed with Implementation

1. **Use Grafana's ColorPicker** - Perfect fit, zero dependencies
2. **Implement in phases** - Display first, then editing, then persistence
3. **Keep it simple** - Don't overcomplicate with schemes/presets initially
4. **Test thoroughly** - Ensure colors persist and render correctly

### User Decision Point

**Do you want me to proceed with implementation?**

If yes, I'll:
1. Add sensor list to settings modal
2. Display current colors
3. Integrate Grafana's ColorPicker
4. Add persistence
5. Wire up to renderer

**Estimated time**: 2-3 hours of focused work

---

## Status: Ready for Implementation

All planning complete. No additional libraries needed. Ready to code when you give the go-ahead! 🎨

**Last Updated**: December 31, 2025

