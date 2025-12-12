# Panel Settings Organization - Grafana Structure Exploration

**Date:** December 12, 2025  
**Goal:** Organize custom panel settings into logical, collapsible categories

---

## 1. **Terminology** 🏷️

The UI elements you're seeing are called **"Categories"** or **"Sections"** in Grafana:
- They appear as collapsible/expandable rows
- Arrow icon (▶/▼) indicates expand/collapse state
- Clicking toggles visibility of child settings

**Built-in categories you see:**
- `Panel Options` → Contains `Panel Links`, `Repeat Options`, `Description`, etc.
- `Satellite Visualizer` → Your custom plugin settings (all at root level currently)

---

## 2. **Current Problem** ⚠️

All 30+ custom settings are in a **flat list** under "Satellite Visualizer":
```
Satellite Visualizer
├─ Display mode
├─ Coordinates type
├─ Point size
├─ Point color
├─ Model Scale
├─ Minimum pixel size
├─ Maximum scale
├─ Asset ID
├─ Asset URI
├─ Show trajectory
├─ Trajectory width
├─ Trajectory color
├─ Trajectory dash length
├─ Show Z-Axis Ground Projection     ← OUR CUSTOM
├─ Show FOV Footprint                 ← OUR CUSTOM
├─ FOV Half-Angle (degrees)           ← OUR CUSTOM
├─ Show RA/Dec Celestial Grid         ← OUR CUSTOM
├─ RA Spacing (hours)                 ← OUR CUSTOM
├─ Dec Spacing (degrees)              ← OUR CUSTOM
├─ Show Grid Labels                   ← OUR CUSTOM
├─ Grid Label Size (px)               ← OUR CUSTOM
├─ Locations
├─ Location point size
├─ Location point color
├─ Access token
├─ Subscribe to data hover event
├─ Show animation
├─ Show timeline
├─ Show info box
├─ Show base layer picker
├─ Show scene mode picker
├─ Show projection picker
└─ Show credits
```

**This is hard to scan and overwhelming!** 😵

---

## 3. **Grafana API Support** 🔍

### **Category Creation:**
Grafana's `PanelOptionsBuilder` has a `.addCategory()` method:

```typescript
builder.addCategory({
  id: 'unique-category-id',
  name: 'Category Display Name',
  description: 'Optional description',
})
```

### **How it works:**
1. Call `.addCategory()` to create a new collapsible section
2. All subsequent `.add*()` calls are nested under that category
3. To start a new category, call `.addCategory()` again

### **Nesting:**
- **YES:** Categories can be nested (category within category)
- **Limit:** Grafana UI typically shows 2-3 levels deep before getting cluttered

---

## 4. **Proposed Organization** 📋

### **Option A: Group Our Custom Features (Minimal Changes)**

Keep original settings as-is, but organize OUR additions into logical groups:

```
Satellite Visualizer
├─ [Original settings remain flat]
│  ├─ Display mode
│  ├─ Coordinates type
│  ├─ Point size, Point color
│  ├─ Model Scale, Minimum pixel size, Maximum scale, Asset ID, Asset URI
│  ├─ Show trajectory, Trajectory width, Trajectory color, Trajectory dash length
│  ├─ Locations, Location point size, Location point color
│  ├─ Access token
│  ├─ Subscribe to data hover event
│  ├─ Show animation, Show timeline, Show info box
│  ├─ Show base layer picker, Show scene mode picker, Show projection picker
│  └─ Show credits
│
├─ 📍 Sensor Projections                    ← NEW CATEGORY
│  ├─ Show Z-Axis Ground Projection
│  ├─ Show FOV Footprint
│  └─ FOV Half-Angle (degrees)
│
└─ 🌌 Celestial Reference Grid              ← NEW CATEGORY
   ├─ Show RA/Dec Celestial Grid
   ├─ RA Spacing (hours)
   ├─ Dec Spacing (degrees)
   ├─ Show Grid Labels
   └─ Grid Label Size (px)
```

**Pros:**
- Minimal disruption to original plugin structure
- Clear separation of OUR features
- Easy to find sensor and celestial grid settings

**Cons:**
- Original settings still somewhat cluttered
- Inconsistent organization (some grouped, some not)

---

### **Option B: Full Reorganization (Recommended)** ⭐

Organize ALL settings into logical categories:

```
Satellite Visualizer
│
├─ 🛰️ Satellite Display                     ← NEW CATEGORY
│  ├─ Display mode (Point/Model)
│  ├─ Coordinates type
│  │
│  ├─ Point Settings                        ← NESTED CATEGORY
│  │  ├─ Point size
│  │  └─ Point color
│  │
│  └─ Model Settings                        ← NESTED CATEGORY
│     ├─ Scale
│     ├─ Minimum pixel size
│     ├─ Maximum scale
│     ├─ Asset ID
│     └─ Asset URI
│
├─ 🛤️ Trajectory                            ← NEW CATEGORY
│  ├─ Show trajectory
│  ├─ Trajectory width
│  ├─ Trajectory color
│  └─ Trajectory dash length
│
├─ 📍 Sensor Projections                    ← NEW CATEGORY
│  ├─ Show Z-Axis Ground Projection
│  ├─ Show FOV Footprint
│  └─ FOV Half-Angle (degrees)
│
├─ 🌌 Celestial Reference Grid              ← NEW CATEGORY
│  ├─ Show RA/Dec Celestial Grid
│  ├─ RA Spacing (hours)
│  ├─ Dec Spacing (degrees)
│  ├─ Show Grid Labels
│  └─ Grid Label Size (px)
│
├─ 📌 Locations                             ← NEW CATEGORY
│  ├─ Locations (custom editor)
│  ├─ Location point size
│  └─ Location point color
│
├─ ⚙️ Viewer Controls                       ← NEW CATEGORY
│  ├─ Show animation
│  ├─ Show timeline
│  ├─ Show info box
│  ├─ Show base layer picker
│  ├─ Show scene mode picker
│  ├─ Show projection picker
│  └─ Show credits
│
└─ 🔐 Advanced                              ← NEW CATEGORY
   ├─ Access token
   └─ Subscribe to data hover event
```

**Pros:**
- Clear logical grouping
- Easy to scan and find settings
- Professional, polished UX
- Scalable for future additions

**Cons:**
- More extensive changes to module.ts
- Might confuse users familiar with old layout (but old plugin had no users yet)

---

## 5. **Implementation Summary** 🛠️

### **Code Pattern:**

```typescript
export const plugin = new PanelPlugin<SimpleOptions>(SatelliteVisualizer)
  .setPanelOptions((builder) => {
    return builder
      // Original flat settings...
      .add*({ path: '...', ... })
      
      // Start new category for our features
      .addCategory({
        id: 'sensor-projections',
        name: '📍 Sensor Projections',
      })
      .addBooleanSwitch({
        path: 'showZAxisProjection',
        name: 'Show Z-Axis Ground Projection',
        ...
      })
      .addBooleanSwitch({
        path: 'showFOVFootprint',
        ...
      })
      .addNumberInput({
        path: 'fovHalfAngle',
        ...
      })
      
      // Start another category
      .addCategory({
        id: 'celestial-grid',
        name: '🌌 Celestial Reference Grid',
      })
      .addBooleanSwitch({
        path: 'showRADecGrid',
        ...
      })
      // ... etc
  });
```

### **For Nested Categories:**
```typescript
.addCategory({ id: 'satellite-display', name: '🛰️ Satellite Display' })
.addRadio({ path: 'assetMode', ... })
.addRadio({ path: 'coordinatesType', ... })

// Nested sub-category
.addCategory({ id: 'point-settings', name: 'Point Settings' })
.addNumberInput({ path: 'pointSize', ... })
.addColorPicker({ path: 'pointColor', ... })

// Back to parent level or new category
.addCategory({ id: 'trajectory', name: '🛤️ Trajectory' })
```

---

## 6. **Recommendation** ✅

**I recommend Option A for now:**
- Less invasive (keeps original structure intact)
- Organizes OUR features cleanly
- Respects the original plugin author's decisions
- Easier to implement and test

**Future enhancement:**
- If you later decide to fully reorganize, Option B provides the blueprint

---

## 7. **What Categories to Create** 📦

### **Immediate (Option A):**

1. **"📍 Sensor Projections"**
   - Show Z-Axis Ground Projection
   - Show FOV Footprint
   - FOV Half-Angle (degrees)

2. **"🌌 Celestial Reference Grid"**
   - Show RA/Dec Celestial Grid
   - RA Spacing (hours)
   - Dec Spacing (degrees)
   - Show Grid Labels
   - Grid Label Size (px)

---

## 8. **Future Additions** 🚀

When you add more features (e.g., attitude vectors settings, ground track, etc.), you can create new categories like:

- **"🎯 Attitude Vectors"** (if we expose size, color, toggle X/Y/Z independently)
- **"🗺️ Ground Track"** (for future ground track visualization)
- **"📡 Communications"** (for link budget visualization)

---

## 9. **Summary** (TL;DR) 📝

✅ **What they're called:** Categories/Sections  
✅ **API method:** `.addCategory({ id: '...', name: '...' })`  
✅ **Can nest:** Yes (2-3 levels comfortable)  
✅ **Recommended approach:** Option A (organize OUR features only)  
✅ **Categories needed:** "Sensor Projections" + "Celestial Reference Grid"  
✅ **Effort:** Low (just add 2 `.addCategory()` calls and reorder settings)

---

## 10. **ACTUAL IMPLEMENTATION** ⚠️

### **Issue Discovered:**
❌ **`.addCategory()` does not exist in this version of Grafana!**

The `PanelOptionsEditorBuilder` API in the Grafana version used by this plugin doesn't support the `.addCategory()` method. This is a newer API feature not available in all Grafana versions.

### **Fallback Solution Implemented:** ✅

Since we can't create collapsible categories, I used **visual grouping with emoji prefixes**:

**📍 Sensor Projections:**
- `📍 Show Z-Axis Ground Projection`
- `📍 Show FOV Footprint`
- `📍 FOV Half-Angle (degrees)`

**🌌 Celestial Reference Grid:**
- `🌌 Show RA/Dec Celestial Grid`
- `🌌 RA Spacing (hours)`
- `🌌 Dec Spacing (degrees)`
- `🌌 Show Grid Labels`
- `🌌 Grid Label Size (px)`

### **Benefits:**
✅ Visual grouping through consistent emoji prefixes  
✅ Easy to scan and identify related settings  
✅ No breaking changes or API incompatibilities  
✅ Settings remain alphabetically grouped by emoji  

### **Tradeoff:**
❌ Not collapsible (all settings visible at once)  
✅ But visually clear and organized

### **Additional Fix:**
Fixed all TypeScript errors: Added `(config: any)` type annotations to all `showIf` callbacks.

---

**Status:** ✅ Implemented and ready to build!  
**Solution:** Emoji-based visual grouping (fallback due to API limitations)

