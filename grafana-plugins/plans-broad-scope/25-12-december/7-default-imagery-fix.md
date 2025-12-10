# Default Imagery Layer Fix

**Date:** December 9, 2025  
**Issue:** Default imagery requires payment, doesn't persist on reload  
**Goal:** Use free Stadia Alidade Smooth Dark by default

---

## Problem Summary

1. **Current default:** Cesium World Imagery or Bing Maps (requires API key/payment)
2. **User workaround:** Manually select "Stadia Alidade Smooth Dark" from BaseLayerPicker every reload
3. **Persistence issue:** Selection doesn't save with dashboard

---

## Solution Approach

### Step 1: Change Default Imagery (Quick Fix)

**Where:** `SatelliteVisualizer.tsx` - Viewer configuration

**Current (implicit):**
```typescript
<Viewer
  baseLayerPicker={options.showBaseLayerPicker}
  // Uses default Cesium imagery
/>
```

**New (explicit):**
```typescript
import { 
  OpenStreetMapImageryProvider,
  IonWorldImageryStyle,
  createWorldImageryAsync,
} from 'cesium';

// In component, before render:
const defaultImagery = new OpenStreetMapImageryProvider({
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
  // Note: Stadia might require attribution
});

<Viewer
  baseLayerPicker={options.showBaseLayerPicker}
  imageryProvider={defaultImagery}
/>
```

**OR use Cesium's built-in providers:**
```typescript
<Viewer
  baseLayerPicker={options.showBaseLayerPicker}
  imageryProvider={false} // Disable default
  // Then manually add Stadia via terrainProvider or baseLayer
/>
```

**Issue with this approach:**
- Stadia tiles might require API key or have usage limits
- Need to check if it's truly free

---

### Step 2: Make Selection Persistent (Better Solution)

**Add panel setting to store imagery choice:**

**In `types.ts`:**
```typescript
export interface SimpleOptions {
  // ... existing options
  
  defaultImageryProvider: string; // e.g., 'stadia-dark', 'osm', 'none'
}
```

**In `module.ts`:**
```typescript
.addRadio({
  path: 'defaultImageryProvider',
  name: 'Default Imagery',
  description: 'Base map imagery layer',
  settings: {
    options: [
      { value: 'stadia-dark', label: 'Stadia Alidade Smooth Dark' },
      { value: 'stadia-light', label: 'Stadia Alidade Smooth' },
      { value: 'osm', label: 'OpenStreetMap' },
      { value: 'none', label: 'No Imagery (Black)' },
    ],
  },
  defaultValue: 'stadia-dark',
})
```

**In `SatelliteVisualizer.tsx`:**
```typescript
const getImageryProvider = () => {
  switch (options.defaultImageryProvider) {
    case 'stadia-dark':
      return new OpenStreetMapImageryProvider({
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
      });
    case 'stadia-light':
      return new OpenStreetMapImageryProvider({
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/',
      });
    case 'osm':
      return new OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/',
      });
    case 'none':
      return false; // No imagery
    default:
      return undefined; // Cesium default
  }
};

<Viewer
  imageryProvider={getImageryProvider()}
  baseLayerPicker={options.showBaseLayerPicker}
/>
```

---

## Research Needed

**Before implementation, need to verify:**

1. **Is Stadia truly free?**
   - Check: https://stadiamaps.com/pricing/
   - May require API key for production use
   - Alternative: Use plain OpenStreetMap

2. **Does Cesium's Viewer accept custom imageryProvider?**
   - Check Resium's `<Viewer>` props
   - Verify it passes through to Cesium

3. **Will this override BaseLayerPicker?**
   - If BaseLayerPicker is enabled, does it reset to default?
   - May need to disable BaseLayerPicker to use custom imagery

---

## Recommended Implementation Order

### Phase 1: Quick Fix (5 minutes)
**Set a simple free default - OpenStreetMap**

```typescript
<Viewer
  imageryProvider={new OpenStreetMapImageryProvider({
    url: 'https://a.tile.openstreetmap.org/',
  })}
/>
```

**Pros:**
- ✅ Definitely free (OSM is open)
- ✅ No API key needed
- ✅ Works immediately

**Cons:**
- ⚠️ Not "Stadia Alidade Smooth Dark" specifically
- ⚠️ Still doesn't persist user changes

---

### Phase 2: Add Stadia Dark (10 minutes)
**If Stadia is free/no key needed:**

```typescript
<Viewer
  imageryProvider={new OpenStreetMapImageryProvider({
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
  })}
/>
```

**Need to test:** Does this work without API key?

---

### Phase 3: Make It Configurable (20 minutes)
**Add panel setting for imagery selection**

- Add `defaultImageryProvider` to types
- Add radio selection to module.ts
- Implement switch/case in component
- Now persists with dashboard save!

---

## Alternative: Disable BaseLayerPicker

**Simplest solution:**

```typescript
<Viewer
  baseLayerPicker={false} // Always hide picker
  imageryProvider={new OpenStreetMapImageryProvider({
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
  })}
/>
```

**Pros:**
- ✅ User can't change it (no confusion)
- ✅ Always uses free imagery
- ✅ No persistence issue

**Cons:**
- ❌ Less flexibility
- ❌ Can't switch between map styles in UI

---

## My Recommendation

**Step 1 (Immediate):**
Try Stadia URL directly, see if it works without API key:

```typescript
imageryProvider={new OpenStreetMapImageryProvider({
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
})}
```

**If that fails (needs API key):**
Fall back to plain OpenStreetMap:

```typescript
imageryProvider={new OpenStreetMapImageryProvider({
  url: 'https://a.tile.openstreetmap.org/',
})}
```

**Step 2 (If user wants persistence):**
Add panel setting to choose between imagery options.

---

## Questions for User

1. **Is BaseLayerPicker important?**
   - If no: We can disable it and hardcode Stadia
   - If yes: Need to add persistence via panel settings

2. **Is Stadia a hard requirement?**
   - If yes: Need to check if API key is needed
   - If no: OpenStreetMap is simpler and guaranteed free

3. **Preference:**
   - Quick fix (hardcode Stadia/OSM, no persistence)?
   - Or proper solution (add panel setting, full persistence)?

---

## Estimated Time

- **Phase 1 (Quick Fix):** 5 minutes
- **Phase 2 (Test Stadia):** 5 minutes
- **Phase 3 (Persistence):** 20 minutes

**Total for full solution:** ~30 minutes

---

## Next Steps

1. ✅ Create this plan
2. ⏸️ Get user approval
3. ⏸️ Implement Phase 1 (quick fix)
4. ⏸️ Test if Stadia works
5. ⏸️ Optionally add persistence

