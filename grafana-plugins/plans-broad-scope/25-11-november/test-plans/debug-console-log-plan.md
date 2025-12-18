# Diagnostic Console.log Plan for Satellite Visualizer

## Target File
**Path**: `src/components/SatelliteVisualizer.tsx`

This is the ONLY file that needs console.logs - all data processing happens here.

---

## Overview of Data Flow

```
Grafana Data → data.series[0] → Extract Fields → Process Time → Process Position → Process Quaternion → Set State → Render Entity
```

---

## Console.log Locations (In Order of Data Flow)

### 1. ENTRY POINT - Raw Data Received (Line ~86)

**Location**: Inside the second `useEffect`, right after `if (data.series.length === 1)`

**What to log**:
```javascript
console.log('=== RAW DATA RECEIVED ===');
console.log('Number of series:', data.series.length);
console.log('DataFrame:', dataFrame);
console.log('Number of fields:', dataFrame.fields.length);
console.log('Field names:', dataFrame.fields.map(f => f.name));
console.log('Field types:', dataFrame.fields.map(f => f.type));
```

**Why**: Verify Grafana is sending data correctly and all 8 fields are present with correct types.

---

### 2. TIME FIELD EXTRACTION (Line ~93-96)

**Location**: After `let timeFieldValues = coalesceToArray(dataFrame.fields[0].values);`

**What to log**:
```javascript
console.log('=== TIME FIELD ===');
console.log('Time field raw values:', timeFieldValues);
console.log('First timestamp (raw):', timeFieldValues[0]);
console.log('Last timestamp (raw):', timeFieldValues.at(-1));
console.log('First as Date:', new Date(timeFieldValues[0]));
console.log('Last as Date:', new Date(timeFieldValues.at(-1)));
console.log('Number of time points:', timeFieldValues.length);
```

**Why**: Check if timestamps are being parsed correctly. If Date shows "Invalid Date", the timestamp format is wrong.

---

### 3. SATELLITE AVAILABILITY WINDOW (Line ~104-112)

**Location**: After `setSatelliteAvailability(...)` is called

**What to log**:
```javascript
console.log('=== AVAILABILITY WINDOW ===');
console.log('Start JulianDate:', JulianDate.fromDate(new Date(startTimestamp)));
console.log('Stop JulianDate:', JulianDate.fromDate(new Date(endTimestamp)));
console.log('Start ISO:', new Date(startTimestamp).toISOString());
console.log('Stop ISO:', new Date(endTimestamp).toISOString());
```

**Why**: This defines when the satellite EXISTS. If animation time is outside this window, satellite disappears.

---

### 4. POSITION PROCESSING - First Point (Line ~120-152)

**Location**: Inside the for loop, add at start (only log first iteration to avoid spam)

**What to log**:
```javascript
if (i === 0) {
  console.log('=== FIRST POSITION SAMPLE ===');
  console.log('Time raw:', coalesceToArray(dataFrame.fields[0].values)[i]);
  console.log('Time as JulianDate:', time);
  console.log('Longitude:', coalesceToArray(dataFrame.fields[1].values)[i]);
  console.log('Latitude:', coalesceToArray(dataFrame.fields[2].values)[i]);
  console.log('Altitude:', coalesceToArray(dataFrame.fields[3].values)[i]);
  console.log('Coordinates Type:', options.coordinatesType);
  console.log('Computed x_ECEF:', x_ECEF);
}
```

**Why**: Verify position values are correct. Altitude of 420000 should be in METERS (420km orbit). Check if coordinatesType matches data format.

---

### 5. QUATERNION PROCESSING - First Point (Line ~154-159)

**Location**: Inside the for loop, after Quaternion creation (only first iteration)

**What to log**:
```javascript
if (i === 0) {
  console.log('=== FIRST QUATERNION SAMPLE ===');
  console.log('qx:', coalesceToArray(dataFrame.fields[4].values)[i]);
  console.log('qy:', coalesceToArray(dataFrame.fields[5].values)[i]);
  console.log('qz:', coalesceToArray(dataFrame.fields[6].values)[i]);
  console.log('qw:', coalesceToArray(dataFrame.fields[7].values)[i]);
  console.log('q_B_ECI:', q_B_ECI);
  console.log('q_B_ECEF (final):', q_B_ECEF);
  console.log('Quaternion magnitude:', Math.sqrt(q_B_ECI.x**2 + q_B_ECI.y**2 + q_B_ECI.z**2 + q_B_ECI.w**2));
}
```

**Why**: Quaternion should be NORMALIZED (magnitude = 1.0). If not, orientation will be wrong. Also checks field order (x,y,z,w vs w,x,y,z).

---

### 6. FINAL STATE - After Loop (Line ~170-171)

**Location**: After `setSatellitePosition(positionProperty);`

**What to log**:
```javascript
console.log('=== FINAL PROCESSED DATA ===');
console.log('Position property created:', positionProperty);
console.log('Orientation property created:', orientationProperty);
console.log('Total samples added:', dataFrame.fields[1].values.length);
```

**Why**: Confirm all samples were added successfully.

---

### 7. TIMESTAMP STATE (Line ~99)

**Location**: After `setTimestamp(...)` 

**What to log**:
```javascript
console.log('=== INITIAL TIMESTAMP SET ===');
console.log('Setting initial timestamp to:', JulianDate.fromDate(new Date(endTimestamp)));
console.log('This is the END of data range (last point)');
```

**Why**: The plugin sets initial animation time to the LAST data point. This might cause issues if animation runs forward from there (no more data!).

---

### 8. RENDER CONDITIONS (Line ~246)

**Location**: Right before the Entity render condition

**What to log**:
```javascript
console.log('=== RENDER CHECK ===');
console.log('satelliteAvailability exists:', !!satelliteAvailability);
console.log('satellitePosition exists:', !!satellitePosition);
console.log('satelliteOrientation exists:', !!satelliteOrientation);
console.log('All conditions met:', !!(satelliteAvailability && satellitePosition && satelliteOrientation));
console.log('Current timestamp:', timestamp);
```

**Why**: Entity only renders if ALL three are truthy. If any is null/undefined, nothing shows.

---

## Quick Copy-Paste Debug Block

Add this single block after line 87 (`const dataFrame = data.series[0];`) for a quick overview:

```javascript
// DEBUG START
console.log('========== SATELLITE VISUALIZER DEBUG ==========');
console.log('Fields count:', dataFrame.fields.length);
console.log('Fields:', dataFrame.fields.map((f,i) => `[${i}] ${f.name}: ${f.type}`));
const timeVals = coalesceToArray(dataFrame.fields[0].values);
console.log('Time range:', new Date(timeVals[0]).toISOString(), '→', new Date(timeVals.at(-1)).toISOString());
console.log('Sample count:', timeVals.length);
console.log('First row values:', dataFrame.fields.map(f => coalesceToArray(f.values)[0]));
console.log('coordinatesType option:', options.coordinatesType);
console.log('Grafana timeRange:', timeRange.from.toISOString(), '→', timeRange.to.toISOString());
console.log('=================================================');
// DEBUG END
```

---

## What to Look For in Console Output

### Problem: "Invalid Date"
- **Cause**: Timestamp format not recognized by JavaScript `Date()`
- **Fix**: Use Unix milliseconds (13 digits) or ISO string

### Problem: Quaternion magnitude ≠ 1.0
- **Cause**: Non-normalized quaternion
- **Fix**: Normalize in data or check field order

### Problem: Grafana timeRange doesn't overlap with data timeRange
- **Cause**: Dashboard time picker is set to wrong date
- **Fix**: Set Grafana time range to match data

### Problem: coordinatesType mismatch
- **Cause**: Data is in lat/lon/alt but plugin expects Cartesian
- **Fix**: Change plugin setting to "Geodetic" (default)

### Problem: Altitude too small
- **Cause**: Altitude in kilometers instead of meters
- **Fix**: Multiply by 1000 in data

---

## Important Notes

1. The plugin sets `timestamp` to the **LAST** data point (line 99). Animation might run FORWARD from there into "no data" territory.

2. The `availability` property (line 248) controls when entity EXISTS. Outside this window = invisible.

3. `tracked={true}` (line 251) means camera follows satellite. If satellite position is invalid, camera goes nowhere.

---

**Document Created**: Dec 2, 2024
**Purpose**: Debug planning for satellite animation issues

