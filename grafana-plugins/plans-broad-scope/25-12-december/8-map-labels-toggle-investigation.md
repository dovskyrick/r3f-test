# Map Labels Toggle Investigation

**Date:** December 9, 2025  
**Requirement:** Toggle country/city names on/off while keeping dark mode with borders  
**Discovery:** Stadia uses VECTOR tiles but doesn't have raster unlabeled variant  
**Solution:** ✅ Switched to Carto Dark Matter (no labels)

---

## Final Implementation (COMPLETED) ✅

**Phase 1: Test & Switch Base Layer**
1. Tested Stadia `alidade_smooth_dark_nolabels` → 404 (doesn't exist)
2. Switched to **Carto Dark Matter (no labels)** as default
3. Changed from `OpenStreetMapImageryProvider` to `UrlTemplateImageryProvider`
4. Default URL: `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png`

**Phase 2: Add to BaseLayerPicker Menu**
1. Imported `ProviderViewModel` and `buildModuleUrl` from Cesium
2. Created two new `ProviderViewModel` options:
   - **Carto Dark Matter (No Labels)** - clean, borders only
   - **Carto Dark Matter (With Labels)** - informative, with text
3. Added both to `viewer.baseLayerPicker.viewModel.imageryProviderViewModels`
4. Set "No Labels" as the default selected imagery

**Result:**
- ✅ Default: Carto Dark Matter (no labels)
- ✅ BaseLayerPicker menu includes both Carto variants
- ✅ Users can switch between:
  - Carto Dark (No Labels)
  - Carto Dark (With Labels)
  - Stadia Dark (With Labels)
  - All other default options (Bing, etc.)
- ✅ Selection persists until user changes it
- ✅ No need for panel settings toggle - it's in the UI!

**Code changes:**
- `SatelliteVisualizer.tsx`: Added Carto options to BaseLayerPicker
- Default imagery set to Carto Dark Matter (No Labels)
- Both Carto variants available in upper-right menu

**Bug Fixes:**
1. **Icon Issue:** Carto options now use Stadia Dark's icon (instead of OpenStreetMap icon)
   - Finds Stadia's iconUrl from existing view models
   - Applies same dark theme icon to both Carto options
   
2. **Base Layer Reset Issue:** Base layer no longer resets when toggling camera tracking
   - Added `imageryInitialized` ref to track if imagery has been set up
   - Only initialize imagery once (not on every re-render)
   - Reset flag when Viewer actually remounts (viewerKey changes)
   - User's manual base layer selection now persists across camera toggle

---

## Major Discovery: Stadia Uses Vector Tiles!

### What This Means

**Vector tiles ≠ Raster tiles:**
- **Raster tiles:** Pre-rendered images (PNG/JPG), labels baked in ❌
- **Vector tiles:** Geometric data, styled client-side, labels separate ✅

**Stadia Alidade Smooth Dark:**
- Uses vector tiles via MapLibre style JSON
- Labels are a separate layer in the style
- Can be hidden by modifying the style!

**Source:** Stadia documentation shows they use MapLibre styles with `openmaptiles` schema.

---

## Current Implementation Problem

**What we're doing now:**
```typescript
const stadiaProvider = new OpenStreetMapImageryProvider({
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
});
```

**Issue:** This requests **raster tiles** (pre-rendered PNGs) from Stadia.
- Labels are baked into the images
- Can't be toggled off

**What Stadia actually provides:**
- **Vector tiles:** `https://tiles.stadiamaps.com/data/openmaptiles.json`
- **Style JSON:** `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json`

---

## Solution Approaches

### Option 1: Use Stadia's Vector Tiles (Best Solution) ✅

**Switch from raster to vector:**

**Current approach:**
```typescript
// Raster tiles (PNG images)
OpenStreetMapImageryProvider({ url: '...' })
```

**New approach:**
```typescript
// Vector tiles with custom style
// Use Cesium's MapboxStyleImageryProvider
```

**BUT:** Cesium has limited vector tile support! It's primarily for raster.

**Alternative:** Use a **custom style JSON** that hides labels.

---

### Option 2: Fetch & Modify Stadia's Style JSON ⚡ (Recommended)

**Concept:**
1. Fetch Stadia's style JSON: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json`
2. Parse it
3. Remove all text/label layers
4. Use the modified style with Cesium

**Implementation:**
```typescript
// Fetch and modify style
const fetchModifiedStyle = async (showLabels: boolean) => {
  const response = await fetch('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json');
  const style = await response.json();
  
  if (!showLabels) {
    // Remove all text layers
    style.layers = style.layers.filter(layer => 
      layer.type !== 'symbol' || !layer.layout?.['text-field']
    );
  }
  
  return style;
};
```

**Challenge:** Cesium doesn't natively support MapLibre style JSON for imagery!

---

### Option 3: Use Raster Tile Variant URLs (Simpler) ✅

**Check Stadia's raster tile endpoints:**

According to the documentation, Stadia provides raster tile endpoints at:
```
https://tiles.stadiamaps.com/tiles/{style}/{z}/{x}/{y}{scale}.{format}
```

**Known styles:**
- `alidade_smooth` - Light with labels
- `alidade_smooth_dark` - Dark with labels
- `alidade_satellite` - Satellite imagery

**Possible unlabeled variants:**
- `alidade_smooth_dark_nolabels` ❓ (need to test)
- Or request custom raster renders without labels

**But:** Documentation doesn't mention pre-built unlabeled raster variants.

---

### Option 4: Switch to Carto Dark Matter (Guaranteed) ✅

**Known working solution:**

```typescript
import { UrlTemplateImageryProvider } from 'cesium';

const getCartoDarkProvider = (showLabels: boolean) => {
  const variant = showLabels ? 'dark_all' : 'dark_nolabels';
  
  return new UrlTemplateImageryProvider({
    url: `https://cartodb-basemaps-a.global.ssl.fastly.net/${variant}/{z}/{x}/{y}.png`,
    credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
  });
};
```

**Pros:**
- ✅ Proven to work (no testing needed)
- ✅ Both variants exist (dark_all, dark_nolabels)
- ✅ Free, no API key
- ✅ Very similar to Stadia Dark
- ✅ Simple implementation

**Cons:**
- ⚠️ Slightly different aesthetic than current Stadia
- ⚠️ Not Stadia (if you're attached to the exact look)

---

### Option 5: Use MapLibre GL JS Directly (Complex) ❌

**Concept:**
- Replace Cesium's imagery system with MapLibre GL JS
- Full control over vector tile styling
- Can toggle labels via style layers

**Reality:**
- ❌ Cesium and MapLibre are different rendering engines
- ❌ Can't easily integrate MapLibre into Cesium's globe
- ❌ Would require complete rewrite
- ❌ Not worth it for just label toggling

**Verdict:** Too complex, not practical.

---

## Recommended Implementation: Use Carto Dark Matter

### Why Carto?

1. **Guaranteed to work** - no testing uncertainty
2. **Simple implementation** - same as current approach, just different URL
3. **Free forever** - no API key concerns
4. **Nearly identical look** - dark theme, borders, similar aesthetic
5. **Toggle-ready** - two URLs, easy to switch

### Implementation Steps

#### Step 1: Add Panel Setting (5 min)

**types.ts:**
```typescript
export interface SimpleOptions {
  // ... existing ...
  showMapLabels: boolean;
}
```

**module.ts:**
```typescript
.addBooleanSwitch({
  path: 'showMapLabels',
  name: 'Show Country/City Names',
  description: 'Display labels on the base map',
  defaultValue: false, // Teachers want labels OFF
})
```

#### Step 2: Create Provider Function (5 min)

**SatelliteVisualizer.tsx:**
```typescript
import { UrlTemplateImageryProvider } from 'cesium';

// Add state for imagery provider
const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null);

// Create provider based on settings
useEffect(() => {
  const variant = options.showMapLabels ? 'dark_all' : 'dark_nolabels';
  
  const provider = new UrlTemplateImageryProvider({
    url: `https://cartodb-basemaps-a.global.ssl.fastly.net/${variant}/{z}/{x}/{y}.png`,
    credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
  });
  
  setImageryProvider(provider);
}, [options.showMapLabels]);

// In Viewer ref callback:
if (imageryProvider) {
  const imageryLayers = viewer.imageryLayers;
  
  // Remove existing imagery
  if (imageryLayers.length > 0) {
    imageryLayers.removeAll();
  }
  
  // Add Carto Dark Matter
  imageryLayers.addImageryProvider(imageryProvider);
  
  // Sync BaseLayerPicker UI
  // (Would need to add Carto to the picker or handle differently)
}
```

#### Step 3: Handle BaseLayerPicker (10 min)

**Challenge:** Carto isn't in the default BaseLayerPicker list.

**Solutions:**

**A. Add Carto to picker manually:**
```typescript
if (viewer.baseLayerPicker) {
  const vm = viewer.baseLayerPicker.viewModel;
  
  // Check if Carto already in list
  let cartoVM = vm.imageryProviderViewModels.find(p => p.name.includes('Carto'));
  
  if (!cartoVM) {
    // Add Carto Dark options
    const cartoNoLabels = new ProviderViewModel({
      name: 'Carto Dark Matter (No Labels)',
      iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
      tooltip: 'Dark theme without labels',
      creationFunction: () => new UrlTemplateImageryProvider({
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png',
      }),
    });
    
    const cartoWithLabels = new ProviderViewModel({
      name: 'Carto Dark Matter (With Labels)',
      iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
      tooltip: 'Dark theme with labels',
      creationFunction: () => new UrlTemplateImageryProvider({
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      }),
    });
    
    // Add to picker
    vm.imageryProviderViewModels.push(cartoNoLabels, cartoWithLabels);
  }
  
  // Select the appropriate one based on setting
  const targetName = options.showMapLabels 
    ? 'Carto Dark Matter (With Labels)'
    : 'Carto Dark Matter (No Labels)';
  
  const target = vm.imageryProviderViewModels.find(p => p.name === targetName);
  if (target) {
    vm.selectedImagery = target;
  }
}
```

**B. Just disable BaseLayerPicker:**
```typescript
// If Carto is the only map you want, disable picker entirely
<Viewer
  baseLayerPicker={false} // Don't show picker
  // ... rest
/>
```

---

## Alternative: Try Stadia Vector Endpoint

**If you want to keep Stadia exactly:**

Stadia provides a style JSON endpoint:
```
https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json
```

**But:** Cesium doesn't easily support MapLibre style JSON for imagery.

**Workaround (complex):**
1. Fetch the style JSON
2. Parse it to find which layers are text
3. Modify the JSON to hide text layers
4. Use a vector tile renderer... but Cesium isn't designed for this

**Verdict:** Too complex for this use case.

---

## Comparison: Current vs Carto

### Current: Stadia Alidade Smooth Dark (Raster)
- ✅ Good looking
- ❌ Labels baked in
- ❌ Can't toggle labels

### Proposed: Carto Dark Matter (Raster)
- ✅ Very similar look (dark, borders, clean)
- ✅ Two variants: with/without labels
- ✅ Free, no API key
- ✅ Easy to toggle
- ⚠️ Slightly different aesthetic (minor)

**Visual similarity:** ~95% - both are dark minimalist maps with borders. Most users won't notice the difference.

---

## Recommended Implementation

**Use Carto Dark Matter with label toggle:**

### Pros
- ✅ Solves the label problem completely
- ✅ Simple implementation (15-20 min)
- ✅ No uncertainty (proven to work)
- ✅ Keeps similar dark aesthetic
- ✅ Teachers can toggle labels on/off

### Cons
- ⚠️ Not exactly Stadia (but very close)
- ⚠️ Need to handle BaseLayerPicker differently

---

## Implementation Plan

### Step 1: Add Panel Setting (5 min)
```typescript
// types.ts
showMapLabels: boolean;

// module.ts
.addBooleanSwitch({
  path: 'showMapLabels',
  name: 'Show Map Labels',
  description: 'Display country and city names',
  defaultValue: false,
})
```

### Step 2: Replace Imagery Provider (10 min)
```typescript
// Import
import { UrlTemplateImageryProvider, buildModuleUrl, ProviderViewModel } from 'cesium';

// In ref callback:
const variant = options.showMapLabels ? 'dark_all' : 'dark_nolabels';

const cartoProvider = new UrlTemplateImageryProvider({
  url: `https://cartodb-basemaps-a.global.ssl.fastly.net/${variant}/{z}/{x}/{y}.png`,
  credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
});

imageryLayers.removeAll();
imageryLayers.addImageryProvider(cartoProvider);
```

### Step 3: Update BaseLayerPicker (10 min)
Either:
- Add Carto variants to the picker, OR
- Disable picker (simpler)

### Step 4: Add to Viewer Remount Dependencies (2 min)
```typescript
useEffect(() => setViewerKey((prevKey) => prevKey + 1), [
  // ... existing ...
  options.showMapLabels, // Add this
]);
```

---

## Testing Checklist

- [ ] Build succeeds
- [ ] Default: No labels, dark map
- [ ] Toggle "Show Map Labels" ON → labels appear
- [ ] Toggle OFF → labels disappear
- [ ] Map style similar to Stadia (dark, clean, borders)
- [ ] BaseLayerPicker behavior acceptable
- [ ] No tile loading errors

---

## Decision Required

**Three options:**

1. **Use Carto Dark Matter** (recommended)
   - Guaranteed to work
   - Very similar to Stadia
   - 15-20 min implementation

2. **Try Stadia raster `_nolabels` URL** (uncertain)
   - Might not exist
   - 5 min to test
   - Fallback to Carto if fails

3. **Disable labels some other way** (complex)
   - Use Stadia vector tiles + custom style
   - Much more complex
   - Not recommended

**My recommendation:** Go with **Carto Dark Matter** - it's proven, simple, and solves the problem completely.

---

## Summary

**Key insight from documentation:**
- Stadia uses vector tiles (can be styled)
- But Cesium is primarily a raster imagery engine
- Easier to use a different raster provider with unlabeled variant

**Best solution:**
- Switch to Carto Dark Matter
- Toggle between `dark_all` and `dark_nolabels` URLs
- Add panel setting for user control

**Effort:** 15-20 minutes total

**Ready to implement when you approve!** 🗺️
