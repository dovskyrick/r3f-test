# Uncertainty Ellipsoid Implementation - Progress Summary

**Date**: January 2, 2026  
**Status**: ✅ Phase 3 Complete - Ready for Testing

---

## 📋 Implementation Phases

### ✅ Phase 1: Data Generation & Parsing (COMPLETE)
- **Data Generator**:
  - Added 6-value covariance generation per trajectory point
  - Covariance format: 3x3 position matrix (xx, yy, zz, xy, xz, yz)
  - Realistic values based on altitude and orbital parameters
  - Integrated into both `generate-trajectories.ts` and `generate-many-satellites.ts`

- **Parser**:
  - Created `covarianceParser.ts` with `parseCovariance()` function
  - Added `findNearestCovariance()` helper for sparse data
  - Integrated into `satelliteParser.ts`
  - Updates `ParsedSatellite` type to include optional `covariance` field

- **Files Modified**:
  - `satellite-data-generator/src/orbit-math.ts` - Added `generateCovariance()`
  - `satellite-data-generator/src/generate-trajectories.ts` - Integrated covariance
  - `satellite-data-generator/src/generate-many-satellites.ts` - Integrated covariance
  - `grafana-plugins/3d-orbit-attitude-plugin/src/parsers/covarianceParser.ts` - NEW
  - `grafana-plugins/3d-orbit-attitude-plugin/src/parsers/satelliteParser.ts` - Updated
  - `grafana-plugins/3d-orbit-attitude-plugin/src/types/satelliteTypes.ts` - Updated

---

### ✅ Phase 2: Panel Settings + Per-Satellite UI (COMPLETE)

- **Global Panel Settings**:
  - Added `showUncertaintyEllipsoids: boolean` (master toggle)
  - Added `uncertaintyOpacityMode: UncertaintyOpacityMode` (High/Medium/Low quality)
  - Added `uncertaintyColor: string` (default: cyan #00FFFF)
  - Settings visible under "Attitude Visualization" section

- **Per-Satellite Settings**:
  - Extended `satelliteRenderSettings` to include `showEllipsoid: boolean`
  - Added toggle in satellite settings modal ("Show Uncertainty Ellipsoid")
  - Checkbox allows per-satellite control of ellipsoid visibility

- **Files Modified**:
  - `grafana-plugins/3d-orbit-attitude-plugin/src/types.ts` - Added settings
  - `grafana-plugins/3d-orbit-attitude-plugin/src/module.ts` - Added UI controls
  - `grafana-plugins/3d-orbit-attitude-plugin/src/components/SatelliteVisualizer.tsx` - Updated state + modal

---

### ✅ Phase 3: Ellipsoid Renderer Component (COMPLETE)

- **Covariance Math Utility**:
  - Created `covarianceEllipsoid.ts` with eigen-decomposition
  - `covarianceToEllipsoid()` - Converts 3x3 matrix to ellipsoid parameters
  - `getOpacityForQuality()` - Maps quality mode to opacity (70%, 30%, 10%)
  - Uses power iteration for eigenvalue extraction
  - Handles degenerate cases with min/max radius clamping

- **Renderer Component**:
  - Created `UncertaintyEllipsoidRenderer` in `CesiumEntityRenderers.tsx`
  - Renders one ellipsoid per covariance epoch
  - Respects both global and per-satellite visibility settings
  - Applies opacity based on data quality mode
  - Uses cyan color (reserved for data quality, not collision avoidance)

- **Integration**:
  - Added import to `SatelliteVisualizer.tsx`
  - Renderer called after sensor visualization
  - Filters by satellite visibility and per-satellite ellipsoid toggle
  - Only renders if covariance data exists

- **Files Created/Modified**:
  - `grafana-plugins/3d-orbit-attitude-plugin/src/utils/covarianceEllipsoid.ts` - NEW
  - `grafana-plugins/3d-orbit-attitude-plugin/src/components/entities/CesiumEntityRenderers.tsx` - Added renderer
  - `grafana-plugins/3d-orbit-attitude-plugin/src/components/SatelliteVisualizer.tsx` - Integrated renderer

---

## 🎯 Current Implementation

### Hierarchical Toggle System

```
Global Panel Setting: "Show Uncertainty Ellipsoids" (ON/OFF)
    └── Per-Satellite Setting: "Show Ellipsoid" (per satellite in settings modal)
```

**Logic**: 
- If global toggle is OFF → No ellipsoids rendered (regardless of per-satellite settings)
- If global toggle is ON → Ellipsoids rendered only for satellites with per-satellite toggle ON (default: ON)

### Data Quality Visualization

- **Opacity-Only Approach**: No color changes, only opacity varies
- **High Quality (70%)**: Good tracking data, high confidence
- **Medium Quality (30%)**: Fair tracking data, moderate confidence  
- **Low Quality (10%)**: Poor tracking data, low confidence

- **Color**: Consistent cyan (#00FFFF) - reserved for uncertainty, not collision
- **Green/Red**: Reserved for future collision avoidance features

### Covariance Data Format

```typescript
interface CovarianceMatrix {
  xx: number;  // Variance in X (m²)
  yy: number;  // Variance in Y (m²)
  zz: number;  // Variance in Z (m²)
  xy: number;  // Covariance X-Y (m²)
  xz: number;  // Covariance X-Z (m²)
  yz: number;  // Covariance Y-Z (m²)
}
```

- **Frame**: ECEF (Earth-Centered, Earth-Fixed)
- **Units**: meters² (variance/covariance)
- **Type**: 3x3 symmetric position covariance matrix (6 unique values)
- **Sigma Scale**: 1.0 (1-sigma ~68% confidence interval)

---

## 🔄 Next Steps

### Phase 4: Testing & Refinement

1. **Build & Test**:
   ```bash
   cd grafana-plugins/3d-orbit-attitude-plugin
   npm run build
   ```

2. **Visual Testing**:
   - Toggle global "Show Uncertainty Ellipsoids" on/off
   - Test per-satellite ellipsoid toggles in settings modal
   - Verify opacity changes with different quality modes (High/Medium/Low)
   - Check ellipsoid rendering at different camera distances
   - Verify ellipsoids only appear for satellites with covariance data

3. **Performance Testing**:
   - Test with many-satellites.json (14 satellites)
   - Check frame rate impact
   - Monitor memory usage

4. **Refinement**:
   - Adjust ellipsoid size scaling if needed
   - Fine-tune opacity values
   - Improve eigen-decomposition accuracy (if needed)
   - Consider LOD (Level of Detail) for performance

### Phase 5: Export Functionality (PENDING)

- Add "Export Colors" button in settings
- Generate combined JSON with:
  - Satellite trajectory data
  - Ground station data
  - Sensor color overrides
- Save to file for sharing/persistence

---

## 🚀 Technical Implementation Highlights

### Eigen-Decomposition (Simplified)

We use **power iteration** to extract eigenvalues/eigenvectors from the covariance matrix:

1. Extract largest eigenvalue λ₁ and eigenvector v₁
2. Deflate matrix: M' = M - λ₁ · v₁ · v₁ᵀ
3. Extract second eigenvalue λ₂ and eigenvector v₂
4. Compute third eigenvector as cross product: v₃ = v₁ × v₂
5. Compute third eigenvalue by projection

**Semi-axis lengths**: `a = √λ₁ · σ`, `b = √λ₂ · σ`, `c = √λ₃ · σ`  
**Orientation**: Quaternion from rotation matrix [v₁, v₂, v₃]

### Cesium Rendering

Currently using **PointGraphics** as a placeholder. The ellipsoid is rendered with:
- Position: Satellite position at covariance epoch
- Orientation: Quaternion from eigenvector rotation matrix
- Size: Scaled by smallest semi-axis length
- Color: Cyan with opacity based on data quality

**Note**: Full 3D oriented ellipsoids require custom Cesium primitives (future enhancement).

---

## 📊 Data Flow

```
1. Generate Test Data
   └── orbit-math.ts: generateCovariance()
       └── Adds 6 covariance values per trajectory point

2. Parse Data
   └── covarianceParser.ts: parseCovariance()
       └── Extracts CovarianceEpoch[] from DataFrame

3. Store in Satellite
   └── satelliteParser.ts: parseSatellites()
       └── Adds optional covariance array to ParsedSatellite

4. Render Ellipsoids
   └── UncertaintyEllipsoidRenderer
       ├── covarianceToEllipsoid(): Compute radii & orientation
       └── Resium Entity: Render with PointGraphics (placeholder)
```

---

## ✅ Success Criteria

- [x] Data generator produces realistic covariance values
- [x] Parser extracts covariance from Grafana DataFrames
- [x] Global panel setting to toggle ellipsoids
- [x] Per-satellite toggle in settings modal
- [x] Opacity indicates data quality (70% / 30% / 10%)
- [x] Consistent cyan color (reserved for uncertainty)
- [ ] Visual confirmation in running app (TESTING PHASE)
- [ ] Performance acceptable with multiple satellites (TESTING PHASE)

---

## 🎓 Research Notes

### Academic Impact

This implementation provides:

1. **Uncertainty Quantification**: Rare in operational satellite visualization tools
2. **Data Quality Visualization**: Transparent indication of tracking confidence
3. **3D Confidence Regions**: Standard statistical visualization applied to space domain
4. **Extensibility**: Framework for future collision avoidance features

### Future Enhancements

- **Full 3D Ellipsoids**: Use Cesium Primitives for true oriented ellipsoids
- **Time-Varying Quality**: Interpolate opacity between epochs
- **Sparse Data Handling**: Visual indicators for missing covariance data
- **Collision Probability**: Integrate with green/red color scheme
- **Automated Alerts**: Threshold-based warnings for low-quality data

---

**Status**: ✅ **Ready for Testing**  
**Next Action**: Build and test in Grafana with new covariance data

---

**Last Updated**: January 2, 2026  
**Author**: Ricardo Santos, Instituto Superior Técnico

