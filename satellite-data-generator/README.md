# Satellite Data Generator

Generate realistic test data for satellite visualization plugins.

## Features

- 🛰️ Multiple satellite trajectories
- 🌍 Keplerian orbital mechanics (circular orbits)
- 📡 Sensor definitions per satellite
- 🎲 Random parameter generation (with seeds for reproducibility)
- 📊 Output in Grafana-compatible JSON format

## Setup

```bash
npm install
```

## Usage

### Generate Multiple Satellites (Default)

```bash
npm run generate
```

Generates:
- `output/multi-satellite.json` - Array of 3 satellites
- `output/satellite-1.json` - Individual satellite files
- `output/satellite-2.json`
- `output/satellite-3.json`

### Generate Single Satellite

```bash
npm run generate:single
```

Generates:
- `output/single-satellite.json`

### Generate Many Satellites (Stress Test)

```bash
npm run generate:many
```

Generates:
- `output/many-satellites.json` - Array of 14 satellites for performance testing

## Output Format

### Multi-Satellite JSON

```json
[
  {
    "satelliteId": "sat-1",
    "satelliteName": "Starlink-4021",
    "meta": {
      "custom": {
        "sensors": [
          {
            "id": "sat0-sens0",
            "name": "Main Camera",
            "fov": 10,
            "orientation": { "qx": 0, "qy": 0, "qz": 0, "qw": 1 }
          }
        ]
      }
    },
    "columns": [...],
    "rows": [
      [timestamp, lon, lat, alt, qx, qy, qz, qs],
      ...
    ]
  },
  ...
]
```

## Orbital Mechanics

Uses simplified Keplerian orbits:
- **Circular orbits** (eccentricity = 0)
- **Kepler's Third Law** for orbital period
- **Coordinate transformations**: Orbital plane → ECI → Geodetic

### Parameters

- **Altitude**: 400-1000 km (LEO)
- **Inclination**: 0-90° (equatorial to polar)
- **Longitude of Ascending Node**: 0-360°
- **Duration**: 1 hour (default)
- **Points**: 10-30 per trajectory

## Future Enhancements

- [ ] Elliptical orbits (eccentricity > 0)
- [ ] TLE/SGP4 propagation
- [ ] Ground station visibility
- [ ] Target-pointing sensors
- [ ] Command-line arguments
- [ ] More attitude modes (LVLH, Sun-pointing, etc.)

## File Structure

```
satellite-data-generator/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── orbit-math.ts           # Orbital mechanics utilities
│   └── generate-trajectories.ts # Main generator script
└── output/                      # Generated JSON files (gitignored)
```

## Using Generated Data

### In Grafana TestData Data Source

1. Copy contents of `output/multi-satellite.json`
2. In Grafana, add TestData data source
3. Select "JSON API" scenario
4. Paste JSON
5. Use in Satellite Visualization Plugin

### In Custom Backend

Import the JSON files directly or use as reference for your data structure.

## Development

### Add New Orbit Type

```typescript
// In orbit-math.ts
export function generateEllipticalOrbit(
  params: OrbitParams,
  eccentricity: number
): TrajectoryPoint[] {
  // Implementation
}
```

### Add New Sensor Type

```typescript
// In generate-trajectories.ts
function generateSensors(satelliteIdx: number): SensorDefinition[] {
  return [
    // Add your sensor configuration
    { name: 'Infrared Camera', fov: 25, orientation: {...} }
  ];
}
```

## License

MIT

