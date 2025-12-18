# Timeline Persistence Fix - Applied

**Date**: December 18, 2025  
**Status**: ✅ **IMPLEMENTED**  
**File**: `src/components/SatelliteVisualizer.tsx`

---

## What Was Fixed

### Problem
Changing ANY panel setting was resetting the animation timeline back to T+0.

### Root Cause
The main data processing `useEffect` (line 352-379) had this dependency array:

```typescript
}, [data, options, isLoaded]); // ❌ options is the entire object!
```

**Why this was broken:**
- `options` is an object with 50+ properties
- Grafana creates a new object reference on every setting change
- React sees new reference → runs effect → calls `setTimestamp()` → timeline resets
- Even changing unrelated settings like `showFOVFootprint` triggered full re-parse

---

## The Fix

**Changed line 379 from:**
```typescript
}, [data, options, isLoaded]);
```

**To:**
```typescript
}, [data, options.coordinatesType, options.modelAssetId, options.modelAssetUri, options.accessToken, isLoaded]);
```

**Why this works:**
- Only depends on options that **actually affect data parsing**
- Visual settings (colors, toggles, UI) don't trigger re-parse
- Timeline state (`timestamp`) is only set when data truly changes

---

## Settings That Will NOT Reset Timeline (✅ Fixed)

All your custom-developed settings should now work without resetting:

### Trajectory Settings
- `trajectoryShow` ✅
- `trajectoryWidth` ✅
- `trajectoryColor` ✅
- `trajectoryDashLength` ✅

### Attitude Visualization
- `showAttitudeVisualization` ✅ (master toggle)
- `showBodyAxes` ✅
- `xAxisColor`, `yAxisColor`, `zAxisColor` ✅

### Sensor Visualization
- `showSensorCones` ✅
- `showFOVFootprint` ✅
- `showCelestialFOV` ✅

### Celestial Grid
- `showRADecGrid` ✅
- `raSpacing`, `decSpacing` ✅
- `showGridLabels` ✅
- `gridLabelSize` ✅

### Custom Features
- `showNadirViewButton` ✅

### Sidebar/UI
- Open/Close Sidebar ✅
- Hide/Show Satellite ✅
- Select Different Satellite ✅

---

## Settings That WILL Reset Timeline (✅ Correct Behavior)

These settings **should** reset because they require re-processing data:

- `coordinatesType` - Changes how lat/lon/alt are interpreted
- `modelAssetId` - Loads different 3D model
- `modelAssetUri` - Loads different 3D model URL
- `accessToken` - Changes Cesium Ion authentication

---

## Viewer UI Settings (Separate Behavior)

These settings will **remount the Viewer** (lines 504-512), but this is correct:

- `showAnimation`
- `showTimeline`
- `showInfoBox`
- `showBaseLayerPicker`
- `showSceneModePicker`
- `showProjectionPicker`

**Note**: These are Grafana/Cesium built-in settings, not your custom-developed ones.

---

## Testing Procedure

### Quick Test (2 minutes)
1. Start Grafana: `cd grafana-server && docker-compose up -d`
2. Load plugin with multi-satellite data
3. Press Play, wait for animation to reach T+30min (or use timeline scrubber)
4. Toggle these settings one by one:
   - ✅ Show FOV Footprint
   - ✅ Show Celestial FOV
   - ✅ Show Body Axes
   - ✅ Show Sensor Cones
   - ✅ Trajectory Color (change it)
5. **Expected**: Timeline stays at T+30min for all toggles

### Full Test (5 minutes)
Run through all settings in the panel editor:
- Toggle every checkbox
- Change every color
- Adjust every slider

**Expected**: Timeline only resets when changing:
- Coordinates Type
- Model Asset ID/URI

---

## What This Fixes

### Before ❌
```
User: *animation at T+30min*
User: *toggles "Show FOV Footprint"*
Plugin: *re-parses all data*
Plugin: *resets to T+0*
User: 😡 "I was watching T+30!"
```

### After ✅
```
User: *animation at T+30min*
User: *toggles "Show FOV Footprint"*
Plugin: *FOV disappears/appears*
Plugin: *timeline stays at T+30*
User: 😊 "Perfect!"
```

---

## Technical Details

### React Dependency Array Explained

```typescript
// ❌ BAD: Entire object
useEffect(() => {
  processData(options);
}, [options]); // Runs on EVERY option change

// ✅ GOOD: Specific properties
useEffect(() => {
  processData(options);
}, [options.field1, options.field2]); // Runs only when field1 or field2 changes
```

**Why primitives work:**
- `options.coordinatesType` is a string ("Geodetic" or "Cartesian")
- Strings are compared by **value**, not reference
- React only re-runs when value actually changes

**Why objects don't work:**
- `options` is an object `{ coordinatesType: "Geodetic", showFOV: true, ... }`
- Objects are compared by **reference** (memory address)
- Grafana creates new object every time → different reference → always runs

---

## Other useEffect Hooks (Already Correct ✅)

### Model Loading (line 500)
```typescript
}, [options.modelAssetId, options.modelAssetUri, options.accessToken]);
```
✅ **Already scoped correctly**

### Celestial Grid (line 547)
```typescript
}, [options.showRADecGrid, options.raSpacing, options.decSpacing, options.showGridLabels, timestamp]);
```
✅ **Already scoped correctly**

### Viewer Remount (line 512)
```typescript
}, [options.showAnimation, options.showTimeline, options.showInfoBox, ...]);
```
✅ **Correct - these settings require Viewer remount**

---

## Success Criteria

| Criteria | Status |
|----------|--------|
| Toggle FOV settings → no timeline reset | ✅ Should pass |
| Toggle body axes → no timeline reset | ✅ Should pass |
| Change colors → no timeline reset | ✅ Should pass |
| Open/close sidebar → no timeline reset | ✅ Should pass |
| Hide/show satellites → no timeline reset | ✅ Should pass |
| Change coordinates → timeline resets (correct!) | ✅ Should pass |
| No linter errors | ✅ Already verified |
| No console errors | 🔍 Test required |

---

## Rollback (If Needed)

If something breaks, revert line 379 back to:

```typescript
}, [data, options, isLoaded]);
```

Then we can debug further.

---

## Next Steps

1. ✅ Fix applied
2. 🔍 **You test**: Try toggling settings, verify timeline persists
3. 📝 Report results: Which settings (if any) still cause reset?
4. 🔧 Apply additional fixes if needed

---

## Confidence Level

**95%** - This should fix timeline persistence for all your custom settings.

The pattern is well-established in React, and the other `useEffect` hooks in the file already follow this pattern correctly.

---

**Ready to test! 🚀**

Start Grafana and give it a try. Let me know which settings (if any) still cause timeline reset!

