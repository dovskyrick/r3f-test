# Grafana Plugin Types - Educational Guide

**Purpose:** Understanding the different types of Grafana plugins to guide development decisions

**Date:** November 25, 2025

---

## Overview

Grafana supports **three main types of plugins**, each serving a different purpose in the Grafana ecosystem. Understanding these types is crucial for architecting your plugin strategy.

---

## 1. Panel Plugins 📊

**What we're building for test-plugin**

### Purpose
Panel plugins add new **visualization types** to Grafana. They display data in dashboards as individual panels.

### Use Cases
- Custom charts and graphs
- 3D visualizations (our use case: React Three Fiber)
- Maps and geospatial displays
- Custom data representations
- Interactive visualizations

### Examples from Official Grafana
- Bar Chart
- Time Series Graph
- Gauge
- Table
- Geomap

### Our Use Cases
- **test-plugin:** 3D cube (proof of concept)
- **3d-orbit-attitude-plugin:** 3D satellite orbit and attitude visualization
- **ground-track-r3f-plugin:** Ground track visualization using R3F

### Key Characteristics
- ✅ Rendered within a dashboard panel
- ✅ Receives data from Grafana data sources
- ✅ Size-constrained (fits in panel dimensions)
- ✅ Can have custom panel options/settings
- ✅ Multiple instances can exist on one dashboard
- ❌ No global navigation or full-page views
- ❌ Cannot define new data sources

### Props Provided by Grafana
```typescript
interface PanelProps<TOptions> {
  data: PanelData;           // Query results
  width: number;             // Panel width in pixels
  height: number;            // Panel height in pixels
  options: TOptions;         // Custom panel options
  timeRange: TimeRange;      // Current time range
  timeZone: TimeZone;        // Timezone setting
  onChangeTimeRange: (timeRange: AbsoluteTimeRange) => void;
  // ... more props
}
```

### When to Use Panel Plugins
- ✅ You want to visualize data in a dashboard
- ✅ Your visualization is self-contained
- ✅ You need multiple instances showing different data
- ✅ Standard Grafana visualizations don't meet your needs

---

## 2. Data Source Plugins 🔌

### Purpose
Data source plugins allow Grafana to **query and retrieve data** from external systems, databases, or APIs.

### Use Cases
- Connect to custom databases
- Query REST APIs
- Integrate with proprietary data systems
- Time-series data from custom sources
- Real-time data streams

### Examples from Official Grafana
- Prometheus
- MySQL
- PostgreSQL
- Elasticsearch
- InfluxDB
- JSON API (SimpleJSON)

### Potential Use Case for Your Project
**Could be relevant if:**
- You want Grafana to query your GODOT backend directly
- You want to create a "Satellite Trajectory Data Source" that other panels can use
- You want to expose your trajectory/orbit data as a Grafana data source

### Key Characteristics
- ✅ Defines how Grafana queries data
- ✅ Appears in data source configuration
- ✅ Can be used by ANY panel type
- ✅ Handles authentication and connection management
- ✅ Defines query editor UI
- ❌ Doesn't visualize data (that's what panels do)
- ❌ More complex than panel plugins

### Components Required
1. **Backend component** (Go, typically) - handles actual data fetching
2. **Frontend component** (React/TypeScript) - query editor UI
3. **Configuration editor** - connection settings

### When to Use Data Source Plugins
- ✅ You have a unique data backend (like your GODOT server)
- ✅ You want to share data across multiple panels
- ✅ You need complex query logic
- ✅ You want to reuse your data source in different visualizations
- ❌ Overkill if you only need one visualization

---

## 3. App Plugins 🚀

### Purpose
App plugins add **entire applications** to Grafana with their own pages, navigation, and functionality. They can include multiple pages, custom routes, and even bundle their own panels and data sources.

### Use Cases
- Complex multi-page applications within Grafana
- Admin interfaces for external systems
- Comprehensive monitoring solutions
- Applications that need multiple views and navigation
- Bundling multiple related panels together

### Examples from Official Grafana
- Kubernetes App
- Synthetic Monitoring
- Incident Management
- Grafana Cloud integrations

### Potential Use Case for Your Project
**Could be relevant if:**
- You want a **complete satellite monitoring application** within Grafana
- You need multiple pages (e.g., orbit view, attitude view, telemetry, ground stations)
- You want custom navigation between different views
- You want to bundle all your satellite-related functionality together

### Key Characteristics
- ✅ Can have multiple pages with custom routes
- ✅ Can include its own navigation
- ✅ Can bundle multiple panel plugins
- ✅ Can bundle data source plugins
- ✅ Can have configuration pages
- ✅ Most flexible and powerful type
- ❌ Most complex to develop
- ❌ Heavier than individual panels

### Structure Example
```
satellite-monitoring-app/
├── Overview Page (dashboard summary)
├── Orbit View Page (3D orbit visualization)
├── Attitude View Page (satellite attitude)
├── Ground Track Page (map view)
├── Telemetry Page (data tables/graphs)
└── Configuration Page (settings)
```

### When to Use App Plugins
- ✅ You need multiple related pages
- ✅ You want custom navigation
- ✅ You're building a cohesive multi-feature application
- ✅ You want to bundle multiple panels/data sources together
- ❌ Overkill for simple visualizations

---

## Comparison Matrix

| Feature | Panel Plugin | Data Source Plugin | App Plugin |
|---------|-------------|-------------------|------------|
| **Complexity** | Low | Medium-High | High |
| **Visualizes Data** | ✅ Yes | ❌ No | ✅ Can include panels |
| **Fetches Data** | ❌ No | ✅ Yes | ✅ Can include data sources |
| **Multiple Pages** | ❌ No | ❌ No | ✅ Yes |
| **Custom Routes** | ❌ No | ❌ No | ✅ Yes |
| **Backend Required** | Optional | Usually Yes | Optional |
| **Can Use React Three Fiber** | ✅ Yes | ❌ N/A | ✅ Yes |
| **Fits in Dashboard** | ✅ Yes | ❌ N/A | Partially |
| **Development Time** | Days-Weeks | Weeks-Months | Months |

---

## Decision Guide for Your Project

### Current Strategy: Panel Plugins ✅

**Why this makes sense:**
- You have distinct visualizations (orbit, attitude, ground track)
- Each can be a separate panel on dashboards
- Can mix with other Grafana panels
- Lower complexity, faster development
- Users can compose custom dashboards

**Current Plan:**
1. ✅ `test-plugin` - Basic R3F panel (proof of concept)
2. ⏳ `3d-orbit-attitude-plugin` - Orbit and attitude visualization
3. ⏳ `ground-track-r3f-plugin` - Ground track visualization

### Future Consideration: Data Source Plugin

**When it might make sense:**
- If you want **other people** to use your GODOT backend with **their own** panel plugins
- If you want to query trajectory data in **standard Grafana panels** (like tables, graphs)
- If you want to separate data fetching from visualization logic

**Example Architecture:**
```
┌─────────────────────────────────┐
│  satellite-trajectory-datasource│  ← Queries GODOT backend
└──────────────┬──────────────────┘
               │ provides data to
               ↓
   ┌───────────────────────────────────┐
   │  Various Panel Plugins            │
   │  - 3D Orbit Panel                 │
   │  - Ground Track Panel             │
   │  - Native Grafana Table           │
   │  - Native Grafana Time Series     │
   └───────────────────────────────────┘
```

**Pros:**
- ✅ Data source reusable across different visualizations
- ✅ Could use native Grafana panels for some data
- ✅ Better separation of concerns

**Cons:**
- ❌ Requires backend development (Go typically)
- ❌ More complex authentication/connection handling
- ❌ Longer development time

### Future Consideration: App Plugin

**When it might make sense:**
- If your satellite monitoring becomes a **complete application**
- If you need **multiple pages** with different purposes
- If you want **custom navigation** between views
- If panels feel too constraining

**Example App Structure:**
```
Satellite Monitoring App
├── Dashboard (Overview)
├── 3D Orbit View (full page)
├── Attitude Analysis (full page)
├── Ground Track (full page)
├── Telemetry Data (tables)
└── Configuration (settings)
```

**Pros:**
- ✅ Complete application experience
- ✅ Custom navigation
- ✅ Can have full-page 3D views (not constrained to panels)
- ✅ Professional, cohesive experience

**Cons:**
- ❌ Much more complex development
- ❌ Longer timeline (months vs weeks)
- ❌ Less flexible for users (can't mix with other panels easily)

---

## Hybrid Approaches

### Approach 1: Multiple Panels + Future App
**Strategy:** Start with individual panel plugins (current approach), later bundle into an app plugin if needed.

**Timeline:**
1. Phase 1: Develop 3-4 panel plugins ← **We are here**
2. Phase 2: Use panels in dashboards, get feedback
3. Phase 3: If needed, create app plugin that bundles/enhances the panels

**Pros:**
- ✅ Incremental development
- ✅ Faster time to value
- ✅ Can pivot based on user feedback

### Approach 2: Data Source + Multiple Panels
**Strategy:** Create a satellite data source plugin that multiple panels consume.

**Timeline:**
1. Phase 1: Basic panel with embedded data fetching ← **We are here**
2. Phase 2: Extract data fetching to data source plugin
3. Phase 3: Multiple panels use the data source

**Pros:**
- ✅ Better architecture for multiple visualizations
- ✅ Data source can be used by native Grafana panels too

**Cons:**
- ❌ More upfront work for data source

---

## Recommendations for Your Project

### Current Phase: Panel Plugins ✅ CORRECT CHOICE

**Why:**
- Fastest path to working 3D visualizations
- Lowest complexity
- Can integrate React Three Fiber immediately
- Users can compose custom dashboards
- Each visualization is independent

**Stick with this for:**
- test-plugin (R3F cube)
- 3d-orbit-attitude-plugin
- ground-track-r3f-plugin
- Any other standalone visualizations

### Future: Consider Data Source Plugin

**When your data becomes more complex:**
- If GODOT backend becomes shared across teams
- If you want to support custom queries
- If you want Grafana's native time-series panels to work with your data

### Future: Consider App Plugin

**Only if you need:**
- Full-page 3D views (not constrained to panels)
- Multiple pages with custom navigation
- A "Satellite Monitoring Suite" brand/identity
- Configuration pages and admin interfaces

---

## Plugin Type Selection Flowchart

```
Do you need to visualize data?
├─ Yes → Do you need multiple pages with navigation?
│        ├─ Yes → App Plugin
│        └─ No → Panel Plugin ✅ (YOUR CURRENT PATH)
│
└─ No → Do you need to fetch data from a custom source?
         ├─ Yes → Data Source Plugin
         └─ No → You might not need a plugin
```

---

## Technical Implications

### Panel Plugins (Current Choice)

**Development Requirements:**
- React + TypeScript
- React Three Fiber (for 3D)
- Grafana SDK (`@grafana/data`, `@grafana/ui`)
- Webpack configuration
- Basic understanding of Grafana panels

**Data Fetching:**
- Can fetch data directly in panel (REST API calls)
- Can use Grafana query editor (if using data source)
- Can use mock/test data

**Bundle Size Concerns:**
- Three.js is large (~600KB)
- Need to consider loading times
- Each panel loads independently

### Data Source Plugins

**Development Requirements:**
- Frontend: React + TypeScript (query editor)
- Backend: Go (typically) for data fetching
- Understanding of Grafana's data frame format
- More complex testing requirements

**When to invest in this:**
- When data fetching logic becomes complex
- When multiple panels need same data
- When you want to expose your backend to others

### App Plugins

**Development Requirements:**
- Everything from panel plugins
- React Router or similar for navigation
- More complex state management
- Configuration persistence
- Potentially authentication/authorization

**When to invest in this:**
- When you have 5+ related features
- When panel constraints feel limiting
- When you need a branded experience

---

## Conclusion

**Your current strategy of building panel plugins is the right choice for:**
- ✅ Starting quickly with R3F visualizations
- ✅ Keeping complexity manageable
- ✅ Allowing incremental development
- ✅ Giving users flexibility in dashboard composition

**Consider evolving to:**
- **Data Source Plugin** if data fetching becomes complex or shared
- **App Plugin** if you need multiple pages and custom navigation

**For now:** Focus on making great panel plugins with React Three Fiber. The plugin ecosystem is designed to be modular, so you can always refactor or expand later.

---

**Next Steps:**
1. Complete test-plugin as a **panel plugin** ← Current focus
2. Develop additional **panel plugins** for specific visualizations
3. Gather user feedback
4. Decide if data source or app plugin makes sense later

**Remember:** Start simple, iterate based on actual needs. Panel plugins are powerful and might be all you ever need!

