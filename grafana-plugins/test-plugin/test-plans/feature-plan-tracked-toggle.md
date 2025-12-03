# Feature Plan: Tracked Mode Toggle Button

## Overview
Add a button on the panel UI to switch between "tracked" (camera follows satellite) and "untracked" (free camera) modes.

---

## Current Behavior
- `tracked={true}` is hardcoded on the Entity (line ~319)
- Camera always follows the satellite
- Zoom is limited when tracking

---

## Proposed Behavior
- Toggle button visible on the panel
- Click to switch between tracked/untracked
- Live switching (no reload needed)
- Visual indicator showing current mode

---

## Technical Approach

### Step 1: Add State Variable
```tsx
// Add to existing state variables (around line 64)
const [isTracked, setIsTracked] = useState<boolean>(true);
```

**Why this works**: React's useState allows live updates. Changing `isTracked` triggers a re-render, updating the Entity's `tracked` prop.

### Step 2: Connect State to Entity
```tsx
// Change from:
tracked={true}

// To:
tracked={isTracked}
```

### Step 3: Add Toggle Button (Overlay on Panel)
```tsx
// Add inside the wrapper div, before or after the Viewer
<button
  onClick={() => setIsTracked(!isTracked)}
  style={{
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 1000,
    padding: '8px 12px',
    cursor: 'pointer',
  }}
>
  {isTracked ? '🎯 Tracking ON' : '🌍 Free Camera'}
</button>
```

---

## File to Modify
`grafana-plugins/3d-orbit-attitude-plugin/src/components/SatelliteVisualizer.tsx`

---

## Changes Summary

| Location | Change |
|----------|--------|
| Line ~64 (state declarations) | Add `const [isTracked, setIsTracked] = useState<boolean>(true);` |
| Line ~319 (Entity prop) | Change `tracked={true}` to `tracked={isTracked}` |
| Line ~288-297 (wrapper div) | Add toggle button element inside the div |

---

## Considerations

### Do we need a hook?
**No.** Simple `useState` is sufficient. The state change triggers React re-render, which updates the `tracked` prop on the Entity component.

### Will it work live?
**Yes.** Resium/Cesium handles prop changes. When `tracked` changes from `true` to `false`, Cesium will:
- Stop following the entity
- Release camera to user control

When switching back to `true`:
- Camera will snap back to follow the entity

### Potential Issues
1. **Camera position on switch-off**: When untracking, camera stays where it is (good)
2. **Camera snap on switch-on**: When re-tracking, camera may "jump" to satellite (expected behavior)
3. **Button styling**: May need to match Grafana's theme (can improve later)

---

## Future Enhancements (Not for this iteration)
- Add to panel settings (Options builder) for persistence
- Remember last state between sessions
- Smooth camera transition when switching modes
- Add keyboard shortcut (e.g., 'T' for toggle)

---

## Estimated Effort
- **Lines of code**: ~10-15
- **Risk**: Low (isolated change)
- **Testing**: Manual - toggle and verify camera behavior

---

## Ready for Development
✅ Plan approved? Proceed with implementation.

