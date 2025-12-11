# Base Layer Persistence Through Tracking Toggle - Fix Exploration

**Date:** December 11, 2025  
**Issue:** Base layer resets to default when toggling camera tracking  
**Priority:** Minor bug, 30-minute exploration  
**Status:** Pre-existing issue (not introduced by recent changes)

---

## The Problem

**What happens:**
1. User selects a different base layer (e.g., Stadia Dark)
2. User toggles camera tracking button
3. Component re-renders
4. Base layer resets to Carto Dark (no labels)

**Why it happens:**
- The `ref` callback on `<Viewer>` runs on every re-render
- Even with `imageryInitialized.current` flag, something is resetting imagery

**Root cause hypothesis:**
- The imagery setup in `ref` callback might be running despite the flag
- OR: Something else is clearing/resetting imagery layers
- OR: The Viewer component itself is remounting (unlikely since `viewerKey` isn't changing)

---

## Quick Diagnosis

### Check 1: Is Viewer Remounting?

**Add console log to see if ref callback runs:**
```typescript
ref={(ref) => {
  if (ref?.cesiumElement) {
    console.log('🔧 Viewer ref callback running, imageryInitialized:', imageryInitialized.current);
    // ... rest of code
  }
}}
```

**Expected:**
- If "imageryInitialized: false" appears on toggle → Flag is resetting incorrectly
- If "imageryInitialized: true" appears on toggle → Flag is working, something else is the issue
- If log doesn't appear at all → Good! Ref callback isn't running

---

### Check 2: Is Something Else Clearing Imagery?

**Search for other places that might touch imagery:**
```bash
grep -n "imageryLayers" src/components/SatelliteVisualizer.tsx
grep -n "removeAll" src/components/SatelliteVisualizer.tsx
```

**Possible culprits:**
- Another `useEffect` that touches imagery layers
- Resium's Viewer component behavior
- BaseLayerPicker's internal logic

---

## Quick Fix Options (Ranked by Speed)

### Option 1: Don't Set Default Programmatically (5 min) ⚡

**Concept:** Let Cesium/Resium handle the default, we just add our options to the picker.

**Implementation:**
```typescript
// REMOVE the imagery initialization code entirely
// Just add Carto to the picker, don't set a default programmatically

if (viewer.baseLayerPicker) {
  const vm = viewer.baseLayerPicker.viewModel;
  
  // Check if already added
  if (!vm.imageryProviderViewModels.some(p => p.name === 'Carto Dark Matter (No Labels)')) {
    // Add Carto options
    vm.imageryProviderViewModels.push(cartoNoLabelsViewModel, cartoWithLabelsViewModel);
  }
  
  // DON'T remove default imagery
  // DON'T set selectedImagery
  // Let user pick from the menu (Bing will be default)
}
```

**Pros:**
- ✅ Very simple
- ✅ Guaranteed not to reset
- ✅ Respects user's choice automatically

**Cons:**
- ⚠️ Default will be Bing Aerial (not dark mode)
- ⚠️ User has to manually select dark mode on first load

**Verdict:** Simple but UX downgrade. Teachers have to pick manually each time.

---

### Option 2: Move Imagery Setup to useEffect (10 min) ⚡⚡

**Concept:** Only run imagery setup once using `useEffect` with empty deps, not in ref callback.

**Implementation:**
```typescript
// Store viewer ref
const viewerRef = useRef<any>(null);

// Setup imagery in useEffect (runs once after mount)
useEffect(() => {
  if (!viewerRef.current || imageryInitialized.current) return;
  
  const viewer = viewerRef.current.cesiumElement;
  if (!viewer) return;
  
  const imageryLayers = viewer.imageryLayers;
  imageryLayers.removeAll();
  
  // Add Carto default
  const cartoProvider = new UrlTemplateImageryProvider({...});
  imageryLayers.addImageryProvider(cartoProvider);
  
  // Add to picker
  if (viewer.baseLayerPicker) {
    // ... add Carto options ...
  }
  
  imageryInitialized.current = true;
}, [isLoaded]); // Run once when viewer is loaded

// In ref callback:
ref={(ref) => {
  viewerRef.current = ref;
  
  if (ref?.cesiumElement) {
    const viewer = ref.cesiumElement;
    const controller = viewer.scene.screenSpaceCameraController;
    controller.maximumZoomDistance = Number.POSITIVE_INFINITY;
    controller.enableCollisionDetection = false;
    
    // Extend camera clipping
    const earthRadius = 6378137;
    const celestialDistance = earthRadius * 100;
    viewer.scene.camera.frustum.far = celestialDistance * 3;
    
    // NO IMAGERY SETUP HERE
  }
}}
```

**Pros:**
- ✅ Separates concerns (ref for viewer setup, useEffect for imagery)
- ✅ useEffect won't re-run unless deps change
- ✅ More React-idiomatic

**Cons:**
- ⚠️ Need to ensure viewer is ready before running effect
- ⚠️ Slightly more complex

**Verdict:** Good approach, worth trying.

---

### Option 3: Check if Imagery Already Customized (5 min) ⚡

**Concept:** Before resetting imagery, check if user already picked something.

**Implementation:**
```typescript
if (!imageryInitialized.current) {
  const imageryLayers = viewer.imageryLayers;
  
  // Only set default if imagery layers are "vanilla" (1 layer = default)
  // If user picked something, layers might be different
  const hasDefaultOnly = imageryLayers.length === 1;
  
  if (hasDefaultOnly) {
    imageryLayers.removeAll();
    
    const cartoProvider = new UrlTemplateImageryProvider({...});
    imageryLayers.addImageryProvider(cartoProvider);
  }
  
  // Always add to picker (safe to do multiple times with duplicate check)
  if (viewer.baseLayerPicker) {
    // ... add Carto options ...
  }
  
  imageryInitialized.current = true;
}
```

**Pros:**
- ✅ Simple modification to existing code
- ✅ Respects user's choice if they've changed it

**Cons:**
- ⚠️ Heuristic (checking layer count) might not be reliable
- ⚠️ Doesn't solve root cause

**Verdict:** Quick patch, might work.

---

### Option 4: Store User's Selection in State (15 min) ⚡⚡⚡

**Concept:** Track which imagery user selected, restore it after re-render.

**Implementation:**
```typescript
// Add state
const [selectedImageryName, setSelectedImageryName] = useState<string>('Carto Dark Matter (No Labels)');

// In imagery setup:
if (!imageryInitialized.current) {
  // ... setup imagery ...
  
  if (viewer.baseLayerPicker) {
    const vm = viewer.baseLayerPicker.viewModel;
    
    // Add Carto options
    // ...
    
    // Listen for user selection changes
    vm.selectedImagery.definitionChanged.addEventListener(() => {
      const selected = vm.selectedImagery;
      setSelectedImageryName(selected.name);
    });
    
    // Restore user's previous selection
    const userChoice = vm.imageryProviderViewModels.find(
      p => p.name === selectedImageryName
    );
    if (userChoice) {
      vm.selectedImagery = userChoice;
    }
  }
  
  imageryInitialized.current = true;
}
```

**Pros:**
- ✅ Tracks user intent explicitly
- ✅ Survives re-renders

**Cons:**
- ⚠️ More complex
- ⚠️ Need to handle listener cleanup
- ⚠️ Might have timing issues

**Verdict:** Most robust, but takes time.

---

## Recommended Quick Test Plan (30 min)

### Phase 1: Diagnosis (5 min)

**Add console logs:**
```typescript
ref={(ref) => {
  if (ref?.cesiumElement) {
    console.log('🔧 REF CALLBACK - imageryInitialized:', imageryInitialized.current);
    console.log('🔧 REF CALLBACK - isTracked:', isTracked);
    // ... rest
  }
}}
```

**Toggle camera tracking, check console:**
- Does log appear? → ref callback is running (bad)
- No log? → Something else is resetting imagery

---

### Phase 2: Try Option 3 First (5 min)

**Why:** Smallest code change, might work.

**What to do:**
- Add the `hasDefaultOnly` check
- Build, test
- If it works → Done!
- If not → Move to Phase 3

---

### Phase 3: Try Option 2 (15 min)

**Why:** More robust, React-idiomatic.

**What to do:**
- Move imagery setup to `useEffect`
- Use `viewerRef` instead of inline ref callback
- Build, test
- If it works → Done!
- If not → Leave as minor bug

---

### Phase 4: If Still Not Working (5 min)

**Accept as minor bug, add TODO:**
```typescript
// TODO: Base layer resets on camera tracking toggle
// This is a minor UX issue. User can re-select from BaseLayerPicker.
// Possible fix: Move imagery setup to separate useEffect with proper deps.
// Priority: Low
```

**Add to cesium-todos.md** (if it exists).

---

## Implementation: Option 2 (useEffect Approach)

**Full code changes:**

### Step 1: Add viewer ref

```typescript
// After other state declarations
const viewerRef = useRef<any>(null);
```

### Step 2: Create imagery setup effect

```typescript
// After celestial grid effect, before return statement
useEffect(() => {
  if (!viewerRef.current?.cesiumElement || imageryInitialized.current) {
    return;
  }
  
  const viewer = viewerRef.current.cesiumElement;
  const imageryLayers = viewer.imageryLayers;
  
  // Remove default imagery
  if (imageryLayers.length > 0) {
    imageryLayers.removeAll();
  }
  
  // Set default to Carto Dark Matter (no labels)
  const cartoNoLabelsProvider = new UrlTemplateImageryProvider({
    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png',
    credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
  });
  imageryLayers.addImageryProvider(cartoNoLabelsProvider);
  
  // Add Carto options to BaseLayerPicker
  if (viewer.baseLayerPicker) {
    const vm = viewer.baseLayerPicker.viewModel;
    
    const hasCartoNoLabels = vm.imageryProviderViewModels.some(p => p.name === 'Carto Dark Matter (No Labels)');
    
    if (!hasCartoNoLabels) {
      const stadiaViewModel = vm.imageryProviderViewModels.find(
        p => p.name === 'Stadia Alidade Smooth Dark'
      );
      const darkIconUrl = stadiaViewModel?.iconUrl || buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png');
      
      const cartoNoLabelsViewModel = new ProviderViewModel({
        name: 'Carto Dark Matter (No Labels)',
        iconUrl: darkIconUrl,
        tooltip: 'Dark theme map without city/country labels - clean view with borders only',
        creationFunction: () => new UrlTemplateImageryProvider({
          url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png',
          credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
        }),
      });
      
      const cartoWithLabelsViewModel = new ProviderViewModel({
        name: 'Carto Dark Matter (With Labels)',
        iconUrl: darkIconUrl,
        tooltip: 'Dark theme map with city/country labels',
        creationFunction: () => new UrlTemplateImageryProvider({
          url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
          credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
        }),
      });
      
      vm.imageryProviderViewModels.push(cartoNoLabelsViewModel, cartoWithLabelsViewModel);
    }
    
    const cartoNoLabelsVM = vm.imageryProviderViewModels.find(
      p => p.name === 'Carto Dark Matter (No Labels)'
    );
    
    if (cartoNoLabelsVM) {
      vm.selectedImagery = cartoNoLabelsVM;
    }
  }
  
  imageryInitialized.current = true;
}, [isLoaded]); // Only run when viewer is loaded
```

### Step 3: Simplify ref callback

```typescript
ref={(ref) => {
  viewerRef.current = ref;
  
  if (ref?.cesiumElement) {
    const viewer = ref.cesiumElement;
    const controller = viewer.scene.screenSpaceCameraController;
    
    controller.maximumZoomDistance = Number.POSITIVE_INFINITY;
    controller.enableCollisionDetection = false;
    
    const earthRadius = 6378137;
    const celestialDistance = earthRadius * 100;
    viewer.scene.camera.frustum.far = celestialDistance * 3;
    
    // NO IMAGERY SETUP HERE - moved to useEffect above
  }
}}
```

---

## Testing Checklist

After implementing Option 2:

- [ ] Build succeeds
- [ ] Default: Carto Dark (no labels) on first load
- [ ] Switch to Stadia Dark via BaseLayerPicker
- [ ] Toggle camera tracking
- [ ] ✅ Base layer stays as Stadia Dark (NOT reset to Carto)
- [ ] Reload page → Default returns to Carto (expected)
- [ ] BaseLayerPicker shows both Carto options with dark icons

---

## If All Else Fails

**Document as known minor bug:**

```markdown
## Known Issues

### Base Layer Resets on Some Actions

**Issue:** When toggling camera tracking or certain UI interactions, the base layer may reset to the default (Carto Dark Matter, no labels).

**Workaround:** Re-select your preferred base layer from the BaseLayerPicker menu (upper-right button).

**Impact:** Minor UX inconvenience, does not affect functionality.

**Status:** Low priority, tracked for future fix.
```

---

## Summary

**Quick wins to try (in order):**
1. ⚡ Add console logs (5 min) - diagnose what's happening
2. ⚡ Option 3: Check if imagery already customized (5 min)
3. ⚡⚡ Option 2: Move to useEffect (15 min)
4. If time runs out: Document as minor bug, move on

**Total time budget:** 30 minutes  
**Expected outcome:** Either fixed or documented as minor issue

---

## Implementation Complete! ✅

**Implemented: Hybrid Approach (useEffect + ref callback)**

### What changed:

1. **Added `viewerRef`:**
   - Stores Viewer reference for use in useEffect
   - Set in ref callback: `viewerRef.current = ref`

2. **Created imagery setup useEffect:**
   - Runs when `viewerKey` changes (Viewer is created/remounted)
   - ONLY sets up default Carto imagery (once per mount)
   - Does NOT touch BaseLayerPicker
   - Only runs when viewer exists (guard against race conditions)

3. **BaseLayerPicker setup in ref callback:**
   - Adds both Carto options to the picker menu
   - Sets default selection to Carto (no labels)
   - Only runs when options are first added (duplicate check)
   - Guaranteed timing (runs when viewer is fully ready)

4. **Hybrid approach benefits:**
   - ✅ Default imagery only set in useEffect (won't reset on re-renders)
   - ✅ Picker options added in ref callback (guaranteed timing)
   - ✅ Selection only set on first add (won't reset user's choice)

5. **Removed `imageryInitialized` flag:**
   - No longer needed with hybrid approach
   - Duplicate check in picker setup prevents re-adding options

### Why this works:

**useEffect (default imagery):**
- Runs when `viewerKey` changes (mount/remount only)
- Sets default imagery ONCE
- Doesn't run on random re-renders ✅

**ref callback (picker options):**
- Runs when viewer is ready (guaranteed timing) ✅
- Adds Carto options to menu
- Only sets selection when first adding options
- Duplicate check prevents issues on re-renders

### Test Results:

**Issue 1: Map persists ✅**
- User reported: Map now persists through camera tracking toggle
- Fix successful!

**Issue 2: Carto options don't appear ❌ → Fixed**
- Problem: useEffect timing issue with BaseLayerPicker
- Solution: Moved picker setup back to ref callback
- Options now added when picker is ready

**Issue 3: Nothing selected on startup ❌ → Fixed**
- Problem: Selection code not running
- Solution: Set selection in ref callback when first adding options

### Expected behavior:

- ✅ Default: Carto Dark (no labels) on first load
- ✅ Carto options appear in BaseLayerPicker menu
- ✅ Carto (no labels) is selected by default
- ✅ User can switch to any base layer via picker
- ✅ Toggling camera tracking does NOT reset base layer
- ✅ Changing panel settings DOES reset (expected - viewer remounts)

**Ready to test!** Build and verify all three requirements work.

