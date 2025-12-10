# Default Imagery Layer Fix

**Date:** December 9, 2025  
**Issue:** Default imagery requires payment, BaseLayerPicker UI shows wrong selection  
**Status:** Default imagery fixed ✅, UI sync investigation in progress

---

## Problem Summary

1. **Default imagery:** Cesium World Imagery (requires payment) - ✅ **FIXED**
2. **BaseLayerPicker UI:** Shows paid layer as selected, even though Stadia Dark is actually loaded
3. **User confusion:** First-time users might think they're using the wrong layer

---

## Solution Implemented

### Programmatic Imagery Change

**File:** `SatelliteVisualizer.tsx`

**Implementation:**
```typescript
// In Viewer ref callback:
const viewer = ref.cesiumElement;
const imageryLayers = viewer.imageryLayers;

// Remove default imagery
if (imageryLayers.length > 0) {
  imageryLayers.removeAll();
}

// Add Stadia Alidade Smooth Dark
const stadiaProvider = new OpenStreetMapImageryProvider({
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
});
imageryLayers.addImageryProvider(stadiaProvider);
```

**Result:**
- ✅ Earth loads with Stadia Alidade Smooth Dark immediately
- ✅ No payment error
- ✅ BaseLayerPicker (if enabled) still allows changing layers
- ⚠️ **BUT:** BaseLayerPicker UI doesn't reflect the change

---

## Remaining Issue: BaseLayerPicker UI Desync

### The Problem

**What happens:**
1. We programmatically set imagery to Stadia Dark
2. BaseLayerPicker widget doesn't know about this change
3. UI shows "Bing Maps Aerial with Labels" (or similar) as selected
4. Actual imagery IS Stadia Dark (correct)
5. User sees mismatch between UI and reality

**Why it happens:**
- BaseLayerPicker maintains its own state
- We're changing imagery after widget initialization
- Widget doesn't detect external imagery changes

---

## Solution Exploration

### Approach 1: Access BaseLayerPicker Widget and Update Selection

**Concept:**
```typescript
// In ref callback, after setting imagery:
const baseLayerPicker = viewer.baseLayerPicker;
if (baseLayerPicker) {
  // Find the Stadia layer in the picker's viewModel
  const stadiaLayer = baseLayerPicker.viewModel.imageryProviderViewModels.find(
    vm => vm.name === 'Stadia Alidade Smooth Dark'
  );
  
  if (stadiaLayer) {
    baseLayerPicker.viewModel.selectedImagery = stadiaLayer;
  }
}
```

**Challenge:** Stadia might not be in the default list!

---

### Approach 2: Add Stadia to BaseLayerPicker Options

**Concept:**
```typescript
// Before creating viewer, configure BaseLayerPicker options
const imageryViewModels = Cesium.createDefaultImageryProviderViewModels();

// Add Stadia as an option
imageryViewModels.push(
  new Cesium.ProviderViewModel({
    name: 'Stadia Alidade Smooth Dark',
    tooltip: 'Stadia Maps - Alidade Smooth Dark theme',
    iconUrl: 'some-icon-url',
    creationFunction: () => {
      return new OpenStreetMapImageryProvider({
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
      });
    },
  })
);

// Then pass to Viewer... but Resium doesn't expose this
```

**Challenge:** Resium's `<Viewer>` doesn't expose `imageryProviderViewModels` prop!

---

### Approach 3: Directly Manipulate BaseLayerPicker After Creation

**Most Practical Approach:**

```typescript
// In ref callback:
const viewer = ref.cesiumElement;

// Set up imagery
const imageryLayers = viewer.imageryLayers;
if (imageryLayers.length > 0) {
  imageryLayers.removeAll();
}

const stadiaProvider = new OpenStreetMapImageryProvider({
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/',
});
imageryLayers.addImageryProvider(stadiaProvider);

// Update BaseLayerPicker UI
if (viewer.baseLayerPicker) {
  const picker = viewer.baseLayerPicker;
  const viewModel = picker.viewModel;
  
  // Option A: Find existing provider that matches (if any)
  const matchingProvider = viewModel.imageryProviderViewModels.find(
    vm => vm.name.includes('Stadia') || vm.name.includes('Dark')
  );
  
  if (matchingProvider) {
    viewModel.selectedImagery = matchingProvider;
  } else {
    // Option B: Add custom provider to the list
    const customViewModel = new Cesium.ProviderViewModel({
      name: 'Stadia Alidade Smooth Dark',
      tooltip: 'Dark themed base map',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
      creationFunction: () => stadiaProvider,
    });
    
    viewModel.imageryProviderViewModels.unshift(customViewModel); // Add to start
    viewModel.selectedImagery = customViewModel; // Select it
  }
}
```

---

### Approach 4: Check What's Actually in the Default List

**Investigation needed:**

```typescript
// Log what providers are available
if (viewer.baseLayerPicker) {
  const viewModel = viewer.baseLayerPicker.viewModel;
  console.log('Available imagery providers:');
  viewModel.imageryProviderViewModels.forEach((vm, index) => {
    console.log(`${index}: ${vm.name}`);
  });
  console.log('Currently selected:', viewModel.selectedImagery.name);
}
```

**This will tell us:**
1. Is Stadia already in the list?
2. What's the exact name of each option?
3. Which one is selected by default?

---

## Recommended Implementation Steps

### Step 1: Investigate (2 minutes)
Add logging to see what's in the BaseLayerPicker:

```typescript
// After setting imagery
if (viewer.baseLayerPicker) {
  console.log('=== BASE LAYER PICKER DEBUG ===');
  const vm = viewer.baseLayerPicker.viewModel;
  console.log('Available providers:', vm.imageryProviderViewModels.map(p => p.name));
  console.log('Selected:', vm.selectedImagery?.name);
}
```

### Step 2: Update Selection (5-10 minutes)
Based on what we find:

**If Stadia IS in the list:**
```typescript
const stadiaVM = vm.imageryProviderViewModels.find(
  p => p.name.toLowerCase().includes('stadia')
);
if (stadiaVM) {
  vm.selectedImagery = stadiaVM;
}
```

**If Stadia is NOT in the list:**
```typescript
// Add it manually
const customVM = new ProviderViewModel({
  name: 'Stadia Alidade Smooth Dark',
  iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
  creationFunction: () => stadiaProvider,
});
vm.imageryProviderViewModels.unshift(customVM);
vm.selectedImagery = customVM;
```

---

## Potential Issues

### Issue 1: ProviderViewModel Not Imported
**Solution:** Add to imports:
```typescript
import { ProviderViewModel, buildModuleUrl } from 'cesium';
```

### Issue 2: BaseLayerPicker Recreates Imagery
**Solution:** The BaseLayerPicker might recreate the provider when selected. This is fine - it will use the same URL.

### Issue 3: Selection Triggers Imagery Change
**Solution:** We set the imagery first, THEN update the UI, so it should just sync the state.

---

## Testing Plan

1. **Before fix:**
   - Check BaseLayerPicker dropdown
   - Note which layer shows as selected
   - Verify Earth is actually Stadia Dark

2. **Add logging:**
   - See what providers are available
   - See what's currently selected

3. **Implement sync:**
   - Update `selectedImagery` in viewModel
   - Verify dropdown now shows correct selection

4. **Test interaction:**
   - Change layer via UI
   - Verify it still works
   - Reload page
   - Verify Stadia is selected in UI

---

## Decision: Not Using Panel Settings

**Reasoning:**
- BaseLayerPicker already provides UI for layer selection
- Adding duplicate panel setting = bad UX
- User can enable BaseLayerPicker if they want control
- Just need to sync the default with the UI

---

## Next Actions

1. ✅ Set Stadia as default imagery (DONE)
2. ⏸️ Add logging to investigate BaseLayerPicker state
3. ⏸️ Update BaseLayerPicker selection to match
4. ⏸️ Test and verify UI shows correct selection

**Estimated time for UI sync:** 10-15 minutes
**Complexity:** Low-Medium (depends on what's in the default list)

Ready to investigate and fix when you give the go-ahead! 🔍
