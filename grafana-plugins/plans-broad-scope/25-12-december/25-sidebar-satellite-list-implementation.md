# Sidebar Satellite List Implementation Plan

**Date**: December 16, 2025  
**Goal**: Add scrollable satellite list to sidebar with visibility toggles

---

## Deferred Features (Brief Consideration)

### 1. **Satellite Selection for Tracking** (Future)
- Visual hint: Highlight currently tracked satellite with different background color or icon (🎯)
- Implementation: Click satellite row → `setTrackedSatelliteId(satellite.id)` + enable tracking mode
- State already exists: `trackedSatelliteId` and `isTracked`

### 2. **Satellite-Specific Settings** (Future)
- Right-click context menu with options: Change color, Hide sensors, Copy ID, etc.
- Could use browser native context menu or custom React component
- Alternative: Expandable accordion under each satellite showing settings inline

---

## Current Implementation: Satellite List with Visibility Toggles

### Design Decision: Name vs ID

**Choice: Use `name` as primary, show `id` as subtitle**

Why:
- ✅ Name is human-readable ("ISS", "Hubble", "Starlink-4021")
- ✅ ID is useful for debugging/technical users
- ✅ Both shown = best of both worlds

Visual:
```
┌────────────────────────────┐
│ ◉ ISS                      │  ← name (bold)
│   sat-3                    │  ← id (small, gray)
├────────────────────────────┤
│ ◉ Hubble Space Telescope   │
│   sat-2                    │
└────────────────────────────┘
```

---

## Implementation Structure

### Phase 1: Basic List (No Scrolling)

**Goal**: Display all satellites with visibility toggles

```tsx
<div className={styles.sidebarContent}>
  <h3 className={styles.sidebarTitle}>Satellites</h3>
  
  <div className={styles.satelliteList}>
    {satellites.map((satellite) => (
      <div key={satellite.id} className={styles.satelliteItem}>
        <button
          className={styles.visibilityToggle}
          onClick={() => toggleSatelliteVisibility(satellite.id)}
        >
          {isSatelliteVisible(satellite.id) ? '◉' : '○'}
        </button>
        
        <div className={styles.satelliteInfo}>
          <div className={styles.satelliteName}>{satellite.name}</div>
          <div className={styles.satelliteId}>{satellite.id}</div>
        </div>
      </div>
    ))}
  </div>
</div>
```

**State Management**:
```tsx
const [hiddenSatellites, setHiddenSatellites] = useState<Set<string>>(new Set());

const toggleSatelliteVisibility = (satelliteId: string) => {
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

const isSatelliteVisible = (satelliteId: string) => {
  return !hiddenSatellites.has(satelliteId);
};
```

**Conditional Rendering**:
```tsx
// In satellite rendering loop
{satellites
  .filter(sat => !hiddenSatellites.has(sat.id))
  .map((satellite) => (
    <Entity key={satellite.id} ...>
      {/* Satellite model, trajectory, sensors, etc. */}
    </Entity>
  ))
}
```

---

### Phase 2: Scrollable List

**CSS for Scrolling**:
```css
.sidebarContent {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebarTitle {
  flex-shrink: 0; /* Don't scroll the title */
  padding: 16px;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.satelliteList {
  flex: 1; /* Take remaining space */
  overflow-y: auto; /* Enable vertical scrolling */
  overflow-x: hidden;
  padding: 8px;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
}
```

---

### Phase 3: Visual Hints for Tracked Satellite

**Add subtle indication**:
```tsx
<div 
  key={satellite.id} 
  className={cx(
    styles.satelliteItem,
    trackedSatelliteId === satellite.id && isTracked && styles.tracked
  )}
>
  <button className={styles.visibilityToggle}>
    {isSatelliteVisible(satellite.id) ? '◉' : '○'}
  </button>
  
  <div className={styles.satelliteInfo}>
    <div className={styles.satelliteName}>
      {satellite.name}
      {trackedSatelliteId === satellite.id && isTracked && (
        <span className={styles.trackingIcon}> 🎯</span>
      )}
    </div>
    <div className={styles.satelliteId}>{satellite.id}</div>
  </div>
</div>
```

**CSS for tracked state**:
```css
.satelliteItem {
  display: flex;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.tracked {
    background: rgba(76, 175, 80, 0.15); /* Green tint */
    border-left: 3px solid #4CAF50;
    padding-left: 5px;
  }
}
```

---

## Complete CSS Styling

```css
.sidebar {
  width: 0;
  height: 100%;
  background: rgba(30, 30, 30, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  z-index: 999;
  
  &.open {
    width: 320px;
  }
}

.sidebarContent {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebarTitle {
  flex-shrink: 0;
  padding: 16px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.satelliteList {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
}

.satelliteItem {
  display: flex;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.2s ease, border-left 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.tracked {
    background: rgba(76, 175, 80, 0.15);
    border-left: 3px solid #4CAF50;
    padding-left: 5px;
  }
}

.visibilityToggle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-right: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.7);
  padding: 0;
  transition: color 0.2s ease, transform 0.1s ease;
  
  &:hover {
    color: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.satelliteInfo {
  flex: 1;
  min-width: 0; /* Allow text truncation */
}

.satelliteName {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.satelliteId {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trackingIcon {
  font-size: 12px;
  margin-left: 4px;
}

.emptyState {
  padding: 32px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}
```

---

## State & Logic Updates

### 1. New State Variable
```tsx
const [hiddenSatellites, setHiddenSatellites] = useState<Set<string>>(new Set());
```

### 2. Visibility Functions
```tsx
const toggleSatelliteVisibility = (satelliteId: string) => {
  setHiddenSatellites(prev => {
    const next = new Set(prev);
    if (next.has(satelliteId)) {
      next.delete(satelliteId);
      console.log(`👁️ Showing satellite: ${satelliteId}`);
    } else {
      next.add(satelliteId);
      console.log(`🙈 Hiding satellite: ${satelliteId}`);
    }
    return next;
  });
};

const isSatelliteVisible = (satelliteId: string) => {
  return !hiddenSatellites.has(satelliteId);
};
```

### 3. Filter Satellites in Rendering
```tsx
// Apply filter to all satellite rendering loops
{satellites
  .filter(sat => !hiddenSatellites.has(sat.id))
  .map((satellite) => (
    // Entity components
  ))
}
```

**Apply to**:
- Main satellite entities
- Trajectory paths
- Attitude vectors
- Sensor cones
- FOV footprints
- Celestial FOV projections

---

## Edge Cases & Considerations

### 1. **Empty State**
```tsx
{satellites.length === 0 ? (
  <div className={styles.emptyState}>
    No satellites available
  </div>
) : (
  <div className={styles.satelliteList}>
    {/* Satellite items */}
  </div>
)}
```

### 2. **Hide Tracked Satellite**
**Question**: Should we allow hiding the currently tracked satellite?

**Answer**: Yes, but:
- Show warning icon (⚠️) in visibility toggle
- Or: Automatically disable tracking mode when hiding tracked satellite

```tsx
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

### 3. **Persistence** (Future Enhancement)
Save hidden satellites to localStorage:
```tsx
useEffect(() => {
  const saved = localStorage.getItem('hiddenSatellites');
  if (saved) {
    setHiddenSatellites(new Set(JSON.parse(saved)));
  }
}, []);

useEffect(() => {
  localStorage.setItem('hiddenSatellites', JSON.stringify([...hiddenSatellites]));
}, [hiddenSatellites]);
```

### 4. **Long Satellite Names**
CSS `text-overflow: ellipsis` handles truncation with tooltip for full name:
```tsx
<div 
  className={styles.satelliteName}
  title={satellite.name} // Browser tooltip on hover
>
  {satellite.name}
</div>
```

---

## Performance Considerations

### 1. **Filtering Efficiency**
Using `Set.has()` for visibility check is O(1), very efficient even with many satellites.

### 2. **Re-render Optimization**
Wrap functions in `useCallback` to prevent unnecessary re-renders:
```tsx
const toggleSatelliteVisibility = useCallback((satelliteId: string) => {
  setHiddenSatellites(prev => {
    const next = new Set(prev);
    if (next.has(satelliteId)) {
      next.delete(satelliteId);
    } else {
      next.add(satelliteId);
    }
    return next;
  });
}, []);

const isSatelliteVisible = useCallback((satelliteId: string) => {
  return !hiddenSatellites.has(satelliteId);
}, [hiddenSatellites]);
```

### 3. **Virtual Scrolling** (Only if 50+ satellites)
For very large lists, consider `react-window` or `react-virtual`:
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={satellites.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* Satellite item */}
    </div>
  )}
</FixedSizeList>
```

**Decision**: Skip for now. Only implement if user has 50+ satellites.

---

## Implementation Phases

### ✅ Phase 1: Basic Structure (15 min)
- [x] Add `hiddenSatellites` state
- [x] Add toggle functions
- [x] Add sidebar content container
- [x] Add satellite list with visibility buttons

### ✅ Phase 2: Styling (10 min)
- [x] Add CSS for satellite items
- [x] Add visibility toggle button styles
- [x] Add hover effects

### ✅ Phase 3: Scrolling (5 min)
- [x] Add flexbox layout
- [x] Add overflow-y: auto
- [x] Add custom scrollbar styles

### ✅ Phase 4: Filter Rendering (10 min)
- [x] Apply `.filter()` to all satellite rendering loops
- [x] Test visibility toggling

### 🔮 Phase 5: Polish (5 min)
- [x] Add tracking indicator (🎯 icon)
- [x] Add empty state
- [x] Add tooltips for long names

### 🔮 Phase 6: Edge Cases (5 min)
- [x] Handle hiding tracked satellite
- [x] Add console logs for debugging

**Total Time Estimate**: ~50 minutes

---

## Testing Strategy

### Manual Tests

1. **Basic Visibility**
   - [ ] Open sidebar
   - [ ] See all 3 satellites listed
   - [ ] Click visibility toggle (◉ → ○)
   - [ ] Satellite disappears from scene
   - [ ] Click again (○ → ◉)
   - [ ] Satellite reappears

2. **Scrolling** (with >5 satellites)
   - [ ] Add more satellites to test data
   - [ ] Verify scrollbar appears
   - [ ] Verify smooth scrolling

3. **Tracking Indicator**
   - [ ] Enable tracking mode (🎯)
   - [ ] Verify tracked satellite has green highlight + icon

4. **Hide Tracked Satellite**
   - [ ] Track satellite
   - [ ] Hide it
   - [ ] Verify tracking mode disabled
   - [ ] Verify free camera activated

5. **Long Names**
   - [ ] Add satellite with very long name
   - [ ] Verify ellipsis appears
   - [ ] Hover to see full name in tooltip

---

## Files to Modify

### 1. `src/components/SatelliteVisualizer.tsx`
- Add state: `hiddenSatellites`
- Add functions: `toggleSatelliteVisibility`, `isSatelliteVisible`
- Update sidebar JSX to include satellite list
- Add filter to all satellite rendering loops

### 2. `src/components/SatelliteVisualizer.tsx` (CSS in `getStyles()`)
- Add styles for all new classes

**No new files needed!** Everything goes in existing component.

---

## Code Preview

### Sidebar JSX
```tsx
<div className={cx(styles.sidebar, isSidebarOpen && 'open')}>
  <div className={styles.sidebarContent}>
    <h3 className={styles.sidebarTitle}>Satellites</h3>
    
    {satellites.length === 0 ? (
      <div className={styles.emptyState}>
        No satellites available
      </div>
    ) : (
      <div className={styles.satelliteList}>
        {satellites.map((satellite) => (
          <div 
            key={satellite.id} 
            className={cx(
              styles.satelliteItem,
              trackedSatelliteId === satellite.id && isTracked && styles.tracked
            )}
          >
            <button
              className={styles.visibilityToggle}
              onClick={() => toggleSatelliteVisibility(satellite.id)}
              title={isSatelliteVisible(satellite.id) ? 'Hide satellite' : 'Show satellite'}
            >
              {isSatelliteVisible(satellite.id) ? '◉' : '○'}
            </button>
            
            <div className={styles.satelliteInfo}>
              <div className={styles.satelliteName} title={satellite.name}>
                {satellite.name}
                {trackedSatelliteId === satellite.id && isTracked && (
                  <span className={styles.trackingIcon}>🎯</span>
                )}
              </div>
              <div className={styles.satelliteId} title={satellite.id}>
                {satellite.id}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

### Filtered Rendering Example
```tsx
{/* Main Satellite Entities - Multiple satellites support */}
{satellites
  .filter(sat => !hiddenSatellites.has(sat.id))
  .map((satellite) => (
    <Entity
      key={satellite.id}
      id={satellite.id}
      name={satellite.name}
      availability={satellite.availability}
      position={satellite.position}
      orientation={satellite.orientation}
      tracked={isTracked && trackedSatelliteId === satellite.id}
    >
      {/* Model, trajectory, sensors, etc. */}
    </Entity>
  ))
}
```

---

## Visual Design Mockup

```
┌─────────────────────────────────────┐
│ Satellites                          │  ← Title (fixed)
├─────────────────────────────────────┤
│ ◉  ISS                          🎯  │  ← Tracked (green highlight)
│    sat-3                            │
├─────────────────────────────────────┤
│ ○  Hubble Space Telescope           │  ← Hidden (gray)
│    sat-2                            │
├─────────────────────────────────────┤
│ ◉  Starlink-4021                    │  ← Visible (normal)
│    sat-1                            │
└─────────────────────────────────────┘
 ↑
 Visibility toggle: ◉ = visible, ○ = hidden
```

---

## Summary

**What we're building**:
- Scrollable satellite list in sidebar
- Visibility toggle (◉/○) for each satellite
- Show satellite name + ID
- Indicate tracked satellite with 🎯 icon and green highlight
- Filter all rendering based on visibility

**What we're NOT building yet**:
- Click to track satellite (deferred)
- Right-click context menu (deferred)
- Satellite-specific settings (deferred)

**Complexity**: Medium  
**Time**: ~50 minutes  
**Confidence**: 95%

Ready to implement! 🚀

