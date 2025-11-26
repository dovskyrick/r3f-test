# Cross-Panel Communication Deep Dive: App Events and Panel Interaction

**Focus:** Understanding which panels emit events, who can listen, and what's modifiable

**Date:** November 26, 2025

---

## Table of Contents

1. [The Fundamental Constraint](#the-fundamental-constraint)
2. [Who Writes What Code](#who-writes-what-code)
3. [What Built-in Panels Do](#what-built-in-panels-do)
4. [Your Orbital Plugin as Listener](#your-orbital-plugin-as-listener)
5. [Multiple Event Sources](#multiple-event-sources)
6. [Default Grafana Behavior](#default-grafana-behavior)
7. [Practical Solutions](#practical-solutions)
8. [Architecture Diagrams](#architecture-diagrams)

---

## The Fundamental Constraint

### You CANNOT Modify Grafana's Built-in Panels

**Critical Understanding:**

```
┌─────────────────────────────────────────┐
│         Grafana Core                    │
│  ┌───────────────────────────────┐     │
│  │  Built-in Time Series Panel   │     │  ← You CANNOT modify this
│  │  (Compiled into Grafana)      │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │  Built-in Graph Panel         │     │  ← You CANNOT modify this
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │  Built-in Table Panel         │     │  ← You CANNOT modify this
│  └───────────────────────────────┘     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Your Custom Plugins                │
│  ┌───────────────────────────────┐     │
│  │  Your Orbital Panel           │     │  ← You CAN modify this
│  │  (Your code)                  │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │  Your Custom Time Series      │     │  ← You CAN create this
│  │  (Optional custom panel)      │     │
│  └───────────────────────────────┘     │
└─────────────────────────────────────────┘
```

**Why This Matters:**

- ✅ You can write code in YOUR plugins
- ❌ You cannot write code in Grafana's built-in panels
- ✅ You can listen to events from built-in panels (if they emit them)
- ❌ You cannot make built-in panels emit custom events
- ✅ You can create your own panels that emit custom events
- ✅ You can use Grafana's existing event system

---

## Who Writes What Code

### Scenario 1: Using Built-in Time Series Panel

**Architecture:**

```
┌──────────────────────┐
│ Built-in Time Series │  ← Grafana's code (read-only for you)
│ Panel                │
└──────────┬───────────┘
           │
           │ (emits built-in events only)
           │
           ↓
    ┌──────────────┐
    │  Event Bus   │
    └──────┬───────┘
           │
           │ (you listen here)
           │
           ↓
┌──────────────────────┐
│ Your Orbital Panel   │  ← Your code (you write this)
└──────────────────────┘
```

**Where You Write Code:**

**❌ You CANNOT write this:**
```typescript
// This is INSIDE Grafana's built-in time series panel
// You don't have access to modify this code!
const handlePointClick = (point) => {
  appEvents.publish('my-custom-event', { time: point.time });
};
```

**✅ You CAN write this:**
```typescript
// This is in YOUR orbital panel
// You have full control over this code!
import { getAppEvents } from '@grafana/runtime';

export const OrbitalPanel: React.FC<Props> = (props) => {
  useEffect(() => {
    const appEvents = getAppEvents();
    
    // Listen for events (from any source)
    const sub = appEvents.subscribe('time-selected', (event) => {
      console.log('Received event:', event);
      updateOrbitView(event.payload.timestamp);
    });
    
    return () => sub.unsubscribe();
  }, []);
};
```

---

### Scenario 2: Creating Your Own Time Series Panel

**If you need custom events, you must create your own panel plugin.**

**Architecture:**

```
┌──────────────────────┐
│ Your Custom Time     │  ← Your code (you create this panel)
│ Series Panel         │
└──────────┬───────────┘
           │
           │ (you emit custom events)
           │
           ↓
    ┌──────────────┐
    │  Event Bus   │
    └──────┬───────┘
           │
           │
           ↓
┌──────────────────────┐
│ Your Orbital Panel   │  ← Your code (listens for events)
└──────────────────────┘
```

**Custom Time Series Panel (Emitter):**
```typescript
// File: grafana-plugins/custom-time-series/src/CustomTimeSeriesPanel.tsx

import React from 'react';
import { PanelProps } from '@grafana/data';
import { getAppEvents } from '@grafana/runtime';

export const CustomTimeSeriesPanel: React.FC<PanelProps> = ({ data }) => {
  
  const handlePointClick = (timestamp: number, value: number) => {
    const appEvents = getAppEvents();
    
    // You CAN do this because you're writing this panel!
    appEvents.publish({
      type: 'satellite-time-point-selected',
      payload: {
        timestamp,
        value,
        source: 'custom-time-series'
      }
    });
  };
  
  return (
    <div>
      {/* Render time series with click handlers */}
      {data.series.map(series => (
        <div onClick={() => handlePointClick(/* ... */)}>
          {/* Chart visualization */}
        </div>
      ))}
    </div>
  );
};
```

**Your Orbital Panel (Listener):**
```typescript
// File: grafana-plugins/test-plugin/src/OrbitalPanel.tsx

export const OrbitalPanel: React.FC<Props> = (props) => {
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const sub = appEvents.subscribe('satellite-time-point-selected', (event) => {
      // Handle event from your custom time series panel
      updateOrbitalView(event.payload);
    });
    
    return () => sub.unsubscribe();
  }, []);
};
```

**Key Point:** Both panels are YOUR code, so you control both emitter and listener!

---

## What Built-in Panels Do

### Events Emitted by Grafana's Built-in Panels

**Good News:** Grafana's built-in panels DO emit some events!

**Bad News:** They don't emit custom "point selected" events by default.

---

### Built-in Events You CAN Use

**1. Time Range Changes (Global)**

When user interacts with time series panel's time range:

```typescript
// In your orbital panel:
import { locationService } from '@grafana/runtime';

useEffect(() => {
  // Listen for URL changes (time range is in URL)
  const unsubscribe = locationService.getHistory().listen((location) => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    console.log('Time range changed:', from, to);
    // Update your visualization
  });
  
  return () => unsubscribe();
}, []);
```

**What triggers this:**
- User clicks time series and drags to select range
- User uses time picker
- Any panel calls `onChangeTimeRange`

**Effect:**
- ✅ All panels receive new `timeRange` prop
- ✅ Your panel re-renders automatically
- ✅ You can react in useEffect

---

**2. Dashboard Events**

```typescript
import { getAppEvents } from '@grafana/runtime';

useEffect(() => {
  const appEvents = getAppEvents();
  
  // Some built-in events you can listen to:
  
  // When dashboard is saved
  const sub1 = appEvents.subscribe('dashboard-saved', () => {
    console.log('Dashboard was saved');
  });
  
  // When panel is resized
  const sub2 = appEvents.subscribe('panel-size-changed', (event) => {
    console.log('Panel resized:', event.payload);
  });
  
  // When dashboard refreshes
  const sub3 = appEvents.subscribe('refresh', () => {
    console.log('Dashboard refreshing');
  });
  
  return () => {
    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();
  };
}, []);
```

---

**3. Annotation Events**

Grafana has an annotation system (markers on time series):

```typescript
// Listen for when user adds/edits annotations
appEvents.subscribe('annotation-event-added', (event) => {
  console.log('Annotation added at:', event.payload.time);
  // You could highlight this in orbital view
});
```

---

### What Built-in Panels DON'T Do

**❌ Built-in time series panel does NOT emit:**
- Custom "point clicked" events
- "Hover over point" events (to other panels)
- "Selected series" events
- Custom data selection events

**Why?** Because Grafana's built-in panels are designed for general use and don't know about your specific use case (satellite visualization).

---

## Your Orbital Plugin as Listener

### The Listener-Only Pattern

**Your orbital panel should be designed as a pure listener.**

**Implementation:**

```typescript
// File: grafana-plugins/test-plugin/src/OrbitalPanel.tsx

import React, { useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { getAppEvents } from '@grafana/runtime';

// Define event types you'll listen for
const EVENTS = {
  TIME_POINT_SELECTED: 'satellite:time-point-selected',
  ORBIT_RANGE_SELECTED: 'satellite:orbit-range-selected',
  ANOMALY_DETECTED: 'satellite:anomaly-detected',
};

interface TimePointEvent {
  timestamp: number;
  value: number;
  source: string;  // Which panel sent this
  metadata?: any;
}

export const OrbitalPanel: React.FC<PanelProps> = ({ 
  data, 
  timeRange, 
  width, 
  height 
}) => {
  const [highlightedTime, setHighlightedTime] = useState<number | null>(null);
  const [eventSource, setEventSource] = useState<string>('');
  
  // Listen for time point selection events
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const subscription = appEvents.subscribe<TimePointEvent>(
      EVENTS.TIME_POINT_SELECTED,
      (event) => {
        console.log('Time point selected:', event.payload);
        
        const { timestamp, value, source, metadata } = event.payload;
        
        // Update state
        setHighlightedTime(timestamp);
        setEventSource(source);
        
        // Update 3D visualization
        highlightOrbitAtTime(timestamp);
        
        // Optional: Show value as label
        if (metadata?.showLabel) {
          displayLabel(timestamp, value);
        }
      }
    );
    
    // Cleanup
    return () => subscription.unsubscribe();
  }, []);
  
  // React to time range changes (built-in Grafana behavior)
  useEffect(() => {
    console.log('Time range changed:', timeRange);
    updateOrbitPath(timeRange);
  }, [timeRange]);
  
  return (
    <div style={{ width, height }}>
      {/* 3D Visualization */}
      <canvas ref={canvasRef} />
      
      {/* Show which panel sent the event */}
      {highlightedTime && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          Event from: {eventSource}
          <br />
          Time: {new Date(highlightedTime).toISOString()}
        </div>
      )}
    </div>
  );
};
```

**Key Features:**
- ✅ Listens for multiple event types
- ✅ Tracks which panel sent the event (source)
- ✅ Can handle events from multiple panels
- ✅ Also reacts to built-in time range changes
- ✅ No dependencies on other panels' code

---

## Multiple Event Sources

### Handling Events from Multiple Panels

**Your Question:** "Can the same code handle events from different time series panels?"

**Answer:** YES! Absolutely!

---

### Single Listener, Multiple Emitters

**Architecture:**

```
┌──────────────────┐
│ Time Series      │──┐
│ Panel 1          │  │
│ (Altitude)       │  │
└──────────────────┘  │
                      │
┌──────────────────┐  │    emit 'time-selected'
│ Time Series      │──┤         with source info
│ Panel 2          │  │              │
│ (Temperature)    │  │              │
└──────────────────┘  │              ↓
                      │       ┌──────────────┐
┌──────────────────┐  │       │  Event Bus   │
│ Custom Panel 3   │──┘       └──────┬───────┘
│ (Velocity)       │                 │
└──────────────────┘                 │
                                     │ listen for 'time-selected'
                                     │
                                     ↓
                          ┌──────────────────────┐
                          │  Orbital Panel       │
                          │  (Single Listener)   │
                          └──────────────────────┘
```

---

### Implementation Example

**Panel 1 (Altitude Time Series):**
```typescript
// File: grafana-plugins/altitude-panel/src/AltitudePanel.tsx

export const AltitudePanel: React.FC<PanelProps> = ({ data }) => {
  const handlePointClick = (timestamp: number, altitude: number) => {
    const appEvents = getAppEvents();
    
    appEvents.publish({
      type: 'satellite:time-point-selected',
      payload: {
        timestamp,
        value: altitude,
        source: 'altitude-panel',      // Identifies this panel
        metadata: {
          unit: 'km',
          dataType: 'altitude'
        }
      }
    });
  };
  
  return <div onClick={() => handlePointClick(/*...*/)}>Altitude Chart</div>;
};
```

---

**Panel 2 (Temperature Time Series):**
```typescript
// File: grafana-plugins/temperature-panel/src/TemperaturePanel.tsx

export const TemperaturePanel: React.FC<PanelProps> = ({ data }) => {
  const handlePointClick = (timestamp: number, temp: number) => {
    const appEvents = getAppEvents();
    
    appEvents.publish({
      type: 'satellite:time-point-selected',  // Same event type!
      payload: {
        timestamp,
        value: temp,
        source: 'temperature-panel',    // Different source
        metadata: {
          unit: '°C',
          dataType: 'temperature'
        }
      }
    });
  };
  
  return <div onClick={() => handlePointClick(/*...*/)}>Temperature Chart</div>;
};
```

---

**Orbital Panel (Single Listener for Both):**
```typescript
// File: grafana-plugins/test-plugin/src/OrbitalPanel.tsx

export const OrbitalPanel: React.FC<PanelProps> = (props) => {
  const [events, setEvents] = useState<Array<any>>([]);
  
  useEffect(() => {
    const appEvents = getAppEvents();
    
    // Single subscription handles events from ALL sources
    const sub = appEvents.subscribe('satellite:time-point-selected', (event) => {
      const { timestamp, value, source, metadata } = event.payload;
      
      console.log(`Event from ${source}:`, timestamp, value);
      
      // Store event history
      setEvents(prev => [...prev, event.payload]);
      
      // Handle differently based on source
      switch (source) {
        case 'altitude-panel':
          console.log('Altitude event:', value, metadata.unit);
          highlightOrbitPosition(timestamp, 'altitude');
          showAltitudeMarker(timestamp, value);
          break;
          
        case 'temperature-panel':
          console.log('Temperature event:', value, metadata.unit);
          highlightOrbitPosition(timestamp, 'temperature');
          showTemperatureMarker(timestamp, value);
          break;
          
        default:
          console.log('Unknown source:', source);
          highlightOrbitPosition(timestamp, 'default');
      }
      
      // Common handling regardless of source
      updateOrbitHighlight(timestamp);
    });
    
    return () => sub.unsubscribe();
  }, []);
  
  return (
    <div>
      {/* 3D Orbital View */}
      
      {/* Show event history */}
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <h4>Recent Events:</h4>
        {events.slice(-5).map((evt, i) => (
          <div key={i}>
            {evt.source}: {new Date(evt.timestamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### Sequential Events from Different Panels

**Your Question:** "Time series panel 1 selects a point, then panel 2 selects a point - does orbital panel reflect both?"

**Answer:** YES! Your orbital panel can handle sequential events.

**Example Flow:**

```
Time: 0s
User clicks altitude panel at 14:30
  → Orbital panel highlights 14:30 position (altitude event)

Time: 5s
User clicks temperature panel at 15:00
  → Orbital panel highlights 15:00 position (temperature event)
  → Previous highlight (14:30) can be:
      - Removed (show only latest)
      - Kept (show both highlights)
      - Faded (show history)
```

**Implementation with History:**

```typescript
export const OrbitalPanel: React.FC<PanelProps> = (props) => {
  const [highlights, setHighlights] = useState<Array<{
    timestamp: number;
    source: string;
    age: number;
  }>>([]);
  
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const sub = appEvents.subscribe('satellite:time-point-selected', (event) => {
      const { timestamp, source } = event.payload;
      
      // Add new highlight
      setHighlights(prev => [
        ...prev,
        { timestamp, source, age: 0 }
      ]);
      
      // Optional: Remove old highlights after 10 seconds
      setTimeout(() => {
        setHighlights(prev => 
          prev.filter(h => h.timestamp !== timestamp)
        );
      }, 10000);
    });
    
    return () => sub.unsubscribe();
  }, []);
  
  // Render multiple highlights in 3D scene
  useEffect(() => {
    // Update 3D visualization with all highlights
    highlights.forEach(highlight => {
      renderMarker(highlight.timestamp, highlight.source);
    });
  }, [highlights]);
  
  return <div>Orbital View with Multiple Highlights</div>;
};
```

---

## Default Grafana Behavior

### What Happens by Default

**Your Question:** "Does selection in time series panel show in other time series panels?"

**Answer:** NO (for point selection), YES (for time range selection)

---

### Default Behavior: Time Range Selection

**Scenario:** User drags in time series to select a time range.

**What Happens:**

```
User drags from 14:00 to 15:00 in Time Series Panel 1
         ↓
Grafana updates dashboard time range (global state)
         ↓
All panels receive new timeRange prop
         ↓
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│ Time Series Panel 1 │  │ Time Series Panel 2 │  │ Your Orbital Panel│
│ Shows 14:00-15:00   │  │ Shows 14:00-15:00   │  │ Shows 14:00-15:00 │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘
```

**Effect:**
- ✅ All time series panels zoom to same range
- ✅ All panels show data for 14:00-15:00
- ✅ This is BUILT-IN Grafana behavior
- ✅ No custom code needed!

---

### Default Behavior: Point Selection (Hover/Click)

**Scenario:** User hovers over or clicks a single point in time series.

**What Happens:**

```
User hovers over 14:30 in Time Series Panel 1
         ↓
Grafana shows tooltip in Panel 1
         ↓
❌ Nothing happens in Panel 2
❌ Nothing happens in Orbital Panel
```

**Effect:**
- ❌ Other time series panels DON'T show that point
- ❌ No event is emitted to other panels
- ❌ This is NOT built-in Grafana behavior
- ⚠️ Would require custom code (your own panels)

---

### Cursor Sync Feature (Partial Solution)

**Grafana HAS a "cursor sync" feature!**

**What it does:**
- When you hover over one time series, a vertical line appears at that time
- Other time series panels show the same vertical line
- Shows synchronized tooltips

**How to enable:**
1. Dashboard settings → "Graph tooltip" → "Shared crosshair"
2. Or "Shared Tooltip" for tooltips in all panels

**What you get:**

```
Hover over 14:30 in Time Series Panel 1
         ↓
┌──────────────────┐  ┌──────────────────┐
│ Time Series 1    │  │ Time Series 2    │
│    |             │  │    |             │
│    | ← line      │  │    | ← line      │
│  14:30           │  │  14:30           │
│ Tooltip: 500km   │  │ Tooltip: 25°C    │
└──────────────────┘  └──────────────────┘
```

**BUT:**
- ❌ Your custom orbital panel won't automatically participate
- ❌ You don't get events for these hovers
- ⚠️ This is ONLY for hover, not click/selection

---

### Dashboard Variables (Easiest Custom Solution)

**For simple cross-panel state without custom events.**

**Setup:**

1. **Create dashboard variable:**
   - Dashboard settings → Variables → Add variable
   - Name: `selectedTime`
   - Type: `Custom` or `Query`
   - Initial value: empty

2. **Panels read/write this variable**

**Time Series Panel (if you create custom one):**
```typescript
import { getTemplateSrv } from '@grafana/runtime';

export const CustomTimeSeriesPanel: React.FC<PanelProps> = (props) => {
  const handleClick = (timestamp: number) => {
    // Update dashboard variable
    const templateSrv = getTemplateSrv();
    templateSrv.updateTimeRange({
      from: timestamp,
      to: timestamp
    });
  };
  
  // Or if using custom variable:
  // locationService.partial({ 'var-selectedTime': timestamp });
};
```

**Orbital Panel (reads variable):**
```typescript
import { getTemplateSrv } from '@grafana/runtime';

export const OrbitalPanel: React.FC<PanelProps> = (props) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  
  useEffect(() => {
    const templateSrv = getTemplateSrv();
    
    // Read variable value
    const timeValue = templateSrv.replace('$selectedTime');
    
    if (timeValue && timeValue !== '$selectedTime') {
      setSelectedTime(parseInt(timeValue));
    }
  }, []);
  
  // Watch for variable changes (poll or use events)
  useEffect(() => {
    const interval = setInterval(() => {
      const templateSrv = getTemplateSrv();
      const newValue = templateSrv.replace('$selectedTime');
      
      if (newValue && newValue !== '$selectedTime') {
        const timestamp = parseInt(newValue);
        if (timestamp !== selectedTime) {
          setSelectedTime(timestamp);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [selectedTime]);
  
  useEffect(() => {
    if (selectedTime) {
      highlightOrbitAtTime(selectedTime);
    }
  }, [selectedTime]);
};
```

**Pros:**
- ✅ Built-in Grafana feature
- ✅ No custom events needed
- ✅ Works with existing panels (sort of)

**Cons:**
- ⚠️ Requires custom panel to SET the variable
- ⚠️ Polling needed to detect changes
- ⚠️ Not as elegant as events

---

## Practical Solutions

### Solution Matrix

| Your Need | Best Approach | Requires Custom Panel? | Complexity |
|-----------|---------------|----------------------|-----------|
| Sync time ranges | Built-in timeRange prop | ❌ No | Low |
| Hover sync between TS panels | Built-in cursor sync | ❌ No | Low |
| Click point → Orbital highlights | App Events | ✅ Yes (emitter) | Medium |
| Multiple panels → Orbital | App Events with source | ✅ Yes (emitters) | Medium |
| Bi-directional communication | App Events both ways | ✅ Yes (all custom) | High |
| Simple state sharing | Dashboard Variables | ⚠️ Maybe | Medium |

---

### Recommended Approach for Your Project

**Phase 1: Use Built-in Time Range (Now)**

```typescript
// Your orbital panel - works TODAY with built-in panels
export const OrbitalPanel: React.FC<Props> = ({ timeRange }) => {
  useEffect(() => {
    // User selects time range in any panel → this updates
    updateOrbitForTimeRange(timeRange);
  }, [timeRange]);
};
```

**Benefits:**
- ✅ Works immediately
- ✅ No custom panels needed
- ✅ All built-in panels participate
- ✅ Standard Grafana behavior

---

**Phase 2: Enable Cursor Sync (Easy)**

1. Dashboard settings → Graph tooltip → "Shared crosshair"
2. Users see synchronized hover lines across time series

**Benefits:**
- ✅ No code needed
- ✅ Visual sync between time series panels

**Limitation:**
- ⚠️ Your orbital panel won't automatically participate

---

**Phase 3: Create Custom Event System (Later)**

When you need point-click communication:

1. **Create custom time series panel** (emitter)
2. **Your orbital panel listens** (already ready)
3. **Use app events** for communication

**Benefits:**
- ✅ Full control
- ✅ Custom interactions
- ✅ Multiple panels can emit

**Trade-off:**
- ⚠️ Need to create custom time series panel
- ⚠️ Users must use your custom panel (not built-in)

---

### Hybrid Approach (Recommended)

**Support BOTH built-in behavior AND custom events:**

```typescript
export const OrbitalPanel: React.FC<Props> = ({ timeRange, data }) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  
  // 1. React to built-in time range changes (works with all panels)
  useEffect(() => {
    console.log('Time range changed (built-in)');
    updateOrbitPath(timeRange);
  }, [timeRange]);
  
  // 2. Listen for custom point selection events (works with custom panels)
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const sub = appEvents.subscribe('satellite:time-point-selected', (event) => {
      console.log('Point selected (custom event)');
      setSelectedPoint(event.payload.timestamp);
      highlightOrbitAtTime(event.payload.timestamp);
    });
    
    return () => sub.unsubscribe();
  }, []);
  
  // 3. Also use data annotations if available
  useEffect(() => {
    if (data.annotations) {
      data.annotations.forEach(annotation => {
        console.log('Annotation at:', annotation.time);
        markAnnotationInOrbit(annotation.time);
      });
    }
  }, [data.annotations]);
  
  return <div>Orbital View</div>;
};
```

**This approach:**
- ✅ Works with built-in panels (time range)
- ✅ Works with cursor sync (visual)
- ✅ Works with custom panels (events)
- ✅ Works with annotations (markers)
- ✅ Future-proof and flexible

---

## Architecture Diagrams

### Architecture 1: Using Only Built-in Panels

```
┌────────────────────────────────────────────────────┐
│                  Dashboard                         │
│                                                    │
│  Time Range: [===========] ← User controlled      │
│                                                    │
│  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ Built-in        │  │ Your Orbital Panel   │   │
│  │ Time Series     │  │                      │   │
│  │                 │  │  ┌────────────────┐  │   │
│  │ [Graph]         │  │  │ Listens to:    │  │   │
│  │                 │  │  │ - timeRange    │  │   │
│  │ User selects    │  │  │ - data         │  │   │
│  │ time range ──┐  │  │  └────────────────┘  │   │
│  └──────────────┼──┘  └──────────────────────┘   │
│                 │                                 │
│                 └──> Updates dashboard time range │
│                                 │                 │
│                                 └──> All panels   │
│                                      re-render    │
└────────────────────────────────────────────────────┘

✅ Works TODAY
✅ No custom panels needed
❌ No point-level selection communication
```

---

### Architecture 2: With Custom Emitter Panel

```
┌───────────────────────────────────────────────────────┐
│                  Dashboard                            │
│                                                       │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │ Your Custom         │  │ Your Orbital Panel   │  │
│  │ Time Series Panel   │  │                      │  │
│  │                     │  │  ┌────────────────┐  │  │
│  │ User clicks point   │  │  │ Listens to:    │  │  │
│  │         │           │  │  │ - timeRange    │  │  │
│  │         ↓           │  │  │ - events       │  │  │
│  │  Publish event      │  │  └────────────────┘  │  │
│  │  {                  │  │          ↑           │  │
│  │    type: 'time-sel' │  │          │           │  │
│  │    timestamp: X     │  │          │           │  │
│  │  }                  │  │          │           │  │
│  └──────────┬──────────┘  └──────────┼───────────┘  │
│             │                        │              │
│             └────> Event Bus ────────┘              │
│                   (Grafana Runtime)                 │
└───────────────────────────────────────────────────────┘

✅ Full control over events
✅ Custom interactions
⚠️  Requires creating custom panel(s)
```

---

### Architecture 3: Multiple Emitters, One Listener

```
┌──────────────────────────────────────────────────────────┐
│                      Dashboard                           │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Custom Panel │  │ Custom Panel │  │ Custom Panel │  │
│  │ 1: Altitude  │  │ 2: Temp      │  │ 3: Velocity  │  │
│  │              │  │              │  │              │  │
│  │ Click ───┐   │  │ Click ───┐   │  │ Click ───┐   │  │
│  └──────────┼───┘  └──────────┼───┘  └──────────┼───┘  │
│             │                 │                 │       │
│             │                 │                 │       │
│             ↓                 ↓                 ↓       │
│            ┌───────────────────────────────────┐       │
│            │        Event Bus                  │       │
│            │  'satellite:time-point-selected'  │       │
│            └───────────────┬───────────────────┘       │
│                            │                           │
│                            │ All events                │
│                            │ funnel here               │
│                            ↓                           │
│                 ┌──────────────────────┐               │
│                 │ Your Orbital Panel   │               │
│                 │                      │               │
│                 │ Single subscription  │               │
│                 │ handles all sources  │               │
│                 │                      │               │
│                 │ switch(event.source) │               │
│                 │   case 'altitude'    │               │
│                 │   case 'temp'        │               │
│                 │   case 'velocity'    │               │
│                 └──────────────────────┘               │
└──────────────────────────────────────────────────────────┘

✅ Multiple data sources
✅ Single listener handles all
✅ Source tracking
⚠️  All emitter panels must be custom
```

---

## Summary of Answers

### Q: "Who writes the code for time series click handling?"

**A:** You would write it, but ONLY if you create a custom time series panel. You cannot modify Grafana's built-in panels.

---

### Q: "Do all panels need to be altered?"

**A:** No! Only your orbital panel needs code (listener). But if you want custom click events, you'd need to create custom emitter panels too.

---

### Q: "Can code handle events from different time series panels?"

**A:** YES! One listener can handle events from multiple emitter panels. Use `source` field to identify which panel sent the event.

---

### Q: "Can panel 1 select a point, then panel 2, and both affect orbital?"

**A:** YES! Your orbital panel can:
- Show only the latest selection (replace previous)
- Show both selections (maintain history)
- Show sequential selections with different colors/markers

---

### Q: "Does time series selection show in other time series panels by default?"

**A:** 
- **Time RANGE selection:** YES (built-in)
- **Single POINT selection:** NO (not built-in)
- **Hover sync:** YES (with cursor sync enabled)

---

### Q: "Is this achievable without altering Grafana core?"

**A:** YES! Multiple ways:
- ✅ Time range sync (built-in, works now)
- ✅ Cursor sync (built-in, enable in settings)
- ✅ App events (custom panels, full control)
- ✅ Dashboard variables (workaround, somewhat clunky)

---

### Q: "Is there customizability for correspondence between existing panels?"

**A:**
- ✅ Time range: Full correspondence (built-in)
- ✅ Cursor hover: Visual correspondence (built-in)
- ⚠️ Point selection: Requires custom panels
- ❌ Click events from built-in panels: Not available

---

## Recommendations

### For Tomorrow's Presentation

**Focus on:**
1. ✅ Time range synchronization (works with built-in panels)
2. ✅ Cursor sync feature (visual correspondence)
3. 🎯 Your orbital panel reacts to time changes

**Mention as future work:**
4. Custom panels for point-level selection
5. App events for advanced interactions

---

### For Development

**Priority 1 (Do Now):**
- Implement timeRange reactivity in orbital panel
- Test with built-in time series panels
- Enable cursor sync in dashboard settings

**Priority 2 (Next Sprint):**
- Create custom time series panel (if needed)
- Implement app event publishing
- Test with your orbital listener

**Priority 3 (Future):**
- Multiple custom panels
- Complex event payloads
- Bi-directional communication

---

## Code Template: Complete Listener

```typescript
// Complete orbital panel with all communication methods

import React, { useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';
import { getAppEvents, locationService } from '@grafana/runtime';

export const OrbitalPanel: React.FC<PanelProps> = ({ 
  data, 
  timeRange, 
  timeZone,
  width, 
  height 
}) => {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  
  // 1. Built-in time range (works with all panels)
  useEffect(() => {
    console.log('Time range updated:', {
      from: timeRange.from.format('YYYY-MM-DD HH:mm:ss'),
      to: timeRange.to.format('YYYY-MM-DD HH:mm:ss')
    });
    
    updateOrbitPath(timeRange);
  }, [timeRange]);
  
  // 2. Custom app events (works with custom panels)
  useEffect(() => {
    const appEvents = getAppEvents();
    
    const subscriptions = [
      // Point selection events
      appEvents.subscribe('satellite:time-point-selected', (event) => {
        console.log('Point selected:', event.payload);
        setSelectedPoint(event.payload.timestamp);
        setEventHistory(prev => [...prev, event.payload]);
        highlightOrbitAtTime(event.payload.timestamp);
      }),
      
      // Anomaly detection events
      appEvents.subscribe('satellite:anomaly-detected', (event) => {
        console.log('Anomaly detected:', event.payload);
        markAnomalyInOrbit(event.payload);
      }),
      
      // Dashboard refresh
      appEvents.subscribe('refresh', () => {
        console.log('Dashboard refreshing');
        refetchOrbitData();
      })
    ];
    
    return () => subscriptions.forEach(sub => sub.unsubscribe());
  }, []);
  
  // 3. URL state changes (for dashboard variables)
  useEffect(() => {
    const unsubscribe = locationService.getHistory().listen((location) => {
      const params = new URLSearchParams(location.search);
      const selectedTime = params.get('var-selectedTime');
      
      if (selectedTime) {
        console.log('Variable changed:', selectedTime);
        setSelectedPoint(parseInt(selectedTime));
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // 4. Data annotations (built-in Grafana feature)
  useEffect(() => {
    if (data.annotations) {
      console.log('Annotations:', data.annotations);
      data.annotations.forEach(annotation => {
        markAnnotationInOrbit(annotation);
      });
    }
  }, [data.annotations]);
  
  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* 3D Orbital View */}
      <canvas ref={canvasRef} />
      
      {/* Debug overlay */}
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px' }}>
        <h4>Orbital Panel Status</h4>
        <p>Time Range: {timeRange.from.format('HH:mm')} - {timeRange.to.format('HH:mm')}</p>
        <p>Selected Point: {selectedPoint ? new Date(selectedPoint).toLocaleTimeString() : 'None'}</p>
        <p>Events Received: {eventHistory.length}</p>
        <hr />
        <h5>Recent Events:</h5>
        {eventHistory.slice(-3).map((evt, i) => (
          <div key={i}>{evt.source}: {new Date(evt.timestamp).toLocaleTimeString()}</div>
        ))}
      </div>
    </div>
  );
};
```

---

**End of Guide**

This covers all aspects of cross-panel communication in Grafana, what you can and cannot do with built-in panels, and how to build a comprehensive listener system. Let me know if you need clarification on any specific topic! 🚀

