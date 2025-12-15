import * as fs from 'fs';
import * as path from 'path';
import {
  generateCircularOrbit,
  generateTumblingOrbit,
  randomOrbitParams,
  OrbitParams,
  TrajectoryPoint,
} from './orbit-math';

/**
 * Sensor definition (matches plugin types).
 */
interface SensorDefinition {
  id: string;
  name: string;
  fov: number;
  orientation: {
    qx: number;
    qy: number;
    qz: number;
    qw: number;
  };
}

/**
 * Generate a satellite JSON object.
 */
function generateSatelliteJSON(
  satelliteId: string,
  satelliteName: string,
  trajectoryPoints: TrajectoryPoint[],
  sensors: SensorDefinition[]
) {
  return {
    satelliteId,
    satelliteName,
    meta: {
      custom: {
        sensors,
      },
    },
    columns: [
      { text: 'Time', type: 'time' },
      { text: 'Longitude', type: 'number' },
      { text: 'Latitude', type: 'number' },
      { text: 'Altitude', type: 'number' },
      { text: 'qx', type: 'number' },
      { text: 'qy', type: 'number' },
      { text: 'qz', type: 'number' },
      { text: 'qs', type: 'number' },
    ],
    rows: trajectoryPoints.map(p => [
      p.time,
      p.longitude,
      p.latitude,
      p.altitude,
      p.qx,
      p.qy,
      p.qz,
      p.qs,
    ]),
  };
}

/**
 * Generate example sensors for a satellite.
 */
function generateSensors(satelliteIdx: number): SensorDefinition[] {
  const sensorConfigs = [
    { name: 'Main Camera', fov: 10, orientation: { qx: 0, qy: 0, qz: 0, qw: 1 } },
    { name: 'Nadir Camera', fov: 15, orientation: { qx: 1, qy: 0, qz: 0, qw: 0 } },
    { name: 'Star Tracker', fov: 20, orientation: { qx: 0, qy: 1, qz: 0, qw: 0 } },
  ];

  return sensorConfigs.map((config, idx) => ({
    id: `sat${satelliteIdx}-sens${idx}`,
    ...config,
  }));
}

/**
 * Main script entry point.
 */
function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--multi'; // Default: generate multiple satellites

  const outputDir = path.join(__dirname, '../output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Generating satellite test data...\n');

  if (mode === '--single') {
    // Generate single satellite
    console.log('Mode: Single Satellite');
    const params = randomOrbitParams(12345); // Seeded for reproducibility
    const trajectory = generateCircularOrbit(params);
    const sensors = generateSensors(0);
    
    const satelliteData = generateSatelliteJSON(
      'sat-1',
      'Starlink-4021',
      trajectory,
      sensors
    );

    const outputPath = path.join(outputDir, 'single-satellite.json');
    fs.writeFileSync(outputPath, JSON.stringify(satelliteData, null, 2));
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`   Points: ${trajectory.length}`);
    console.log(`   Sensors: ${sensors.length}`);
    console.log(`   Time range: ${new Date(trajectory[0].time).toISOString()} to ${new Date(trajectory[trajectory.length - 1].time).toISOString()}`);
    
  } else if (mode === '--multi') {
    // Generate multiple satellites
    console.log('Mode: Multiple Satellites\n');
    
    // Explicitly different orbits for visual distinction
    const satelliteConfigs = [
      { 
        id: 'sat-1', 
        name: 'Starlink-4021', 
        type: 'circular',
        altitude: 550,        // Low LEO
        inclination: 53,      // Typical Starlink
        longitudeOfAN: 0,
        startAnomaly: 0,      // Start at 0°
      },
      { 
        id: 'sat-2', 
        name: 'Hubble Space Telescope', 
        type: 'tumbling',
        altitude: 540,        // Slightly lower
        inclination: 28.5,    // Low inclination
        longitudeOfAN: 90,    // 90° offset
        startAnomaly: 120,    // Start at 120°
      },
      { 
        id: 'sat-3', 
        name: 'ISS', 
        type: 'circular',
        altitude: 420,        // ISS altitude
        inclination: 51.6,    // ISS inclination
        longitudeOfAN: 180,   // 180° offset
        startAnomaly: 240,    // Start at 240°
      },
    ];

    const commonStartTime = new Date();  // All satellites start at same time

    const satellitesData = satelliteConfigs.map((config, idx) => {
      // Create explicit orbit parameters (not random)
      const params: OrbitParams = {
        altitude: config.altitude,
        inclination: config.inclination,
        longitudeOfAN: config.longitudeOfAN,
        startTime: commonStartTime,
        numPoints: 15 + idx * 5,  // 15, 20, 25 points
        duration: 60 * 60,  // 1 hour
      };
      
      const trajectory = config.type === 'tumbling'
        ? generateTumblingOrbit(params)
        : generateCircularOrbit(params);
      
      const sensors = generateSensors(idx);
      
      const satData = generateSatelliteJSON(
        config.id,
        config.name,
        trajectory,
        sensors
      );

      console.log(`  🛰️  ${config.name}:`);
      console.log(`     ID: ${config.id}`);
      console.log(`     Type: ${config.type}`);
      console.log(`     Points: ${trajectory.length}`);
      console.log(`     Sensors: ${sensors.length}`);
      console.log(`     Start: ${new Date(trajectory[0].time).toISOString()}`);
      console.log(`     End: ${new Date(trajectory[trajectory.length - 1].time).toISOString()}`);
      console.log(`     Altitude: ${params.altitude.toFixed(0)} km`);
      console.log(`     Inclination: ${params.inclination.toFixed(1)}°`);
      console.log('');
      
      return satData;
    });

    // Write combined multi-satellite file
    const outputPath = path.join(outputDir, 'multi-satellite.json');
    fs.writeFileSync(outputPath, JSON.stringify(satellitesData, null, 2));
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`   Total satellites: ${satellitesData.length}`);
    
    // Also write individual files
    satellitesData.forEach((satData, idx) => {
      const individualPath = path.join(outputDir, `satellite-${idx + 1}.json`);
      fs.writeFileSync(individualPath, JSON.stringify(satData, null, 2));
    });
    
    console.log(`   Individual files: satellite-1.json, satellite-2.json, satellite-3.json`);
  }

  console.log('\n✨ Done! Output in: output/');
}

// Run the script
main();

