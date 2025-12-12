# Data Source Parsing - Exploration & Extension Plan

**Date:** December 12, 2025  
**Goal:** Understand current data parsing and plan for extensible data types

---

## 1. **Current Data Flow** 📊

```
[Your JSON] → [Grafana TestData DB] → [DataFrame] → [Plugin Parses] → [Cesium Entities]
```

### **Where Parsing Happens:**
`SatelliteVisualizer.tsx` lines 145-237 in the `useEffect` hook:

```typescript
useEffect(() => {
  if (data.series.length === 1) {
    const dataFrame = data.series[0];
    
    if (dataFrame.fields.length !== 8) {
      throw new Error(`Invalid number of fields...`);
    }
    
    // Parse fields 0-7 into position/orientation
  }
}, [data, options.coordinatesType, isLoaded]);
```

### **Current Schema (8 columns):**
| Field | Content | Type |
|-------|---------|------|
| 0 | Time (Unix ms) | number |
| 1 | Longitude/X | number |
| 2 | Latitude/Y | number |
| 3 | Altitude/Z | number |
| 4 | qx | number |
| 5 | qy | number |
| 6 | qz | number |
| 7 | qw | number |

---

## 2. **What I Can Access** ✅

| Capability | Status |
|------------|--------|
| Read parsing code | ✅ Full access |
| Modify parsing logic | ✅ Can edit |
| Add new data types | ✅ Possible |
| Handle multiple series | ✅ Grafana supports |
| Display custom UI text | ✅ Can add overlays |

---

## 3. **Extension Strategies** 🔧

### **Option A: Multiple Series (Recommended)**

Grafana DataFrames support **multiple series**. Each series can be a different data type:

```typescript
// Current: data.series.length === 1
// Extended: data.series can have multiple entries

data.series[0] // → Satellite trajectory (8 fields)
data.series[1] // → Sensor 1 data (custom fields)
data.series[2] // → Ground station positions
```

**Implementation:**
```typescript
useEffect(() => {
  for (const series of data.series) {
    const seriesName = series.name; // e.g., "satellite", "sensor1", "metadata"
    
    switch (seriesName) {
      case 'satellite':
        parseSatelliteData(series);
        break;
      case 'sensor':
        parseSensorData(series);
        break;
      case 'metadata':
        parseMetadata(series);  // Hello world test here!
        break;
    }
  }
}, [data]);
```

### **Option B: Extended Fields in Single Series**

Add extra columns beyond 8:

| Field | Content |
|-------|---------|
| 0-7 | Current satellite data |
| 8 | Sensor 1 state (on/off) |
| 9 | Sensor 1 pointing X |
| 10+ | More custom data... |

**Pros:** Simpler JSON structure  
**Cons:** Less flexible, harder to add varied data types

### **Option C: Metadata in DataFrame (Simplest Test)**

Grafana DataFrames have a `meta` property:

```typescript
const dataFrame = data.series[0];
const customMeta = dataFrame.meta?.custom;  // { helloWorld: "Test!" }
```

**Best for testing!** We can add metadata without changing the 8-column structure.

---

## 4. **Hello World Test Plan** 🧪

### **Step 1: Add state for custom message**
```typescript
const [customMessage, setCustomMessage] = useState<string | null>(null);
```

### **Step 2: Parse metadata from DataFrame**
```typescript
useEffect(() => {
  const meta = data.series[0]?.meta?.custom;
  if (meta?.testMessage) {
    setCustomMessage(meta.testMessage);
  }
}, [data]);
```

### **Step 3: Display in UI overlay**
```tsx
{customMessage && (
  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: 'yellow', padding: '8px' }}>
    📡 {customMessage}
  </div>
)}
```

### **Test JSON:**
```json
{
  "meta": {
    "custom": {
      "testMessage": "Hello World from extended data!"
    }
  },
  "columns": ["Time", "Longitude", "Latitude", "Altitude", "qx", "qy", "qz", "qw"],
  "rows": [
    [1733097600000, 10.0, 45.0, 420000, 0.0, 0.0, 0.0, 1.0]
  ]
}
```

---

## 5. **Future: Full Extensible Schema** 🚀

### **Proposed Multi-Type JSON Structure:**
```json
{
  "spacecraft": {
    "name": "ACRIMSAT",
    "trajectory": { ... 8 columns ... },
    "sensors": [
      {
        "name": "Sensor1",
        "type": "camera",
        "fov": 10,
        "timeline": [ ... sensor states ... ]
      }
    ],
    "groundStations": [
      { "name": "NASA DSN", "lat": 35.4, "lon": -116.9 }
    ]
  }
}
```

### **Parsing Architecture:**
```
parsers/
├── satelliteParser.ts    // Trajectory + attitude
├── sensorParser.ts       // Sensor configurations
├── groundStationParser.ts // Ground locations
└── index.ts              // Router that dispatches to correct parser
```

---

## 6. **Limitations & Considerations** ⚠️

| Challenge | Mitigation |
|-----------|------------|
| Grafana TestData format is rigid | Use `meta.custom` for extensions |
| Current code expects exactly 8 fields | Add graceful fallback, don't throw |
| Multiple series need different JSON structure | Document new format clearly |
| Breaking existing dashboards | Version the schema, support legacy |

---

## 7. **Recommended Next Steps** 📋

1. **Phase 1 (Test):** Add `meta.custom` parsing + UI overlay display
2. **Phase 2 (Validate):** Confirm metadata survives Grafana's TestData pipeline
3. **Phase 3 (Extend):** Support multiple series with named types
4. **Phase 4 (Polish):** Create parser modules, add type safety

---

## 8. **Summary** (TL;DR) 📝

✅ **Can I access parsing code?** Yes, fully  
✅ **Can we extend it?** Yes, multiple ways  
✅ **Best test approach:** `meta.custom` field with hello world string  
✅ **Future path:** Multiple series or extended fields  
✅ **Will it break things?** No, with graceful fallbacks  

---

## 9. **Cursor Permanent Context** ⚙️

To add permanent instructions (like "never propose npm run build"):

### **Option 1: `.cursorrules` file (Project-Specific)**

Create a file at project root:
```
/home/rbbs/Dev/r3f-test/.cursorrules
```

Content:
```
# Project Rules for Cursor AI

## Build Commands
- NEVER automatically run `npm run build` - always let the user run it manually
- NEVER run `npm install` without explicit user approval

## Code Style
- Use TypeScript strictly
- Add explicit type annotations

## Project Context
- This is a Grafana plugin project using CesiumJS/Resium
- Main plugin: grafana-plugins/3d-orbit-attitude-plugin
```

### **Option 2: Cursor Settings (Global)**

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "Rules" or "Instructions"
3. Add custom instructions in the AI/Chat section

### **Option 3: Per-Chat Instructions**

At the start of each chat, say:
> "Remember: never propose to run npm run build yourself"

---

**Ready to implement the Hello World test when you give the green light!** 🚦

