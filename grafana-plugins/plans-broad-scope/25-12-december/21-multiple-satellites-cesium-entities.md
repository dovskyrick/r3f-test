# Multiple Satellites in Cesium: Entity System Architecture

**Date**: December 15, 2025  
**Status**: Planning & Education  
**Goal**: Support multiple satellites with hierarchical sensor structure

---

## Part 1: Understanding Cesium's Entity System 🎓

### What is a Cesium Entity?

A **Cesium Entity** is a high-level object that represents "something" in your 3D scene. Think of it as a container that bundles:
- **Position** (where it is in space/time)
- **Orientation** (how it's rotated in space/time)
- **Visual representation** (model, point, polygon, etc.)
- **Availability** (when it exists in time)
- **Metadata** (name, ID, custom properties)

**Key Insight**: Entities are **time-aware**. They know how to interpolate their position/orientation between data points automatically.

---

### Cesium Entity vs Primitive

| Feature | Entity (High-level) | Primitive (Low-level) |
|---------|---------------------|----------------------|
| **Time awareness** | ✅ Built-in (SampledProperty) | ❌ Manual updates |
| **Interpolation** | ✅ Automatic | ❌ You handle it |
| **API simplicity** | ✅ Declarative | ❌ Imperative |
| **Performance** | Good for <1000 objects | Better for >1000 objects |
| **Best for** | Satellites, sensors, locations | Massive point clouds, grids |

**For our use case**: Entities are perfect! We have <10 satellites with <10 sensors each.

---

### Multiple Entities in Cesium

**Core Concept**: Cesium maintains an **EntityCollection** (like an array of entities).

```javascript
// Cesium's internal structure (simplified)
viewer.entities = {
  values: [entity1, entity2, entity3, ...],  // Array of entities
  add(entity),       // Add new entity
  remove(entity),    // Remove entity
  getById(id),       // Find by ID
}
```

**You can have thousands of entities!** Each one:
- Renders independently
- Has its own timeline/availability
- Can be tracked individually
- Can have parent-child relationships

---

### Entity Parent-Child Hierarchy 🌳

**Cesium supports entity hierarchies** where child entities inherit transformations from parents:

```
Satellite Entity (parent)
├─ Position: sampled over time
├─ Orientation: sampled over time
├─ Model: spacecraft.glb
└─ Children:
    ├─ Sensor 1 (child entity)
    │   ├─ Position: relative to parent (0,0,0)
    │   ├─ Orientation: sensor body frame
    │   └─ Graphics: cone mesh
    ├─ Sensor 2 (child entity)
    └─ Sensor 3 (child entity)
```

**How it works**:
```tsx
// Parent satellite
<Entity 
  id="sat-1"
  position={satellitePosition}
  orientation={satelliteOrientation}
>
  <ModelGraphics ... />
</Entity>

// Child sensor (automatically inherits parent transform)
<Entity
  id="sat-1-sensor-1"
  parent={viewer.entities.getById('sat-1')}  // Links to parent!
  position={new ConstantPositionProperty(Cartesian3.ZERO)}  // Relative to parent
  orientation={sensorBodyFrameOrientation}
>
  <PolylineGraphics ... />  // Sensor cone
</Entity>
```

**Benefits**:
- Sensors automatically move/rotate with satellite
- Clean data structure (tree hierarchy)
- Less manual transform math

**Note**: In our current code, we compute sensor world transforms manually. We can refactor to use parent-child later.

---

## Part 2: Multiple Satellites Architecture 🛰️

### Current State (Single Satellite)

```typescript
// State
const [satellitePosition, setSatellitePosition] = useState<SampledPositionProperty | null>(null);
const [satelliteOrientation, setSatelliteOrientation] = useState<SampledProperty | null>(null);
const [sensors, setSensors] = useState<SensorDefinition[]>([]);

// Rendering
<Entity position={satellitePosition} orientation={satelliteOrientation}>
  <ModelGraphics ... />
</Entity>

{sensors.map(sensor => 
  <Entity>  // Sensor cone
    ...
  </Entity>
)}
```

---

### New State (Multiple Satellites)

```typescript
interface SatelliteData {
  id: string;                           // Unique identifier (e.g., "sat-1")
  name: string;                         // Display name (e.g., "Starlink-4021")
  position: SampledPositionProperty;    // Time-sampled position
  orientation: SampledProperty;         // Time-sampled orientation
  availability: TimeIntervalCollection; // When this satellite has data
  sensors: SensorDefinition[];          // Attached sensors
  resource: IonResource | string;       // 3D model
  color?: Color;                        // Optional: custom color for trajectory/axes
}

// State
const [satellites, setSatellites] = useState<SatelliteData[]>([]);
const [trackedSatelliteId, setTrackedSatelliteId] = useState<string | null>(null);
```

---

### JSON Data Structure

**Current** (single satellite):
```json
{
  "meta": {
    "custom": {
      "sensors": [...]
    }
  },
  "columns": ["Time", "Longitude", "Latitude", "Altitude", "qx", "qy", "qz", "qs"],
  "rows": [...]
}
```

**New** (multiple satellites):
```json
[
  {
    "satelliteId": "sat-1",
    "satelliteName": "Starlink-4021",
    "meta": {
      "custom": {
        "sensors": [
          {
            "id": "sens1",
            "name": "Main Camera",
            "fov": 10,
            "orientation": {"qx": 0, "qy": 0, "qz": 0, "qw": 1}
          }
        ]
      }
    },
    "columns": ["Time", "Longitude", "Latitude", "Altitude", "qx", "qy", "qz", "qs"],
    "rows": [
      [1734220800000, -45.2, 23.1, 550000, 0, 0, 0, 1],
      ...
    ]
  },
  {
    "satelliteId": "sat-2",
    "satelliteName": "Hubble Space Telescope",
    "meta": {
      "custom": {
        "sensors": [
          {
            "id": "sens1",
            "name": "Wide Field Camera",
            "fov": 15,
            "orientation": {"qx": 0, "qy": 0, "qz": 0, "qw": 1}
          }
        ]
      }
    },
    "columns": ["Time", "Longitude", "Latitude", "Altitude", "qx", "qy", "qz", "qs"],
    "rows": [
      [1734307200000, 12.5, -30.2, 547000, 0.1, 0.2, 0.3, 0.9],
      ...
    ]
  }
]
```

**Key Changes**:
- Top level is now an **array** of satellite data objects
- Each object has `satelliteId` and `satelliteName`
- Each has its own timeline (rows) and sensors
- Non-overlapping time intervals are fine—each satellite has its own `availability`

---

### Grafana Data Structure

**Option 1**: Multiple DataFrames (one per satellite)
```typescript
if (data.series.length > 0) {
  const satelliteDataArray: SatelliteData[] = [];
  
  for (const dataFrame of data.series) {
    // Each dataFrame represents one satellite
    const satelliteId = dataFrame.name || `sat-${index}`;
    // Parse position, orientation, sensors...
    satelliteDataArray.push({...});
  }
  
  setSatellites(satelliteDataArray);
}
```

**Option 2**: Single DataFrame with satellite ID column
```typescript
// Columns: ["Time", "SatelliteID", "Longitude", "Latitude", ...]
// Rows split by satelliteId
```

**Recommendation**: **Option 1** (multiple DataFrames) is cleaner and aligns with Grafana's query structure.

---

### TimeIntervalCollection: Handling Time Gaps

**What is TimeIntervalCollection?**
A Cesium class that defines when an entity exists. It's an array of time intervals:

```typescript
const availability = new TimeIntervalCollection([
  new TimeInterval({
    start: JulianDate.fromDate(new Date('2024-12-15T00:00:00Z')),
    stop: JulianDate.fromDate(new Date('2024-12-15T02:00:00Z')),
  }),
  new TimeInterval({
    start: JulianDate.fromDate(new Date('2024-12-15T06:00:00Z')),
    stop: JulianDate.fromDate(new Date('2024-12-15T08:00:00Z')),
  }),
]);
```

**Behavior**:
- Entity only renders during these intervals
- Outside intervals: entity disappears (no error)
- Cesium handles transitions automatically

**For Non-Overlapping Satellites**:
- Satellite A: 00:00-02:00
- Satellite B: 06:00-08:00
- Result: A visible first, then disappears; B appears later

**Perfect for our use case!** 🎯

---

## Part 3: Tracking System 🎯

### What is `viewer.trackedEntity`?

**Definition**: The entity that the camera follows.

```typescript
viewer.trackedEntity = entityToTrack;
```

**Behavior**:
- Camera automatically follows the entity's position
- Camera orientation adjusts to keep entity in view
- User can still manually pan/zoom (tracking persists)
- Set to `undefined` to stop tracking

**In Resium** (our React wrapper):
```tsx
<Viewer trackedEntity={trackedEntityRef.current}>
  ...
</Viewer>
```

---

### Multi-Satellite Tracking Strategy

**Phase 1** (Current Implementation):
- Default: Track first satellite in array
- User can toggle tracking on/off (existing button)
- When off: free camera
- When on: tracks first satellite

**Phase 2** (Future with Sidebar):
- Dropdown to select which satellite to track
- "Auto-switch" mode: track whichever satellite has data at current time
- "Multi-view" mode: split screen with different tracked satellites (advanced)

**Implementation**:
```typescript
// State
const [trackedSatelliteId, setTrackedSatelliteId] = useState<string | null>(
  satellites.length > 0 ? satellites[0].id : null
);

// Compute tracked entity
const trackedEntity = React.useMemo(() => {
  if (!isTracked || !trackedSatelliteId) return undefined;
  return satellites.find(sat => sat.id === trackedSatelliteId);
}, [isTracked, trackedSatelliteId, satellites]);

// In Viewer
<Viewer>
  {satellites.map(sat => (
    <Entity 
      key={sat.id}
      id={sat.id}
      position={sat.position}
      orientation={sat.orientation}
      availability={sat.availability}
      tracked={sat.id === trackedSatelliteId && isTracked}
    >
      <ModelGraphics ... />
    </Entity>
  ))}
</Viewer>
```

---

## Part 4: Implementation Plan 📋

### Step 1: Data Parsing (Multiple DataFrames)

**File**: New file `src/parsers/satelliteParser.ts`

```typescript
export interface ParsedSatellite {
  id: string;
  name: string;
  position: SampledPositionProperty;
  orientation: SampledProperty;
  availability: TimeIntervalCollection;
  sensors: SensorDefinition[];
}

export function parseSatellites(
  dataFrames: DataFrame[], 
  options: SimpleOptions
): ParsedSatellite[] {
  return dataFrames.map((dataFrame, idx) => {
    const satelliteId = dataFrame.name || `satellite-${idx}`;
    const satelliteName = dataFrame.meta?.custom?.satelliteName || satelliteId;
    
    // Parse time, position, orientation (existing logic)
    // Parse sensors (existing logic)
    // Compute availability from time range
    
    return {
      id: satelliteId,
      name: satelliteName,
      position: ...,
      orientation: ...,
      availability: ...,
      sensors: ...
    };
  });
}
```

---

### Step 2: Component State Refactor

**File**: `src/components/SatelliteVisualizer.tsx`

**Changes**:
```typescript
// OLD
const [satellitePosition, setSatellitePosition] = useState<SampledPositionProperty | null>(null);
const [satelliteOrientation, setSatelliteOrientation] = useState<SampledProperty | null>(null);
const [sensors, setSensors] = useState<SensorDefinition[]>([]);

// NEW
const [satellites, setSatellites] = useState<ParsedSatellite[]>([]);
const [trackedSatelliteId, setTrackedSatelliteId] = useState<string | null>(null);
```

---

### Step 3: Rendering Loop

```tsx
{satellites.map(satellite => (
  <React.Fragment key={satellite.id}>
    {/* Main satellite entity */}
    <Entity
      id={satellite.id}
      name={satellite.name}
      position={satellite.position}
      orientation={satellite.orientation}
      availability={satellite.availability}
    >
      <ModelGraphics resource={satelliteResource} ... />
      {options.showBodyAxes && (
        // Attitude vectors (X, Y, Z axes)
        ...
      )}
    </Entity>
    
    {/* Sensor cones for this satellite */}
    {options.showSensorCones && satellite.sensors.map((sensor, idx) => (
      <Entity key={`${satellite.id}-cone-${sensor.id}`} ...>
        <PolylineGraphics ... />
      </Entity>
    ))}
    
    {/* FOV footprints for this satellite */}
    {options.showFOVFootprint && satellite.sensors.map((sensor, idx) => (
      <Entity key={`${satellite.id}-footprint-${sensor.id}`} ...>
        <PolygonGraphics ... />
      </Entity>
    ))}
    
    {/* Celestial FOV projections for this satellite */}
    {options.showCelestialFOV && satellite.sensors.map((sensor, idx) => (
      <Entity key={`${satellite.id}-celestial-${sensor.id}`} ...>
        <PolygonGraphics ... />
      </Entity>
    ))}
  </React.Fragment>
))}
```

---

### Step 4: Tracking Logic

```typescript
// Compute tracked entity reference
const trackedEntityRef = React.useRef<Entity | undefined>();

React.useEffect(() => {
  if (!isTracked || !trackedSatelliteId || !viewerRef.current) {
    trackedEntityRef.current = undefined;
    return;
  }
  
  // Find entity by ID
  const entity = viewerRef.current.cesiumElement?.entities.getById(trackedSatelliteId);
  trackedEntityRef.current = entity;
}, [isTracked, trackedSatelliteId, satellites]);

// In Viewer
<Viewer ref={viewerRef}>
  {/* Viewer automatically tracks trackedEntityRef.current */}
</Viewer>
```

---

### Step 5: Default to First Satellite

```typescript
// When satellites data changes, default to first
React.useEffect(() => {
  if (satellites.length > 0 && !trackedSatelliteId) {
    setTrackedSatelliteId(satellites[0].id);
  }
}, [satellites]);
```

---

## Part 5: Future Sidebar Architecture (Preview) 🎨

### Hierarchy Structure

```
📦 Satellites
├─ 🛰️ Starlink-4021 (sat-1)
│   ├─ 🎨 Colors
│   │   ├─ Trajectory: cyan
│   │   ├─ X-axis: red
│   │   ├─ Y-axis: green
│   │   └─ Z-axis: blue
│   ├─ 📡 Sensors
│   │   ├─ Main Camera
│   │   │   ├─ FOV: 10°
│   │   │   ├─ Color: cyan
│   │   │   └─ Show: ✓
│   │   └─ Nadir Camera
│   │       ├─ FOV: 15°
│   │       ├─ Color: magenta
│   │       └─ Show: ✓
│   └─ 🎯 Track: [Button]
├─ 🛰️ Hubble (sat-2)
│   ├─ 🎨 Colors
│   ├─ 📡 Sensors
│   └─ 🎯 Track: [Button]
└─ ➕ Add Satellite
```

### UI Component Ideas (Blender-like)

```tsx
<Sidebar>
  <Tree>
    {satellites.map(sat => (
      <TreeNode
        key={sat.id}
        icon="🛰️"
        label={sat.name}
        onTrack={() => setTrackedSatelliteId(sat.id)}
      >
        <TreeNode label="Colors">
          <ColorPicker label="Trajectory" ... />
          <ColorPicker label="X-axis" ... />
        </TreeNode>
        <TreeNode label="Sensors">
          {sat.sensors.map(sensor => (
            <TreeNode key={sensor.id} label={sensor.name}>
              <NumberInput label="FOV" ... />
              <ColorPicker label="Color" ... />
              <Toggle label="Show" ... />
            </TreeNode>
          ))}
        </TreeNode>
      </TreeNode>
    ))}
  </Tree>
</Sidebar>
```

**Libraries to Consider**:
- `react-arborist` (tree view)
- `@grafana/ui` components (for consistency)
- Custom CSS grid layout

---

## Part 6: Edge Cases & Considerations

### 1. **Empty DataFrame Array**
```typescript
if (data.series.length === 0) {
  setSatellites([]);
  return;
}
```

### 2. **Overlapping Time Intervals**
- Cesium handles this naturally
- Both satellites render simultaneously
- User can switch tracking between them

### 3. **Missing Sensor Data for One Satellite**
- Parse sensors per satellite
- If `meta.custom.sensors` is missing, set `sensors: []`
- Rendering loops handle empty arrays gracefully

### 4. **Performance with Many Satellites**
- <10 satellites: No problem
- >100 satellites: Consider using Cesium Primitives instead of Entities
- >1000 satellites: Use point cloud primitive with custom shaders

### 5. **Tracking Unavailable Satellite**
- If tracked satellite has no data at current time, camera stays at last known position
- Future: Auto-switch to satellite with data

---

## Part 7: Testing Strategy

### Test Data Files

**File 1**: `satellite-1-TEST.json` (00:00-02:00)
```json
{
  "satelliteId": "sat-1",
  "satelliteName": "Starlink-4021",
  "rows": [[time1, ...], [time2, ...], ...]
}
```

**File 2**: `satellite-2-TEST.json` (06:00-08:00)
```json
{
  "satelliteId": "sat-2",
  "satelliteName": "Hubble",
  "rows": [[time3, ...], [time4, ...], ...]
}
```

### Visual Tests
1. **Two satellites, non-overlapping**: Only one visible at a time
2. **Two satellites, overlapping**: Both visible, can switch tracking
3. **Empty satellite (no data)**: Gracefully skipped
4. **First satellite tracked by default**: Camera follows sat-1 on load

---

## Part 8: File Changes Summary

| File | Change |
|------|--------|
| `src/parsers/satelliteParser.ts` | **NEW**: Parse array of satellites |
| `src/types/satelliteTypes.ts` | **NEW**: `ParsedSatellite` interface |
| `src/components/SatelliteVisualizer.tsx` | Refactor state from single to array |
| `src/components/SatelliteVisualizer.tsx` | Rendering loop over `satellites.map()` |
| `src/components/SatelliteVisualizer.tsx` | Tracking logic for first satellite |

---

## Part 9: Key Takeaways 📚

### Cesium Capabilities ✅
- ✅ Multiple entities: **Unlimited** (practically thousands)
- ✅ Parent-child hierarchy: **Yes** (we can refactor sensors as child entities)
- ✅ Individual tracking: **Yes** (`viewer.trackedEntity`)
- ✅ Time gaps: **Yes** (`TimeIntervalCollection` handles it)
- ✅ Independent timelines: **Yes** (each entity has its own `availability`)

### Our Approach
1. **Phase 1** (Now): Multi-satellite rendering + default tracking
2. **Phase 2** (Later): Sidebar UI for satellite/sensor management
3. **Phase 3** (Later): Per-satellite/sensor color customization

### Why This Works
- Cesium was **designed** for multi-entity scenarios (think: thousands of planes, satellites, ships)
- React + Resium = clean declarative rendering
- State management scales naturally (array of satellites)
- Future sidebar fits the tree structure perfectly

---

## Next Steps

1. Create `satelliteParser.ts` with multi-satellite parsing
2. Refactor component state to array
3. Update rendering loops
4. Test with 2-satellite JSON data
5. Verify tracking defaults to first satellite

**Ready to implement?** 🚀

