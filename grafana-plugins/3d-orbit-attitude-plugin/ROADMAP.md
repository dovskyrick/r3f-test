# Roadmap & Future Features

This document outlines planned features, improvements, and ideas for the Satellite Visualization Plugin.

> **Note**: This plugin is an extended version of Lucas Brémond's [Satellite Visualizer Plugin](https://github.com/lucas-bremond/satellite-visualizer). This roadmap covers enhancements beyond the original plugin's features.

---

## 🎯 High Priority Features

### 1. Per-Satellite Customization
**Status**: Not Implemented  
**Impact**: High - Essential for multi-satellite missions

Currently, all satellites share global visualization settings. This needs per-satellite control:

- [ ] **Individual Satellite Colors**
  - Custom trajectory colors per satellite
  - Per-satellite FOV cone colors
  - Per-satellite attitude vector colors (X/Y/Z axes)
  - Color picker in satellite sidebar menu
  
- [ ] **Per-Satellite Visibility Toggles**
  - Individual control for FOV visibility per satellite
  - Individual control for attitude vectors per satellite
  - Individual control for reference systems per satellite
  - Per-satellite sensor on/off toggles
  - Right-click context menu in sidebar for quick access

- [ ] **Visual Distinction**
  - Save/load per-satellite configurations
  - Preset color schemes (e.g., "Mission Alpha" palette)
  - Opacity/transparency per satellite

**Use Case**: When tracking multiple satellites (e.g., constellation), operators need to distinguish them quickly and focus on specific satellites without being overwhelmed by visual clutter.

---

### 2. Enhanced FOV Visualization
**Status**: Partially Implemented  
**Impact**: High - Improves clarity of sensor observations

- [ ] **Different Colors for Footprint vs Celestial FOV**
  - Ground footprint: Solid color with adjustable transparency
  - Celestial FOV: Different color/luminosity for distinction
  - Automatic contrast adjustment
  
- [ ] **Horizon-Cut Visual Effects**
  - Highlight where FOV is cut by Earth's horizon
  - Gradient or border to show occultation boundary
  - Distinguish between full-sky and horizon-limited observations
  
- [ ] **Per-Sensor Color Customization**
  - Individual colors for each sensor's FOV
  - Transparency/opacity controls per sensor
  - Different styles (solid, wireframe, gradient)

**Use Case**: When analyzing sensor coverage, operators need to clearly distinguish between what's visible on Earth vs in space, especially when horizon cuts affect observations.

---

### 3. 🌌 Celestial Map Enhancements
**Status**: Partially Implemented  
**Impact**: High - Essential for attitude and celestial navigation

- [ ] **Sun Position on Celestial Sphere**
  - Sun position marker with accurate ephemeris
  - Sun vector from satellite to Sun
  - Solar illumination angles
  - Eclipse period indication
  
- [ ] **Earth Center on Celestial Sphere**
  - Nadir direction marker
  - Earth angular size indicator
  - Earth occultation zone visualization
  
- [ ] **Enhanced Celestial Grid**
  - Constellation outlines (optional)
  - Ecliptic plane visualization
  - Major celestial objects (Moon, bright stars)
  
**Use Case**: Satellite attitude determination and star tracker validation require knowing Sun and Earth positions relative to the spacecraft body frame.

---

### 4. 📉 Uncertainty Visualization
**Status**: Not Implemented  
**Impact**: High - Critical for operational decision-making

- [ ] **Position Uncertainty Ellipsoids**
  - 3D covariance ellipsoids around satellite position
  - Configurable sigma levels (1σ, 2σ, 3σ)
  - Color-coded by confidence level
  - Transparency adjustable
  
- [ ] **Uncertainty Tubes**
  - Trajectory uncertainty as tubes along path
  - Width represents position uncertainty over time
  - Time-varying uncertainty (narrow near measurements, wider for predictions)
  
- [ ] **Intersection Analysis**
  - Highlight intersections of uncertainty ellipsoids (collision risk)
  - Closest approach indicators
  - Probability of collision visualization
  
- [ ] **Sensor FOV Uncertainty**
  - Uncertainty cones for sensor pointing
  - Attitude knowledge error visualization
  
**Use Case**: Mission planning and collision avoidance require visualizing position/attitude uncertainties. Operators need to see not just "where the satellite is" but "where it could be within confidence bounds."

---

### 5. 🕒 Timeline Features
**Status**: Basic Implementation  
**Impact**: High - Improves mission analysis and synchronization

- [ ] **Event Markers on Timeline**
  - Visual markers for key mission events
  - Configurable event types (maneuver, data acquisition, ground contact, anomaly)
  - Color-coded event categories
  - Click to jump to event time
  - Event labels on hover
  
- [ ] **Interval Highlighting**
  - Highlight time intervals (e.g., ground station passes, eclipse periods)
  - Color-coded intervals by type
  - Interval metadata on hover
  
- [ ] **Sync with Other Grafana Panels**
  - Mouse hover on timeline synchronizes with other panels
  - Click event broadcasts to other dashboard panels
  - Shared time cursor across dashboard
  - Bidirectional sync (other panels can control 3D view time)
  
- [ ] **Multiple Timeline Visualizations**
  - Per-satellite timelines
  - Event comparison view
  - Gantt-style activity timeline
  
**Use Case**: When analyzing telemetry alongside 3D visualization, operators need to correlate events in time. Hovering over a temperature spike in a chart should show the satellite's 3D state at that moment.

---

### 6. 📡 Ground Station Integration
**Status**: Not Implemented  
**Impact**: High - Essential for operations and communications planning

- [ ] **Ground Station Entities**
  - Ground station locations on Earth surface
  - Station identifiers and metadata
  - Antenna orientation visualization
  
- [ ] **Ground Station POV (Point of View)**
  - Camera view from ground station perspective
  - Satellite elevation/azimuth display
  - Horizon line from ground station
  - "What the antenna sees" view
  
- [ ] **Ground Station List/Panel**
  - Sidebar list of ground stations
  - Visibility status per station
  - Access windows (AOS/LOS times)
  - Communication links visualization
  
- [ ] **Visibility Cones**
  - Ground station antenna FOV cone
  - Minimum elevation angle constraint
  - Terrain/obstacle masking (optional)
  
- [ ] **Link Visualization**
  - Communication link lines between satellite and ground station
  - Link quality indicators (signal strength, data rate)
  - Active vs. scheduled contacts
  
**Use Case**: Ground station operators need to see when satellites are visible, plan communication windows, and visualize antenna pointing for contact scheduling.

---

### 7. ⚡ Live Data Source Integration
**Status**: Not Implemented  
**Impact**: High - Enables real-time operations

Currently, the plugin uses static JSON with pre-computed trajectories. Real-time operations require live data.

- [ ] **WebSocket Data Source**
  - Live telemetry streaming from WebSocket endpoints
  - Auto-update on new data (no page refresh)
  - Configurable update intervals
  
- [ ] **HTTP Polling**
  - Periodic REST API calls for updated state vectors
  - Configurable polling frequency
  - Error handling and reconnection logic
  
- [ ] **Grafana Live Integration**
  - Native Grafana Live streaming support
  - Real-time dashboard updates
  - Multi-user synchronized views
  
- [ ] **Time Interpolation**
  - Smooth animation between discrete telemetry updates
  - Propagation/extrapolation for gaps in data
  - Configurable interpolation methods (linear, spline, Keplerian)
  
- [ ] **Buffer Management**
  - Rolling window of recent data (e.g., last 1 hour)
  - Historical data archive
  - Memory-efficient data structures

**Use Case**: Mission control rooms need real-time satellite tracking. As telemetry arrives, the 3D view updates automatically to reflect current satellite state, enabling live monitoring and rapid response to anomalies.

---

## 🔧 Low Priority Features

### 8. Advanced Camera Reference Frame Controls
**Status**: Partially Implemented  
**Impact**: Medium - Useful for advanced users and specific analysis

Currently, the camera operates in ECI (Earth-Centered Inertial) frame with tracking modes. Advanced users need more control.

- [ ] **ECEF (Earth-Centered Earth-Fixed) Camera Lock**
  - Camera fixed to rotating Earth frame
  - Useful for ground track analysis
  
- [ ] **ECI (Earth-Centered Inertial) Camera Lock**
  - Camera in inertial frame (current default)
  - Stars appear stationary
  
- [ ] **LVLH (Local Vertical Local Horizontal) Camera Lock**
  - Camera locked to satellite LVLH frame
  - Nadir always points "down," velocity "forward"
  - Useful for understanding satellite perspective
  
- [ ] **Body-Fixed Camera Lock**
  - Camera fixed to satellite body frame
  - View from satellite's own reference system
  - Shows what satellite "sees" in its own coordinates
  
- [ ] **Frame Transition Animations**
  - Smooth transitions when switching reference frames
  - Visual indicators showing active frame

**Use Case**: Aerospace engineers analyzing specific scenarios (e.g., docking, formation flying) need to visualize from different reference frames to understand relative motion.

---

## 🤖 AI-Suggested Features (Pending Review)

*These features were suggested by the AI assistant during initial roadmap development. They are not yet prioritized by the user and require review/approval.*

### Sensor Enhancements
- [ ] **Dynamic Sensor Orientation**: Time-varying sensor pointing
  - Target-pointing sensors
  - Scanning patterns
  - Gimbal constraints
  
- [ ] **Additional Sensor Types**:
  - Cameras (frustum visualization)
  - Antennas (radiation patterns)
  - Solar panels (normal vectors)
  - Thrusters (plume visualization)

### Mission Planning Tools
- [ ] **Maneuver Visualization**: Display planned thrust maneuvers
  - Delta-V vectors
  - Burn duration indicators
  - Pre/post-maneuver trajectory comparison
  
- [ ] **Collision Avoidance**: Advanced conjunction analysis
  - Closest approach visualization
  - Automated alerts

### Performance Optimizations
- [ ] **Level-of-Detail (LOD)**: Simplify distant objects
  - Reduce trajectory segments for far satellites
  - Billboard fallback for distant satellites
  
- [ ] **Culling**: Don't render off-screen objects
  
- [ ] **Web Workers**: Offload computations
  - FOV footprint calculation
  - Trajectory interpolation
  - Coordinate transformations

### Advanced Visualizations
- [ ] **Eclipse Visualization**: Umbra/penumbra regions
  - Solar panel illumination
  - Thermal effects indication
  
- [ ] **Atmospheric Effects**: Drag visualization
  - Density contours
  - Orbital decay prediction
  
- [ ] **Magnetic Field Visualization**:
  - Field lines
  - Magnetometer readings
  - Torque visualization

### Export & Sharing
- [ ] **Screenshot/Video Export**: Capture visualization
  - PNG/JPEG snapshots
  - MP4 video recording
  - GIF animations
  
- [ ] **Configuration Presets**: Save and load settings
  - Export JSON config
  - Share configurations between users
  - Template library

### UI/UX Improvements
- [ ] **Dark/Light Theme Support**: Match Grafana theme
- [ ] **Keyboard Shortcuts**: Power user features
  - Quick camera presets
  - Toggle visibility shortcuts
  - Time navigation (forward/backward)
- [ ] **Touch Gestures**: Mobile/tablet support
- [ ] **Context Menus**: Right-click actions on entities
- [ ] **Search/Filter**: Quick satellite search in sidebar

### Additional Reference Frames
- [ ] **Sun-pointing frame**
- [ ] **Velocity frame**
- [ ] **Custom user-defined frames**
- [ ] **Frame transformation visualization**

### Time Controls
- [ ] **Time Offsets**: Synchronize satellites with different epoch times
- [ ] **Playback Speed Controls**: 1x, 2x, 10x, 100x
- [ ] **Historical Data Playback**: Replay past missions with time range selection

### Multi-Planetary Support
- [ ] **Moon, Mars, and other celestial bodies**
- [ ] **Non-WGS84 ellipsoids**
- [ ] **Interplanetary trajectories**

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **FOV Horizon Clipping**: 
   - Smooth elliptical footprints partially implemented
   - Full horizon curve interpolation needs refinement
   - Jagged edges in some edge cases

2. **Performance with Many Satellites**: 
   - 14 satellites: 6-10 FPS (acceptable)
   - 50+ satellites: Not tested, likely needs optimization
   - LOD and culling not yet implemented

3. **Global Visualization Settings**:
   - All satellites currently share visualization settings
   - No per-satellite customization yet (see High Priority #1)

4. **Coordinate System Assumptions**:
   - Assumes WGS-84 ellipsoid
   - Earth-centric only (no Moon, Mars support)

5. **Data Format Rigidity**:
   - Requires specific 8-column format
   - No support for sparse data (missing orientation)
   - No automatic interpolation for missing data points

### Workarounds

- **Performance**: Hide unused satellites, reduce trajectory points
- **FOV Clipping**: Increase subdivision samples (defaults to 10)
- **Customization**: Manually edit panel settings (until per-satellite controls are added)
- **Data Format**: Use provided data generator as reference

---

## 🗓️ Version Planning

### Version 1.0 (Current - December 2025)
- ✅ Multi-satellite support
- ✅ Sensor cone visualization
- ✅ FOV footprints (basic)
- ✅ Celestial FOV projections
- ✅ Sidebar satellite menu
- ✅ Camera controls (tracking, free, nadir)
- ✅ Timeline persistence
- ✅ RA/Dec celestial grid

### Version 1.1 (Next Release)
**Focus: Per-Satellite Customization & Enhanced FOV**
- [ ] Per-satellite color customization
- [ ] Per-satellite visibility toggles
- [ ] Different colors for ground footprint vs celestial FOV
- [ ] Horizon-cut visual effects
- [ ] Performance optimizations (basic LOD)

### Version 1.2
**Focus: Celestial Enhancements & Uncertainty**
- [ ] Sun position on celestial sphere
- [ ] Earth center on celestial sphere
- [ ] Position uncertainty ellipsoids
- [ ] Uncertainty tubes along trajectories
- [ ] Smooth horizon FOV footprints (complete)

### Version 1.3
**Focus: Timeline & Ground Stations**
- [ ] Event markers on timeline
- [ ] Interval highlighting
- [ ] Sync with other Grafana panels
- [ ] Ground station entities
- [ ] Ground station POV
- [ ] Visibility cones and link visualization

### Version 2.0
**Focus: Live Data & Advanced Features**
- [ ] Live data source integration (WebSocket/HTTP)
- [ ] Real-time telemetry streaming
- [ ] Advanced camera reference frame controls
- [ ] Collision/intersection analysis
- [ ] Export/screenshot functionality

---

## 💡 Community Ideas

*This section will be populated based on user feedback from the Grafana forum and GitHub issues.*

### User-Requested Features
- *Awaiting forum responses after publication*

### Research Collaboration Opportunities
- *Seeking partnerships with space agencies, universities, and aerospace companies*
- **Contact**: feedback@dovsky.com

---

## 🤝 Contributing to the Roadmap

We welcome suggestions! To propose a feature:

1. **Check existing issues** on GitHub to avoid duplicates
2. **Open a feature request** with:
   - Clear description of the feature
   - Use case / problem it solves
   - Any reference implementations or examples
   - Priority level (how important to your workflow)
3. **Vote on existing features** by reacting with 👍 to issues

**Priority changes**: If you have strong opinions on priority, please open an issue or email feedback@dovsky.com

---

## 📊 Prioritization Criteria

Features are prioritized based on:

1. **Operational Impact**: How critical for satellite operations?
2. **Research Value**: Does it enable new analysis capabilities?
3. **User Demand**: Community feedback and votes
4. **Implementation Effort**: Development time vs. benefit
5. **Technical Feasibility**: Dependencies and limitations

---

## 🔬 Research Focus

This plugin is part of ongoing aerospace engineering research at Instituto Superior Técnico. Current research areas:

### Satellite Operations
- Real-time monitoring dashboards for mission control
- Multi-satellite coordination and collision avoidance
- Uncertainty quantification and visualization

### Mission Planning
- Coverage analysis (ground targets, celestial objects)
- Ground station access planning
- Sensor observation strategy optimization

### Education & Training
- Interactive satellite mechanics demonstrations
- Orbital mechanics visualization for students
- Mission simulation training tools

---

## 📅 Last Updated

December 19, 2025

---

**Note**: This roadmap is subject to change based on user feedback, research priorities, and development capacity. Features marked as "Planned" are not guaranteed in the specified timeframe.

**Your feedback matters!** This is research-driven development. Email: feedback@dovsky.com

