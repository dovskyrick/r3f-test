# Horizon Tangent Points - Smooth FOV Footprint Edges

**Date:** December 13, 2025  
**Goal:** Add horizon tangent points to complete the elliptical FOV footprint shape

---

## 1. **The Problem** 🎯

When a sensor FOV cone is partially cut by the horizon:

```
        Satellite
            •
          ╱ │ ╲
        ╱   │   ╲  FOV cone
      ╱     ↓     ╲
    ╱       ?       ╲
   •────────────────•  Earth
   ↑                ↑
  Left             Right
  edge             edge
  
Missing: The farthest point in the middle!
```

**Current result:** Incomplete arc (looks like `∩` with flat bottom)  
**Desired result:** Complete ellipse (looks like smooth `⌒`)

---

## 2. **What We Need to Find** 📐

**Horizon tangent point:**
- The **farthest visible point** on Earth within the FOV
- Where line of sight from satellite is **tangent** to Earth (grazes surface)
- **90° angle** between Earth radius and line of sight
- Located at the **center direction** of the horizon cut

---

## 3. **The Algorithm** 🔧

### **Step 1: Detect Horizon Cut**

Already done! We detect transitions where some rays hit and some miss.

```typescript
// After detecting transitions, we know:
const leftEdgeAngle = ...;   // Angle where last hit before miss
const rightEdgeAngle = ...;  // Angle where last hit before miss (other side)
```

### **Step 2: Find Middle Angular Region**

Between the two edges, compute several angles to sample:

```typescript
const numTangentSamples = 7;  // Sample 5-10 angles

const middleAngles: number[] = [];
for (let i = 0; i < numTangentSamples; i++) {
  const t = (i + 1) / (numTangentSamples + 1);  // 0.125, 0.25, 0.375, ...
  const angle = leftEdgeAngle + t * (rightEdgeAngle - leftEdgeAngle);
  middleAngles.push(angle);
}
```

### **Step 3: For Each Middle Angle, Find Horizon Tangent**

For each angle, compute the tangent point:

```typescript
function findHorizonTangentPoint(
  satellitePos: Cartesian3,
  direction: Cartesian3  // Unit vector pointing in cone at this angle
): Cartesian3 | null {
  
  // Step 3a: Compute horizon distance
  const satHeight = Cartesian3.magnitude(satellitePos) - earthRadius;
  const horizonDistance = Math.sqrt(
    satHeight * satHeight + 2 * satHeight * earthRadius
  );
  
  // Step 3b: Position along the direction at horizon distance
  const tangentPoint = Cartesian3.add(
    satellitePos,
    Cartesian3.multiplyByScalar(direction, horizonDistance, new Cartesian3()),
    new Cartesian3()
  );
  
  // Step 3c: Project to Earth surface (closest point on ellipsoid)
  const surfacePoint = Ellipsoid.WGS84.scaleToGeodeticSurface(
    tangentPoint,
    new Cartesian3()
  );
  
  return surfacePoint;
}
```

### **Step 4: Verify Point is Within FOV**

Check that the tangent point angle is actually within the cone half-angle:

```typescript
// Vector from satellite to tangent point
const toTangent = Cartesian3.subtract(tangentPoint, satellitePos, new Cartesian3());
Cartesian3.normalize(toTangent, toTangent);

// Angle between cone axis and this vector
const angleToConeAxis = Math.acos(Cartesian3.dot(coneAxis, toTangent));

// Check if within FOV
if (angleToConeAxis <= halfAngleRad) {
  // Valid! Include this point
}
```

### **Step 5: Insert Points into Polygon**

Add these tangent points to the footprint polygon between left and right edges:

```typescript
// After left edge subdivision points
tangentPoints.forEach(p => allResults.push({ angle: p.angle, point: p, hit: true }));
// Before right edge subdivision points
```

---

## 4. **Simplified Approach** ⭐

**Simplest version (5-7 samples):**

```typescript
// After detecting horizon cut transitions:

if (isHorizonCut) {
  // Find the two edge angles
  const [leftEdge, rightEdge] = findEdgeAngles(initialResults);
  
  // Sample 7 tangent points in the middle
  for (let i = 1; i <= 7; i++) {
    const t = i / 8;
    const angle = leftEdge + t * (rightEdge - leftEdge);
    
    // Compute ray direction at this angle
    const rayDir = computeRayDirection(angle, coneAxis, perp1, perp2, halfAngleRad);
    
    // Find horizon tangent
    const tangentPoint = findHorizonTangent(satellitePos, rayDir);
    
    if (tangentPoint) {
      allResults.push({ angle, point: tangentPoint, hit: true });
    }
  }
}
```

---

## 5. **Math Details** 📊

### **Horizon Distance Formula:**

Given:
- Satellite height above Earth: `h`
- Earth radius: `R`

Horizon distance (straight-line):
```
d = √(h² + 2hR)
```

Or more accurately for WGS84 ellipsoid:
```
d = √((|satPos| - R)² + 2(|satPos| - R)R)
```

### **Why This Works:**

At the horizon tangent point:
```
|satPos| = satellite distance from Earth center
|tangentPoint| = R (on Earth surface)

Pythagorean theorem:
d² + R² = |satPos|²
d = √(|satPos|² - R²)
```

---

## 6. **Implementation Changes** 🛠️

### **What to Modify:**

File: `src/utils/projections.ts`, function `computeFOVFootprint()`

**After line where we detect horizon cut:**

```typescript
// NEW CODE BLOCK: Add horizon tangent points

if (hitCount > 0 && hitCount < numRays) {
  // Find transition edges
  const edgeIndices = findTransitionEdges(initialResults);
  
  if (edgeIndices.length >= 2) {
    const leftEdge = initialResults[edgeIndices[0]];
    const rightEdge = initialResults[edgeIndices[1]];
    
    // Sample 7 tangent points between edges
    const tangentSamples = 7;
    for (let i = 1; i <= tangentSamples; i++) {
      const t = i / (tangentSamples + 1);
      const angle = leftEdge.angle + t * (rightEdge.angle - leftEdge.angle);
      
      // Compute direction at this angle
      const rayDir = computeDirectionAtAngle(
        angle, 
        coneAxis, 
        perp1, 
        perp2, 
        halfAngleRad
      );
      
      // Find horizon tangent
      const tangentPt = computeHorizonTangent(position, rayDir);
      
      if (tangentPt) {
        allResults.push({ angle, point: tangentPt, hit: true });
      }
    }
  }
}
```

---

## 7. **Helper Functions Needed** 🔨

### **A. Find Transition Edge Angles**

```typescript
function findTransitionEdges(results: RayResult[]): number[] {
  const edges: number[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const current = results[i];
    const next = results[(i + 1) % results.length];
    
    // Transition detected
    if (current.hit !== next.hit) {
      edges.push(i);
    }
  }
  
  return edges;
}
```

### **B. Compute Ray Direction at Angle**

Extract the existing direction computation into a helper:

```typescript
function computeDirectionAtAngle(
  angle: number,
  coneAxis: Cartesian3,
  perp1: Cartesian3,
  perp2: Cartesian3,
  halfAngleRad: number
): Cartesian3 {
  const cosHalf = Math.cos(halfAngleRad);
  const sinHalf = Math.sin(halfAngleRad);
  
  const circleDir = Cartesian3.add(
    Cartesian3.multiplyByScalar(perp1, Math.cos(angle) * sinHalf, new Cartesian3()),
    Cartesian3.multiplyByScalar(perp2, Math.sin(angle) * sinHalf, new Cartesian3()),
    new Cartesian3()
  );
  
  const rayDirection = Cartesian3.add(
    Cartesian3.multiplyByScalar(coneAxis, cosHalf, new Cartesian3()),
    circleDir,
    new Cartesian3()
  );
  
  return Cartesian3.normalize(rayDirection, new Cartesian3());
}
```

### **C. Compute Horizon Tangent Point**

```typescript
function computeHorizonTangent(
  satellitePos: Cartesian3,
  direction: Cartesian3
): Cartesian3 | null {
  
  const earthRadius = Ellipsoid.WGS84.maximumRadius;
  const satDistance = Cartesian3.magnitude(satellitePos);
  const altitude = satDistance - earthRadius;
  
  // Horizon distance (straight-line tangent)
  const horizonDist = Math.sqrt(altitude * altitude + 2 * altitude * earthRadius);
  
  // Point along direction at horizon distance
  const horizonPoint = Cartesian3.add(
    satellitePos,
    Cartesian3.multiplyByScalar(direction, horizonDist, new Cartesian3()),
    new Cartesian3()
  );
  
  // Project to Earth surface (closest point on ellipsoid)
  const surfacePoint = Ellipsoid.WGS84.scaleToGeodeticSurface(
    horizonPoint,
    new Cartesian3()
  );
  
  if (!surfacePoint) {
    return null;
  }
  
  // Add offset above surface (same as other footprint points)
  const surfaceNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(surfacePoint, new Cartesian3());
  const offsetPoint = Cartesian3.add(
    surfacePoint,
    Cartesian3.multiplyByScalar(surfaceNormal, 100, new Cartesian3()),  // 100m offset
    new Cartesian3()
  );
  
  return offsetPoint;
}
```

---

## 8. **Expected Result** ✨

### **Before:**
```
Footprint with horizon cut:
  •─•─••••••••─────────••••••••─•─•
  ↑           gap               ↑
Left edge                   Right edge
```

### **After:**
```
Footprint with smooth horizon:
  •─•─••••••••─○─○─○─○─○─○─○─••••••••─•─•
  ↑           ↑ tangent pts ↑           ↑
Left       horizon curve            Right
           (completes the ellipse!)
```

---

## 9. **Complexity** ⏱️

**Additions:**
- 3 helper functions (~30 lines each)
- 1 new code block in main function (~20 lines)
- Total: ~110 lines of new code

**Difficulty:** 🟡 Medium
- Math is straightforward
- Cesium helpers available
- Main complexity: integration with existing transition detection

---

## 10. **Testing Strategy** 🧪

### **Test Case 1: Nadir Sensor (pointing down)**
- Expect: Full circular footprint (no horizon cut)
- No tangent points needed

### **Test Case 2: Low-Angle Sensor (20° above horizon)**
- Expect: Partial ellipse with horizon cut
- Should add 7 tangent points at far edge

### **Test Case 3: Near-Horizon Sensor (5° above horizon)**
- Expect: Very elongated ellipse
- Tangent points critical for smooth curve

---

## 11. **Alternative: Single Center Point** 🎯

**Simplest possible approach (if 7 samples is too many):**

Just add **ONE point** at the exact center:

```typescript
const centerAngle = (leftEdge + rightEdge) / 2;
const centerDir = computeDirectionAtAngle(centerAngle, ...);
const centerTangent = computeHorizonTangent(satellitePos, centerDir);

if (centerTangent) {
  allResults.push({ angle: centerAngle, point: centerTangent, hit: true });
}
```

**Pros:**
- ✅ Minimal code
- ✅ Still completes the ellipse shape

**Cons:**
- ⚠️ Less smooth (only 1 point vs 7)
- ⚠️ Might still look slightly flat

**Recommendation:** Start with 1 point, increase to 7 if needed

---

## 12. **Summary** (TL;DR) 📝

**Problem:** FOV footprints have flat/jagged horizon cuts  
**Solution:** Add 5-7 horizon tangent points at the center of the cut  
**Math:** Use horizon distance formula + Cesium ellipsoid projection  
**Effort:** ~110 lines, 3 helper functions, medium difficulty  
**Result:** Smooth elliptical footprints (professors happy!) 🎓✨

---

**Ready to implement?** 🚀

