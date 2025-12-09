# Timeline Reset Issue Analysis & Fix Plan

**Date:** December 9, 2025  
**Status:** Investigation Complete - Ready for Implementation  
**Priority:** Medium (UX annoyance, not critical bug)

---

## Problem Statement

Two related timeline issues:

### Issue 1: Timeline Resets When Toggling Settings
**Symptom:** When toggling projection settings (Z-axis, FOV footprint), the current time resets.  
**Impact:** User loses their place in the animation.  
**Frequency:** Every time any panel setting is changed.

### Issue 2: Animation Always Starts at END of Trajectory
**Symptom:** Satellite appears at the last data point, user must press reverse/rewind to see animation.  
**Impact:** Counter-intuitive UX, confusing for new users.  
**Frequency:** Every time the panel loads or data is refreshed.

---

## Root Cause Analysis

### Issue 1 Root Cause: Over-Broad useEffect Dependency

**Location:** `SatelliteVisualizer.tsx`, line 247

```typescript
useEffect(() => {
  // ... 160 lines of data processing ...
  
  if (endTimestamp !== null) {
    setTimestamp(JulianDate.fromDate(new Date(endTimestamp))); // Resets to END
  }
  
  // ... more data processing ...
}, [data, options, isLoaded]); // ❌ options is too broad!
```

**Why it's broken:**
- The data processing `useEffect` depends on the entire `options` object
- When you toggle `showZAxisProjection` or `showFOVFootprint`, `options` changes
- This triggers the entire data processing to re-run
- `setTimestamp(...)` is called again, resetting the current time

**Similar to the Viewer remount issue we just fixed!**
- Before: `useEffect(..., [options])` remounted the entire Viewer
- Now: Same pattern is resetting the timeline

### Issue 2 Root Cause: Intentional Design Choice (Questionable)

**Location:** `SatelliteVisualizer.tsx`, lines 122-128

```typescript
const startTimestamp: number | null = timeFieldValues[0] ?? null;
const endTimestamp: number | null = timeFieldValues.at(-1) ?? null;

if (endTimestamp !== null) {
  // DEBUG: Initial timestamp set
  console.log('Setting initial timestamp to:', JulianDate.fromDate(new Date(endTimestamp)));
  console.log('This is the END of data range (last point)');
  setTimestamp(JulianDate.fromDate(new Date(endTimestamp))); // ❌ Sets to END!
}
```

**Why it's designed this way:**
- Unknown - possibly inherited from the original `satellite-visualizer` plugin
- Maybe intended for "current position" scenarios (real-time tracking)
- Could be a workaround for a different issue

**Why it's confusing:**
- Animations naturally start at the beginning, not the end
- User sees satellite at end position, no obvious "play" direction
- Trajectory is already drawn, satellite appears at wrong end

---

## Investigation: Is Data Order the Problem?

**Question:** Does the JSON data order affect initial position?

**Answer:** No, the data order doesn't matter for Cesium's rendering.

**Evidence:**
1. Cesium's `SampledPositionProperty` and `SampledProperty` use timestamps, not array order
2. Even if data were reversed, line 120 would still pick the *last* element: `timeFieldValues.at(-1)`
3. The code explicitly chooses `endTimestamp`, not based on array position

**Test suggestion (low priority):**
- Reverse the data points in the JSON to confirm
- Expected: Satellite still appears at the END time (just different spatial position)
- Would prove that timestamp value, not array order, determines position

---

## Proposed Solutions

### Solution for Issue 1: Narrow useEffect Dependencies

**Strategy:** Only re-run data processing when data or coordinate type changes, NOT when UI options change.

**Implementation:**

```typescript
// BEFORE (line 247)
}, [data, options, isLoaded]);

// AFTER
}, [data, options.coordinatesType, isLoaded]);
```

**Why this works:**
- Only `coordinatesType` affects how data is parsed (Cartesian vs Geodetic vs Inertial)
- Other options (projections, colors, visibility) don't affect data processing
- Timeline won't reset when toggling projections, colors, trajectory settings, etc.

**Potential concern:**
- What if other options DO affect data processing in the future?
- Answer: Add them explicitly when needed, don't use entire `options` object

**Alternative (more robust):**
```typescript
}, [data, options.coordinatesType, options.modelAssetId, options.modelAssetUri, isLoaded]);
```
- Include options that affect satellite resource/rendering
- Still avoids resetting on projection/UI toggles

### Solution for Issue 2: Start at Beginning

**Strategy:** Change initial timestamp from `endTimestamp` to `startTimestamp`.

**Implementation:**

```typescript
// BEFORE (lines 122-128)
if (endTimestamp !== null) {
  setTimestamp(JulianDate.fromDate(new Date(endTimestamp)));
} else {
  setTimestamp(null);
}

// AFTER
if (startTimestamp !== null) {
  setTimestamp(JulianDate.fromDate(new Date(startTimestamp)));
} else {
  setTimestamp(null);
}
```

**Why this is better:**
- Natural animation flow: start → end
- Consistent with user expectation
- Press "play" goes forward through trajectory
- Satellite appears at launch/start position

**Potential concern:**
- Was there a reason for starting at the end?
- Answer: Unknown, but likely not intentional for this use case

### Alternative Solution for Issue 2: Use Middle Timestamp

**If you want to see the full trajectory immediately:**

```typescript
if (startTimestamp !== null && endTimestamp !== null) {
  const middleIndex = Math.floor(timeFieldValues.length / 2);
  const middleTimestamp = timeFieldValues[middleIndex];
  setTimestamp(JulianDate.fromDate(new Date(middleTimestamp)));
} else if (startTimestamp !== null) {
  setTimestamp(JulianDate.fromDate(new Date(startTimestamp)));
} else {
  setTimestamp(null);
}
```

**Pros:**
- Can see trajectory in both directions
- Shows satellite in orbit, not at edge

**Cons:**
- More complex
- Less predictable (where exactly is "middle"?)
- Still not the natural "start at beginning" flow

---

## Recommended Implementation Plan

### Phase 1: Fix Timeline Reset (High Priority)
**Effort:** 2 minutes  
**Risk:** Low  
**Impact:** Immediate UX improvement

**Steps:**
1. Change line 247 from `[data, options, isLoaded]` to `[data, options.coordinatesType, isLoaded]`
2. Test: Toggle projection settings while animation is running
3. Verify: Timeline doesn't reset, satellite continues moving
4. Test edge cases: Change coordinate type, verify it DOES re-process data

### Phase 2: Fix Initial Position (Medium Priority)
**Effort:** 2 minutes  
**Risk:** Low (might reveal why it was designed this way?)  
**Impact:** Better first impression, natural flow

**Steps:**
1. Change lines 122-128 to use `startTimestamp` instead of `endTimestamp`
2. Test: Reload panel with data
3. Verify: Satellite appears at START of trajectory
4. Press play: Animation goes forward naturally
5. Observe: Any unexpected behavior? (If so, document why end was chosen)

### Phase 3: Cleanup Debug Logs (Optional)
**Effort:** 5 minutes  
**Risk:** None  
**Impact:** Cleaner console

**Steps:**
1. Remove or comment out extensive console.log statements (lines 96-245)
2. Keep only critical error logging
3. Or wrap in a debug flag: `if (DEBUG) console.log(...)`

---

## Testing Checklist

### After Phase 1 (Timeline Reset Fix)
- [ ] Toggle "Show Z-Axis Projection" while animation is playing
  - Timeline should NOT reset
  - Satellite should continue moving smoothly
- [ ] Toggle "Show FOV Footprint" while animation is playing
  - Timeline should NOT reset
  - Camera position should NOT reset
- [ ] Adjust FOV angle slider
  - Timeline should NOT reset
  - Polygon should update smoothly
- [ ] Change trajectory color
  - Timeline should NOT reset
- [ ] Change coordinate type (Geodetic → Cartesian)
  - Timeline SHOULD reset (this is expected, data is re-processed)
- [ ] Reload panel, verify data still loads correctly

### After Phase 2 (Initial Position Fix)
- [ ] Load panel with fresh data
  - Satellite should appear at START of trajectory (first data point)
  - Press play: should move forward through trajectory
  - Press reverse: should move backward (expected for going to earlier time)
- [ ] With 100-point dataset (3 hours):
  - Timeline should be at 16:10 (start time, not 19:10 end time)
  - Satellite should be at initial orbit position
- [ ] Verify trajectory path is still visible (not affected by change)
- [ ] Verify projections still work at start position

---

## Potential Side Effects & Risks

### Risk 1: Breaking Something That Depends on End-Time Start
**Likelihood:** Low  
**Mitigation:** Test thoroughly, check original plugin docs/issues  
**Recovery:** Revert to `endTimestamp`, document why it's needed

### Risk 2: Coordinate Type Might Not Be Only Relevant Option
**Likelihood:** Medium  
**Impact:** Some setting changes might not trigger data re-processing  
**Mitigation:** Review all options, add relevant ones to dependency array  
**Example:** If `modelAssetId` affects data processing, add it

### Risk 3: Users Accustomed to Current Behavior
**Likelihood:** Low (you're the primary user)  
**Impact:** Minor confusion if others are used to reverse playback  
**Mitigation:** Can make it configurable if needed

---

## Future Enhancements (Out of Scope)

### 1. Configurable Initial Time
Add a panel setting:
```typescript
.addRadio({
  path: 'initialTimePosition',
  name: 'Initial Time Position',
  description: 'Where to start the animation timeline',
  settings: {
    options: [
      { value: 'start', label: 'Start of trajectory' },
      { value: 'end', label: 'End of trajectory' },
      { value: 'middle', label: 'Middle of trajectory' },
      { value: 'current', label: 'Current time (from Grafana)' },
    ],
  },
  defaultValue: 'start',
})
```

### 2. Remember Timeline Position
Store current time in component state, restore it when data refreshes:
```typescript
const [savedTime, setSavedTime] = useState<JulianDate | null>(null);

// On data refresh, restore time if within new data range
if (savedTime && isWithinNewDataRange(savedTime, startTimestamp, endTimestamp)) {
  setTimestamp(savedTime);
} else {
  setTimestamp(JulianDate.fromDate(new Date(startTimestamp)));
}
```

### 3. Auto-Play on Load
Add option to automatically start playing animation when panel loads:
```typescript
.addBooleanSwitch({
  path: 'autoPlay',
  name: 'Auto-play animation',
  description: 'Automatically start playing the animation when the panel loads',
  defaultValue: false,
})
```

---

## Decision Record

### Why Not Fix Data Order?
- Data order doesn't affect the issue
- Reversing data would add complexity
- Timestamps, not array indices, determine position
- **Decision:** Don't modify data order

### Why Not Make It Configurable Immediately?
- YAGNI (You Ain't Gonna Need It)
- Simple fix solves 99% of use cases
- Can add configurability later if requested
- **Decision:** Start with simple "start timestamp" fix

### Why Narrow Dependencies vs Other Solutions?
- **Considered:** Use `useMemo` for data processing
  - Pro: More React-idiomatic
  - Con: 160+ lines of processing logic is complex for memo
- **Considered:** Split data processing into separate hooks
  - Pro: Better separation of concerns
  - Con: Over-engineering for current needs
- **Decision:** Narrow dependencies - simplest, most direct fix

---

## Summary

**Two distinct issues, two simple fixes:**

1. **Timeline resets on toggle:**
   - Change: `}, [data, options, isLoaded]);`
   - To: `}, [data, options.coordinatesType, isLoaded]);`
   - Result: Timeline persists across setting changes

2. **Starts at end of trajectory:**
   - Change: `setTimestamp(JulianDate.fromDate(new Date(endTimestamp)));`
   - To: `setTimestamp(JulianDate.fromDate(new Date(startTimestamp)));`
   - Result: Natural animation flow

**Total effort:** < 5 minutes  
**Risk:** Low  
**Reward:** Much better UX! 🎯

Ready to implement when you give the green light! 🚀

