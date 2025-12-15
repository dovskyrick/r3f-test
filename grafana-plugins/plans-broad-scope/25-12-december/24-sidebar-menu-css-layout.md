# Sidebar Menu Implementation & CSS Layout System

**Date**: December 15, 2025  
**Goal**: Implement a collapsible sidebar menu that pushes UI elements (not overlays)

---

## Overview

We want to add a sidebar menu to the panel that:
- ✅ Starts as an empty container (no logic yet)
- ✅ **Pushes** top-right corner buttons to the left (not overlay)
- ✅ **Can overlay** timeline (acceptable)
- ✅ Is collapsible (toggle open/closed)
- 🔮 Later: Contains satellite/sensor selection and color controls

---

## CSS Layout Fundamentals: Overlay vs Push

### 1. **Overlay Approach** (Elements stay under)

When elements have `position: absolute` or `position: fixed`, they are **removed from document flow**:

```css
.sidebar {
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
}

.other-elements {
  /* Stay in their original position */
  /* Sidebar covers them */
}
```

**Result**: Sidebar floats on top, other elements stay in place.

**Visual**:
```
┌──────────────────────────────┐
│  [Button]            ┌─────┐ │
│                      │     │ │  ← Button is UNDER sidebar
│  Content             │ S   │ │
│                      │ I   │ │
│  ════════════════════│ D   │ │
│  Timeline            │ E   │ │
│  ════════════════════│ B   │ │
└──────────────────────└─────┘ │
```

---

### 2. **Push Approach** (Elements move aside)

When using **flexbox** or **grid** with `position: relative` (or default `static`), elements stay in document flow:

```css
.container {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-content {
  flex: 1; /* Takes remaining space */
  /* Shrinks when sidebar opens */
}

.sidebar {
  width: 0; /* Collapsed */
  transition: width 0.3s ease;
}

.sidebar.open {
  width: 300px; /* Expanded */
}
```

**Result**: Main content shrinks, sidebar takes space from it.

**Visual**:
```
Collapsed:
┌──────────────────────────────┐
│  [Button]                    │
│                              │
│  Content                     │
│                              │
│  ══════════════════════════  │
│  Timeline                    │
│  ══════════════════════════  │
└──────────────────────────────┘

Expanded:
┌────────────────────┬─────────┐
│  [Button]          │         │
│                    │  S      │  ← Button moved left
│  Content           │  I      │
│  (shrunk)          │  D      │
│  ══════════════════│  E      │
│  Timeline          │  B      │  ← Timeline also shrunk
│  ══════════════════│  A      │
└────────────────────┴─────────┘
```

---

### 3. **Hybrid Approach** (Push some, overlay others)

Use flexbox for main layout, but make specific elements `position: absolute`:

```css
.container {
  display: flex;
}

.main-content {
  flex: 1;
  position: relative; /* For absolute children */
}

.button-in-corner {
  position: absolute; /* Removed from flex flow */
  top: 10px;
  right: 10px;
  z-index: 50;
  /* Will be pushed by sidebar if calculated correctly */
}

.sidebar {
  width: 300px;
  /* In flex flow, pushes .main-content */
}
```

**Key**: Buttons can be `absolute` but their **right** position must be **relative to parent width**.

---

## Current Grafana Panel Structure

Let me analyze the current structure:

### Viewer Container
```tsx
<Viewer> {/* Cesium viewer - full width/height */}
  {/* Cesium entities */}
</Viewer>
```

### Custom UI Overlay
```tsx
<button
  onClick={() => setIsTracked(!isTracked)}
  style={{
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 1000,
    // ... styles
  }}
>
  {isTracked ? '🎯 Tracking ON' : '🌍 Free Camera'}
</button>
```

**Current approach**: 
- Cesium viewer is full panel size
- Button is `position: absolute` with `right: 10px`
- **Problem**: Button is relative to panel, not to available space

---

## Recommended Sidebar Implementation

### Option A: Flexbox with Calculated Button Position (RECOMMENDED)

**Structure**:
```tsx
<div className={styles.panelContainer}>
  <div className={styles.mainContent}>
    <Viewer>
      {/* Cesium content */}
    </Viewer>
    
    {/* Buttons positioned relative to mainContent width */}
    <button
      className={styles.trackingButton}
      onClick={() => setIsTracked(!isTracked)}
    >
      {isTracked ? '🎯 Tracking ON' : '🌍 Free Camera'}
    </button>
  </div>
  
  <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
    {/* Empty for now, will contain satellite controls */}
  </div>
</div>
```

**CSS**:
```css
.panelContainer {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.mainContent {
  flex: 1; /* Takes remaining space after sidebar */
  position: relative;
  min-width: 0; /* Allows flex item to shrink below content size */
  transition: flex 0.3s ease;
}

.trackingButton {
  position: absolute;
  top: 10px;
  right: 10px; /* Relative to .mainContent, not panel */
  z-index: 1000;
  padding: 8px 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sidebar {
  width: 0; /* Collapsed by default */
  height: 100%;
  background: rgba(30, 30, 30, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: width 0.3s ease;
  z-index: 999;
}

.sidebar.open {
  width: 320px; /* Expanded width */
}
```

**Result**:
- Sidebar in flex layout → automatically pushes `.mainContent`
- `.mainContent` shrinks → Cesium viewer shrinks
- Button is `absolute` relative to `.mainContent` → button moves with content edge
- Timeline (if inside Cesium) also shrinks naturally

---

### Option B: Flexbox with Wrapper for Cesium

If Cesium viewer needs special handling:

```tsx
<div className={styles.panelContainer}>
  <div className={styles.mainContentWrapper}>
    <div className={styles.cesiumContainer}>
      <Viewer>{/* Cesium */}</Viewer>
    </div>
    
    <div className={styles.uiOverlay}>
      <button className={styles.trackingButton}>
        {isTracked ? '🎯 Tracking ON' : '🌍 Free Camera'}
      </button>
    </div>
  </div>
  
  <div className={styles.sidebar}>
    {/* Sidebar content */}
  </div>
</div>
```

**CSS**:
```css
.mainContentWrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.cesiumContainer {
  width: 100%;
  height: 100%;
}

.uiOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* Click through to Cesium */
  z-index: 500;
}

.trackingButton {
  position: absolute;
  top: 10px;
  right: 10px;
  pointer-events: auto; /* Button is clickable */
}
```

---

### Option C: Sidebar Overlays Timeline Only

To make sidebar overlay timeline but push other elements:

```css
.panelContainer {
  display: grid;
  grid-template-rows: 1fr auto; /* Main content, then timeline */
  grid-template-columns: 1fr auto; /* Main content, then sidebar */
  height: 100%;
}

.mainContent {
  grid-row: 1 / 2;
  grid-column: 1 / 2;
  position: relative;
}

.timeline {
  grid-row: 2 / 3;
  grid-column: 1 / 3; /* Spans both columns (under sidebar) */
  height: 60px;
  z-index: 100;
}

.sidebar {
  grid-row: 1 / 3; /* Spans both rows */
  grid-column: 2 / 3;
  width: 320px;
  z-index: 500; /* Above timeline */
}
```

**Result**: Sidebar only overlays timeline, not the main 3D view.

---

## Toggle Mechanism

### State Management
```tsx
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const toggleSidebar = () => {
  setIsSidebarOpen(!isSidebarOpen);
};
```

### Toggle Button (inside or outside sidebar)

**Option 1: Attached to sidebar edge**
```tsx
<div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
  <button className={styles.toggleButton} onClick={toggleSidebar}>
    {isSidebarOpen ? '→' : '←'}
  </button>
  
  {/* Sidebar content (empty for now) */}
</div>
```

```css
.toggleButton {
  position: absolute;
  left: -40px; /* Extends outside sidebar */
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 60px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-right: none;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  z-index: 1000;
}
```

**Option 2: Hamburger menu in top-right**
```tsx
<button className={styles.hamburgerButton} onClick={toggleSidebar}>
  ☰
</button>
```

---

## Grafana-Specific Considerations

### Using Grafana's useStyles2

Grafana panels use Emotion CSS with `useStyles2`:

```tsx
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';

const getStyles = (theme: GrafanaTheme2) => ({
  panelContainer: css`
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `,
  
  mainContent: css`
    flex: 1;
    position: relative;
    min-width: 0;
    transition: flex 0.3s ease;
  `,
  
  sidebar: css`
    width: 0;
    height: 100%;
    background: ${theme.colors.background.secondary};
    border-left: 1px solid ${theme.colors.border.weak};
    overflow: hidden;
    transition: width 0.3s ease;
    
    &.open {
      width: 320px;
    }
  `,
  
  trackingButton: css`
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    padding: ${theme.spacing(1, 2)};
    background: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
    border: none;
    border-radius: ${theme.shape.borderRadius()};
    cursor: pointer;
    
    &:hover {
      background: ${theme.colors.primary.shade};
    }
  `,
});

export const SatelliteVisualizer: React.FC<Props> = ({ ... }) => {
  const styles = useStyles2(getStyles);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <div className={styles.panelContainer}>
      <div className={styles.mainContent}>
        <Viewer>{/* Cesium */}</Viewer>
        <button className={styles.trackingButton} ...>
          ...
        </button>
      </div>
      
      <div className={`${styles.sidebar} ${isSidebarOpen ? 'open' : ''}`}>
        {/* Empty for now */}
      </div>
    </div>
  );
};
```

### Accessing Grafana Theme
```tsx
const styles = useStyles2(getStyles);
```

This gives you access to:
- `theme.colors.background.primary` - Main background
- `theme.colors.background.secondary` - Sidebar background
- `theme.colors.border.weak` - Subtle borders
- `theme.spacing(1, 2)` - Consistent spacing (8px, 16px)
- `theme.shape.borderRadius()` - Consistent border radius

---

## Animation & Performance

### Smooth Transitions
```css
.sidebar {
  transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.mainContent {
  transition: flex 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### Will-Change Optimization
```css
.sidebar {
  will-change: width; /* GPU acceleration hint */
}
```

### Avoiding Cesium Re-renders

When sidebar toggles, the Cesium viewer **will resize**. To prevent expensive re-initialization:

```tsx
<Viewer
  key={viewerKey} // Don't change this on sidebar toggle
  style={{ width: '100%', height: '100%' }}
>
  {/* Cesium automatically handles resize events */}
</Viewer>
```

Cesium's built-in resize observer will detect the container size change and update viewport accordingly.

---

## Z-Index Stack

Proper layering for all UI elements:

```
┌─ z-index: 2000 ─ Grafana Modals/Dialogs
│
├─ z-index: 1500 ─ Sidebar Toggle Button
│
├─ z-index: 1000 ─ Tracking Button (and other overlay buttons)
│
├─ z-index: 999  ─ Sidebar Panel
│
├─ z-index: 500  ─ UI Overlay Layer
│
├─ z-index: 100  ─ Cesium Timeline
│
└─ z-index: 1    ─ Cesium Viewer (default)
```

---

## Implementation Plan

### Phase 1: Basic Structure (Empty Sidebar)

1. **Wrap existing content**:
   ```tsx
   <div className={styles.panelContainer}>
     <div className={styles.mainContent}>
       {/* Existing Viewer + button */}
     </div>
     <div className={styles.sidebar}>
       {/* Empty for now */}
     </div>
   </div>
   ```

2. **Add toggle state**:
   ```tsx
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   ```

3. **Add toggle button**:
   ```tsx
   <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
     ☰
   </button>
   ```

4. **Add CSS classes** using `useStyles2`

### Phase 2: Verify Behavior

- [ ] Sidebar opens/closes smoothly
- [ ] Tracking button moves left when sidebar opens
- [ ] Cesium viewer resizes correctly
- [ ] No console errors
- [ ] Performance is smooth (60fps)

### Phase 3: Add Content (Future)

Later, populate sidebar with:
- Satellite list (tree structure)
- Sensor list (nested under satellites)
- Color pickers for each sensor
- Visibility toggles

---

## Common Pitfalls & Solutions

### Pitfall 1: Button Doesn't Move

**Problem**: Button is `position: absolute; right: 10px` relative to **panel**, not **mainContent**.

**Solution**: Make button a child of `.mainContent`:
```tsx
<div className={styles.mainContent}>
  <Viewer>...</Viewer>
  <button className={styles.trackingButton}>...</button>
</div>
```

---

### Pitfall 2: Cesium Viewer Doesn't Resize

**Problem**: Cesium needs explicit resize notification.

**Solution**: Cesium automatically handles resize via `ResizeObserver`. Just ensure container has valid `width` and `height`.

If issues persist:
```tsx
useEffect(() => {
  const viewer = viewerRef.current?.cesiumElement;
  if (viewer) {
    viewer.resize(); // Manual resize trigger
  }
}, [isSidebarOpen]);
```

---

### Pitfall 3: Sidebar Causes Horizontal Scroll

**Problem**: Flex container allows overflow.

**Solution**: Add `overflow: hidden` to parent:
```css
.panelContainer {
  overflow: hidden;
}
```

---

### Pitfall 4: Timeline Gets Covered

**Solution 1**: Accept it (user can zoom timeline).

**Solution 2**: Make timeline stick to bottom and extend under sidebar:
```css
.timeline {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0; /* Extends under sidebar */
  z-index: 50; /* Below sidebar */
}
```

---

## Accessibility Considerations

### Keyboard Navigation
```tsx
<button
  onClick={toggleSidebar}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleSidebar();
    }
  }}
  aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
  aria-expanded={isSidebarOpen}
>
  ☰
</button>
```

### Screen Reader Support
```tsx
<div
  className={styles.sidebar}
  role="complementary"
  aria-label="Satellite controls"
  aria-hidden={!isSidebarOpen}
>
  {/* Content */}
</div>
```

---

## Responsive Behavior (Optional)

If panel is very narrow, collapse sidebar automatically:

```tsx
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

useEffect(() => {
  const handleResize = () => {
    if (width < 800) {
      setIsSidebarOpen(false); // Auto-collapse on narrow screens
    }
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

## Summary

### Best Approach for This Use Case

**Flexbox with nested absolute button** (Option A):

```
Panel Container (flex)
├─ Main Content (flex: 1, relative)
│  ├─ Cesium Viewer (100% width/height)
│  └─ Tracking Button (absolute, top-right)
└─ Sidebar (width: 0 → 320px)
```

**Why**:
- ✅ Sidebar pushes content (not overlay)
- ✅ Button moves with content edge
- ✅ Timeline naturally shrinks (acceptable)
- ✅ Simple CSS with smooth animations
- ✅ No complex calculations
- ✅ Works with Grafana's styling system

**Estimated Implementation**: ~30 minutes for empty sidebar + toggle

---

## Next Steps

1. ✅ Implement basic flexbox structure
2. ✅ Add toggle button and state
3. ✅ Add empty sidebar with CSS
4. ✅ Test resizing behavior
5. 🔮 Later: Add satellite tree content
6. 🔮 Later: Add color pickers and controls

