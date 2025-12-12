# Tracked Mode Vector Scaling with Distance Threshold

**Date:** December 11, 2025  
**Requirement:** Scale vectors in tracked mode when far, keep fixed when close  
**Bonus:** Tracked mode now allows infinite zoom-out! 🎉

---

## Current Behavior

**Tracked mode:**
- ✅ Can zoom out infinitely (no limit!)
- ✅ Camera follows satellite
- ❌ Vector stays 2m (too small when far)

**Untracked mode:**
- ✅ Scales with distance
- ✅ Always visible

---

## Desired Behavior

**Tracked mode should have TWO zones:**

### Zone 1: Close Range (Fixed Size)
- Distance: < threshold (e.g., 50km)
- Vector: **2 meters** (fixed)
- Why: At close range, 2m looks good, proportional to model

### Zone 2: Far Range (Dynamic Scaling)
- Distance: > threshold
- Vector: **Scales with distance**
- Why: Keep vector visible when zoomed out

---

## Determining the Threshold

### Option A: Arbitrary Distance (Simple) ⚡
```
Threshold = 50km (50,000 meters)

If distance < 50km:
  vectorLength = 2m
Else:
  vectorLength = 2m * (distance / 50km)
```

**Pros:**
- ✅ Simple
- ✅ Easy to understand
- ✅ Works well in practice

**Example:**
- 10km away: 2m (fixed)
- 50km away: 2m (threshold)
- 100km away: 4m (2× scaled)
- 500km away: 20m (10× scaled)

---

### Option B: Pixel Size Calculation (Complex)

**Concept:** Switch when 2m would be < 50 pixels

**Formula:**
```
Apparent pixel size ≈ (vectorLength / distance) × screenWidth × FOV_factor

Threshold = 2m × (screenWidth / minPixelSize) × FOV_factor
```

**Pros:**
- ✅ Mathematically precise
- ✅ Maintains exact pixel size

**Cons:**
- ⚠️ Complex calculation
- ⚠️ Depends on screen resolution, FOV
- ⚠️ Overkill for visual purposes

**Verdict:** Option A is sufficient (we're not being rigorous about pixel size anyway)

---

## Recommended Implementation

### Simple Threshold with Smooth Scaling

```typescript
if (isTracked) {
  const thresholdDistance = 50000; // 50km
  
  if (viewer) {
    const cameraPosition = viewer.camera.position;
    const distance = Cartesian3.distance(cameraPosition, pos);
    
    if (distance < thresholdDistance) {
      // Close range: fixed size
      vectorLength = 2; // 2 meters
    } else {
      // Far range: scale proportionally
      const scaleFactor = distance / thresholdDistance;
      vectorLength = 2 * scaleFactor; // Start from 2m baseline
    }
  } else {
    vectorLength = 2; // Fallback
  }
}
```

**Behavior:**
- 0-50km: 2m (fixed)
- 50km: 2m (threshold)
- 100km: 4m (2× scaled)
- 250km: 10m (5× scaled)
- 1,000km: 40m (20× scaled)

---

## Alternative: Different Scaling Rate

If the above scales too slowly or too fast, adjust the formula:

### Slower scaling:
```typescript
const scaleFactor = Math.sqrt(distance / thresholdDistance);
```
- 100km: 2.83m (√2 scaled)
- 400km: 5.66m (√8 scaled)

### Faster scaling:
```typescript
const scaleFactor = Math.pow(distance / thresholdDistance, 1.5);
```
- 100km: 5.66m (2^1.5 scaled)
- 400km: 32m (8^1.5 scaled)

**Start with linear (default), adjust if needed.**

---

## Comparison: Tracked vs Untracked Scaling

### Tracked Mode:
```
Close (< 50km): 2m fixed
Far (> 50km): 2m × (distance / 50km)
```

### Untracked Mode:
```
All distances: 50km × (distance / 1000km)
```

**Key difference:**
- Tracked starts tiny (2m) → stays small when close
- Untracked starts bigger (50km) → visible from all angles

**Both scale at far distances to maintain visibility.**

---

## Implementation Time

**Estimated:** 5 minutes (simple change to existing logic)

---

## Code Changes

### Current (Tracked = Fixed):
```typescript
if (isTracked) {
  vectorLength = 2; // Always 2m
}
```

### New (Tracked = Fixed when close, scaled when far):
```typescript
if (isTracked) {
  const thresholdDistance = 50000; // 50km
  
  if (viewer) {
    const cameraPosition = viewer.camera.position;
    const distance = Cartesian3.distance(cameraPosition, pos);
    
    if (distance < thresholdDistance) {
      vectorLength = 2; // Fixed 2m when close
    } else {
      const scaleFactor = distance / thresholdDistance;
      vectorLength = 2 * scaleFactor; // Scale when far
    }
  } else {
    vectorLength = 2; // Fallback
  }
}
```

---

## Testing Checklist

**Tracked mode:**
- [ ] Very close (< 50km): Vector is 2m, looks good
- [ ] At threshold (50km): Vector is 2m
- [ ] Far (100km): Vector is 4m, visible
- [ ] Very far (1000km): Vector is 40m, clearly visible
- [ ] Infinite zoom-out: Vector keeps scaling, always visible

**Untracked mode:**
- [ ] Still works as before
- [ ] Scaling independent from tracked mode

---

## Adjustable Parameters

If the scaling doesn't feel right, tweak these:

1. **Threshold distance** (50km default)
   - Too much small vector? Decrease (e.g., 25km)
   - Too early scaling? Increase (e.g., 100km)

2. **Base size** (2m default)
   - Too small when close? Increase (e.g., 5m)
   - Too big when close? Decrease (e.g., 1m)

3. **Scaling rate** (linear default)
   - Too slow growth? Use power > 1
   - Too fast growth? Use power < 1 (sqrt)

---

## Implementation Complete! ✅

**What was implemented:**

```typescript
if (isTracked) {
  const thresholdDistance = 50000; // 50km threshold
  
  if (viewer) {
    const cameraPosition = viewer.camera.position;
    const distance = Cartesian3.distance(cameraPosition, pos);
    
    if (distance < thresholdDistance) {
      vectorLength = 2; // Fixed 2m when close
    } else {
      const scaleFactor = distance / thresholdDistance;
      vectorLength = 2 * scaleFactor; // Scale when far
    }
  }
}
```

**New tracked mode behavior:**
- **0-50km:** 2m (fixed, perfect close-up size)
- **50km:** 2m (threshold)
- **100km:** 4m (2× scaled)
- **500km:** 20m (10× scaled)
- **∞:** Scales infinitely, always visible! 🎉

**Benefits:**
- ✅ Clean look when close
- ✅ Always visible when far
- ✅ Infinite zoom-out capability
- ✅ Camera stays centered on satellite

**Ready to build and test!** Tracked mode is now perfect for all zoom levels. 🚀

