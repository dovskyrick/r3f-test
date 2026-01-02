# Uncertainty Ellipsoid Visualization - Implementation Plan

**Date:** January 1, 2026  
**Phase 1 Goal:** Basic 3D position uncertainty ellipsoids with sparse data handling

---

## 📊 Data Model Design

### JSON Schema Extension

**Add to each trajectory row:**
```json
{
  "satelliteId": "sat-1",
  "columns": [
    {"text": "time", "type": "time"},
    {"text": "longitude", "type": "number"},
    {"text": "latitude", "type": "number"},
    {"text": "altitude", "type": "number"},
    {"text": "qx", "type": "number"},
    {"text": "qy", "type": "number"},
    {"text": "qz", "type": "number"},
    {"text": "qs", "type": "number"},
    // NEW: Position uncertainty (3x3 covariance)
    {"text": "cov_xx", "type": "number"},  // Variance in X (m²)
    {"text": "cov_yy", "type": "number"},  // Variance in Y (m²)
    {"text": "cov_zz", "type": "number"},  // Variance in Z (m²)
    {"text": "cov_xy", "type": "number"},  // Covariance X-Y (m²)
    {"text": "cov_xz", "type": "number"},  // Covariance X-Z (m²)
    {"text": "cov_yz", "type": "number"}   // Covariance Y-Z (m²)
  ],
  "meta": {
    "custom": {
      "covarianceFrame": "ECEF",  // or "ECI" / "GCRF"
      "covarianceConfidence": "1sigma",  // or "2sigma", "3sigma", "95percent"
      "sensors": [...]
    }
  }
}
```

**Why 6 values for 3x3 symmetric matrix:**
- Symmetric: cov_xy = cov_yx (only store upper triangle)
- Reduces bandwidth by 33%

### Reference Frame Choice

**Decision: Use ECEF (Earth-Centered Earth-Fixed)**

**Rationale:**
- ✅ Your satellite positions are already in Geodetic → convert to ECEF internally
- ✅ Cesium works natively in ECEF/WGS84
- ✅ No additional coordinate transforms needed
- ✅ Physically intuitive (X/Y/Z align with Earth)

**Alternative (ECI) deferred:**
- More complex (requires rotation with Earth)
- Better for long-arc propagation
- Overkill for thesis demo

---

## 🎨 Sparse Data Visualization Strategy

### Option 1: Opacity Gradient (RECOMMENDED)

**Visual approach:**
```
Dense Data      Sparse Data       Dense Data
  Point 1    ←  Interpolated  →    Point 2
    ████           ░░░░░░░           ████
  (Opaque)     (Transparent)      (Opaque)
```

**Implementation:**
1. **"Fresh" zone:** ±5 min from covariance epoch → 70% opacity
2. **"Stale" zone:** 5-15 min from epoch → 30% opacity (fade)
3. **"Unknown" zone:** >15 min from any epoch → 10% opacity

**Color:** Consistent neutral color (e.g., cyan/light blue) - NOT green/red
- **Rationale:** Green/red reserved for collision avoidance visualization

### Option 2: Stepwise Display

**Show ellipsoid only near actual covariance epochs:**
- Render ellipsoid for ±5 min around each epoch
- Hide ellipsoid in gaps
- Display "No Uncertainty Data" badge on timeline

**Advantage:** Honest about data quality  
**Disadvantage:** Gaps look jarring

### Option 3: Linear Interpolation with Warning

**Interpolate covariance (with caveats):**
- Use log-Euclidean interpolation to preserve SPD
- Always show a ⚠️ icon when displaying interpolated uncertainty
- Sidebar shows: "Interpolated uncertainty (not propagated)"

**Advantage:** Continuous visualization  
**Disadvantage:** May misrepresent actual uncertainty growth

---

## 🎯 Recommended Approach: Hybrid

**Combine Option 1 + Warning System:**

### Visual Elements

**1. Ellipsoid Opacity Map:**
```typescript
function getEllipsoidOpacity(currentTime, nearestCovEpoch) {
  const deltaMinutes = Math.abs(currentTime - nearestCovEpoch) / 60000;
  
  if (deltaMinutes < 5) return 0.8;        // Fresh: solid
  if (deltaMinutes < 15) return 0.4;       // Aging: fading
  if (deltaMinutes < 30) return 0.15;      // Stale: ghosted
  return 0.0;  // Don't render beyond 30 min
}
```

**2. Opacity-Only Coding:**
```typescript
function getEllipsoidOpacity(currentTime, nearestCovEpoch) {
  const deltaMinutes = Math.abs(currentTime - nearestCovEpoch) / 60000;
  
  if (deltaMinutes < 5) return 0.7;        // Fresh: solid
  if (deltaMinutes < 15) return 0.3;       // Aging: fading
  if (deltaMinutes < 30) return 0.1;       // Stale: ghosted
  return 0.0;  // Don't render beyond 30 min
}
```

**Note:** No color changes - opacity conveys data quality subtly. Explicit quality metrics shown on timeline/sidebar.

**3. Timeline Indicator:**
- Add small dot on Cesium timeline for each covariance epoch
- Tooltip: "Covariance measured at 12:34:56"

**4. Sidebar Notification:**
```
⚠️ Uncertainty Data Quality
├─ Last measurement: 12 minutes ago
├─ Next measurement: in 3 minutes
└─ Current display: Interpolated (not propagated)
```

---

## 📐 Ellipsoid Rendering Math

### Step 1: Parse Covariance Matrix

```typescript
const P_rr = [
  [cov_xx, cov_xy, cov_xz],
  [cov_xy, cov_yy, cov_yz],
  [cov_xz, cov_yz, cov_zz]
];
```

### Step 2: Eigen Decomposition

Use `math.js` or similar:
```typescript
import { eigs } from 'mathjs';

const { values, vectors } = eigs(P_rr);
// values = [λ1, λ2, λ3] (eigenvalues = variance along principal axes)
// vectors = 3x3 matrix (columns = principal directions)
```

### Step 3: Ellipsoid Parameters

```typescript
const confidenceScale = {
  '1sigma': 1.0,      // 68.3% confidence (1σ)
  '2sigma': 2.0,      // 95.4% confidence (2σ)
  '3sigma': 3.0,      // 99.7% confidence (3σ)
  '95percent': 2.795  // Exactly 95% for 3D Gaussian (chi-square)
};

const scale = confidenceScale['2sigma'];  // User-selectable

const semiAxes = {
  x: scale * Math.sqrt(values[0]),  // meters
  y: scale * Math.sqrt(values[1]),
  z: scale * Math.sqrt(values[2])
};
```

### Step 4: Orientation Quaternion

Convert eigenvector matrix to quaternion:
```typescript
import { Quaternion, Matrix3 } from 'cesium';

const rotationMatrix = new Matrix3(
  vectors[0][0], vectors[1][0], vectors[2][0],
  vectors[0][1], vectors[1][1], vectors[2][1],
  vectors[0][2], vectors[1][2], vectors[2][2]
);

const orientation = Quaternion.fromRotationMatrix(rotationMatrix);
```

---

## 🏗️ Implementation Phases

### **Phase 1: Data Generation & Parsing** (TODAY)

**1.1 Update Data Generator (1 hour)**
- Add 6 covariance columns to `generate-trajectories.ts`
- Generate realistic covariance values:
  - Base uncertainty: ~10m radial, ~5m transverse
  - Grow uncertainty with time (simulate aging measurements)
  - Reduce uncertainty after "measurements" (sparse epochs)

**1.2 Create Covariance Parser (30 min)**
- New file: `parsers/covarianceParser.ts`
- Extract 3x3 matrix from DataFrame
- Validate SPD property (optional: warn if violated)

**1.3 Update Types (15 min)**
```typescript
// types/satelliteTypes.ts
export interface CovarianceData {
  epoch: Date;
  P_rr: number[][];  // 3x3 position covariance (ECEF)
  confidence: '1sigma' | '2sigma' | '3sigma' | '95percent';
  frame: 'ECEF' | 'ECI';
}

export interface ParsedSatellite {
  // ... existing fields
  covariances?: CovarianceData[];  // Optional: sparse epochs
}
```

---

### **Phase 2: Basic Ellipsoid Rendering** (2-3 hours)

**2.1 Create Uncertainty Renderer Component**
```typescript
// components/entities/UncertaintyRenderer.tsx

export const UncertaintyEllipsoidRenderer: React.FC<{
  satellite: ParsedSatellite;
  currentTime: JulianDate;
  options: SimpleOptions;
}> = ({ satellite, currentTime, options }) => {
  // Find nearest covariance epoch
  // Compute ellipsoid parameters
  // Render with EllipsoidGraphics
};
```

**2.2 Cesium Ellipsoid Rendering**
```typescript
import { Entity, EllipsoidGraphics } from 'resium';

<Entity position={satellitePosition}>
  <EllipsoidGraphics
    radii={new Cartesian3(semiAxes.x, semiAxes.y, semiAxes.z)}
    material={Color.CYAN.withAlpha(opacity)}  // Cyan: neutral, visible
    outline={true}
    outlineColor={Color.WHITE}
    outlineWidth={1}
  />
</Entity>
```

**Note:** Green/red colors reserved for future collision avoidance feature.

---

### **Phase 3: Sparse Data Handling** (2 hours)

**3.1 Opacity/Color Logic**
- Implement time-based opacity function
- Add color gradient (green → yellow → red)

**3.2 Timeline Indicators**
- Render dots on Cesium timeline for cov epochs
- Add tooltips

**3.3 Sidebar Notification**
- Show data quality metrics
- Display time since last measurement

---

### **Phase 4: UI Controls** (1 hour)

**4.1 Panel Settings**
```typescript
// Add to SimpleOptions
showUncertaintyEllipsoids: boolean;
uncertaintyConfidence: '1sigma' | '2sigma' | '3sigma' | '95percent';
uncertaintyOpacity: number;  // 0-1
```

**4.2 Toggle in Sidebar**
- Per-satellite: Show/hide uncertainty
- Global: Toggle all uncertainties

---

### **Phase 5: Advanced (Future)**

- Attitude uncertainty (quaternion covariance → 3D cone)
- FOV pointing uncertainty (cone with uncertainty envelope)
- Trajectory uncertainty tubes (extrude ellipsoids along path)
- Monte Carlo cloud visualization (sample from covariance)

---

## 📋 Phase 1 Deliverables (Starting Now)

### Files to Create/Modify:

**1. Data Generator:**
- `satellite-data-generator/src/generate-trajectories.ts` (add covariance)

**2. Parser:**
- `grafana-plugins/.../src/parsers/covarianceParser.ts` (new file)

**3. Types:**
- `grafana-plugins/.../src/types/satelliteTypes.ts` (extend interface)

**4. Test Data:**
- `satellite-data-generator/output/multi-satellite.json` (regenerate)

---

## 🎓 Academic Soundness

### This approach is solid because:

1. **CCSDS-aligned:** Matches ODM covariance representation
2. **Physically motivated:** 3x3 P_rr is standard in orbit determination
3. **Honest visualization:** Opacity gradients reveal data quality
4. **Frame consistency:** ECEF matches rest of visualization
5. **Future-proof:** Easy to extend to 6x6 or attitude covariance

### Thesis Contribution:

> "We developed a novel time-aware visualization of orbital uncertainty that uses opacity gradients to communicate measurement freshness, enabling operators to distinguish between high-confidence (recently measured) and low-confidence (interpolated) state estimates."

---

## ✅ Decision: Start Implementation?

**This is straightforward enough to start coding now.**

**Next steps:**
1. Approve this plan
2. I'll implement Phase 1 (data generation + parsing)
3. You test with regenerated JSON
4. Move to Phase 2 (rendering)

**Estimated Phase 1 time:** 1-2 hours

**Ready to code?** 🚀

