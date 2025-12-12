# Sensor Cone Visualization - Phase 2 Extension

**Date:** December 12, 2025  
**Goal:** Visualize infinite sensor FOV cones attached to satellite in 3D

---

## 1. **Requirements** 🎯

### **Minimal Implementation (Phase 2A):**
- ✅ Parse infinite sensors from JSON (`sens1`, `sens2`, ...)
- ✅ Each sensor has:
  - **Constant quaternion** (attitude relative to satellite body frame)
  - **FOV angle** (degrees)
- ✅ Compute sensor world attitude: `q_sensor_world = q_satellite_world × q_sensor_body`
- ✅ Visualize as 3D cone attached to satellite
- ✅ Different color per sensor
- ✅ Safe parsing (missing sensors don't break satellite)

### **Future Extensions (Phase 2B+):**
- Time-varying sensor attitudes
- Panel settings per sensor (toggle visibility, color)
- Sensor state timeline (active/standby)
- Sensor telemetry display
- Ground footprint projection (like current FOV)

---

## 2. **JSON Schema** 📊

### **Minimal Sensor Schema:**
```json
[
  {
    "meta": {
      "custom": {
        "messages": ["Sensor 1: Active", "Battery: 85%"],
        "sensors": [
          {
            "id": "sens1",
            "name": "Main Camera",
            "fov": 10,
            "orientation": {
              "qx": 0.0,
              "qy": 0.0,
              "qz": 0.0,
              "qw": 1.0
            }
          },
          {
            "id": "sens2",
            "name": "Secondary Radar",
            "fov": 15,
            "orientation": {
              "qx": 0.1736,
              "qy": 0.0,
              "qz": 0.0,
              "qw": 0.9848
            }
          }
        ]
      }
    },
    "columns": [...],
    "rows": [...]
  }
]
```

### **Field Definitions:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | string | ✅ | Unique sensor identifier | `"sens1"`, `"cam-main"` |
| `name` | string | ✅ | Display name | `"Main Camera"` |
| `fov` | number | ✅ | Field of view (degrees) | `10`, `15`, `45` |
| `orientation.qx` | number | ✅ | Quaternion X (relative to body) | `0.0` |
| `orientation.qy` | number | ✅ | Quaternion Y | `0.0` |
| `orientation.qz` | number | ✅ | Quaternion Z | `0.0` |
| `orientation.qw` | number | ✅ | Quaternion W (scalar) | `1.0` |

### **Orientation Examples:**

| Description | Quaternion (qx, qy, qz, qw) |
|-------------|------------------------------|
| **Forward (Z-axis)** - Default | `(0, 0, 0, 1)` |
| **Down (−Z-axis)** - Nadir | `(1, 0, 0, 0)` |
| **Backward (+Z-axis)** | `(0, 1, 0, 0)` or `(0, 0, 1, 0)` |
| **Rotated 20° around X** | `(0.1736, 0, 0, 0.9848)` |
| **Rotated 45° around Y** | `(0, 0.3827, 0, 0.9239)` |

---

## 3. **TypeScript Interfaces** 🔧

```typescript
// src/types/sensorTypes.ts

export interface SensorOrientation {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

export interface SensorDefinition {
  id: string;
  name: string;
  fov: number;  // Field of view in degrees
  orientation: SensorOrientation;  // Relative to satellite body frame
}

export interface SensorData {
  sensors: SensorDefinition[];
}
```

---

## 4. **Parsing Strategy** 🔍

### **Parse Flow:**
```
JSON → DataFrame.meta.custom.sensors → Validate → State → Render
```

### **Parser Function:**
```typescript
// src/parsers/sensorParser.ts

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
        console.warn(`⚠️ Invalid sensor, skipping:`, sensor);
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
    
    console.log(`✅ Parsed ${validSensors.length} valid sensors`);
    return validSensors;
    
  } catch (error) {
    console.warn('❌ Sensor parsing failed:', error);
    return [];  // Fail gracefully
  }
}
```

---

## 5. **Quaternion Math** 🔢

### **Sensor World Attitude Computation:**

```typescript
// At each time t:
const q_satellite_world = satelliteOrientation.getValue(time);  // From data
const q_sensor_body = new Quaternion(sensor.orientation.qx, sensor.orientation.qy, 
                                      sensor.orientation.qz, sensor.orientation.qw);

// Multiply quaternions: q_sensor_world = q_satellite_world × q_sensor_body
const q_sensor_world = Quaternion.multiply(
  q_satellite_world, 
  q_sensor_body, 
  new Quaternion()
);

// Convert to rotation matrix for Cesium
const rotationMatrix = Matrix3.fromQuaternion(q_sensor_world);
```

### **Sensor Pointing Direction (Z-axis in world frame):**

```typescript
// Sensor points along its Z-axis in body frame
const sensorZAxis_body = new Cartesian3(0, 0, 1);

// Transform to world frame
const sensorZAxis_world = Matrix3.multiplyByVector(
  rotationMatrix,
  sensorZAxis_body,
  new Cartesian3()
);
```

---

## 6. **3D Cone Visualization** 🎨

### **Option A: Polyline Cone (Simple, Lightweight)**

Draw lines from apex (satellite position) to circle points on cone base:

```typescript
function generateConeMesh(
  apexPosition: Cartesian3,
  direction: Cartesian3,
  fovDegrees: number,
  length: number,
  numSegments: number = 16
): Cartesian3[] {
  
  const positions: Cartesian3[] = [];
  const halfAngle = Cesium.Math.toRadians(fovDegrees / 2);
  const baseRadius = length * Math.tan(halfAngle);
  
  // Create base circle perpendicular to direction
  const up = Cartesian3.normalize(direction, new Cartesian3());
  const right = Cartesian3.cross(up, Cartesian3.UNIT_X, new Cartesian3());
  if (Cartesian3.magnitude(right) < 0.1) {
    Cartesian3.cross(up, Cartesian3.UNIT_Y, right);
  }
  Cartesian3.normalize(right, right);
  const forward = Cartesian3.cross(right, up, new Cartesian3());
  
  // Base center
  const baseCenter = Cartesian3.add(
    apexPosition,
    Cartesian3.multiplyByScalar(direction, length, new Cartesian3()),
    new Cartesian3()
  );
  
  // Generate circle points
  for (let i = 0; i <= numSegments; i++) {
    const theta = (i / numSegments) * 2 * Math.PI;
    const x = baseRadius * Math.cos(theta);
    const y = baseRadius * Math.sin(theta);
    
    const offset = Cartesian3.add(
      Cartesian3.multiplyByScalar(right, x, new Cartesian3()),
      Cartesian3.multiplyByScalar(forward, y, new Cartesian3()),
      new Cartesian3()
    );
    
    const circlePoint = Cartesian3.add(baseCenter, offset, new Cartesian3());
    
    // Line from apex to circle point
    positions.push(apexPosition);
    positions.push(circlePoint);
  }
  
  // Base circle
  for (let i = 0; i <= numSegments; i++) {
    const theta = (i / numSegments) * 2 * Math.PI;
    const x = baseRadius * Math.cos(theta);
    const y = baseRadius * Math.sin(theta);
    
    const offset = Cartesian3.add(
      Cartesian3.multiplyByScalar(right, x, new Cartesian3()),
      Cartesian3.multiplyByScalar(forward, y, new Cartesian3()),
      new Cartesian3()
    );
    
    positions.push(Cartesian3.add(baseCenter, offset, new Cartesian3()));
  }
  
  return positions;
}
```

### **Option B: Cesium Primitive (Advanced, Better Performance)**

Use `GeometryInstance` + `Primitive` for custom geometry. More complex but better for many sensors.

**For Phase 2A: Use Option A (Polylines) ✅**

---

## 7. **Rendering Strategy** 🖼️

### **State Management:**

```typescript
const [sensors, setSensors] = useState<SensorDefinition[]>([]);
```

### **Parsing in useEffect:**

```typescript
useEffect(() => {
  // ... existing satellite parsing ...
  
  // Parse sensors
  try {
    const parsedSensors = parseSensors(dataFrame);
    setSensors(parsedSensors);
  } catch (error) {
    console.warn('Sensor parsing failed:', error);
    setSensors([]);
  }
  
}, [data, options.coordinatesType, isLoaded]);
```

### **Render Cones:**

```tsx
{/* Sensor FOV Cones */}
{sensors.map((sensor, idx) => (
  <Entity 
    key={`sensor-${sensor.id}`}
    name={sensor.name}
    availability={satelliteAvailability}
  >
    <PolylineGraphics
      positions={new CallbackProperty((time) => {
        const satPos = satellitePosition.getValue(time);
        const satOrient = satelliteOrientation.getValue(time);
        if (!satPos || !satOrient) return [];
        
        // Compute sensor world orientation
        const sensorBodyQuat = new Quaternion(
          sensor.orientation.qx,
          sensor.orientation.qy,
          sensor.orientation.qz,
          sensor.orientation.qw
        );
        const sensorWorldQuat = Quaternion.multiply(
          satOrient,
          sensorBodyQuat,
          new Quaternion()
        );
        
        // Get sensor pointing direction
        const rotMatrix = Matrix3.fromQuaternion(sensorWorldQuat);
        const sensorDir = Matrix3.multiplyByVector(
          rotMatrix,
          new Cartesian3(0, 0, 1),  // Z-axis
          new Cartesian3()
        );
        
        // Generate cone mesh
        const coneLength = 50000;  // 50km
        return generateConeMesh(satPos, sensorDir, sensor.fov, coneLength);
        
      }, false)}
      width={1}
      material={getSensorColor(idx)}
      arcType={ArcType.NONE}
    />
  </Entity>
))}
```

---

## 8. **Color Scheme** 🎨

```typescript
// Distinct colors for up to 10 sensors
const SENSOR_COLORS = [
  Color.CYAN,           // sens1
  Color.MAGENTA,        // sens2
  Color.YELLOW,         // sens3
  Color.ORANGE,         // sens4
  Color.LIME,           // sens5
  Color.PINK,           // sens6
  Color.VIOLET,         // sens7
  Color.AQUA,           // sens8
  Color.GOLD,           // sens9
  Color.CORAL,          // sens10
];

function getSensorColor(index: number): Color {
  return SENSOR_COLORS[index % SENSOR_COLORS.length].withAlpha(0.6);
}
```

---

## 9. **Performance Considerations** ⚡

| Concern | Solution |
|---------|----------|
| Many sensors | Use `GeometryInstance` batching (Phase 2B) |
| Cone complexity | Adjustable `numSegments` (default 16) |
| Real-time updates | `CallbackProperty` updates only when needed |
| Memory | Clean up entities on unmount |

**Phase 2A limits:**
- Target: Up to 10 sensors
- Acceptable performance with polyline approach

---

## 10. **Testing Plan** 🧪

### **Test Case 1: Single Sensor (Forward)**
```json
"sensors": [
  {
    "id": "sens1",
    "name": "Main Camera",
    "fov": 10,
    "orientation": {"qx": 0, "qy": 0, "qz": 0, "qw": 1}
  }
]
```
**Expected:** Cyan cone pointing along satellite's Z-axis

### **Test Case 2: Two Sensors (Forward + Down)**
```json
"sensors": [
  {
    "id": "sens1",
    "name": "Forward Camera",
    "fov": 10,
    "orientation": {"qx": 0, "qy": 0, "qz": 0, "qw": 1}
  },
  {
    "id": "sens2",
    "name": "Nadir Camera",
    "fov": 15,
    "orientation": {"qx": 1, "qy": 0, "qz": 0, "qw": 0}
  }
]
```
**Expected:** Cyan cone forward, Magenta cone pointing at Earth

### **Test Case 3: No Sensors**
```json
"sensors": []
```
**Expected:** Satellite renders normally, no cones

### **Test Case 4: Invalid Sensor**
```json
"sensors": [
  {"id": "bad", "name": "Broken", "fov": "not a number"},
  {"id": "sens1", "name": "Good", "fov": 10, "orientation": {...}}
]
```
**Expected:** Warning logged, only valid sensor renders

---

## 11. **Baby Steps Implementation** 👣

### **Step 1: Add TypeScript Interfaces**
- Create `src/types/sensorTypes.ts`
- Define interfaces

### **Step 2: Create Parser**
- Create `src/parsers/sensorParser.ts`
- Implement `parseSensors()` function
- Add validation

### **Step 3: Add State**
- Add `const [sensors, setSensors] = useState<SensorDefinition[]>([]);`
- Parse in existing `useEffect`

### **Step 4: Test Parsing (Console Logs)**
- Add debug logs
- Verify sensor data reaches component

### **Step 5: Create Cone Generator**
- Implement `generateConeMesh()` utility
- Test with single sensor

### **Step 6: Render Cones**
- Map over sensors
- Render `PolylineGraphics` for each
- Apply colors

### **Step 7: Test & Refine**
- Test with 1, 2, 5, 10 sensors
- Adjust cone length, segments
- Verify quaternion math

---

## 12. **Future Extensions** 🚀

### **Phase 2B: Panel Settings**
- Toggle individual sensors on/off
- Adjust cone length
- Change colors per sensor

### **Phase 2C: Time-Varying Attitudes**
```json
"sensors": [{
  "id": "sens1",
  "timeline": [
    {"time": 1733097600000, "qx": 0, "qy": 0, "qz": 0, "qw": 1},
    {"time": 1733097630000, "qx": 0.1, "qy": 0, "qz": 0, "qw": 0.995}
  ]
}]
```

### **Phase 2D: Ground Footprint**
- Project sensor FOV onto Earth (like current Z-axis projection)
- Show coverage area

### **Phase 2E: Sensor States**
- Color by state (active=green, standby=yellow, off=gray)
- Timeline integration

---

## 13. **Summary** (TL;DR) 📝

✅ **Goal:** Visualize infinite sensor FOV cones in 3D  
✅ **Input:** JSON with sensor definitions (id, name, fov, orientation)  
✅ **Output:** Colored cones attached to satellite, following its motion  
✅ **Math:** World orientation = Satellite × Sensor_relative  
✅ **Safety:** Invalid sensors skipped, satellite always works  
✅ **Colors:** Distinct color per sensor (up to 10)  
✅ **Baby Steps:** 7 incremental steps from types to rendering  

---

**Status:** Ready to implement Step 1! 🚀  
**Estimate:** ~1 hour for full Phase 2A implementation  
**Risk:** Low (isolated from satellite rendering)

