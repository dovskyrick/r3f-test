import { SensorDefinition } from 'types/sensorTypes';

export function parseSensors(dataFrame: any): SensorDefinition[] {
  try {
    const sensorArray = dataFrame.meta?.custom?.sensors;
    
    if (!sensorArray || !Array.isArray(sensorArray)) {
      return [];  // No sensors - silent fallback
    }
    
    const validSensors: SensorDefinition[] = [];
    
    for (const sensor of sensorArray) {
      // Validate required fields
      if (!sensor.id || !sensor.name || typeof sensor.fov !== 'number') {
        console.warn(`⚠️ Invalid sensor (missing id/name/fov), skipping:`, sensor);
        continue;
      }
      
      // Validate orientation
      const ori = sensor.orientation;
      if (!ori || typeof ori.qx !== 'number' || typeof ori.qy !== 'number' ||
          typeof ori.qz !== 'number' || typeof ori.qw !== 'number') {
        console.warn(`⚠️ Invalid orientation for sensor ${sensor.id}, skipping`);
        continue;
      }
      
      // Valid sensor!
      validSensors.push({
        id: sensor.id,
        name: sensor.name,
        fov: sensor.fov,
        orientation: {
          qx: ori.qx,
          qy: ori.qy,
          qz: ori.qz,
          qw: ori.qw
        }
      });
    }
    
    if (validSensors.length > 0) {
      console.log(`✅ Parsed ${validSensors.length} valid sensor(s):`, validSensors.map(s => s.name));
    }
    return validSensors;
    
  } catch (error) {
    console.warn('❌ Sensor parsing failed:', error);
    return [];  // Fail gracefully
  }
}

