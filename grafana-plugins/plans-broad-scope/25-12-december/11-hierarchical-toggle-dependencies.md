# Hierarchical Toggle Dependencies in Grafana Panel Settings

**Date:** December 11, 2025  
**Question:** Can toggle A auto-enable B1/B2/B3, and turning off any B auto-disable A?  
**Answer:** Partially - requires custom logic

---

## The Requirement

**Desired behavior:**
```
Toggle A (Master) = ON
  → Auto-enable: B1, B2, B3 (Slaves)

Any of B1, B2, B3 = OFF
  → Auto-disable: A (Master)
```

**Use cases:**
- Master "Show FOV Features" → enables projection, footprint, cone
- Any FOV feature disabled → disables master
- Provides grouped control with manual override

---

## What Grafana Provides Out-of-Box

### 1. `showIf` (Conditional Visibility) ✅

**Already used in the plugin:**
```typescript
.addBooleanSwitch({
  path: 'showGridLabels',
  showIf: (config) => config.showRADecGrid, // Only show if parent enabled
})
```

**What it does:**
- Hides/shows settings based on other settings
- Does NOT automatically change values
- One-way dependency (parent controls visibility only)

**Limitation:** Visibility ≠ Value control

---

### 2. `defaultValue` (Initial State) ✅

```typescript
.addBooleanSwitch({
  path: 'childToggle',
  defaultValue: true, // Default when first created
})
```

**What it does:**
- Sets initial value when panel is created
- Does NOT update when parent changes later

**Limitation:** Only works on initialization, not dynamic updates

---

## What's NOT Built-In

❌ **Auto-enable children when parent enabled**  
❌ **Auto-disable parent when any child disabled**  
❌ **Bidirectional dependencies**  
❌ **Value synchronization**

**Grafana's settings are declarative, not reactive.**

---

## Solution: Custom Logic in Component

### Approach: Implement in `useEffect`

**Location:** `SatelliteVisualizer.tsx` (or similar component)

```typescript
const [effectiveOptions, setEffectiveOptions] = useState(options);

useEffect(() => {
  const newOptions = { ...options };
  
  // Rule 1: If master ON, ensure children are ON
  if (options.masterToggle && (!options.childB1 || !options.childB2 || !options.childB3)) {
    newOptions.childB1 = true;
    newOptions.childB2 = true;
    newOptions.childB3 = true;
  }
  
  // Rule 2: If any child OFF, ensure master is OFF
  if (!options.childB1 || !options.childB2 || !options.childB3) {
    if (options.masterToggle) {
      newOptions.masterToggle = false;
    }
  }
  
  setEffectiveOptions(newOptions);
}, [options]);

// Use effectiveOptions instead of options in rendering
```

**Pros:**
- ✅ Implements desired logic
- ✅ Works with existing Grafana settings
- ✅ Flexible (any logic possible)

**Cons:**
- ⚠️ UI settings don't update automatically (confusing UX)
- ⚠️ User sees checkbox state different from actual behavior
- ❌ Panel settings state doesn't persist the derived values

---

## Better Solution: UI Feedback Pattern

### Strategy: Use Master + Individual Controls

**Panel settings structure:**
```typescript
// Master toggle
.addBooleanSwitch({
  path: 'enableFOVFeatures',
  name: 'Enable FOV Features',
  description: 'Master toggle for all FOV-related visualizations',
  defaultValue: false,
})

// Individual controls (only visible when master enabled)
.addBooleanSwitch({
  path: 'showFOVProjection',
  name: 'Show Ground Projection',
  defaultValue: true,
  showIf: (config) => config.enableFOVFeatures,
})
.addBooleanSwitch({
  path: 'showFOVFootprint',
  name: 'Show FOV Footprint',
  defaultValue: true,
  showIf: (config) => config.enableFOVFeatures,
})
.addBooleanSwitch({
  path: 'showFOVCone',
  name: 'Show FOV Cone',
  defaultValue: true,
  showIf: (config) => config.enableFOVFeatures,
})
```

**In component:**
```typescript
// Render features only if master enabled AND individual toggle enabled
{options.enableFOVFeatures && options.showFOVProjection && (
  <FOVProjection />
)}
{options.enableFOVFeatures && options.showFOVFootprint && (
  <FOVFootprint />
)}
```

**Behavior:**
- Master OFF → all hidden (children invisible in UI)
- Master ON → children appear (can toggle individually)
- No automatic value changes (clear UX)

**Pros:**
- ✅ Clear UX (what you see is what you get)
- ✅ No confusing auto-updates
- ✅ Master acts as "enable group" gate
- ✅ Individual controls for fine-tuning

**Cons:**
- ⚠️ Doesn't auto-disable master when child disabled
- ⚠️ But this is actually better UX (explicit > implicit)

---

## Alternative: Computed Properties Pattern

### Use getters for derived state

```typescript
const isMasterEffectivelyEnabled = 
  options.masterToggle && 
  options.childB1 && 
  options.childB2 && 
  options.childB3;

// Use computed value in rendering
{isMasterEffectivelyEnabled && <MasterFeature />}
```

**Pros:**
- ✅ Simple
- ✅ No state mutation
- ✅ Clear logic

**Cons:**
- ⚠️ Master toggle can be ON but feature hidden (confusing if not documented)

---

## Recommended Pattern for Your Use Cases

### Pattern: Master Gate + Individual Toggles

**Step 1: Define settings**
```typescript
// Master
.addBooleanSwitch({
  path: 'enableFeatureGroup',
  name: 'Enable [Feature Group]',
  defaultValue: false,
})

// Children (hidden when master OFF)
.addBooleanSwitch({
  path: 'showSubFeature1',
  name: 'Show [Sub Feature 1]',
  defaultValue: true, // Default when master first enabled
  showIf: (config) => config.enableFeatureGroup,
})
```

**Step 2: Render with AND logic**
```typescript
{options.enableFeatureGroup && options.showSubFeature1 && (
  <SubFeature1 />
)}
```

**UX Flow:**
1. User enables master → children appear in settings
2. User can toggle children individually
3. Master OFF → all features hidden (children invisible)

**This gives you:**
- ✅ Grouped control (master)
- ✅ Individual control (children)
- ✅ Clear behavior (no auto-updates)
- ✅ Standard Grafana pattern

---

## Can You Do True Bidirectional Dependencies?

**Short answer: Not cleanly in Grafana.**

**Why:**
- Grafana panel options are stored JSON state
- No built-in reactivity or computed properties
- UI doesn't automatically update from component logic
- Would need to modify panel options from component (possible but hacky)

**Workaround (not recommended):**
```typescript
import { getTemplateSrv } from '@grafana/runtime';

// In component
useEffect(() => {
  if (!options.childB1 && options.masterToggle) {
    // Modify panel options directly
    onOptionsChange({ ...options, masterToggle: false });
  }
}, [options]);
```

**Problems:**
- ⚠️ Triggers re-renders
- ⚠️ Can cause infinite loops if not careful
- ⚠️ Confusing UX (settings change without user action)
- ❌ Not recommended

---

## Summary & Recommendation

### What Works Well:
1. **Master gate + individual toggles** (recommended)
   - Master controls group visibility
   - Individual toggles for fine control
   - Use AND logic in rendering

2. **Computed properties** (for display logic)
   - Derive effective state in component
   - Don't mutate panel options

### What Doesn't Work Well:
1. **Auto-enabling children** (confusing UX)
2. **Auto-disabling parent** (possible but hacky)
3. **Bidirectional sync** (not Grafana's design)

### Best Practice:
```typescript
// Settings
masterToggle: boolean        // Controls group visibility
childToggle1: boolean        // Individual control (hidden if master OFF)
childToggle2: boolean        // Individual control (hidden if master OFF)

// Rendering
const showFeature1 = masterToggle && childToggle1;
const showFeature2 = masterToggle && childToggle2;
```

**This pattern:**
- ✅ Clear and predictable
- ✅ Works with Grafana's design
- ✅ No surprising behavior
- ✅ Easy to understand and maintain

---

**For your two use cases:** Use the **Master Gate + Individual Toggles** pattern!

**Word count: ~800 words**

