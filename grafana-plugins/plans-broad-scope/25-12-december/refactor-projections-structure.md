# Projection Features Refactor & Structure Plan

**Date:** December 9, 2025  
**Status:** Planning Phase  
**Scope:** Refactor projected vector & FOV footprint, add panel toggles, plan src structure

---

## Current State Assessment

### What We Have Now
- **Single monolithic file:** `SatelliteVisualizer.tsx` (~616 lines)
- **Inline projection logic:** Z-axis projection and FOV footprint computed directly in JSX `CallbackProperty`
- **No UI controls:** Projections are always visible when satellite data exists
- **Features implemented:**
  - Red arrow (Z-axis attitude vector)
  - Yellow line + point (Z-axis ground intersection)
  - Red polygon (5° FOV footprint)

### What's Getting Messy
1. **Large `CallbackProperty` closures** - complex calculations buried in render logic
2. **Hard to maintain** - finding/modifying projection code requires scrolling through 600+ lines
3. **No user control** - can't toggle projections on/off
4. **Will get worse** - more features = more chaos

---

## Proposed Refactor Strategy

### Phase 1: Extract Projection Utilities (Small, Focused)
**Goal:** Move calculation logic out of JSX into pure functions

**Create:** `src/utils/projections.ts`

```typescript
// Pure functions for projection calculations
export function computeZAxisGroundIntersection(
  position: Cartesian3,
  orientation: Quaternion
): Cartesian3 | null {
  // Ray casting logic here
  // Returns ground point or null
}

export function computeFOVFootprint(
  position: Cartesian3,
  orientation: Quaternion,
  halfAngleDegrees: number,
  numRays: number = 20
): Cartesian3[] {
  // Cone intersection logic here
  // Returns array of ground points
}
```

**Benefits:**
- ✅ Testable (can write unit tests later)
- ✅ Reusable (other plugins can import)
- ✅ Readable (clear function signatures)
- ✅ Easy to modify (isolated from rendering)

### Phase 2: Add Panel Settings Toggles
**Goal:** User control over projection visibility

**Modify:** `src/module.ts` to add options:

```typescript
.addBooleanSwitch({
  path: 'showZAxisProjection',
  name: 'Show Z-Axis Ground Projection',
  description: 'Display yellow line and point where Z-axis intersects Earth',
  defaultValue: true,
})
.addBooleanSwitch({
  path: 'showFOVFootprint',
  name: 'Show FOV Footprint',
  description: 'Display sensor field-of-view projection on Earth surface',
  defaultValue: true,
})
.addNumberInput({
  path: 'fovHalfAngle',
  name: 'FOV Half-Angle (degrees)',
  description: 'Sensor cone half-angle for footprint calculation',
  defaultValue: 5,
  settings: {
    min: 1,
    max: 45,
    step: 1,
  },
  showIf: (config) => config.showFOVFootprint,
})
```

**Benefits:**
- ✅ Users can hide projections if not needed (performance/clarity)
- ✅ Adjustable FOV angle (different sensors have different FOVs)
- ✅ Settings only show when relevant (`showIf`)

### Phase 3: Refactor Rendering (Optional, Phase 3+)
**Goal:** Extract projection rendering into sub-components

**Create:** `src/components/projections/` (only if SatelliteVisualizer gets >800 lines)

```
src/components/projections/
  ├── ZAxisProjection.tsx   // Yellow line + point
  └── FOVFootprint.tsx      // Red polygon
```

**When to do this?**
- ⏸️ **NOT NOW** - current file is manageable at 616 lines
- ⏸️ **WAIT UNTIL** - SatelliteVisualizer exceeds ~800 lines or we add 3+ more projection types
- ⏸️ **REASON** - Premature abstraction = harder to change, more files to navigate

---

## Recommended Src Structure (Grow Organically)

### Current Structure (Good for now)
```
src/
├── components/
│   └── SatelliteVisualizer.tsx    (~616 lines)
├── static/
│   └── models/
│       └── ACRIMSAT-A.glb
└── module.ts
```

### Near-Term Structure (After Phase 1-2)
```
src/
├── components/
│   └── SatelliteVisualizer.tsx    (~500 lines, slimmed down)
├── utils/
│   └── projections.ts             (NEW - pure calculation functions)
├── static/
│   └── models/
│       └── ACRIMSAT-A.glb
└── module.ts
```

### Future Structure (If we hit ~1000+ lines total, add 5+ features)
```
src/
├── components/
│   ├── SatelliteVisualizer.tsx    (main orchestrator)
│   ├── projections/               (ONLY if needed)
│   │   ├── ZAxisProjection.tsx
│   │   ├── FOVFootprint.tsx
│   │   └── index.ts
│   └── overlays/                  (future: info panels, controls)
├── utils/
│   ├── projections.ts
│   ├── quaternions.ts             (future: if quaternion math gets complex)
│   └── cesium-helpers.ts          (future: common Cesium utilities)
├── types/
│   └── satellite.ts               (future: shared TypeScript interfaces)
├── static/
│   └── models/
│       └── ACRIMSAT-A.glb
└── module.ts
```

---

## Organization Philosophy: "Add Subdirs When Pain Emerges"

### ✅ Good Reasons to Create a Subdir
1. **>5 related files** in the same category (e.g., 5 projection components)
2. **Naming conflicts** (e.g., `UserSettings.tsx` vs `PanelSettings.tsx` - use subdirs)
3. **Clear conceptual boundary** (e.g., "all projection rendering" or "all data processing")
4. **Reusability** (e.g., `utils/` for functions used in multiple components)

### ❌ Bad Reasons to Create a Subdir
1. **"Might need it later"** - YAGNI (You Ain't Gonna Need It)
2. **Copying structure from huge projects** - we're not Google, don't need their org
3. **One file per subdir** - pointless navigation overhead
4. **"Best practices say so"** - best practices for 100k LOC don't apply to 600 LOC

### 🎯 Sweet Spot Rules
- **Flat until painful** - keep `components/` flat until you have >7 component files
- **Utils for pure functions** - if a function has no React/Cesium dependencies, it's a util
- **Types only when shared** - if 3+ files use the same interface, extract to `types/`
- **Test by feel** - if you struggle to find a file, time to organize; if you find it fast, don't touch it

---

## Implementation Phases

### Phase 1: Extract Utils + Add Settings (RECOMMENDED NOW)
**Effort:** ~30 minutes  
**Risk:** Low (pure refactor, no behavior change)  
**Value:** High (sets up good patterns, adds user control)

**Steps:**
1. Create `src/utils/projections.ts`
2. Extract projection calculation logic into pure functions
3. Update `SatelliteVisualizer.tsx` to call these functions in `CallbackProperty`
4. Add 3 settings to `module.ts` (2 booleans, 1 number)
5. Wire up settings to conditionally render projection entities
6. Test: toggle settings, adjust FOV angle

**Result:**
- Cleaner component file (~500 lines)
- User control over projections
- Easy to add more projection types later

### Phase 2: Component Extraction (SKIP FOR NOW)
**When:** If `SatelliteVisualizer.tsx` exceeds ~800 lines  
**Trigger:** Adding 3+ more projection types OR file becomes hard to navigate  
**Steps:** Extract `<ZAxisProjection />` and `<FOVFootprint />` sub-components

---

## Additional Features to Consider (Future)

Once refactor is done, these become easier to add:

### Easy Additions (With Current Structure)
- **Multiple FOV cones** - add array of FOV configs in settings
- **FOV color customization** - add color picker settings
- **Swath visualization** - show ground track swath (similar to FOV but along trajectory)
- **Ground station visibility cones** - show which ground stations can "see" the satellite

### Medium Additions (May Trigger Component Extraction)
- **Solar panel projections** - show solar panel vectors
- **Communication link lines** - lines to ground stations when in view
- **Orbital plane visualization** - show orbital plane disk

### Complex Additions (Would Require New Structure)
- **Multiple satellites** - array of satellite data, each with projections
- **Real-time data streaming** - WebSocket integration for live telemetry
- **Collision avoidance zones** - 3D spheres around satellites

---

## Recommendations Summary

### Do Now (Phase 1)
✅ Extract projection calculations to `src/utils/projections.ts`  
✅ Add 3 panel settings (toggle Z-axis, toggle FOV, FOV angle)  
✅ Conditional rendering based on settings  

### Do Later (When Needed)
⏸️ Create `src/components/projections/` subdirectory (wait until >800 lines)  
⏸️ Create `src/types/` (wait until 3+ files share interfaces)  
⏸️ Extract sub-components (wait until navigation becomes hard)

### Don't Do (Unless Specific Need)
❌ Don't create deep folder hierarchies preemptively  
❌ Don't extract components "just because"  
❌ Don't create single-file subdirectories  

---

## Questions to Answer During Implementation

1. **Should FOV angle be per-panel or per-session?**
   - Per-panel (in `module.ts`) = different dashboards can have different FOVs ✅
   - Per-session (hardcoded) = simpler but less flexible

2. **Should dummy triangles be hidden or transparent?**
   - Hidden (`show={false}`) = cleaner, but adds complexity
   - Transparent (`alpha=0`) = simpler, but Cesium still processes them

3. **Should we add color pickers for projections now?**
   - Yes = more user control, slightly more code
   - No = keep it simple, colors can be hardcoded for now ✅ (Recommended)

4. **Should projection utilities throw errors or return null?**
   - Return null = safer, caller handles edge cases ✅ (Recommended)
   - Throw errors = easier debugging, but could crash rendering

---

## Success Criteria

### After Phase 1, We Should Have:
- ✅ `src/utils/projections.ts` with 2 pure functions
- ✅ `SatelliteVisualizer.tsx` reduced to ~500 lines
- ✅ Panel settings with 3 new options (2 toggles, 1 slider)
- ✅ Projections can be toggled on/off in Grafana UI
- ✅ FOV angle adjustable from 1° to 45°
- ✅ No bugs introduced (projections still look/work the same)
- ✅ Code easier to read and modify

### Long-Term Success (6+ Months)
- ✅ Can add new projection types in <1 hour
- ✅ `SatelliteVisualizer.tsx` never exceeds 1000 lines
- ✅ No "where is this feature?" confusion
- ✅ New developers understand structure in <10 minutes

---

## Conclusion

**You're asking for exactly the right thing at exactly the right time.** 🎯

- ✅ **Feasible?** Yes, Phase 1 is straightforward and low-risk
- ✅ **Worth it?** Absolutely - prevents future mess, adds user value
- ✅ **Too much at once?** No - extracting utils + adding settings is a natural pairing
- ✅ **Structure philosophy?** Grow organically, add subdirs when pain emerges

**Recommended Action:**  
Proceed with **Phase 1 only** (utils + settings). Skip component extraction until needed. This gives you immediate benefits without over-engineering.

Let me know when you're ready and I'll implement Phase 1! 🚀

