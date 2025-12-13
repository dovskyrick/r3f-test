# Dynamic Sensor/Satellite Settings - Design Exploration

**Date:** December 12, 2025  
**Goal:** Determine best approach for managing multiple sensors/satellites in UI

---

## 1. **The Core Question** 🤔

**Can Grafana panel settings be dynamically generated based on incoming data?**

Answer: **NO** ❌ (with important caveats)

### **Why Not:**

Grafana's `setPanelOptions()` is called **once at plugin initialization**, not on every data update:

```typescript
export const plugin = new PanelPlugin<SimpleOptions>(SatelliteVisualizer)
  .setPanelOptions((builder) => {
    // This runs ONCE when plugin loads
    // builder cannot access runtime data
    return builder.addBooleanSwitch({...});
  });
```

**Limitations:**
- ❌ Cannot read `data.series` in `setPanelOptions`
- ❌ Cannot dynamically add/remove settings based on sensor count
- ❌ Cannot generate "Sensor 1", "Sensor 2", "Sensor 3" settings on the fly
- ❌ Settings UI is static, defined at plugin load time

---

## 2. **Workarounds Within Grafana Settings** 🔧

### **Option A: Pre-Allocate Fixed Number of Sensors**

Define settings for N sensors (e.g., 10) regardless of actual count:

```typescript
// In module.ts
for (let i = 1; i <= 10; i++) {
  builder
    .addBooleanSwitch({
      path: `sensor${i}Visible`,
      name: `Sensor ${i}: Visible`,
      defaultValue: true,
    })
    .addColorPicker({
      path: `sensor${i}Color`,
      name: `Sensor ${i}: Color`,
      defaultValue: SENSOR_COLORS[i-1],
    });
}
```

**Pros:**
- ✅ Uses native Grafana settings
- ✅ Familiar UI pattern
- ✅ Settings persist in dashboard JSON

**Cons:**
- ❌ Cluttered UI (10 sensors × 2+ settings = 20+ rows)
- ❌ Confusing when only 2 sensors present
- ❌ Wasteful (unused settings always visible)
- ❌ Not scalable beyond pre-allocated count

**Verdict:** 🟡 Acceptable for fixed, small number (≤5 sensors)

---

### **Option B: Single Sensor Settings (Applied to All)**

One set of global sensor settings:

```typescript
builder
  .addBooleanSwitch({
    path: 'allSensorsVisible',
    name: 'Show All Sensors',
    defaultValue: true,
  })
  .addNumberInput({
    path: 'sensorConeLength',
    name: 'Sensor Cone Length (km)',
    defaultValue: 50,
  });
```

**Pros:**
- ✅ Clean, minimal UI
- ✅ Scales to infinite sensors
- ✅ Simple to understand

**Cons:**
- ❌ Cannot customize individual sensors
- ❌ All-or-nothing approach
- ❌ Less flexible

**Verdict:** 🟢 Good for uniform sensor visualization

---

### **Option C: Custom Editor Component**

Grafana supports `.addCustomEditor()` for complex UIs:

```typescript
.addCustomEditor({
  id: 'sensorSettings',
  path: 'sensorSettings',
  name: 'Sensor Configuration',
  editor: SensorSettingsEditor,  // Custom React component
  defaultValue: {},
})
```

**What you can build:**
- Dynamic list of sensors parsed from data
- Add/remove sensor overrides
- Nested settings per sensor
- Similar to the "Locations" editor in satellite-visualizer

**Pros:**
- ✅ Flexible, custom UI
- ✅ Can be data-aware (read sensor IDs from data)
- ✅ Native to Grafana settings panel
- ✅ Settings persist in dashboard

**Cons:**
- ⚠️ Moderate complexity to build
- ⚠️ Still lives in right-side settings panel (not in main view)
- ⚠️ Requires building custom React component

**Verdict:** 🟢 Best hybrid approach if staying in Grafana settings

---

## 3. **Alternative: In-Panel UI (Recommended)** ⭐

Build custom UI **inside the visualization panel** (like your R3F project sidebar):

```
┌──────────────────────────────────────────────┐
│  ☰ [Sidebar Toggle]          [Settings]      │
├────┬─────────────────────────────────────────┤
│    │                                          │
│ 🛰️ │          [3D Cesium View]               │
│    │                                          │
│ 📡 │                                          │
│    │                                          │
│ 🌍 │                                          │
│    │                                          │
└────┴─────────────────────────────────────────┘
 ^
 Collapsible sidebar
```

### **Sidebar Contents:**

```
📡 Sensors (3)
├─ ✅ sens1: Main Camera
│  ├─ FOV: 10°
│  ├─ Color: Cyan
│  └─ 👁️ Visible | 🎨 Edit
├─ ✅ sens2: Nadir Camera
│  ├─ FOV: 15°
│  └─ 👁️ Visible
└─ ❌ sens3: Side Scanner
   └─ 👁️ Hidden

🛰️ Satellites (1)
└─ ✅ ACRIMSAT-A
   └─ 📍 Track
```

**Implementation:**
- React state in `SatelliteVisualizer.tsx`
- Overlay div with absolute positioning
- Toggle button in top-left corner
- Parse sensors from data, generate list dynamically

**Pros:**
- ✅ **Fully dynamic** - adapts to data automatically
- ✅ **Scalable** - works with 1 or 100 sensors
- ✅ **Intuitive** - users see exactly what exists
- ✅ **Flexible** - can add any UI elements (icons, colors, sliders)
- ✅ **Familiar pattern** - like your R3F project
- ✅ **Real-time** - updates instantly with data changes

**Cons:**
- ⚠️ More development work
- ⚠️ Settings don't persist in Grafana dashboard JSON (would need custom solution)
- ⚠️ Takes screen real estate from 3D view (but collapsible!)

**Verdict:** 🟢🟢 **Recommended for multi-sensor/multi-satellite scenarios**

---

## 4. **Comparison Table** 📊

| Feature | Pre-Allocated (A) | Global (B) | Custom Editor (C) | In-Panel UI (D) |
|---------|-------------------|------------|-------------------|-----------------|
| **Dynamic** | ❌ | ✅ | 🟡 Semi | ✅ |
| **Scales to N items** | ❌ (limited) | ✅ | ✅ | ✅ |
| **Individual control** | ✅ | ❌ | ✅ | ✅ |
| **Clean UI** | ❌ | ✅ | 🟡 | ✅ |
| **Dev complexity** | Low | Low | Medium | Medium-High |
| **Persists in dashboard** | ✅ | ✅ | ✅ | ❌* |
| **Real-time updates** | ❌ | ✅ | 🟡 | ✅ |
| **Best for** | ≤3 sensors | Uniform control | Moderate complexity | Many sensors/satellites |

*Can be implemented with custom persistence

---

## 5. **Design Considerations** 🎨

### **What Needs Per-Sensor Control?**

| Setting | Priority | Best Approach |
|---------|----------|---------------|
| Visibility toggle | High | In-panel sidebar ⭐ |
| Cone color | Medium | Custom editor or pre-allocated |
| Cone length | Low | Global setting (all sensors) |
| FOV angle | Low | Read from data (shouldn't change) |
| Label/name | Low | Read from data |

### **What About Satellites?**

Future multi-satellite visualization needs:
- **Satellite list** - which satellites to show
- **Satellite selection** - focus camera on which one
- **Satellite settings** - color, trajectory style

**Recommendation:** Same in-panel sidebar approach

---

## 6. **Proposed Architecture** 🏗️

### **Phase 1: Global Sensor Controls (Current + Immediate)**

**In Grafana settings:**
```typescript
🎯 Attitude Visualization
├─ Show All Sensors (boolean)
├─ Sensor Cone Length (number, km)
└─ Sensor Cone Opacity (number, 0-1)
```

**In rendering:**
- All sensors use same length/opacity
- Individual colors from `SENSOR_COLORS` array (automatic)
- Visibility controlled by master "Show All Sensors" toggle

**Pros:**
- ✅ Simple, works now
- ✅ Covers 90% of use cases
- ✅ No extra development

**Good for:** Testing, demos, simple scenarios

---

### **Phase 2: In-Panel Sidebar (Future)**

**Component structure:**
```typescript
<SatelliteVisualizer>
  <SensorSidebar
    sensors={parsedSensors}
    onToggleSensor={(id) => {...}}
    onEditSensor={(id, settings) => {...}}
  />
  <Viewer>
    {/* Cesium */}
  </Viewer>
</SatelliteVisualizer>
```

**State management:**
```typescript
const [sensorVisibility, setSensorVisibility] = useState<Record<string, boolean>>({});
const [sensorOverrides, setSensorOverrides] = useState<Record<string, SensorSettings>>({});
```

**UI Features:**
- Collapsible sidebar (☰ toggle button)
- Sensor list with checkboxes
- Expand sensor for settings (color, length, opacity)
- Search/filter for many sensors
- Satellite list (future)

**Persistence options:**
1. **URL params** - store in dashboard URL variables
2. **LocalStorage** - browser-based persistence
3. **Grafana variables** - use dashboard variables
4. **None** - reset on page reload (simplest)

**Good for:** Production use, many sensors, complex scenarios

---

## 7. **User Testing Question** 🧪

> "Is it too small a thing to test with users?"

**Answer:** **Depends on target users**

### **If users are:**
- **Satellite operators** - Settings persistence matters (Grafana settings)
- **Mission control** - Real-time visibility control matters (sidebar)
- **Researchers** - Flexibility matters (sidebar)
- **Demos/teaching** - Simplicity matters (global settings)

### **Fork strategy:**
```
main branch
├─ 3d-orbit-attitude-plugin (global sensor settings)
└─ 3d-orbit-attitude-plugin-advanced (in-panel sidebar)
```

**Recommendation:** 🟡 **Not necessary to fork yet**

Instead:
1. Ship Phase 1 (global controls) now
2. Gather feedback from actual use
3. Build Phase 2 (sidebar) if users request per-sensor control
4. Avoid premature optimization

---

## 8. **Connection to R3F Project** 🔗

Your previous React Three Fiber project likely had:
```tsx
<Canvas>
  <Sidebar>
    <SatelliteList />
    <SensorList />
    <GroundStationList />
  </Sidebar>
  <Scene3D />
</Canvas>
```

**Same pattern can work here!**

Differences:
- R3F: Full control over entire page
- Grafana: Plugin constrained to panel div

But we can still build sidebar inside panel div! ✅

---

## 9. **Recommended Path Forward** 🛤️

### **Short-term (Now):**
1. ✅ Keep current implementation (sensors auto-render with colors)
2. ✅ Add global "Show All Sensors" toggle (already have via master toggle)
3. ✅ Add global "Sensor Cone Length" setting in Grafana options

### **Medium-term (After user feedback):**
1. Build in-panel sensor sidebar if users need per-sensor control
2. Start simple: just visibility toggles
3. Expand to color/length overrides if needed

### **Long-term (Multi-satellite future):**
1. Extend sidebar to include satellite list
2. Implement satellite selection/focus
3. Consider forking for "simple" vs "advanced" UI

---

## 10. **Implementation Complexity** ⏱️

| Approach | Time Estimate | Risk |
|----------|---------------|------|
| **Global sensor settings** | 15 min | Low |
| **Pre-allocated 5 sensors** | 30 min | Low |
| **Custom editor component** | 2-3 hours | Medium |
| **In-panel sidebar (basic)** | 3-4 hours | Medium |
| **In-panel sidebar (full)** | 8-12 hours | Medium-High |

---

## 11. **Summary** (TL;DR) 📝

### **The Question:**
Can Grafana settings be dynamic based on data?

### **The Answer:**
❌ No - settings are static at plugin load

### **The Solutions:**

| Approach | When to Use |
|----------|-------------|
| **Global controls** | ⭐ **Now** - simple, works for most cases |
| **Pre-allocated** | If ≤3 sensors, need individual control |
| **Custom editor** | Need persistence + flexibility |
| **In-panel sidebar** | ⭐ **Future** - many sensors, satellites, complex control |

### **Recommendation:**
1. ✅ **Phase 1 (now):** Global sensor controls
2. 🔮 **Phase 2 (later):** In-panel sidebar if users need it
3. 🚫 **Don't fork yet** - wait for real user feedback

---

**Status:** Planning complete - ready for Phase 1 implementation  
**Next:** Add global sensor settings (cone length, opacity)?  
**Future:** In-panel sidebar architecture documented for when needed

