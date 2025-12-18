# Roadmap & Future Features

This document outlines planned features, improvements, and ideas for the 3D Orbit & Attitude Visualization Plugin.

> **Note**: This plugin is an extended version of Lucas Brémond's [Satellite Visualizer Plugin](https://github.com/lucas-bremond/satellite-visualizer). This roadmap covers enhancements beyond the original plugin's features.

---

## 🚀 Planned Features

### High Priority

#### 1. Advanced FOV Footprint Rendering
- [ ] **Smooth Horizon Cuts**: Improve elliptical shape rendering when FOV is partially cut by horizon
  - Implement polynomial interpolation (Lagrange) for horizon tangent points
  - Add adaptive ray subdivision for smooth curves
  - Status: *Partially implemented, needs refinement*

#### 2. Satellite-Specific Settings
- [ ] **Per-Satellite Configuration**: Individual settings for each satellite
  - Trajectory color per satellite
  - Model scaling per satellite
  - Sensor toggle per satellite
  - Right-click context menu in sidebar for quick access

#### 3. Enhanced Data Integration
- [ ] **Real-Time Data Streaming**: Support for live telemetry
  - WebSocket integration
  - Auto-refresh on data updates
  - Configurable update intervals
- [ ] **Historical Data Playback**: Replay past missions
  - Time range selection
  - Speed controls (1x, 2x, 10x)
  - Bookmarks for key mission events

#### 4. Ground Station Visualization
- [ ] **Ground Station Entities**: Display ground station locations
  - Antenna position and orientation
  - Visibility cones
  - Communication links to satellites
  - Access windows calculation

---

### Medium Priority

#### 5. Improved Sensor Features
- [ ] **Dynamic Sensor Orientation**: Time-varying sensor pointing
  - Target-pointing sensors
  - Scanning patterns
  - Gimbal constraints
- [ ] **Sensor Types**: Different visualization styles
  - Cameras (frustum)
  - Antennas (radiation pattern)
  - Solar panels (normal vectors)
  - Thrusters (plume visualization)

#### 6. Coordinate Frame Options
- [ ] **Additional Reference Frames**:
  - LVLH (Local Vertical Local Horizontal)
  - Sun-pointing frame
  - Velocity frame
  - Custom user-defined frames
- [ ] **Frame Transformation Visualization**: Show transformations between frames

#### 7. Mission Planning Tools
- [ ] **Maneuver Visualization**: Display planned thrust maneuvers
  - Delta-V vectors
  - Burn duration
  - Trajectory prediction
- [ ] **Collision Avoidance**: Visualize conjunction analysis
  - Closest approach visualization
  - Probability ellipsoids
  - Warning indicators

#### 8. Enhanced Time Controls
- [ ] **Multi-Timeline Support**: Compare multiple mission timelines
- [ ] **Time Offsets**: Synchronize satellites with different epoch times
- [ ] **Event Markers**: Annotate timeline with mission events
  - Orbit maneuvers
  - Sensor activations
  - Communication windows

---

### Low Priority (Nice to Have)

#### 9. Export & Sharing
- [ ] **Screenshot/Video Export**: Capture visualization
  - PNG/JPEG snapshots
  - MP4 video recording
  - GIF animations
- [ ] **Configuration Presets**: Save and load visualization settings
  - Export JSON config
  - Share configurations between users
  - Template library

#### 10. Performance Optimizations
- [ ] **Level-of-Detail (LOD)**: Simplify distant objects
  - Reduce trajectory segments for far satellites
  - Simplify sensor cone geometry
  - Billboard fallback for distant satellites
- [ ] **Culling**: Don't render off-screen objects
- [ ] **Web Workers**: Offload computations
  - FOV footprint calculation
  - Trajectory interpolation
  - Coordinate transformations

#### 11. Advanced Visualizations
- [ ] **Sun/Shadow Visualization**: Eclipse periods
  - Umbra/penumbra regions
  - Solar panel illumination
  - Thermal effects
- [ ] **Atmospheric Effects**: Drag visualization
  - Density contours
  - Orbital decay prediction
- [ ] **Magnetic Field**: Visualize Earth's magnetic field
  - Field lines
  - Magnetometer readings
  - Torque visualization

#### 12. UI/UX Improvements
- [ ] **Dark/Light Theme Support**: Match Grafana theme
- [ ] **Keyboard Shortcuts**: Power user features
  - Quick camera presets
  - Toggle visibility
  - Time navigation
- [ ] **Touch Gestures**: Mobile/tablet support
- [ ] **Context Menus**: Right-click actions on entities
- [ ] **Search/Filter**: Quick satellite search in sidebar

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **FOV Horizon Clipping**: Smooth elliptical footprints partially implemented
   - Works for single tangent point
   - Full horizon curve interpolation needs testing
   - Jagged edges in some edge cases

2. **Performance with Many Satellites**: 
   - 14 satellites: 6-10 FPS (acceptable)
   - 50+ satellites: Not tested, likely slow
   - Needs LOD and culling optimizations

3. **Coordinate System Assumptions**:
   - Assumes WGS-84 ellipsoid
   - No support for other planetary bodies (Moon, Mars)
   - Limited support for non-Earth-centric frames

4. **Data Format Rigidity**:
   - Requires specific 8-column format
   - No support for sparse data (missing orientation, partial coverage)
   - No automatic interpolation for missing data points

### Workarounds

- **Performance**: Hide unused satellites, reduce trajectory points
- **FOV Clipping**: Increase subdivision samples (already defaults to 10)
- **Data Format**: Use provided data generator as reference

---

## 💡 Community Ideas

*This section will be populated based on user feedback from the Grafana forum.*

### User-Requested Features
- *TBD based on forum responses*

### Research Collaboration Opportunities
- *TBD - seeking partnerships with space agencies, universities*

---

## 🗓️ Release Planning

### Version 1.0 (Current)
- ✅ Multi-satellite support
- ✅ Sensor cone visualization
- ✅ FOV footprints (basic)
- ✅ Celestial FOV projections
- ✅ Sidebar satellite menu
- ✅ Camera controls (tracking, free, nadir)
- ✅ Timeline persistence

### Version 1.1 (Next Release)
- [ ] Smooth horizon FOV footprints (complete implementation)
- [ ] Per-satellite settings (basic)
- [ ] Performance optimizations (LOD, culling)
- [ ] Improved documentation with video tutorials

### Version 1.2
- [ ] Ground station support
- [ ] Real-time data streaming
- [ ] Event markers on timeline
- [ ] Export/screenshot functionality

### Version 2.0 (Long-term)
- [ ] Mission planning tools
- [ ] Advanced sensor types
- [ ] Sun/shadow/eclipse visualization
- [ ] Multi-planetary support

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

---

## 📊 Prioritization Criteria

Features are prioritized based on:

1. **User Impact**: How many users benefit?
2. **Research Value**: Does it enable new analysis capabilities?
3. **Implementation Effort**: Development time vs. benefit
4. **Technical Feasibility**: Current limitations or dependencies
5. **Community Interest**: Forum feedback and issue votes

---

## 🔬 Research Directions

This plugin is part of ongoing aerospace engineering research. Areas of investigation:

### Satellite Operations
- Real-time monitoring dashboards for mission control
- Telemetry visualization and anomaly detection
- Multi-satellite coordination and collision avoidance

### Mission Planning
- Trajectory optimization visualization
- Coverage analysis (ground targets, celestial objects)
- Sensor pointing strategies

### Education & Training
- Interactive satellite mechanics demonstrations
- Orbital mechanics visualization for students
- Mission simulation and training tools

---

## 📅 Last Updated

December 18, 2025

---

**Note**: This roadmap is subject to change based on user feedback, research priorities, and development capacity. Features marked as "Planned" are not guaranteed to be implemented in the specified timeframe.


