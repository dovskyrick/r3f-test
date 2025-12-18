# 3D Satellite Visualization for Grafana

A comprehensive suite for **real-time 3D visualization of satellite orbits, attitude, and sensor coverage** in Grafana. Built for satellite operations teams, aerospace researchers, and mission control dashboards.

[![Grafana](https://img.shields.io/badge/Grafana-Plugin-orange?logo=grafana)](https://grafana.com)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-Powered-blue?logo=cesium)](https://cesium.com/platform/cesiumjs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

![3D Satellite Visualization Demo](./grafana-plugins/3d-orbit-attitude-plugin/src/img/screenshot.png)

> **⚡ Built Upon**: This project extends and enhances the original [Satellite Visualizer Plugin](https://github.com/lucas-bremond/satellite-visualizer) by **Lucas Brémond** (Apache 2.0 License). We've added multi-satellite tracking, sensor FOV visualization, attitude displays, and advanced camera controls for aerospace research applications.

---

## 🎯 What's Included

### 1. [3D Orbit & Attitude Plugin](./grafana-plugins/3d-orbit-attitude-plugin/)
**Main Grafana panel plugin** for 3D satellite visualization:
- Multi-satellite tracking with independent trajectories
- 3D sensor field-of-view visualization (cones, ground footprints, celestial projections)
- Real-time attitude display (body axes, quaternion orientation)
- Advanced camera controls (tracking mode, free camera, nadir view)
- RA/Dec celestial grid with coordinate labels
- Timeline scrubbing and animation controls

👉 **[Full Documentation](./grafana-plugins/3d-orbit-attitude-plugin/README.md)**

### 2. [Satellite Data Generator](./satellite-data-generator/)
**Standalone test data generator** with realistic Keplerian orbits:
- Generate multi-satellite trajectories with random parameters
- Configurable altitude, inclination, and orbital elements
- Automatic sensor definitions with varied FOV and orientations
- Output in Grafana-compatible JSON format

👉 **[Generator Documentation](./satellite-data-generator/README.md)**

### 3. [Grafana Server Setup](./grafana-server/)
**Pre-configured Docker Compose** setup for self-hosted Grafana:
- Unsigned plugin support enabled
- Plugin directory pre-mounted
- TestData data source pre-configured
- Ready to run out-of-the-box

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Docker & Docker Compose ([Install Guide](https://docs.docker.com/get-docker/))
- Cesium Ion account ([Free Sign-up](https://cesium.com/ion/signup))

### Step 1: Clone Repository
```bash
git clone https://github.com/dovskyrick/grafana-satellite-visualizer.git
cd grafana-satellite-visualizer
```

> **Note**: The plugin is pre-built and included in the repository. No build step required!

### Step 2: Start Grafana
```bash
cd grafana-server
docker-compose up -d
```

Access Grafana at **http://localhost:3000** (admin/admin)

### Step 3: Load Test Data
```bash
# Copy pre-generated satellite data (from project root)
cat ../satellite-data-generator/output/multi-satellite.json
```

In Grafana:
1. Go to **Explore** or create a **Dashboard**
2. Add **TestData DB** data source
3. Select scenario: **JSON API**
4. Paste the JSON
5. Run query

### Step 4: Create Visualization
1. Add a new panel
2. Select visualization: **"3D Orbit & Attitude Visualization"**
3. In panel settings:
   - Paste your **Cesium Ion Access Token**
   - Toggle features: trajectory, sensors, FOV, etc.
4. Watch your satellites orbit Earth in 3D! 🛰️

👉 **[Detailed Setup Guide](./grafana-plugins/3d-orbit-attitude-plugin/README.md#-quick-start)**

---

## ✨ Key Features

### Multi-Satellite Support
Track multiple satellites simultaneously with individual control:
- ✅ Independent trajectories and time intervals
- ✅ Per-satellite visibility toggles
- ✅ Sidebar menu for satellite selection
- ✅ Color-coded paths and labels

### Sensor Visualization
Understand what your sensors are observing:
- 📡 **3D FOV Cones**: Attached to satellite body with quaternion orientation
- 🌍 **Ground Footprints**: Project sensor FOV onto Earth with horizon detection
- ⭐ **Celestial Projections**: Show observed sky region on celestial sphere
- 🎨 **Customizable**: Colors, transparency, FOV angles

### Advanced Camera Controls
Navigate the 3D scene with ease:
- 🎯 **Tracking Mode**: Follow selected satellite
- 🌍 **Free Camera**: Orbit Earth with smooth transitions
- 🛰️ **Nadir View**: Quick overhead view of tracked satellite
- 📏 **Dynamic Scaling**: Vectors/cones scale with camera distance

### Attitude Visualization
Real-time orientation display:
- 🧭 Body axes (X, Y, Z) with customizable colors
- 📐 RA/Dec celestial coordinate grid
- 🔄 Quaternion-based orientation updates
- 🎛️ Master toggle for all attitude features

### Grafana Integration
Seamless integration with Grafana ecosystem:
- ⏱️ Native timeline controls
- 🔄 Settings persistence (no timeline reset)
- 📊 TestData data source compatibility
- 🎨 Panel customization options

---

## 📚 Documentation

- **[Plugin README](./grafana-plugins/3d-orbit-attitude-plugin/README.md)** - Complete plugin documentation
- **[ROADMAP](./grafana-plugins/3d-orbit-attitude-plugin/ROADMAP.md)** - Future features and planned improvements
- **[Data Generator](./satellite-data-generator/README.md)** - Test data generation guide
- **[Development Guide](./grafana-plugins/3d-orbit-attitude-plugin/README.md#-development)** - Building and contributing

---

## 🎓 Use Cases

### Satellite Operations
- **Mission Control Dashboards**: Real-time satellite tracking
- **Telemetry Monitoring**: Visualize position, attitude, and sensor status
- **Multi-Satellite Coordination**: Track constellations and formations

### Aerospace Research
- **Orbit Dynamics**: Study orbital mechanics and perturbations
- **Sensor Coverage Analysis**: Evaluate ground coverage and observation windows
- **Attitude Control**: Analyze spacecraft orientation and stability

### Education & Training
- **Orbital Mechanics**: Interactive demonstrations for students
- **Mission Simulation**: Training tools for operators
- **Space Systems Engineering**: Visualize satellite subsystems

---

## 🛠️ Technology Stack

- **[CesiumJS](https://cesium.com/platform/cesiumjs/)** - 3D geospatial visualization engine
- **[Resium](https://resium.reearth.io/)** - React components for CesiumJS
- **[Grafana](https://grafana.com/)** - Monitoring and visualization platform
- **[React](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development

---

## 📁 Repository Structure

```
grafana-satellite-visualizer/
├── grafana-plugins/
│   └── 3d-orbit-attitude-plugin/    # Main Grafana plugin
│       ├── src/                     # Plugin source code
│       ├── dist/                    # Built plugin (included)
│       ├── README.md                # Plugin documentation
│       ├── ROADMAP.md               # Future features
│       └── package.json
├── satellite-data-generator/        # Test data generation scripts
│   ├── src/                         # Generator source code
│   ├── output/                      # Pre-generated test data
│   │   ├── multi-satellite.json    # 3 satellites (default)
│   │   └── many-satellites.json    # 14 satellites (stress test)
│   ├── README.md
│   └── package.json
├── grafana-server/                  # Docker setup for Grafana
│   └── docker-compose.yml
└── README.md                        # This file
```

---

## 🐛 Troubleshooting

### Common Issues

**Plugin doesn't appear in Grafana:**
- Ensure Grafana started correctly: `docker-compose ps`
- Check plugin is built: `cd grafana-plugins/3d-orbit-attitude-plugin && npm run build`
- View logs: `docker-compose logs grafana`

**"Invalid Access Token" error:**
- Get token from [Cesium Ion](https://cesium.com/ion/tokens)
- Verify token permissions
- Paste carefully (no extra spaces)

**Timeline resets when changing settings:**
- Update to latest version (this bug was fixed)
- Run: `git pull && cd grafana-plugins/3d-orbit-attitude-plugin && npm run build`

**Satellites don't appear:**
- Verify JSON format matches [specification](./grafana-plugins/3d-orbit-attitude-plugin/README.md#-data-format)
- Check timestamps are Unix milliseconds
- Ensure coordinates are in correct frame (Geodetic/ECEF/ECI)
- Open browser console for parsing errors

👉 **[Full Troubleshooting Guide](./grafana-plugins/3d-orbit-attitude-plugin/README.md#-troubleshooting)**

---

## 🤝 Contributing

This plugin is part of ongoing aerospace engineering research. **Your feedback directly contributes to research!**

### How You Can Help

1. **Try the plugin** with your satellite data
2. **Report issues** and bugs
3. **Request features** you'd find useful
4. **Share use cases** and screenshots
5. **Contribute code** via pull requests

### Development Setup

```bash
# Clone repository
git clone https://github.com/dovskyrick/grafana-satellite-visualizer.git
cd grafana-satellite-visualizer

# Install dependencies for plugin
cd grafana-plugins/3d-orbit-attitude-plugin
npm install

# Start development server
npm run dev

# In another terminal, start Grafana
cd ../../grafana-server
docker-compose up
```

Changes to plugin source will auto-rebuild. Refresh Grafana to see updates.

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see individual component licenses for details.

### License Information

- **3D Orbit & Attitude Plugin**: Apache License 2.0
  - Original work: Copyright © 2024 Lucas Brémond
  - Enhancements: Copyright © 2025 Ricardo Santos, Instituto Superior Técnico
  - Based on [Satellite Visualizer Plugin](https://github.com/lucas-bremond/satellite-visualizer)
- **Satellite Data Generator**: MIT License (new component)
- **Grafana Server Setup**: Docker configuration (no license required)

See [LICENSE](./grafana-plugins/3d-orbit-attitude-plugin/LICENSE) and [NOTICE](./grafana-plugins/3d-orbit-attitude-plugin/NOTICE) files for full legal details.

---

## 🙏 Acknowledgments

### Original Work

This project is built upon:
- **[Satellite Visualizer Plugin](https://github.com/lucas-bremond/satellite-visualizer)** by **Lucas Brémond**
  - Original CesiumJS-based 3D satellite visualization for Grafana
  - Copyright © 2024 Lucas Brémond, Apache License 2.0
  - Provided the foundation for all 3D rendering and Grafana integration

### Additional Thanks

- **NASA** for providing the ACRIM satellite 3D model
- **CesiumJS** team for the incredible 3D geospatial platform
- **Grafana Labs** for the extensible visualization framework
- **Resium** project for React-CesiumJS integration
- **Aerospace engineering community** for feedback and support

---

## 📧 Contact & Support

**Author**: Ricardo Santos  
**Institution**: Instituto Superior Técnico  
**Email**: feedback@dovsky.com  
**Repository**: https://github.com/dovskyrick/grafana-satellite-visualizer

- **GitHub Issues**: [Report bugs and request features](https://github.com/dovskyrick/grafana-satellite-visualizer/issues)
- **Discussions**: Ask questions and share ideas
- **Email**: feedback@dovsky.com

---

## 🌟 Star This Repository!

If you find this project useful, please ⭐ star the repository to help others discover it!

---

## 📊 Project Status

- ✅ **Production Ready**: Core features stable and tested
- 🔬 **Active Research**: Part of ongoing thesis work
- 🎓 **Academic Use**: Suitable for research and education
- 🚀 **Community Driven**: Seeking feedback for improvements

**Current Version**: 1.0.0  
**Last Updated**: December 18, 2025

---

**Built with ❤️ for the aerospace community**

