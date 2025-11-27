# Cesium Globe Visualization Planning Document

## Overview
This document outlines the plan for implementing a 3D Earth globe visualization in a Grafana plugin using CesiumJS and Resium libraries. It covers free functionalities, implementation requirements, and licensing considerations.

---

## 1. What is CesiumJS vs Resium?

### CesiumJS
- **Description**: A standalone open-source JavaScript library for 3D geospatial visualization
- **Approach**: Imperative programming style (direct API calls)
- **Use Case**: Can be used in any JavaScript environment (vanilla JS, frameworks, etc.)
- **License**: Apache 2.0 (free for commercial and non-commercial use)

### Resium
- **Description**: A React wrapper library that provides React components for CesiumJS
- **Approach**: Declarative programming style (React components)
- **Use Case**: Specifically designed for React applications (like Grafana plugins)
- **License**: Apache 2.0 (free for commercial and non-commercial use)
- **Advantage**: Makes CesiumJS integration cleaner in React apps with component-based architecture

### **Recommendation for Grafana Plugin**: Use **Resium**
- Grafana plugins are React-based
- Resium provides cleaner, more maintainable code
- Better integration with React state management and lifecycle

---

## 2. Free-to-Use Core Functionalities

### 2.1 Globe Visualization Features (Confirmed Free)

#### ✅ Earth Textures & Customization
- **Default Blue Marble imagery** - Free to use
- **Custom imagery layers** - Can overlay different textures
- **Base color customization** - Can modify globe base appearance
- **Dark Mode Support**: YES
  - Can use dark-themed imagery providers
  - Can adjust base color to darker tones
  - Can modify lighting and atmospheric effects
  - Options: Blue Marble (dark variant), Natural Earth II (darker options)

#### ✅ Country Names & Labels
- **Visibility**: YES - Available through multiple methods:
  1. **Imagery layers with built-in labels** (easiest)
  2. **Custom label entities** - Add programmatically at country coordinates
  3. **GeoJSON overlays** - Import country boundary data with labels
  4. **Entity system** - Create text entities positioned at country centroids

#### ✅ Basic Globe Properties
- **3D WGS84 globe** - High-precision Earth representation
- **Rotation and navigation** - Pan, zoom, tilt controls
- **Camera controls** - Programmatic camera positioning
- **Terrain visualization** - Flat globe (free), elevation data (requires Cesium ion)
- **Atmosphere effects** - Lighting, fog, and atmospheric scattering
- **Dynamic lighting** - Time-of-day based lighting

### 2.2 3D Objects & Entities (Confirmed Free)

#### ✅ Geometric Primitives
- **Points** - Markers, satellites, ground stations
- **Lines/Polylines** - Ground tracks, connections, paths
- **Polygons/Areas** - Coverage areas, country boundaries
- **Spheres** - Custom 3D spherical objects
- **Boxes, Cylinders, Cones** - Various 3D shapes
- **Transparency support** - All objects support opacity/transparency settings

#### ✅ Entity Properties
- **Color customization** - RGB/RGBA for any object
- **Material properties** - Solid colors, patterns, textures
- **Outline properties** - Border colors and widths
- **Show/Hide control** - Dynamic visibility toggling

---

## 3. Advanced Functionalities (Potentially Useful)

### 3.1 Celestial & Astronomical Features

#### 🌞 Sun Position
- **Feature**: Sun position based on date/time
- **Status**: **AVAILABLE FREE**
- **Usage**: `viewer.scene.globe.enableLighting = true`
- **Benefit**: Realistic day/night visualization, shadow rendering
- **Use Case**: Time-aware simulations, solar panel analysis

#### 🌌 Celestial Sphere & Star Field
- **Feature**: Background star field visualization
- **Status**: **AVAILABLE FREE**
- **Usage**: `viewer.scene.skyBox` and `viewer.scene.skyAtmosphere`
- **Benefit**: Astronomical context for satellite tracking
- **Use Case**: Space situational awareness applications

#### 📐 Alt-Azimuth Grid / Reference Grids
- **Feature**: Coordinate grids (lat/lon, alt-azimuth)
- **Status**: **REQUIRES CUSTOM IMPLEMENTATION**
- **Method**: Use polylines to draw grid lines programmatically
- **Complexity**: Medium - requires coordinate calculations
- **Use Case**: Scientific visualization, astronomy applications

### 3.2 Time-Dynamic Visualization

#### ⏱️ Time-Based Animation
- **Feature**: Built-in timeline and clock system
- **Status**: **AVAILABLE FREE**
- **Capabilities**:
  - Animate entity positions over time
  - Change properties dynamically (color, size, visibility)
  - Synchronized multi-object animation
- **Use Case**: Satellite orbit visualization, flight tracking

### 3.3 Data Integration

#### 🗺️ Data Overlay Options
- **GeoJSON support** - Import geographic data
- **CZML format** - Cesium's native time-dynamic format
- **KML/KMZ support** - Google Earth format compatibility
- **Custom data sources** - REST API integration

---

## 4. Limitations for Open Source Projects

### 4.1 What's FREE with Apache 2.0 License ✅
- **CesiumJS library** - Complete 3D engine
- **Resium library** - React components
- **Commercial use** - Allowed
- **Modification** - Allowed
- **Distribution** - Allowed
- **Open source projects** - Fully compatible

### 4.2 What Requires Cesium ion Subscription ⚠️

**Cesium ion** is a separate cloud service (NOT required to use CesiumJS):

#### Requires Subscription:
- **High-resolution terrain data** - Global elevation datasets
- **High-resolution imagery** - Premium satellite imagery
- **3D Tiles streaming** - Large 3D model datasets
- **Commercial-grade performance** - Asset optimization and CDN

#### Free Tier Available:
- **Limited usage** - Free tier with monthly asset request limits
- **Development/testing** - Good for prototyping
- **Free token** - Can register for free access token

### 4.3 Recommendations for Open Source Projects

✅ **Safe Approach** (No ion dependency):
1. Use CesiumJS/Resium libraries (Apache 2.0) ✅
2. Use open imagery providers:
   - OpenStreetMap
   - Natural Earth
   - Custom imagery servers
3. Flat globe (no terrain data needed for satellite tracking)
4. Self-hosted assets (no cloud dependencies)

⚠️ **If Using Cesium ion**:
- Clearly document the requirement in your README
- Users need their own Cesium ion token
- Note usage limits for free tier
- Consider it an optional enhancement, not a requirement

---

## 5. Minimal Testing Plugin Setup Guide

### 5.1 Plugin Location
- **Directory**: `grafana-plugins/test-plugin/cesium-test`
- **Method**: Use Grafana's `create-plugin` CLI tool

### 5.2 Installation Requirements

#### Prerequisites
```bash
# Required software
- Node.js (v18+ recommended)
- npm or yarn
- Grafana CLI tools
```

#### Dependencies to Install
```bash
npm install cesium resium
npm install --save-dev @types/cesium  # TypeScript types
npm install copy-webpack-plugin  # For Cesium assets
```

### 5.3 Minimal Code Implementation

#### File Structure
```
cesium-test/
├── src/
│   ├── components/
│   │   └── CesiumPanel.tsx
│   ├── module.ts
│   └── plugin.json
├── package.json
└── webpack.config.js
```

#### Minimal React Component (CesiumPanel.tsx)
```tsx
import React from 'react';
import { Viewer, Globe, Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';

export const CesiumPanel: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Viewer full timeline={false} animation={false}>
        <Globe enableLighting={false} />
        <Entity
          name="Test Marker"
          position={Cartesian3.fromDegrees(-75.5977, 40.0388, 0)}
          point={{ pixelSize: 10, color: Color.RED }}
        />
      </Viewer>
    </div>
  );
};
```

#### Webpack Configuration (webpack.config.js additions)
```javascript
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports.plugins = [
  // ... existing plugins
  new CopyWebpackPlugin({
    patterns: [
      { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'Workers' },
      { from: 'node_modules/cesium/Build/Cesium/ThirdParty', to: 'ThirdParty' },
      { from: 'node_modules/cesium/Build/Cesium/Assets', to: 'Assets' },
      { from: 'node_modules/cesium/Build/Cesium/Widgets', to: 'Widgets' },
    ],
  }),
  new webpack.DefinePlugin({
    CESIUM_BASE_URL: JSON.stringify(''),
  }),
];

module.exports.resolve = {
  alias: {
    cesium: path.resolve(__dirname, 'node_modules/cesium/Source'),
  },
};
```

#### CSS Import (in main component or index)
```typescript
import 'cesium/Build/Cesium/Widgets/widgets.css';
```

### 5.4 Build and Test Commands

```bash
# Navigate to plugin directory
cd grafana-plugins/test-plugin/cesium-test

# Install dependencies
npm install

# Development mode (with watch)
npm run dev

# Build for production
npm run build

# Link to Grafana plugins directory (if needed)
# Follow Grafana plugin development guide for local testing
```

---

## 6. Key Features Testing Checklist

### Initial Testing Goals
- [ ] Globe renders successfully
- [ ] Can navigate (pan, zoom, rotate)
- [ ] Can add a marker/point
- [ ] Plugin integrates with Grafana panel system

### Texture & Appearance Testing
- [ ] Default blue marble texture loads
- [ ] Can switch to different imagery provider
- [ ] Can adjust base color for "dark mode" effect
- [ ] Lighting effects work (day/night)

### Country Names Testing
- [ ] Can overlay imagery with country labels
- [ ] Or: Can add custom label entities for countries
- [ ] Labels remain visible during navigation

### Object Testing
- [ ] Can add points (markers)
- [ ] Can add polylines (paths)
- [ ] Can add polygons (areas)
- [ ] Can set transparency on objects
- [ ] Can dynamically show/hide objects

---

## 7. Next Steps & Development Phases

### Phase 1: Minimal Plugin (Current Plan)
- Create `cesium-test` plugin in `test-plugin` folder
- Get basic globe rendering
- Add one test marker
- Verify Grafana integration

### Phase 2: Feature Exploration
- Test different imagery providers
- Implement dark mode toggle
- Add country name labels
- Test various 3D objects (lines, polygons, spheres)

### Phase 3: Advanced Features
- Implement sun position/time-of-day
- Add custom reference grids (if needed)
- Test time-dynamic animations
- Explore data source integration

### Phase 4: Integration with Project
- Connect to real data sources
- Implement satellite orbit visualization
- Add ground station markers
- Create ground track overlays

---

## 8. Important Notes

### Performance Considerations
- Cesium is resource-intensive (WebGL required)
- Consider limiting number of visible entities
- Use entity clustering for many points
- Optimize for Grafana's panel refresh rate

### Browser Compatibility
- Requires WebGL 2.0 support
- Works best in Chrome/Edge/Firefox
- Safari has some limitations with WebGL

### Grafana-Specific Considerations
- Panel resizing must be handled
- Cesium viewer must clean up on unmount
- Consider panel options for user controls
- Data source queries need proper handling

---

## 9. Resources & Documentation

### Official Documentation
- **CesiumJS**: https://cesium.com/docs/cesiumjs-ref-doc/
- **Resium**: https://resium.reearth.io/
- **Cesium Sandcastle** (examples): https://sandcastle.cesium.com/

### Tutorials
- Cesium Getting Started: https://cesium.com/learn/cesiumjs-learn/
- Grafana Plugin Development: https://grafana.com/docs/grafana/latest/developers/plugins/

### Community
- Cesium Community Forum: https://community.cesium.com/
- GitHub Issues: https://github.com/CesiumGS/cesium

---

## 10. Summary & Recommendations

### ✅ Recommended Approach
1. **Use Resium** for React-friendly integration
2. **Start with basic globe** and simple markers
3. **Use free imagery providers** (avoid ion dependency initially)
4. **Implement dark mode** via imagery and base color changes
5. **Add country labels** via imagery or custom entities
6. **Keep ion token optional** for future enhancements

### ✅ Licensing is Safe
- CesiumJS and Resium are Apache 2.0 (fully open source compatible)
- No restrictions for open source projects
- Commercial use is allowed
- No attribution required (though appreciated)

### ⚠️ Watch Out For
- Don't make Cesium ion mandatory (creates user friction)
- Test performance with expected data volumes
- Plan for proper cleanup/disposal in React lifecycle
- Consider fallback UI if WebGL is unavailable

---

**Document Created**: November 27, 2024  
**Purpose**: Planning phase for Cesium globe visualization in Grafana plugin  
**Status**: Ready for development phase

