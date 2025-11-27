# Grafana Data System - How Plugins Get Data

## Overview
This document explains how data flows from sources to Grafana panels, specifically focusing on what our satellite visualization plugin needs.

---

## 1. The Big Picture: Data Flow in Grafana

```
Data Source → Query → Data Frame → Panel Plugin → Visualization
    ↓           ↓         ↓            ↓              ↓
 (SQL DB)   (SELECT)  (Table)     (Your Code)    (Globe View)
```

### Components:

1. **Data Source** - Where data lives (SQL, CSV, API, etc.)
2. **Query** - How to fetch data (SQL query, API call, etc.)
3. **Data Frame** - Grafana's internal data format (like a table)
4. **Panel Plugin** - Your code that receives the data frame
5. **Visualization** - What the user sees

---

## 2. What is a Data Frame?

A **Data Frame** is Grafana's standardized data structure - essentially a **table with typed columns**.

### Example Data Frame (What Your Plugin Receives):

```typescript
{
  name: "Satellite Orbit",
  fields: [
    { name: "Time",      type: "time",   values: [t1, t2, t3, ...] },
    { name: "Longitude", type: "number", values: [12.5, 13.1, ...] },
    { name: "Latitude",  type: "number", values: [45.2, 45.8, ...] },
    { name: "Altitude",  type: "number", values: [400000, 401000, ...] },
    { name: "qx",        type: "number", values: [0.1, 0.12, ...] },
    { name: "qy",        type: "number", values: [0.2, 0.21, ...] },
    { name: "qz",        type: "number", values: [0.3, 0.32, ...] },
    { name: "qs",        type: "number", values: [0.9, 0.89, ...] },
  ],
  length: 10  // Number of rows
}
```

**Your plugin receives this in the `data` prop:**
```typescript
export const SatelliteVisualizer: React.FC<Props> = ({ data }) => {
  const dataFrame = data.series[0];  // First series
  const timeColumn = dataFrame.fields[0].values;  // Time values
  const lonColumn = dataFrame.fields[1].values;   // Longitude values
  // etc...
}
```

---

## 3. How to Get Data Into Grafana (Options)

### Option A: TestData Data Source (Built-in, Best for Testing) ⭐

**What**: Grafana's built-in data source for testing and development  
**Pros**: 
- ✅ No setup required
- ✅ Can generate time-series data
- ✅ Can load CSV
- ✅ Can use custom JSON

**How to use**:
1. Add panel → Select "TestData DB" as data source
2. Choose scenario:
   - **CSV Content** - Paste CSV data directly
   - **Raw Frame** - Provide JSON data frame
   - **Random Walk** - Auto-generated time-series

**Example - CSV Content**:
```csv
Time,Longitude,Latitude,Altitude,qx,qy,qz,qs
1609459200000,12.5,45.2,400000,0.1,0.2,0.3,0.9
1609459260000,13.1,45.8,401000,0.12,0.21,0.32,0.89
```

**Example - Raw Frame (JSON)**:
```json
[
  {
    "columns": [
      {"text": "Time", "type": "time"},
      {"text": "Longitude", "type": "number"},
      {"text": "Latitude", "type": "number"}
    ],
    "rows": [
      [1609459200000, 12.5, 45.2],
      [1609459260000, 13.1, 45.8]
    ]
  }
]
```

---

### Option B: CSV File (via Infinity/CSV Plugin)

**What**: Load data from CSV files  
**Requires**: Installing CSV or Infinity data source plugin  
**Pros**: 
- ✅ Can load local files
- ✅ Can load from URLs
- ✅ Easy for static datasets

**Setup**:
```bash
# Install CSV plugin
grafana-cli plugins install marcusolsson-csv-datasource

# Or in docker-compose:
environment:
  - GF_INSTALL_PLUGINS=marcusolsson-csv-datasource
```

**Usage**:
1. Add CSV data source
2. Point to CSV file (local path or URL)
3. Query in panel

---

### Option C: PostgreSQL/MySQL Database

**What**: Store satellite data in SQL database  
**Pros**:
- ✅ Good for large datasets
- ✅ Can update in real-time
- ✅ Powerful querying
- ✅ Production-ready

**Setup**:
1. Set up PostgreSQL/MySQL container
2. Create table with 8 columns
3. Insert satellite data
4. Add SQL data source in Grafana
5. Write SQL query in panel

**Example Table**:
```sql
CREATE TABLE satellite_positions (
  timestamp BIGINT,
  longitude FLOAT,
  latitude FLOAT,
  altitude FLOAT,
  qx FLOAT,
  qy FLOAT,
  qz FLOAT,
  qs FLOAT
);
```

**Example Query**:
```sql
SELECT 
  timestamp as time,
  longitude,
  latitude,
  altitude,
  qx, qy, qz, qs
FROM satellite_positions
WHERE timestamp BETWEEN $__timeFrom() AND $__timeTo()
ORDER BY timestamp
```

---

### Option D: JSON API Data Source

**What**: Fetch data from REST API  
**Requires**: Infinity or JSON API plugin  
**Pros**:
- ✅ Can connect to live APIs
- ✅ Real-time updates
- ✅ Flexible

**Use case**: If you have a backend API serving satellite positions.

---

### Option E: Custom Data Source Plugin

**What**: Build your own data source plugin  
**Complexity**: High  
**Pros**:
- ✅ Complete control
- ✅ Custom query language
- ✅ Optimized for your use case

**When to use**: Production systems with specific requirements.

---

## 4. Recommended Approach for Testing

### For Immediate Testing: **TestData DB with Raw Frame** ⭐

**Why**:
- ✅ Zero setup
- ✅ Already installed in Grafana
- ✅ Perfect for development
- ✅ Can paste JSON directly in query editor

**Steps**:
1. Open Grafana → Create dashboard
2. Add panel → Visualization: "Satellite Visualizer"
3. Data source: Select "TestData DB"
4. Scenario: Select "Raw Frame"
5. Paste your test data JSON
6. Apply

---

## 5. The Data Your Plugin Needs

### Satellite Visualizer Requirements:

**8 columns in this exact order**:

| Column | Name | Type | Description | Example |
|--------|------|------|-------------|---------|
| 1 | Time | time | Unix timestamp (ms) | 1609459200000 |
| 2 | X/Lon | number | Longitude (deg) OR x_ECI (m) OR x_ECEF (m) | 12.5 or 6500000 |
| 3 | Y/Lat | number | Latitude (deg) OR y_ECI (m) OR y_ECEF (m) | 45.2 or 1200000 |
| 4 | Z/Alt | number | Altitude (m) OR z_ECI (m) OR z_ECEF (m) | 400000 or 6800000 |
| 5 | qx | number | Quaternion X component | 0.1 |
| 6 | qy | number | Quaternion Y component | 0.2 |
| 7 | qz | number | Quaternion Z component | 0.3 |
| 8 | qs | number | Quaternion S (scalar) component | 0.9 |

**Note**: The plugin has a setting for "Coordinates Type":
- **Geodetic**: Columns 2-4 are Longitude (deg), Latitude (deg), Altitude (m)
- **Cartesian Fixed**: Columns 2-4 are x_ECEF, y_ECEF, z_ECEF (meters)
- **Cartesian Inertial**: Columns 2-4 are x_ECI, y_ECI, z_ECI (meters)

---

## 6. How Your Plugin Receives Data

### In Your Panel Component:

```typescript
interface Props extends PanelProps<SimpleOptions> {}

export const MyPanel: React.FC<Props> = ({ 
  data,      // ← THIS CONTAINS YOUR DATA FRAMES!
  options,   // ← User settings from panel options
  width,     // Panel width
  height     // Panel height
}) => {
  // Access the data
  if (data.series.length === 0) {
    return <div>No data</div>;
  }

  const dataFrame = data.series[0];  // First series
  
  // Check if we have 8 fields
  if (dataFrame.fields.length !== 8) {
    return <div>Error: Need 8 columns, got {dataFrame.fields.length}</div>;
  }

  // Extract values
  const times = dataFrame.fields[0].values;
  const xValues = dataFrame.fields[1].values;
  const yValues = dataFrame.fields[2].values;
  // etc...

  // Use the data in your visualization
  return <CesiumViewer positions={xValues} />;
};
```

---

## 7. Data Update Frequency

### How Often Does Data Refresh?

Controlled by:
1. **Panel refresh interval** - Set in dashboard (e.g., every 5s, 10s, 30s)
2. **Time range** - Dashboard time range picker
3. **Query interval** - Some data sources support custom intervals

**Your plugin automatically receives new data** when:
- User changes time range
- Refresh interval triggers
- User clicks refresh button

---

## 8. Testing Workflow

### Recommended Development Workflow:

```
1. Create test data file (JSON/CSV)
        ↓
2. Use TestData DB to load it
        ↓
3. Open panel, verify data arrives
        ↓
4. Debug with console.log(data)
        ↓
5. Process data in plugin
        ↓
6. Render visualization
```

---

## 9. Common Pitfalls

### ❌ Wrong Number of Columns
```
Error: Invalid number of fields [2] in data frame.
```
**Fix**: Ensure your data has exactly 8 columns.

### ❌ Wrong Column Types
If Grafana interprets a column as string instead of number, calculations will fail.
**Fix**: Ensure numeric columns have numeric values (not strings).

### ❌ Empty Data
```typescript
if (data.series.length === 0) {
  // No data loaded!
}
```
**Fix**: Verify data source is returning data.

### ❌ Timestamp Format
Grafana expects Unix timestamps in **milliseconds**, not seconds.
```typescript
// WRONG: 1609459200 (seconds)
// RIGHT: 1609459200000 (milliseconds)
```

---

## 10. Production Considerations

### For Production Systems:

1. **Use a proper data source**:
   - PostgreSQL for structured data
   - InfluxDB for time-series data
   - Prometheus for metrics
   - Custom API with authentication

2. **Optimize queries**:
   - Use time range variables: `$__timeFrom()`, `$__timeTo()`
   - Index timestamp columns
   - Limit rows returned

3. **Handle real-time data**:
   - WebSocket connections
   - Streaming data sources
   - Auto-refresh panels

4. **Error handling**:
   - Handle missing data gracefully
   - Show loading states
   - Display error messages

---

## 11. Summary: Best Path for Your Use Case

### For Testing Satellite Visualizer Now:

1. ✅ **Use TestData DB** (built-in)
2. ✅ **Scenario: Raw Frame**
3. ✅ **Paste test JSON data** (I'll provide this)
4. ✅ **Set plugin to "Geodetic" coordinates**
5. ✅ **Test with 10 sample points**

### For Future Production:

1. **Backend API** serving satellite position data
2. **PostgreSQL** to store historical orbits
3. **Grafana SQL data source** to query it
4. **Real-time updates** via WebSocket or polling

---

## 12. Quick Reference: TestData DB Setup

### Step-by-Step for Immediate Use:

```
1. Grafana → Dashboard → Add Panel
2. Visualization: "Satellite Visualizer" (or your plugin)
3. Data source: "TestData DB"
4. Query:
   - Scenario: "Raw Frame"
   - Format: "Time series"
5. Paste JSON in "Raw Frame Content"
6. Apply
7. See globe with satellite!
```

---

## Next Steps

1. ✅ I'll create test data file with 10 realistic satellite positions
2. ✅ You paste it into TestData DB query editor
3. ✅ Plugin receives data and renders
4. ✅ Verify plugin works!

---

**Document Created**: November 27, 2024  
**Purpose**: Explain Grafana data system for satellite visualization  
**Status**: Ready for testing with sample data

