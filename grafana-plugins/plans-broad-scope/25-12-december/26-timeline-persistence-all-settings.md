# Timeline Persistence Across All Settings - Comprehensive Guide

**Date**: December 16, 2025  
**Goal**: Prevent timeline reset when toggling settings/options  
**Approach**: Minimal, surgical fixes using React best practices

---

## Problem Summary

**Symptom**: Changing any panel setting resets the timeline to initial time  
**Impact**: User loses their place in the animation (e.g., at T+30min, toggle a setting, jumps back to T+0)  
**Root Cause**: Over-broad React `useEffect` dependencies

---

## React Concepts Involved

### 1. **useEffect Dependencies**

```typescript
useEffect(() => {
  // This code runs when dependencies change
}, [dependency1, dependency2]);
```

**The Problem**:
```typescript
useEffect(() => {
  // Parse data and set initial timestamp
  setTimestamp(startTime);
}, [data, options]); // ❌ options is an OBJECT!
```

**Why it's broken**:
- `options` is an object with ~50 properties
- Changing ANY property creates a new object reference
- React sees new reference → runs effect → resets timeline
- Even changing `showFOVFootprint: true → false` triggers full data re-processing

### 2. **Object Reference Equality**

```typescript
const options1 = { showFOV: true, color: 'red' };
const options2 = { showFOV: true, color: 'red' };

options1 === options2; // false! Different objects
```

**In React**:
- Props/state objects are compared by **reference**, not value
- Grafana creates a new `options` object on every setting change
- Even if only one field changed, entire object is "new"

### 3. **Selective Dependencies (The Solution)**

```typescript
// ❌ BAD: Depends on entire object
}, [data, options]);

// ✅ GOOD: Depends only on relevant fields
}, [data, options.coordinatesType, options.modelAssetId]);
```

**Why this works**:
- Only re-runs when fields that **actually affect data processing** change
- Primitive values (`string`, `number`, `boolean`) compared by value
- Timeline won't reset when irrelevant settings change

---

## Past Solution (December 9, 2025)

### Fixed: Timeline Reset on Projection Toggles

**File**: `SatelliteVisualizer.tsx`  
**Location**: Main data processing `useEffect`

**Before**:
```typescript
useEffect(() => {
  // ... 200 lines of data parsing ...
  setTimestamp(startTime);
}, [data, options, isLoaded]); // ❌ options too broad
```

**After**:
```typescript
}, [data, options.coordinatesType, isLoaded]); // ✅ Only relevant field
```

**Result**: Toggling `showZAxisProjection`, `showFOVFootprint`, etc. no longer resets timeline

**Why `coordinatesType` was included**:
- Affects how data is parsed (Cartesian vs Geodetic vs Inertial)
- Changing it SHOULD re-process data and reset timeline
- Other options don't affect parsing logic

---

## Current Settings Audit

### Settings That SHOULD Reset Timeline

These require data re-processing:

| Setting | Why It Should Reset |
|---------|---------------------|
| `coordinatesType` | Changes how lat/lon/alt are interpreted |
| `modelAssetId` | Loads different 3D model (async) |
| `modelAssetUri` | Loads different 3D model (async) |
| `accessToken` | Affects Cesium Ion authentication |

**Current Status**: ✅ **Already fixed** (only these are in dependency array)

---

### Settings That Should NOT Reset Timeline

These are purely visual/rendering options:

#### Trajectory Settings
- `trajectoryShow` - Show/hide trajectory path
- `trajectoryWidth` - Line thickness
- `trajectoryColor` - Line color
- `trajectoryDashLength` - Dash pattern

#### Attitude Visualization
- `showAttitudeVisualization` - Master toggle for all attitude features
- `showBodyAxes` - Show X/Y/Z axes
- `xAxisColor`, `yAxisColor`, `zAxisColor` - Axis colors

#### Sensor Visualization
- `showSensorCones` - Show FOV cones
- `showFOVFootprint` - Show ground footprints
- `showCelestialFOV` - Show celestial projections

#### Cesium UI
- `showAnimation` - Show animation controller
- `showTimeline` - Show timeline scrubber
- `showInfoBox` - Show info popup
- `showBaseLayerPicker` - Show layer selector
- `showSceneModePicker` - Show 2D/3D toggle
- `showProjectionPicker` - Show projection toggle
- `showCredits` - Show Cesium credits

#### Point/Model Settings
- `pointSize`, `pointColor` - Point rendering
- `modelScale`, `modelMinimumPixelSize`, `modelMaximumScale` - Model scaling

#### Celestial Grid
- `showRADecGrid` - Show RA/Dec grid
- `raSpacing`, `decSpacing` - Grid spacing
- `showGridLabels` - Show coordinate labels
- `gridLabelSize` - Label font size

#### Custom Features
- `showNadirViewButton` - Show/hide nadir button

**Current Status**: ✅ **Already fixed** (not in dependency array)

---

## Verification: Are We Already Fixed?

Let me check the current dependency array:

### Expected Current Code

```typescript
useEffect(() => {
  // Data processing logic
  
  if (data.series.length > 0) {
    const parsedSatellites = parseSatellites(data.series, options);
    setSatellites(parsedSatellites);
    
    // Set initial timestamp
    if (parsedSatellites.length > 0) {
      const firstInterval = parsedSatellites[0].availability.get(0);
      if (firstInterval) {
        setTimestamp(firstInterval.start);
      }
    }
  }
}, [data, options.coordinatesType, options.modelAssetId, options.modelAssetUri, isLoaded]);
```

**If this is the case**: ✅ **Timeline persistence is already implemented!**

---

## Potential Remaining Issues

### Issue 1: Viewer Remount Might Still Reset

**Symptom**: Changing certain settings might remount the entire `<Viewer>` component

**Check**: Is `Viewer` using a `key` prop?

```typescript
<Viewer
  key={viewerKey} // ← This key
  ...
>
```

**Problem**:
- If `viewerKey` changes, entire Viewer remounts
- Timeline resets because Cesium clock is destroyed/recreated

**Solution**: Ensure `viewerKey` only changes when truly necessary (e.g., access token changes)

```typescript
// ❌ BAD: Changes on every option change
const [viewerKey, setViewerKey] = useState<number>(0);
useEffect(() => {
  setViewerKey(prev => prev + 1);
}, [options]); // Too broad!

// ✅ GOOD: Only changes when necessary
useEffect(() => {
  setViewerKey(prev => prev + 1);
}, [options.accessToken]); // Only relevant field
```

---

### Issue 2: Component State Not Persisted

**Symptom**: Toggling sidebar or other UI elements resets timeline

**Check**: Is there a `useState` that gets reset?

```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

// ❌ BAD: Resets sidebar state unnecessarily
useEffect(() => {
  setIsSidebarOpen(false);
}, [options]); // Why?
```

**Solution**: Remove unnecessary state resets

---

### Issue 3: Timeline Slider Interaction

**Symptom**: Moving timeline slider works, but then a setting change resets it

**Root Cause**: Timeline position is stored in Cesium's clock, not React state

**Check**:
```typescript
// Does the code use viewer.clock.currentTime?
const currentTime = viewer.clock.currentTime;

// Or does it use React state?
const [timestamp, setTimestamp] = useState<JulianDate | null>(null);
```

**Problem**:
- If using React state (`timestamp`), it gets reset when effect re-runs
- If using Cesium clock, it persists automatically

**Solution**: Let Cesium manage time, use React state only for initialization

```typescript
useEffect(() => {
  // Set INITIAL time once
  if (viewer && satellites.length > 0 && !initialTimeSet) {
    viewer.clock.currentTime = initialTime;
    setInitialTimeSet(true);
  }
}, [satellites, initialTimeSet]); // Not on every render!
```

---

## Minimal Solution Pattern

### Pattern 1: Narrow Dependencies (Most Common)

**When to use**: Effect processes data based on settings

```typescript
// ❌ BEFORE
useEffect(() => {
  processData(options);
}, [data, options]); // Too broad

// ✅ AFTER
useEffect(() => {
  processData(options);
}, [data, options.relevantField1, options.relevantField2]); // Only what matters
```

**How to identify relevant fields**:
1. Read the effect code
2. Find which `options` properties are actually used
3. Only depend on those specific properties

---

### Pattern 2: useCallback for Functions

**When to use**: Passing functions to child components or effects

```typescript
// ❌ BEFORE
const handleToggle = () => {
  setVisible(!visible);
};

useEffect(() => {
  handleToggle(); // New function every render!
}, [handleToggle]);

// ✅ AFTER
const handleToggle = useCallback(() => {
  setVisible(!visible);
}, []); // Stable reference

useEffect(() => {
  handleToggle();
}, [handleToggle]); // Doesn't change unnecessarily
```

---

### Pattern 3: Separate State for Initialization

**When to use**: Need to track if initial setup is complete

```typescript
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (!isInitialized && viewer && satellites.length > 0) {
    // Do initial setup (set time, position, etc.)
    viewer.clock.currentTime = initialTime;
    setIsInitialized(true);
  }
}, [isInitialized, viewer, satellites]); // Won't run on option changes
```

**Why this works**:
- `isInitialized` gates the effect
- Once true, effect doesn't do anything
- Options can change freely without affecting initialization

---

### Pattern 4: Ref for Persistent Values

**When to use**: Need to remember a value without causing re-renders

```typescript
const lastTimeRef = useRef<JulianDate | null>(null);

useEffect(() => {
  // Save current time before re-processing
  if (viewer) {
    lastTimeRef.current = viewer.clock.currentTime;
  }
  
  // Process data...
  
  // Restore time if still valid
  if (lastTimeRef.current && isWithinNewRange(lastTimeRef.current)) {
    viewer.clock.currentTime = lastTimeRef.current;
  }
}, [data, options.coordinatesType]); // Time restoration is automatic
```

**Why refs are useful**:
- Store values across renders
- Don't trigger re-renders when updated
- Persist even when component updates

---

## Diagnostic Checklist

### Step 1: Identify Which Setting Causes Reset

1. Load panel with animation at T+30min
2. Toggle each setting one by one:
   - [ ] Show FOV Footprint
   - [ ] Show Celestial FOV
   - [ ] Show Body Axes
   - [ ] Show Sensor Cones
   - [ ] Show Timeline
   - [ ] Show RA/Dec Grid
   - [ ] Trajectory Color
   - [ ] Show Nadir Button
   - [ ] Open/Close Sidebar
3. Note which ones cause timeline to reset

### Step 2: Find the Offending Effect

For each problematic setting:
1. Search code for `setTimestamp` or `viewer.clock`
2. Find enclosing `useEffect`
3. Check its dependency array
4. Look for `options` or broad dependencies

### Step 3: Narrow Dependencies

```typescript
// Template for fix:
}, [data, options.coordinatesType, /* ADD ONLY RELEVANT FIELDS */]);
```

### Step 4: Verify Fix

1. Make the change
2. Reload panel
3. Advance animation to T+30min
4. Toggle the setting
5. Verify timeline stays at T+30min

---

## Complete Example: Before & After

### Before (Broken)

```typescript
export const SatelliteVisualizer: React.FC<Props> = ({ options, data, ... }) => {
  const [timestamp, setTimestamp] = useState<JulianDate | null>(null);
  const [viewerKey, setViewerKey] = useState<number>(0);
  
  // ❌ PROBLEM 1: Viewer remounts on any option change
  useEffect(() => {
    setViewerKey(prev => prev + 1);
  }, [options]); // Too broad!
  
  // ❌ PROBLEM 2: Timeline resets on any option change
  useEffect(() => {
    if (data.series.length > 0) {
      // ... parse data ...
      setTimestamp(initialTime); // Resets!
    }
  }, [data, options]); // Too broad!
  
  return <Viewer key={viewerKey} .../>;
};
```

**Result**: Changing ANY option → Viewer remounts + Timeline resets

---

### After (Fixed)

```typescript
export const SatelliteVisualizer: React.FC<Props> = ({ options, data, ... }) => {
  const [timestamp, setTimestamp] = useState<JulianDate | null>(null);
  const [viewerKey, setViewerKey] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // ✅ FIX 1: Viewer only remounts when access token changes
  useEffect(() => {
    setViewerKey(prev => prev + 1);
  }, [options.accessToken]); // Only relevant field!
  
  // ✅ FIX 2: Timeline only resets when data/coordinates change
  useEffect(() => {
    if (data.series.length > 0) {
      // ... parse data ...
      if (!isInitialized) {
        setTimestamp(initialTime); // Only on first load
        setIsInitialized(true);
      }
    }
  }, [data, options.coordinatesType, isInitialized]); // Only relevant fields!
  
  return <Viewer key={viewerKey} .../>;
};
```

**Result**: Changing visual options → Viewer stays mounted + Timeline persists

---

## Testing Strategy

### Test 1: Visual Options (Should NOT Reset)

```typescript
// Start animation at T+30min
viewer.clock.currentTime = JulianDate.addMinutes(startTime, 30, new JulianDate());

// Toggle these:
- showFOVFootprint
- showCelestialFOV  
- showBodyAxes
- showSensorCones
- trajectoryColor
- xAxisColor

// Expected: Time stays at T+30min
```

### Test 2: Data-Related Options (SHOULD Reset)

```typescript
// Start animation at T+30min
viewer.clock.currentTime = JulianDate.addMinutes(startTime, 30, new JulianDate());

// Change these:
- coordinatesType (Geodetic → Cartesian)
- modelAssetId

// Expected: Time resets (this is correct behavior - data is re-processed)
```

### Test 3: UI Options (Should NOT Reset)

```typescript
// Start animation at T+30min

// Toggle these:
- showTimeline
- showAnimation
- showBaseLayerPicker
- isSidebarOpen

// Expected: Time stays at T+30min
```

---

## Implementation Priority

### High Priority (Likely Already Done ✅)
1. Main data processing effect - narrow to `coordinatesType`
2. Viewer key management - narrow to `accessToken`

### Medium Priority (Check These)
3. Satellite resource loading - should only depend on `modelAssetId`, `modelAssetUri`
4. Celestial grid generation - should only depend on `showRADecGrid`, `raSpacing`, `decSpacing`

### Low Priority (Nice to Have)
5. Add `useCallback` to handler functions
6. Use refs for persistent values
7. Add initialization flags to prevent re-initialization

---

## Summary

### React Concepts
1. **Object references**: `options` object changes on every setting change
2. **useEffect dependencies**: Be selective, only include what's needed
3. **Initialization patterns**: Track if setup is complete
4. **Refs for persistence**: Store values without causing re-renders

### The Fix Pattern
```typescript
// ❌ BEFORE
}, [data, options]);

// ✅ AFTER  
}, [data, options.field1, options.field2]); // Only relevant fields
```

### Verification
- Toggle visual settings → Timeline persists ✅
- Change data settings → Timeline resets (correct) ✅
- UI interactions → Timeline persists ✅

**Estimated effort**: 10-15 minutes to verify current state + apply any remaining fixes  
**Complexity**: Low - pattern is well-established  
**Confidence**: 95% - this is a solved problem in React

---

## Next Steps

1. **Audit current code**: Check if fix from Dec 9 is still applied
2. **Test each setting**: Identify any that still cause reset
3. **Apply pattern**: Narrow dependencies for any offending effects
4. **Verify**: Run test checklist above

Want me to check the current code and apply fixes if needed? 🔍

---

# IMPLEMENTATION PLAN - PREFERRED PATH

**Approach**: Solution 1 (Extract at Top) + Surgical Fixes  
**Complexity**: Low  
**Time Estimate**: 20-30 minutes  
**Risk**: Very Low

---

## Phase 0: Pre-Implementation Checklist

### Backup Current State
```bash
git add .
git commit -m "Before timeline persistence fix"
```

### Verify Current Behavior
1. Start Grafana server
2. Load plugin with 3-satellite data
3. Let animation run to T+30min
4. Toggle each setting, note which ones reset timeline:
   - [ ] Show FOV Footprint
   - [ ] Show Celestial FOV
   - [ ] Show Body Axes
   - [ ] Show Sensor Cones
   - [ ] Show RA/Dec Grid
   - [ ] Trajectory Color
   - [ ] Open/Close Sidebar

---

## Phase 1: Extract Options at Component Top (5 min)

**Goal**: Make code readable and set up for fixes

### Step 1.1: Add Option Extraction

**File**: `src/components/SatelliteVisualizer.tsx`  
**Location**: After component declaration, before hooks

```typescript
export const SatelliteVisualizer: React.FC<Props> = ({ 
  options, 
  data, 
  timeRange, 
  width, 
  height, 
  eventBus 
}) => {
  Ion.defaultAccessToken = options.accessToken;
  const styles = useStyles2(getStyles);

  // ============================================================
  // 📦 EXTRACT OPTIONS (for readable dependencies)
  // ============================================================
  
  // Data-processing options (affect parsing/initialization)
  const { 
    coordinatesType,
    modelAssetId,
    modelAssetUri,
    accessToken,
    assetMode,
  } = options;
  
  // Visual options (don't affect data processing)
  const {
    showAttitudeVisualization,
    showBodyAxes,
    showSensorCones,
    showFOVFootprint,
    showCelestialFOV,
    showRADecGrid,
    trajectoryColor,
    // ... others as needed
  } = options;

  // ============================================================
  // STATE & HOOKS
  // ============================================================
  
  const [isLoaded, setLoaded] = useState<boolean>(false);
  // ... rest of state
```

**Why**: Makes dependencies crystal clear, no more `options.x` everywhere

---

## Phase 2: Fix Main Data Processing Effect (5 min)

**Goal**: Prevent timeline reset when visual options change

### Step 2.1: Find Main Data Processing useEffect

**Search for**: `setSatellites(parsedSatellites)`

**Current code** (approximately line 350-380):
```typescript
useEffect(() => {
  if (!isLoaded) {
    return;
  }

  if (data.series.length > 0) {
    console.log(`🛰️ Parsing ${data.series.length} satellite(s)...`);
    
    try {
      const parsedSatellites = parseSatellites(data.series, options);
      setSatellites(parsedSatellites);
      
      // Set timestamp from first satellite's first data point
      if (parsedSatellites.length > 0) {
        const firstSatellite = parsedSatellites[0];
        const firstInterval = firstSatellite.availability.get(0);
        if (firstInterval) {
          setTimestamp(firstInterval.start);
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse satellites:', error);
      setSatellites([]);
    }
  } else {
    setSatellites([]);
    setTimestamp(null);
  }
}, [data, options, isLoaded]); // ❌ PROBLEM HERE
```

### Step 2.2: Replace Dependency Array

**Change**:
```typescript
}, [data, options, isLoaded]); // ❌ OLD
```

**To**:
```typescript
}, [data, coordinatesType, assetMode, isLoaded]); // ✅ NEW
```

**Why these specific options**:
- `coordinatesType`: Affects how lat/lon/alt are parsed
- `assetMode`: Affects whether to load model or show point
- NOT visual toggles like `showFOVFootprint`

**Expected result**: Toggling FOV/sensors/colors won't reset timeline

---

## Phase 3: Fix Model Asset Loading Effect (3 min)

**Goal**: Only reload model when asset actually changes

### Step 3.1: Find Model Loading useEffect

**Search for**: `IonResource.fromAssetId`

**Current code** (approximately line 490):
```typescript
useEffect(() => {
  if (options.modelAssetId) {
    IonResource.fromAssetId(options.modelAssetId, { accessToken: options.accessToken })
      .then((resource) => {
        setSatelliteResource(resource);
      })
      .catch((error) => {
        console.error('❌ Failed to load Cesium Ion asset:', error);
        setSatelliteResource(undefined);
      });
  } else if (options.modelAssetUri) {
    setSatelliteResource(options.modelAssetUri);
  } else {
    setSatelliteResource(undefined);
  }
}, [options.modelAssetId, options.modelAssetUri, options.accessToken]); // CHECK THIS
```

### Step 3.2: Verify or Fix Dependency Array

**If it currently has `[options]`**:
```typescript
}, [options]); // ❌ OLD
```

**Change to**:
```typescript
}, [modelAssetId, modelAssetUri, accessToken]); // ✅ NEW (use extracted vars)
```

**If it already has specific fields**: ✅ **Leave it as is**

**Expected result**: Changing FOV/colors won't reload 3D model

---

## Phase 4: Fix Celestial Grid Effect (3 min)

**Goal**: Only regenerate grid when grid settings change

### Step 4.1: Find Grid Generation useEffect

**Search for**: `generateRADecGrid`

**Current code** (approximately line 520):
```typescript
useEffect(() => {
  if (options.showRADecGrid) {
    const raLines = generateRADecGrid('ra', options.raSpacing, options.decSpacing);
    const decLines = generateRADecGrid('dec', options.raSpacing, options.decSpacing);
    setRALines(raLines);
    setDecLines(decLines);
    
    if (options.showGridLabels) {
      const labels = generateRADecGridLabels(options.raSpacing, options.decSpacing, options.gridLabelSize);
      setGridLabels(labels);
    } else {
      setGridLabels([]);
    }
  } else {
    setRALines([]);
    setDecLines([]);
    setGridLabels([]);
  }
}, [options.showRADecGrid, options.raSpacing, options.decSpacing, 
    options.showGridLabels, options.gridLabelSize]); // CHECK THIS
```

### Step 4.2: Verify Dependency Array

**If it has `[options]`**: Fix it

**Current (good)**:
```typescript
}, [options.showRADecGrid, options.raSpacing, options.decSpacing, 
    options.showGridLabels, options.gridLabelSize]);
```

**Better (use extracted vars)**:
```typescript
}, [showRADecGrid, raSpacing, decSpacing, showGridLabels, gridLabelSize]);
```

**Expected result**: Grid only regenerates when grid-related settings change

---

## Phase 5: Check Viewer Key Management (5 min)

**Goal**: Prevent unnecessary Viewer remounts

### Step 5.1: Find viewerKey State

**Search for**: `const [viewerKey, setViewerKey]`

### Step 5.2: Find Where viewerKey Changes

**Search for**: `setViewerKey`

**Look for code like**:
```typescript
useEffect(() => {
  setViewerKey(prev => prev + 1);
}, [options]); // ❌ Would cause remount on every option change
```

### Step 5.3: Fix If Found

**If viewerKey changes on `[options]`**:
```typescript
// ❌ OLD
}, [options]);

// ✅ NEW
}, [accessToken]); // Only remount when auth changes
```

**If viewerKey never changes except initialization**: ✅ **Good!**

**Expected result**: Viewer only remounts when absolutely necessary

---

## Phase 6: Test Each Toggle (10 min)

### Test Matrix

| Setting | Should Reset? | Test Result |
|---------|---------------|-------------|
| **Data Processing** (should reset) |
| Change Coordinates Type | ✅ Yes | [ ] Pass |
| Change Model Asset ID | ✅ Yes | [ ] Pass |
| **Visual Options** (should NOT reset) |
| Toggle FOV Footprint | ❌ No | [ ] Pass |
| Toggle Celestial FOV | ❌ No | [ ] Pass |
| Toggle Body Axes | ❌ No | [ ] Pass |
| Toggle Sensor Cones | ❌ No | [ ] Pass |
| Toggle RA/Dec Grid | ❌ No | [ ] Pass |
| Change Trajectory Color | ❌ No | [ ] Pass |
| Change X-Axis Color | ❌ No | [ ] Pass |
| Toggle Show Timeline | ❌ No | [ ] Pass |
| Toggle Show Animation | ❌ No | [ ] Pass |
| **UI Interactions** (should NOT reset) |
| Open/Close Sidebar | ❌ No | [ ] Pass |
| Toggle Nadir Button | ❌ No | [ ] Pass |
| Hide/Show Satellite | ❌ No | [ ] Pass |
| Select Different Satellite | ❌ No | [ ] Pass |

### Test Procedure

For each setting:
1. Start animation
2. Wait for T+30min (or press play, let it run)
3. Toggle the setting
4. Check if timeline stayed at T+30min
5. Mark Pass/Fail in table

---

## Phase 7: Edge Case Handling (Optional, 5 min)

### Edge Case 1: Data Refresh During Animation

**Issue**: New data loads while animation is at T+30min of old data

**Current behavior**: Resets to T+0 of new data (correct)

**Optional enhancement**: Save current time offset, apply to new data
```typescript
const timeOffsetRef = useRef<number>(0); // seconds from start

// Before data processing
if (viewer && timestamp) {
  const start = satellites[0]?.availability.get(0)?.start;
  if (start) {
    timeOffsetRef.current = JulianDate.secondsDifference(timestamp, start);
  }
}

// After data processing, restore offset
if (timeOffsetRef.current > 0) {
  const newStart = newSatellites[0]?.availability.get(0)?.start;
  if (newStart) {
    const restoredTime = JulianDate.addSeconds(newStart, timeOffsetRef.current, new JulianDate());
    setTimestamp(restoredTime);
  }
}
```

**Decision**: Skip for now, can add later if requested

---

### Edge Case 2: Hide Tracked Satellite

**Issue**: User hides the currently tracked satellite

**Current behavior**: Satellite disappears but still tracked (works fine)

**Optional enhancement**: Auto-switch to free camera
```typescript
const toggleSatelliteVisibility = (satelliteId: string) => {
  // If hiding tracked satellite, switch to free camera
  if (satelliteId === trackedSatelliteId && isTracked) {
    setIsTracked(false);
    console.log('⚠️ Hiding tracked satellite, switching to free camera');
  }
  
  setHiddenSatellites(prev => {
    const next = new Set(prev);
    if (next.has(satelliteId)) {
      next.delete(satelliteId);
    } else {
      next.add(satelliteId);
    }
    return next;
  });
};
```

**Decision**: Already implemented! ✅

---

## Quick Reference: Which Effects to Fix

### Effect 1: Main Data Processing ⚠️ **FIX THIS**
```typescript
}, [data, options, isLoaded]); // ❌
}, [data, coordinatesType, assetMode, isLoaded]); // ✅
```

### Effect 2: Model Loading ✅ **CHECK IF ALREADY FIXED**
```typescript
}, [modelAssetId, modelAssetUri, accessToken]); // Should be this
```

### Effect 3: Celestial Grid ✅ **PROBABLY ALREADY GOOD**
```typescript
}, [showRADecGrid, raSpacing, decSpacing, showGridLabels, gridLabelSize]);
```

### Effect 4: Viewer Key ⚠️ **CHECK THIS**
```typescript
// Make sure it doesn't change on [options]
}, [accessToken]); // Or don't change it at all
```

---

## Implementation Checklist

### Before Starting
- [ ] Backup code: `git commit -m "Before timeline fix"`
- [ ] Test current behavior (document which toggles cause reset)
- [ ] Read Phase 1-7

### Phase 1: Extract Options
- [ ] Add option extraction at component top
- [ ] Remove `options.x` in favor of extracted variables
- [ ] Verify code still compiles

### Phase 2: Fix Main Effect
- [ ] Find data processing effect
- [ ] Change `[data, options, isLoaded]` to `[data, coordinatesType, assetMode, isLoaded]`
- [ ] Test: Toggle FOV → timeline should NOT reset

### Phase 3: Fix Model Loading
- [ ] Find model loading effect
- [ ] Verify dependencies are specific, not `[options]`
- [ ] Test: Change trajectory color → model should NOT reload

### Phase 4: Fix Grid
- [ ] Find grid generation effect
- [ ] Verify dependencies are specific
- [ ] Test: Toggle FOV → grid should NOT regenerate

### Phase 5: Check Viewer Key
- [ ] Find viewerKey changes
- [ ] Ensure it only changes when necessary
- [ ] Test: Toggle settings → Viewer should NOT remount

### Phase 6: Full Test
- [ ] Run test matrix (all 15+ settings)
- [ ] Document any remaining issues
- [ ] Verify data-related options DO reset (correct behavior)

### Phase 7: Optional Enhancements
- [ ] Skip or implement if time permits

---

## Rollback Plan

If something breaks:
```bash
git diff # See what changed
git checkout src/components/SatelliteVisualizer.tsx # Revert
```

Or partial revert:
```typescript
// Temporarily change back to broad dependency
}, [data, options, isLoaded]); // Rollback temporarily
```

---

## Success Criteria

### Must Have ✅
1. Toggling FOV/sensors/colors doesn't reset timeline
2. Data-related options (coordinates, model) DO reset timeline
3. No console errors
4. Satellite still renders correctly

### Nice to Have 🎯
1. Clean, readable code with extracted options
2. All 15+ toggles tested and passing
3. Performance unchanged or better

---

## Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 0 | Pre-checks | 5 min |
| 1 | Extract options | 5 min |
| 2 | Fix main effect | 5 min |
| 3 | Fix model loading | 3 min |
| 4 | Fix grid | 3 min |
| 5 | Check viewer key | 5 min |
| 6 | Test all toggles | 10 min |
| 7 | Optional extras | 5 min |
| **Total** | | **30-40 min** |

---

## After Restart: Quick Start Commands

```bash
# 1. Navigate to Grafana server
cd /home/rbbs/Dev/r3f-test/grafana-server

# 2. Start Docker (might take a minute)
docker-compose up -d

# 3. Wait for Grafana to be ready
# Visit: http://localhost:3000

# 4. Open code editor
# File: grafana-plugins/3d-orbit-attitude-plugin/src/components/SatelliteVisualizer.tsx

# 5. Begin Phase 1!
```

---

## Questions to Answer After Implementation

1. How many effects needed fixing? (Expected: 1-2)
2. Which toggles were causing resets? (Will help understand scope)
3. Any unexpected behavior? (Edge cases to document)
4. Performance impact? (Should be neutral or better)

---

**Ready to implement after restart! You're doing great! 🚀**

Good luck with the Windows Defender issue, see you soon! 💪

