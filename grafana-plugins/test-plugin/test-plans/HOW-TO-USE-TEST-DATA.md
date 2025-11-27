# How to Use Satellite Test Data in Grafana

## Quick Steps

### 1. Open Grafana
```
http://localhost:3000
```

### 2. Create Dashboard & Add Panel
- Click **"+ Create"** → **"Dashboard"**
- Click **"Add visualization"**

### 3. Select Visualization
- Choose **"Satellite Visualizer"** from the list

### 4. Configure Data Source
- **Data source**: Select **"TestData DB"** (built-in, no setup needed!)
- **Scenario**: Select **"Raw Frame"**

### 5. Paste Test Data
- Copy **ALL contents** from: `satellite-test-data-PASTE-THIS.json`
- Paste into the **"Raw Frame Content"** text box

### 6. Configure Plugin Settings
- In the right panel (plugin options):
  - **Coordinates type**: Select **"Geodetic"**
  - **Display mode**: "Model" or "Point" (your choice)
  - Leave other settings as default

### 7. Apply
- Click **"Apply"** button (top right)
- You should see a 🌍 globe with a satellite orbit!

---

## What the Data Represents

**10 data points** representing a Low Earth Orbit satellite:

- **Location**: Passing over Central/Northern Europe
- **Altitude**: ~418-422 km above Earth (LEO)
- **Path**: Moving west→east, south→north
- **Time**: 10 minutes of orbit (1 point per minute)
- **Starting**: December 2, 2024, 00:00:00 UTC

---

## Files Available

| File | Purpose |
|------|---------|
| `satellite-test-data-PASTE-THIS.json` | ⭐ **USE THIS** - Ready to copy-paste into Grafana |
| `satellite-test-data-10-points.json` | Full version with explanations |
| `satellite-test-data-10-points.csv` | CSV format (for CSV data source or editing) |

---

## Troubleshooting

### "Invalid number of fields [X] in data frame"
**Problem**: Plugin received wrong number of columns  
**Solution**: Make sure you pasted the ENTIRE JSON including the outer `[` and `]`

### "No data" or blank panel
**Problem**: Data source not configured  
**Solution**: 
1. Check data source is "TestData DB"
2. Check scenario is "Raw Frame"
3. Verify JSON is pasted correctly

### Satellite not visible
**Problem**: Plugin settings or data format issue  
**Solution**:
1. Check "Coordinates type" is set to "Geodetic"
2. Try toggling "Display mode" between "Point" and "Model"
3. Zoom out on the globe

### "Invalid access token" error
**Problem**: Plugin trying to use Cesium ion features  
**Solution**: This is **OK to ignore** - it's just warning about optional features (3D models). The satellite will still show as a point.

---

## Data Format Details

### 8 Required Columns (in order):

1. **Time** - Unix timestamp in milliseconds
2. **Longitude** - Degrees (-180 to 180) [when using Geodetic]
3. **Latitude** - Degrees (-90 to 90) [when using Geodetic]
4. **Altitude** - Meters above Earth surface
5. **qx** - Quaternion X component (orientation)
6. **qy** - Quaternion Y component
7. **qz** - Quaternion Z component
8. **qs** - Quaternion scalar component

---

## Next Steps

1. ✅ Get satellite showing with this test data
2. ✅ Verify plugin works
3. ✅ Try modifying coordinates to move satellite
4. ✅ Add more data points for longer orbit
5. ✅ Set up real data source (PostgreSQL, API, etc.)

---

**Happy visualizing!** 🛰️🌍

