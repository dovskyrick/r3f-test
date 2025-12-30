# Ground Station Visualization in CesiumJS - Technical Exploration

**Date**: December 30, 2025  
**Purpose**: Explore CesiumJS capabilities for ground station placement, terrain awareness, and line-of-sight analysis

---

## 🌍 Ground Station Positioning Requirements

### Minimum Data Required
```json
{
  "id": "GS-MAD",
  "name": "Madrid Deep Space",
  "latitude": 40.4314,
  "longitude": -4.2481,
  "altitude": 0  // Optional but recommended
}
```

### Coordinate Systems Supported

**1. Geodetic (Most Common)**
- **Latitude**: Degrees (-90 to +90)
- **Longitude**: Degrees (-180 to +180)
- **Altitude**: Meters above WGS84 ellipsoid

**2. Cartesian (ECEF - Earth-Centered Earth-Fixed)**
- **X, Y, Z**: Meters from Earth center
- Useful for precision calculations

---

## 🏔️ Cesium Terrain Capabilities

### Does Cesium Know Terrain Altitude?

**YES!** Cesium has comprehensive terrain support:

#### Built-in Terrain Providers:
1. **Cesium World Terrain** (Default - FREE)
   - Global coverage at ~30m resolution
   - Elevation data from multiple sources (SRTM, ASTER, etc.)
   - Mesh-based (not just heightmap)
   - Occlusion-aware rendering

2. **Cesium Ion Terrain** (Premium)
   - Higher resolution in some areas
   - Updated regularly
   - Requires Cesium Ion token

3. **Custom Terrain**
   - Load your own heightmap/quantized-mesh tiles
   - For specific high-res areas

### Automatic Terrain Clamping

```typescript
// Option 1: Clamp to terrain surface
const position = Cartesian3.fromDegrees(longitude, latitude, 0);
entity.position = position;
entity.clampToGround = true;  // Automatically sits on terrain

// Option 2: Height above terrain
const position = Cartesian3.fromDegrees(longitude, latitude, antennaHeight);
```

### Sampling Terrain Elevation

```typescript
// Get terrain height at a specific location
const positions = [Cartesian3.fromDegrees(lon, lat)];
const promise = viewer.scene.sampleTerrainMostDetailed(
  viewer.terrainProvider,
  positions
);

promise.then((updatedPositions) => {
  const terrainHeight = updatedPositions[0].height;
  console.log(`Terrain elevation: ${terrainHeight}m`);
});
```

---

## 🏢 Antenna Height Above Ground

### Yes, This is Fully Supported!

```typescript
// Ground station with antenna on building
const groundStationData = {
  latitude: 40.4314,
  longitude: -4.2481,
  terrainAltitude: 650,      // Meters above sea level (from terrain)
  buildingHeight: 20,        // Meters (building/tower)
  antennaHeight: 15,         // Meters (antenna mast)
  totalAltitude: 650 + 20 + 15  // = 685m above ellipsoid
};

const position = Cartesian3.fromDegrees(
  groundStationData.longitude,
  groundStationData.latitude,
  groundStationData.totalAltitude
);
```

### Recommended JSON Structure for Ground Stations

```json
{
  "groundStations": [
    {
      "id": "GS-MAD",
      "name": "Madrid Deep Space",
      "location": {
        "latitude": 40.4314,
        "longitude": -4.2481,
        "elevation": 650,        // Terrain elevation (meters MSL)
        "antennaHeight": 35      // Height above ground (building + antenna)
      },
      "equipment": {
        "antennaType": "DSN 70m",
        "minElevation": 10,      // Minimum elevation angle (degrees)
        "maxElevation": 90,
        "azimuthRange": [0, 360]
      },
      "visibility": {
        "horizonMask": [         // Optional: custom horizon profile
          { "azimuth": 0, "elevation": 5 },
          { "azimuth": 90, "elevation": 3 },
          { "azimuth": 180, "elevation": 8 },  // Mountain blocking
          { "azimuth": 270, "elevation": 4 }
        ]
      }
    }
  ]
}
```

---

## 🏔️ Line-of-Sight & Terrain Occlusion

### Can We See if a Mountain Blocks the View?

**YES!** Cesium has built-in occlusion detection:

### 1. **Automatic Horizon Occlusion**
```typescript
// Cesium automatically handles terrain occlusion in rendering
viewer.scene.globe.depthTestAgainstTerrain = true;

// Objects behind terrain are automatically hidden
// No additional code needed for visual occlusion
```

### 2. **Ray-Based Line-of-Sight**
```typescript
// Check if satellite is visible from ground station
function isSatelliteVisible(gsPosition, satPosition, viewer) {
  const ray = new Ray(gsPosition, 
    Cartesian3.subtract(satPosition, gsPosition, new Cartesian3())
  );
  
  // Test intersection with terrain and Earth
  const intersection = viewer.scene.globe.pick(ray, viewer.scene);
  
  if (intersection) {
    // Ray hit terrain or Earth - satellite is occluded
    return false;
  }
  
  return true;  // Clear line of sight
}
```

### 3. **Elevation Angle Calculation**
```typescript
// Calculate elevation angle from GS to satellite
function calculateElevationAngle(gsPosition, satPosition) {
  const direction = Cartesian3.subtract(satPosition, gsPosition, new Cartesian3());
  Cartesian3.normalize(direction, direction);
  
  const surfaceNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(gsPosition);
  
  const elevationAngle = Math.asin(
    Cartesian3.dot(direction, surfaceNormal)
  );
  
  return CesiumMath.toDegrees(elevationAngle);
}
```

### 4. **Horizon Mask Implementation**
```typescript
// Check if satellite is above custom horizon mask
function isAboveHorizonMask(azimuth, elevation, horizonMask) {
  // Find closest horizon points by azimuth
  const maskedElevation = interpolateHorizonMask(azimuth, horizonMask);
  
  return elevation > maskedElevation;
}
```

---

## 🎨 Visualization Techniques for Ground Stations

### 1. **Ground Station Marker**
```typescript
viewer.entities.add({
  name: 'Madrid Deep Space',
  position: Cartesian3.fromDegrees(lon, lat, alt),
  billboard: {
    image: 'antenna-icon.png',
    width: 32,
    height: 32,
    heightReference: HeightReference.NONE  // Use absolute altitude
  },
  label: {
    text: 'Madrid DSN',
    font: '14px sans-serif',
    verticalOrigin: VerticalOrigin.BOTTOM,
    pixelOffset: new Cartesian2(0, -40)
  }
});
```

### 2. **Visibility Cone (Field of View)**
```typescript
// Show ground station coverage cone
viewer.entities.add({
  position: gsPosition,
  cylinder: {
    length: 1000000,  // 1000 km range
    topRadius: Math.tan(CesiumMath.toRadians(75)) * 500000,  // 75° max elevation
    bottomRadius: 0,
    material: Color.CYAN.withAlpha(0.2),
    outline: true,
    outlineColor: Color.CYAN
  }
});
```

### 3. **Line-of-Sight Visualization**
```typescript
// Draw line from GS to satellite
viewer.entities.add({
  polyline: {
    positions: [gsPosition, satPosition],
    width: 2,
    material: new PolylineDashMaterialProperty({
      color: isVisible ? Color.GREEN : Color.RED,
      dashLength: 16
    })
  }
});
```

### 4. **Horizon Profile Visualization**
```typescript
// Draw custom horizon mask around ground station
const horizonPoints = horizonMask.map(point => {
  const distance = 100000;  // 100km away
  const direction = /* calculate from azimuth and elevation */;
  return gsPosition + direction * distance;
});

viewer.entities.add({
  polyline: {
    positions: horizonPoints,
    width: 3,
    material: Color.ORANGE,
    clampToGround: false
  }
});
```

---

## 🎯 Real-World Ground Station Examples

### NASA Deep Space Network (DSN)

```json
{
  "groundStations": [
    {
      "id": "GS-DSS14",
      "name": "Goldstone - DSS-14",
      "location": {
        "latitude": 35.4267,
        "longitude": -116.8900,
        "elevation": 1001,
        "antennaHeight": 70
      },
      "equipment": {
        "diameter": "70m",
        "minElevation": 5,
        "bands": ["S", "X", "Ka"]
      }
    },
    {
      "id": "GS-DSS43",
      "name": "Canberra - DSS-43",
      "location": {
        "latitude": -35.4019,
        "longitude": 148.9819,
        "elevation": 688,
        "antennaHeight": 70
      }
    },
    {
      "id": "GS-DSS63",
      "name": "Madrid - DSS-63",
      "location": {
        "latitude": 40.4314,
        "longitude": -4.2481,
        "elevation": 837,
        "antennaHeight": 70
      }
    }
  ]
}
```

### ESA Ground Stations

```json
{
  "id": "GS-NNO",
  "name": "New Norcia",
  "location": {
    "latitude": -31.0483,
    "longitude": 116.1914,
    "elevation": 252,
    "antennaHeight": 35
  }
}
```

---

## 🚀 Advanced Features We Can Implement

### 1. **Contact Windows Prediction**
- Calculate when satellites are visible from each GS
- Factor in elevation mask
- Account for terrain occlusion
- Display as timeline or schedule

### 2. **Multi-Station Coverage**
- Show which satellites are visible from multiple stations
- Handover visualization
- Coverage gaps identification

### 3. **Signal Strength Estimation**
- Distance-based
- Elevation angle effects
- Atmospheric attenuation (simple model)

### 4. **Real-Time Access Visualization**
- Draw active links (GS ↔ Satellite)
- Animate during playback
- Color-code by signal quality

---

## 📊 Data Sources for Ground Station Locations

### Public Sources:
1. **NASA DSN**: https://eyes.nasa.gov/dsn/dsn.html
2. **ESA Tracking Stations**: https://www.esa.int/Enabling_Support/Operations/ESA_Ground_Stations
3. **NORAD Ground Stations**: Public catalogs
4. **Amateur Radio**: SatNOGS network

### Terrain Data:
1. **Cesium World Terrain**: Built-in (free)
2. **SRTM**: 30m resolution globally
3. **ASTER GDEM**: 30m resolution
4. **Local Surveys**: For high-precision applications

---

## ✅ Recommendations for Implementation

### Phase 1: Basic Ground Stations (Now)
```typescript
interface GroundStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;  // Total: terrain + antenna height
}
```

### Phase 2: Visibility Calculations
```typescript
interface GroundStation {
  // ... Phase 1 fields
  minElevation: number;  // Degrees (typically 5-10°)
  maxRange: number;      // Meters (optional limit)
}
```

### Phase 3: Advanced Features
```typescript
interface GroundStation {
  // ... Phase 2 fields
  horizonMask?: Array<{ azimuth: number; elevation: number }>;
  equipment?: {
    type: string;
    frequency: number;
    power: number;
  };
}
```

---

## 🎓 Key Cesium APIs to Use

### Terrain
- `viewer.terrainProvider` - Access terrain data
- `viewer.scene.sampleTerrainMostDetailed()` - Query elevation
- `viewer.scene.globe.depthTestAgainstTerrain` - Enable occlusion

### Positioning
- `Cartesian3.fromDegrees(lon, lat, alt)` - Create positions
- `HeightReference.NONE` - Absolute altitude
- `HeightReference.CLAMP_TO_GROUND` - Terrain-relative

### Visibility
- `viewer.scene.globe.pick(ray)` - Ray-terrain intersection
- `Ellipsoid.WGS84.geodeticSurfaceNormal()` - Surface normal
- Custom horizon mask calculations

---

## 💡 Example: Antenna Behind Mountain

```typescript
// Poorly placed antenna scenario
const groundStation = {
  name: "Mountain-Blocked Station",
  latitude: 46.5,
  longitude: 8.5,
  elevation: 1200,      // In valley
  antennaHeight: 30,
  horizonMask: [
    { azimuth: 0, elevation: 3 },
    { azimuth: 45, elevation: 5 },
    { azimuth: 90, elevation: 25 },   // 🏔️ Large mountain blocking
    { azimuth: 135, elevation: 18 },
    { azimuth: 180, elevation: 4 },
    { azimuth: 225, elevation: 3 },
    { azimuth: 270, elevation: 6 },
    { azimuth: 315, elevation: 4 }
  ]
};

// Cesium will automatically:
// 1. Place antenna at correct altitude
// 2. Render terrain blocking the view
// 3. Allow custom horizon mask for precise simulation
```

---

## 🎯 Conclusion

### What Cesium CAN Do:
✅ Position ground stations with lat/lon/alt  
✅ Automatically handle terrain elevation  
✅ Support antenna height above terrain  
✅ Detect line-of-sight occlusion by mountains  
✅ Calculate elevation angles  
✅ Visualize coverage cones  
✅ Sample terrain at any point  

### What We Need to Provide:
📍 Ground station coordinates  
📏 Antenna heights (optional)  
🏔️ Custom horizon masks (optional, for precision)  
📡 Equipment constraints (min elevation, etc.)  

### Recommendation:
**Start simple** with lat/lon/altitude, then progressively add:
1. Elevation masks
2. Line-of-sight checks
3. Contact window predictions
4. Custom horizon profiles

All data is obtainable and implementable! 🚀

---

**Next Steps:**
1. Add 4 ground stations to test data JSON
2. Implement basic marker visualization
3. Add visibility toggle
4. Later: Line-of-sight calculations and contact windows

