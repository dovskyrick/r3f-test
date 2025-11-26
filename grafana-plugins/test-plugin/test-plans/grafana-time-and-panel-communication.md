# Grafana Time Range and Panel Communication Guide

**For Understanding:** How plugins access time data and communicate with other panels

**Date:** November 26, 2025

---

## Table of Contents

1. [Time Range in Grafana](#time-range-in-grafana)
2. [How Plugins Access Time Data](#how-plugins-access-time-data)
3. [Reacting to Time Changes](#reacting-to-time-changes)
4. [Cross-Panel Communication](#cross-panel-communication)
5. [Practical Examples](#practical-examples)
6. [Advanced Topics](#advanced-topics)

---

## Time Range in Grafana

### What is the Time Range?

**The Dashboard Time Range** is Grafana's global time context that controls what data is displayed across all panels.

**User Interface:**
```
┌─────────────────────────────────────────────┐
│  Grafana Dashboard                    🕐 📅 │  ← Time picker (top right)
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Time Series  │  │ Your Orbital │        │
│  │ Panel        │  │ View Panel   │        │
│  │              │  │              │        │
│  │ [Graph data  │  │ [Shows orbit │        │
│  │  from 2pm-5pm]│  │  for 2pm-5pm]│        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
       ↑                    ↑
       └────────┬───────────┘
              Same time range!
```

**Examples of time ranges:**
- "Last 5 minutes"
- "Last 24 hours"
- "Last 7 days"
- "2025-11-20 14:00 to 2025-11-20 17:00" (absolute)
- "now-6h to now" (relative)

---

## How Plugins Access Time Data

### The PanelProps Interface

When Grafana loads your panel, it passes a **props object** that contains EVERYTHING your panel needs, including time information.

**Your SimplePanel receives these props:**

```typescript
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = (props) => {
  // Props contains:
  // - timeRange
  // - timeZone
  // - data
  // - width, height
  // - options
  // - onChangeTimeRange
  // ... and more
};
```

---

### Key Time-Related Props

#### 1. `timeRange` - The Current Time Window

```typescript
import { TimeRange } from '@grafana/data';

const SimplePanel: React.FC<Props> = ({ timeRange }) => {
  console.log(timeRange);
  // Output:
  // {
  //   from: DateTime { /* 2025-11-26 14:00:00 */ },
  //   to: DateTime { /* 2025-11-26 17:00:00 */ },
  //   raw: { from: 'now-3h', to: 'now' }
  // }
};
```

**Structure:**
- `timeRange.from` - Start time (DateTime object)
- `timeRange.to` - End time (DateTime object)
- `timeRange.raw` - Original input (e.g., "now-6h", "now")

**DateTime object methods:**
```typescript
const startTime = timeRange.from;

// Get as different formats:
startTime.valueOf()      // Unix timestamp (milliseconds)
startTime.unix()         // Unix timestamp (seconds)
startTime.toISOString()  // "2025-11-26T14:00:00.000Z"
startTime.format('YYYY-MM-DD HH:mm:ss')  // "2025-11-26 14:00:00"

// Calculate duration:
const durationMs = timeRange.to.valueOf() - timeRange.from.valueOf();
const durationHours = durationMs / (1000 * 60 * 60);
```

---

#### 2. `timeZone` - User's Timezone Setting

```typescript
const SimplePanel: React.FC<Props> = ({ timeZone }) => {
  console.log(timeZone);
  // Output: "browser" or "America/New_York" or "UTC"
  
  // Use this when formatting times to display to user
};
```

**Why this matters:**
- User in New York sees times in EST
- User in Tokyo sees times in JST
- Same data, different display times

---

#### 3. `onChangeTimeRange` - Callback to Change Time

```typescript
import { AbsoluteTimeRange } from '@grafana/data';

const SimplePanel: React.FC<Props> = ({ onChangeTimeRange }) => {
  
  const zoomToSpecificTime = () => {
    // Change the dashboard time range
    const newRange: AbsoluteTimeRange = {
      from: 1700000000000,  // Unix timestamp in ms
      to: 1700003600000      // One hour later
    };
    
    onChangeTimeRange(newRange);
    // This updates the ENTIRE dashboard's time range!
  };
  
  return <button onClick={zoomToSpecificTime}>Zoom to Event</button>;
};
```

**Use cases:**
- User clicks on orbit position → zoom dashboard to that time
- User selects time range in your 3D view → update all panels
- "Jump to anomaly" button

---

#### 4. `data` - Query Results (Time-Series Data)

```typescript
import { PanelData } from '@grafana/data';

const SimplePanel: React.FC<Props> = ({ data, timeRange }) => {
  console.log(data);
  // {
  //   series: [...],      // Array of time series
  //   state: 'Done',      // Loading state
  //   timeRange: {...}    // Same as timeRange prop
  // }
  
  // Access time-series data:
  data.series.forEach(series => {
    console.log(series.name);     // "Temperature", "Altitude", etc.
    console.log(series.fields);   // Array of Field objects
    
    // Typical structure:
    // fields[0] = { name: 'Time', type: 'time', values: [...] }
    // fields[1] = { name: 'Value', type: 'number', values: [...] }
  });
};
```

---

## Reacting to Time Changes

### How Time Updates Work

**The Flow:**

```
User changes time picker
         ↓
Grafana updates timeRange prop
         ↓
Your component re-renders with new timeRange
         ↓
useEffect detects change
         ↓
Your code updates visualization
```

---

### Basic Pattern: useEffect with timeRange

```typescript
import { useEffect } from 'react';

export const SimplePanel: React.FC<Props> = ({ timeRange, data }) => {
  
  // This runs whenever timeRange changes
  useEffect(() => {
    console.log('Time range changed!');
    console.log('From:', timeRange.from.format('YYYY-MM-DD HH:mm:ss'));
    console.log('To:', timeRange.to.format('YYYY-MM-DD HH:mm:ss'));
    
    // Update your 3D visualization here
    // e.g., fetch orbital data for new time range
    // e.g., update trajectory path display
    
  }, [timeRange]); // Dependency: re-run when timeRange changes
  
  return <div>My Visualization</div>;
};
```

---

### Practical Example: Orbital View

**Scenario:** Show satellite orbit for the selected time range

```typescript
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export const OrbitalPanel: React.FC<Props> = ({ timeRange, data }) => {
  const [orbitPoints, setOrbitPoints] = useState<THREE.Vector3[]>([]);
  
  // Fetch orbital data when time range changes
  useEffect(() => {
    const fetchOrbitData = async () => {
      const startTime = timeRange.from.valueOf(); // milliseconds
      const endTime = timeRange.to.valueOf();
      
      // Call your GODOT backend
      const response = await fetch(
        `http://localhost:8000/trajectory?start=${startTime}&end=${endTime}`
      );
      const trajectoryData = await response.json();
      
      // Convert to Three.js points
      const points = trajectoryData.points.map((p: any) => 
        new THREE.Vector3(p.x, p.y, p.z)
      );
      
      setOrbitPoints(points);
    };
    
    fetchOrbitData();
  }, [timeRange]); // Re-fetch when time changes
  
  // Render orbit using orbitPoints...
  return <div>3D Orbit View</div>;
};
```

---

### Handling Loading States

```typescript
const SimplePanel: React.FC<Props> = ({ data, timeRange }) => {
  
  // Check if data is still loading
  if (data.state === 'Loading') {
    return <div>Loading trajectory data...</div>;
  }
  
  if (data.state === 'Error') {
    return <div>Error loading data: {data.error?.message}</div>;
  }
  
  // data.state === 'Done'
  // Safe to use data.series
  
  return <div>Render visualization</div>;
};
```

---

## Cross-Panel Communication

### The Challenge

**Your Question:** "If a user clicks a point in a time series panel, can my orbital panel react to show that position?"

**Answer:** Yes! But it requires understanding Grafana's event system.

---

### Method 1: Shared Time Range (Built-in)

**Easiest approach:** Use Grafana's built-in time synchronization.

**How it works:**

1. **Time series panel** allows clicking to zoom/focus on a time
2. **This updates the dashboard time range**
3. **Your orbital panel** receives the new `timeRange` prop
4. **Your panel re-renders** with the new time

**Implementation:**

```typescript
// In your orbital panel - nothing special needed!
export const OrbitalPanel: React.FC<Props> = ({ timeRange }) => {
  
  useEffect(() => {
    // When user clicks time series, this automatically updates
    const currentTime = timeRange.from;
    
    // Position satellite at this time
    updateSatellitePosition(currentTime);
    
  }, [timeRange]);
  
  // Render satellite at current time
};
```

**Built-in Grafana features:**
- Click time series → zooms dashboard to that time
- Shift+click+drag → selects time range
- All panels update automatically!

---

### Method 2: App Events (Advanced)

**For custom cross-panel communication beyond time.**

Grafana has an **Event Bus** that allows panels to communicate.

**Architecture:**

```
┌──────────────────┐
│   Event Bus      │  ← Global message broker
│  (in Grafana)    │
└────────┬─────────┘
         │
    ┌────┴─────┐
    ↓          ↓
┌────────┐  ┌──────────┐
│Panel A │  │ Panel B  │
│(emits) │  │(listens) │
└────────┘  └──────────┘
```

**Example: Time series emits "point selected" event**

**Panel A (Time Series - Emitter):**
```typescript
import { getAppEvents } from '@grafana/runtime';

export const TimeSeriesPanel: React.FC<Props> = (props) => {
  
  const handlePointClick = (timestamp: number, value: number) => {
    // Publish event to event bus
    const appEvents = getAppEvents();
    
    appEvents.publish({
      type: 'satellite-time-selected',
      payload: {
        timestamp: timestamp,
        value: value,
        metadata: { source: 'altitude-graph' }
      }
    });
  };
  
  // ... render time series with click handler
};
```

**Panel B (Orbital View - Listener):**
```typescript
import { getAppEvents } from '@grafana/runtime';
import { useEffect } from 'react';

export const OrbitalPanel: React.FC<Props> = (props) => {
  
  useEffect(() => {
    const appEvents = getAppEvents();
    
    // Subscribe to events
    const subscription = appEvents.subscribe(
      'satellite-time-selected',
      (event) => {
        console.log('Received event:', event.payload);
        const { timestamp, value } = event.payload;
        
        // Update orbital view to show satellite at this time
        jumpToTime(timestamp);
        highlightOrbitPoint(timestamp);
      }
    );
    
    // Cleanup: unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // ... render orbital view
};
```

---

### Method 3: URL State Synchronization

**Share state via URL parameters.**

Grafana's dashboard URL can store state:
```
http://localhost:3000/d/abc123?
  orgId=1
  &from=now-6h
  &to=now
  &var-satellite=SAT-001      ← Custom variable
  &selectedTime=1700000000000  ← Your custom param
```

**How to use:**

```typescript
import { locationService } from '@grafana/runtime';

export const OrbitalPanel: React.FC<Props> = (props) => {
  
  // Read from URL
  const urlParams = locationService.getSearch();
  const selectedTime = urlParams.get('selectedTime');
  
  // Write to URL
  const selectTimePoint = (timestamp: number) => {
    locationService.partial({
      selectedTime: timestamp.toString()
    });
    // This updates URL and all panels can read it
  };
  
  // Listen for URL changes
  useEffect(() => {
    const subscription = locationService.getHistory().listen((location) => {
      const newSelectedTime = new URLSearchParams(location.search).get('selectedTime');
      if (newSelectedTime) {
        updateVisualization(parseInt(newSelectedTime));
      }
    });
    
    return () => subscription();
  }, []);
};
```

---

### Method 4: Dashboard Variables (Recommended for Simple Cases)

**Use Grafana's built-in variable system.**

**Setup:**
1. Create dashboard variable: `selectedTimestamp`
2. Panels read/write this variable
3. Grafana handles synchronization

**Implementation:**

```typescript
import { getTemplateSrv } from '@grafana/runtime';

export const OrbitalPanel: React.FC<Props> = (props) => {
  
  // Read variable
  const templateSrv = getTemplateSrv();
  const selectedTime = templateSrv.replace('$selectedTimestamp');
  
  // Update variable (triggers other panels to update)
  const selectTime = (timestamp: number) => {
    templateSrv.setVariable('selectedTimestamp', timestamp);
  };
  
  // React to variable changes
  useEffect(() => {
    if (selectedTime) {
      updateOrbitView(parseInt(selectedTime));
    }
  }, [selectedTime]);
};
```

---

## Practical Examples

### Example 1: Display Current Time Range

```typescript
export const SimplePanel: React.FC<Props> = ({ timeRange, timeZone }) => {
  const duration = timeRange.to.valueOf() - timeRange.from.valueOf();
  const durationHours = Math.round(duration / (1000 * 60 * 60));
  
  return (
    <div>
      <h3>Orbital View</h3>
      <p>Showing orbit from:</p>
      <p><strong>{timeRange.from.format('YYYY-MM-DD HH:mm:ss')}</strong></p>
      <p>to:</p>
      <p><strong>{timeRange.to.format('YYYY-MM-DD HH:mm:ss')}</strong></p>
      <p>Duration: {durationHours} hours</p>
      <p>Timezone: {timeZone}</p>
      
      {/* Your 3D visualization here */}
    </div>
  );
};
```

---

### Example 2: Fetch Trajectory Based on Time Range

```typescript
export const OrbitalPanel: React.FC<Props> = ({ timeRange }) => {
  const [trajectory, setTrajectory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTrajectory = async () => {
      setLoading(true);
      
      const start = timeRange.from.unix(); // seconds
      const end = timeRange.to.unix();
      
      try {
        const response = await fetch(
          `http://localhost:8000/api/trajectory?start=${start}&end=${end}`
        );
        const data = await response.json();
        setTrajectory(data.points);
      } catch (error) {
        console.error('Failed to fetch trajectory:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrajectory();
  }, [timeRange]); // Re-fetch when time changes
  
  if (loading) {
    return <div>Loading orbital data...</div>;
  }
  
  return (
    <div>
      <p>Showing {trajectory.length} orbital points</p>
      {/* Render 3D trajectory */}
    </div>
  );
};
```

---

### Example 3: Allow User to Change Dashboard Time

```typescript
export const OrbitalPanel: React.FC<Props> = ({ onChangeTimeRange }) => {
  
  const jumpToAnomaly = () => {
    // Detected anomaly at specific time
    const anomalyTime = 1700000000000; // Unix timestamp (ms)
    const windowMs = 30 * 60 * 1000;   // 30 minute window
    
    // Change dashboard time to focus on anomaly
    onChangeTimeRange({
      from: anomalyTime - windowMs,
      to: anomalyTime + windowMs
    });
    
    // Now all panels show data around the anomaly time!
  };
  
  return (
    <div>
      {/* 3D visualization */}
      <button onClick={jumpToAnomaly}>
        Jump to Detected Anomaly
      </button>
    </div>
  );
};
```

---

### Example 4: Cross-Panel Selection (Time Series → Orbital View)

**Custom implementation using app events:**

```typescript
// ==========================================
// Shared event types (create in types.ts)
// ==========================================
export const EVENTS = {
  TIME_POINT_SELECTED: 'time-point-selected',
  ORBIT_POSITION_SELECTED: 'orbit-position-selected',
};

export interface TimePointEvent {
  timestamp: number;
  value: number;
  source: string;
}

// ==========================================
// Time Series Panel (or any panel)
// ==========================================
import { getAppEvents } from '@grafana/runtime';

const handleDataPointClick = (timestamp: number, value: number) => {
  const appEvents = getAppEvents();
  
  appEvents.publish({
    type: EVENTS.TIME_POINT_SELECTED,
    payload: {
      timestamp,
      value,
      source: 'altitude-graph'
    } as TimePointEvent
  });
};

// ==========================================
// Orbital Panel (listener)
// ==========================================
export const OrbitalPanel: React.FC<Props> = (props) => {
  const [highlightedTime, setHighlightedTime] = useState<number | null>(null);
  
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const subscription = appEvents.subscribe<TimePointEvent>(
      EVENTS.TIME_POINT_SELECTED,
      (event) => {
        const { timestamp, value, source } = event.payload;
        
        console.log(`Time selected from ${source}:`, timestamp);
        
        // Highlight this point in orbit
        setHighlightedTime(timestamp);
        
        // Optional: animate camera to this position
        animateCameraToTime(timestamp);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Use highlightedTime to render marker in 3D scene
  
  return <div>Orbital View</div>;
};
```

---

## Advanced Topics

### Time Granularity and Performance

**Problem:** Time range is large, but you can't render every point.

**Solution:** Sample or aggregate data based on time range.

```typescript
const calculateSampleRate = (timeRange: TimeRange, maxPoints: number = 1000) => {
  const durationMs = timeRange.to.valueOf() - timeRange.from.valueOf();
  const durationSeconds = durationMs / 1000;
  
  // If range is 1 hour and maxPoints is 1000, sample every ~3.6 seconds
  const sampleInterval = Math.max(1, Math.floor(durationSeconds / maxPoints));
  
  return sampleInterval;
};

useEffect(() => {
  const sampleRate = calculateSampleRate(timeRange, 1000);
  
  fetchTrajectory({
    start: timeRange.from.unix(),
    end: timeRange.to.unix(),
    interval: sampleRate // seconds between points
  });
}, [timeRange]);
```

---

### Relative vs Absolute Time

**Grafana supports both:**

**Relative (e.g., "Last 6 hours"):**
```typescript
timeRange.raw.from = 'now-6h'
timeRange.raw.to = 'now'

// These update continuously!
// Every refresh, "now" means a different timestamp
```

**Absolute (e.g., "Nov 26, 2pm to 5pm"):**
```typescript
timeRange.raw.from = '2025-11-26T14:00:00.000Z'
timeRange.raw.to = '2025-11-26T17:00:00.000Z'

// These are fixed
// Won't change on refresh
```

**Check which type:**
```typescript
const isRelative = typeof timeRange.raw.from === 'string' && 
                   timeRange.raw.from.includes('now');

if (isRelative) {
  console.log('User is viewing real-time data');
  // Maybe auto-refresh more frequently
} else {
  console.log('User is viewing historical data');
  // Static view, no need for frequent updates
}
```

---

### Auto-Refresh Integration

**Grafana dashboards can auto-refresh.**

**Your panel should handle this:**

```typescript
export const OrbitalPanel: React.FC<Props> = ({ data, timeRange }) => {
  
  // data includes state that tells you if it's refreshing
  useEffect(() => {
    if (data.state === 'Loading') {
      console.log('Dashboard is refreshing...');
      showLoadingIndicator();
    } else if (data.state === 'Done') {
      console.log('New data received!');
      hideLoadingIndicator();
      updateVisualization(data.series);
    }
  }, [data.state]);
  
  // Also react to actual time changes
  useEffect(() => {
    console.log('Time range updated');
    fetchNewTrajectoryData();
  }, [timeRange]);
};
```

---

### Time Zone Handling Best Practices

**Always use the provided timeZone prop for display:**

```typescript
import { dateTime, TimeZone } from '@grafana/data';

const formatTime = (timestamp: number, timezone: TimeZone) => {
  return dateTime(timestamp).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
};

export const OrbitalPanel: React.FC<Props> = ({ timeRange, timeZone }) => {
  const displayTime = formatTime(timeRange.from.valueOf(), timeZone);
  
  return <div>Start time: {displayTime}</div>;
};
```

**Why this matters:**
- Satellite data is usually in UTC
- User might be in any timezone
- Grafana handles conversion, but you need to use timeZone prop for display

---

### Data Queries and Time Range

**If your plugin queries data sources:**

Grafana automatically includes time range in queries!

```typescript
// You configure queries in plugin.json and query editor
// Grafana passes the results in data prop

export const OrbitalPanel: React.FC<Props> = ({ data, timeRange }) => {
  // data.series contains query results for the current timeRange
  
  data.series.forEach(series => {
    const timeField = series.fields.find(f => f.type === 'time');
    const valueField = series.fields.find(f => f.type === 'number');
    
    // These arrays are parallel:
    const times = timeField?.values.toArray() || [];
    const values = valueField?.values.toArray() || [];
    
    // Plot as trajectory
    times.forEach((timestamp, i) => {
      const value = values[i];
      console.log(`At ${timestamp}: value = ${value}`);
    });
  });
};
```

---

### Performance Optimization

**Debouncing time range changes:**

```typescript
import { useEffect, useRef } from 'react';

export const OrbitalPanel: React.FC<Props> = ({ timeRange }) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Wait 500ms after user stops changing time range
    timeoutRef.current = setTimeout(() => {
      console.log('Time range settled, fetching data...');
      fetchTrajectoryData(timeRange);
    }, 500);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeRange]);
};
```

**Why:** If user drags time slider, you don't want to fetch data 100 times per second!

---

## Summary of Key Concepts

### Time Range Access
- ✅ **timeRange prop** - current dashboard time window
- ✅ **timeRange.from** and **timeRange.to** - DateTime objects
- ✅ **timeZone prop** - user's timezone setting
- ✅ **data prop** - query results for current time range

### Reacting to Time Changes
- ✅ **useEffect** with timeRange dependency
- ✅ Automatic re-render when time changes
- ✅ Fetch new data, update visualization
- ✅ Handle loading states

### Changing Dashboard Time
- ✅ **onChangeTimeRange callback** - programmatically update dashboard
- ✅ Use cases: zoom to event, jump to anomaly
- ✅ Updates ALL panels on dashboard

### Cross-Panel Communication
- ✅ **Shared time range** (easiest - built-in)
- ✅ **App events** (custom events between panels)
- ✅ **URL state** (share via query parameters)
- ✅ **Dashboard variables** (Grafana-managed state)

---

## Your Specific Questions Answered

### Q1: "How do plugins access the time interval?"

**Answer:**
```typescript
export const SimplePanel: React.FC<Props> = ({ timeRange }) => {
  const startTime = timeRange.from.valueOf(); // milliseconds
  const endTime = timeRange.to.valueOf();
  
  // Use these to:
  // 1. Display to user
  // 2. Query your backend
  // 3. Filter data
  // 4. Render visualization
};
```

---

### Q2: "How does the plugin react to updates?"

**Answer:**
```typescript
useEffect(() => {
  // This runs automatically when timeRange changes
  fetchOrbitForTimeRange(timeRange);
}, [timeRange]); // React dependency
```

Grafana **automatically re-renders your component** with new props when time changes. You just need useEffect to react to it!

---

### Q3: "Can time series selection affect orbital panel?"

**Answer:** Yes! Four ways:

**Easiest:**
Use Grafana's built-in time selection (click time series → updates timeRange → orbital panel reacts)

**Most Flexible:**
Use app events to publish custom events between panels

**Best for Simple State:**
Use dashboard variables

**For Complex State:**
URL parameters or custom state management

---

## Next Steps / Topics for Future Exploration

### Beginner Level (Start Here):
- ✅ Read timeRange and display it
- ✅ Use useEffect to react to changes
- ✅ Fetch trajectory data based on time range
- ✅ Handle loading states

### Intermediate Level:
- Implement "jump to time" button using onChangeTimeRange
- Add time markers to 3D visualization
- Optimize with debouncing
- Handle relative vs absolute time differently

### Advanced Level:
- Implement cross-panel communication with app events
- Create custom time selection UI in 3D view
- Sync 3D animation timeline with dashboard time
- Build time-based playback controls

### Expert Level:
- Create custom query editor for your panel
- Implement streaming real-time data
- Build time-based annotations system
- Advanced state synchronization across multiple plugins

---

## Code Templates Ready to Use

### Template 1: Basic Time-Aware Panel

```typescript
import React, { useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ 
  data, 
  timeRange, 
  timeZone,
  width, 
  height 
}) => {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    console.log('Time range changed:', {
      from: timeRange.from.format('YYYY-MM-DD HH:mm:ss'),
      to: timeRange.to.format('YYYY-MM-DD HH:mm:ss'),
      timezone: timeZone
    });
    
    // Your code to update visualization
    
  }, [timeRange, timeZone]);
  
  return (
    <div style={{ width, height }}>
      <h3>Time Range: {timeRange.from.format('HH:mm')} - {timeRange.to.format('HH:mm')}</h3>
      {loading ? <div>Loading...</div> : <div>Your 3D View</div>}
    </div>
  );
};
```

---

### Template 2: Panel with Backend Integration

```typescript
import React, { useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';

export const OrbitalPanel: React.FC<PanelProps> = ({ timeRange }) => {
  const [trajectory, setTrajectory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTrajectory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const start = timeRange.from.unix();
        const end = timeRange.to.unix();
        
        const response = await fetch(
          `http://localhost:8000/trajectory?start=${start}&end=${end}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setTrajectory(data.points);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrajectory();
  }, [timeRange]);
  
  if (error) return <div>Error: {error}</div>;
  if (loading) return <div>Loading trajectory...</div>;
  
  return <div>Render {trajectory.length} points</div>;
};
```

---

### Template 3: Cross-Panel Communication

```typescript
import React, { useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { getAppEvents } from '@grafana/runtime';

const EVENT_TIME_SELECTED = 'satellite-time-selected';

// Emitter panel
export const TimeSeriesPanel: React.FC<PanelProps> = (props) => {
  const emitTimeSelection = (timestamp: number) => {
    const appEvents = getAppEvents();
    appEvents.publish({
      type: EVENT_TIME_SELECTED,
      payload: { timestamp }
    });
  };
  
  return <div onClick={() => emitTimeSelection(Date.now())}>Click me</div>;
};

// Listener panel
export const OrbitalPanel: React.FC<PanelProps> = (props) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  
  useEffect(() => {
    const appEvents = getAppEvents();
    const sub = appEvents.subscribe(EVENT_TIME_SELECTED, (event) => {
      setSelectedTime(event.payload.timestamp);
    });
    
    return () => sub.unsubscribe();
  }, []);
  
  return <div>Selected time: {selectedTime}</div>;
};
```

---

## Resources and Documentation

### Official Grafana Docs:
- Panel Plugin Development: https://grafana.com/docs/grafana/latest/developers/plugins/
- PanelProps API: https://grafana.com/docs/grafana/latest/packages_api/data/panelprops/
- Time Range: https://grafana.com/docs/grafana/latest/packages_api/data/timerange/
- App Events: https://grafana.com/docs/grafana/latest/packages_api/runtime/

### Your Backend Integration:
- GODOT trajectory API endpoints
- Time format: Unix timestamps (seconds or milliseconds)
- Time zone handling: backend should store UTC, frontend converts

### Related Files in Your Project:
- `SimplePanel.tsx` - Your current panel implementation
- `plugin.json` - Plugin metadata
- `types.ts` - TypeScript interfaces

---

**End of Guide**

This document covers the fundamentals of time handling and panel communication in Grafana. As you implement features, refer back to the templates and examples. Feel free to expand on any section with more specific questions!

**Next:** Implement basic time display, then add trajectory fetching, then explore cross-panel communication. 🚀

