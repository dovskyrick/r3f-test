# Transitioning from Single Satellite to Multiple Satellites

## Current Architecture Analysis

### Data Structures

Currently, the system is designed to handle only a single satellite trajectory at a time, primarily through two main contexts:

#### 1. Trajectory Context (src/contexts/TrajectoryContext.tsx)

```typescript
// Current TrajectoryContext state
const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
const [isTrajectoryVisible, setIsTrajectoryVisible] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

The existing `TrajectoryContext` manages:
- A single trajectory dataset (`trajectoryData`)
- A single visibility toggle (`isTrajectoryVisible`)
- Loading and error states

The trajectory data structure itself includes:
```typescript
export interface TrajectoryData {
  points: TrajectoryPoint[];
  start_time: string;
  end_time: string;
  point_count: number;
  status: string;
  message?: string;
}
```

#### 2. Satellite Context (src/contexts/SatelliteContext.tsx)

```typescript
// Satellite interface 
export interface Satellite {
  id: string;
  name: string;
  isVisible: boolean;
}

// Context state
const [satellites, setSatellites] = useState<Satellite[]>([]);
const [activeSatelliteId, setActiveSatelliteId] = useState<string | null>(null);
const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
```

While the `SatelliteContext` is already structured to handle multiple satellites with:
- An array of satellites
- A concept of an "active" (selected) satellite
- Basic satellite properties (id, name, visibility)

However, it lacks integration with trajectory data - satellites are currently just name/visibility pairs without actual orbit data.

### Limitations

1. The trajectory data is managed separately from satellite entities
2. Only one trajectory can be displayed at a time
3. No connection between satellites in the list and their trajectory data
4. No way to focus on a specific satellite's trajectory

## Proposed New Architecture

### Enhanced Data Structures

#### 1. Enhanced Satellite Interface

```typescript
export interface Satellite {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  isVisible: boolean;            // Visibility toggle
  trajectoryData: TrajectoryData | null;  // Trajectory data
  color: string;                 // Color for visualization
  tle: {                         // Store original TLE data
    line1: string;
    line2: string;
  };
  isLoading: boolean;            // Per-satellite loading state
  error: string | null;          // Per-satellite error state
  lastUpdated: Date;             // When the trajectory was last fetched
}
```

#### 2. Updated Context State

```typescript
// Main state
const [satellites, setSatellites] = useState<Satellite[]>([]);
const [focusedSatelliteId, setFocusedSatelliteId] = useState<string | null>(null);
const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

// Global loading state (for operations affecting multiple satellites)
const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);
```

#### 3. New Context Functions

```typescript
// Add a new satellite from TLE data
const addSatelliteFromTLE = async (name: string, tleLine1: string, tleLine2: string) => {...}

// Update a satellite's trajectory 
const updateSatelliteTrajectory = async (satelliteId: string) => {...}

// Focus on a specific satellite (for camera centering, etc.)
const focusOnSatellite = (satelliteId: string) => {...}

// Toggle visibility of a satellite
const toggleSatelliteVisibility = (satelliteId: string) => {...}

// Remove a satellite
const removeSatellite = (satelliteId: string) => {...}

// Fetch all trajectories (for initial load or refresh)
const fetchAllTrajectories = async () => {...}
```

### Implementation Approach

1. **Enhance the SatelliteContext**:
   - Merge the trajectory functionality from TrajectoryContext into SatelliteContext
   - Maintain a single source of truth for satellite data including trajectories
   - Add new methods for TLE-based satellite creation and management

2. **Modify Visualization Components**:
   - Update trajectory visualization to handle multiple trajectories with distinct colors
   - Add UI indicators for the focused satellite
   - Implement camera controls that center on the focused satellite

3. **Update UI Components**:
   - Enhance the satellite list items to show trajectory status and focus controls
   - Add color indicators/pickers in the satellite list
   - Create a more comprehensive satellite detail view

4. **API Integration**:
   - Connect the frontend TLE upload to the new backend endpoint
   - Implement proper error handling and loading states per satellite

## Maximum Number of Satellites

Regarding whether to impose a maximum number of satellites, I recommend a **soft limit** approach:

1. **Default Suggested Limit**: 10-15 satellites
   - This balances usability with performance

2. **Warning System**:
   - Display performance warnings when adding more than the suggested limit
   - Allow users to acknowledge and continue if they wish

3. **Performance-Based Approach**:
   - Monitor rendering performance
   - If frame rate drops below thresholds, suggest turning off some satellite visualizations

4. **Technical Considerations**:
   - Each satellite's trajectory may contain hundreds of points
   - Rendering many trajectories simultaneously could impact performance
   - Consider implementing level-of-detail for trajectories based on zoom level

The soft limit approach respects user agency while providing guidance for optimal performance.

## Extensibility for Future Features

The new design accommodates future extensions through:

1. **Flexible Satellite Properties**:
   - The enhanced `Satellite` interface can easily accommodate new properties

2. **Component-Based Visualization**:
   - Each visualization aspect (lines, markers, labels) can be independently enhanced

3. **Possible Future Extensions**:
   - **Grouping**: Add `groupId` property to organize satellites into mission groups
   - **Custom Visualization**: Add per-satellite visualization settings
   - **Ephemeris Data**: Support alternative orbit data sources beyond TLE
   - **Historical Data**: Add timestamp ranges for showing historical positions
   - **Conjunction Detection**: Add properties for proximity alerts between satellites
   - **Communication Links**: Visualize communication opportunities between satellites

## Focus Management

For managing which satellite is currently "focused," I recommend:

1. **Single Focus Approach** (preferred):
   - Maintain a single `focusedSatelliteId` in the context
   - This clearly indicates which satellite's perspective is currently active
   - Simpler to manage in UI and camera controls
   - Clear mental model for users

2. **Benefits over Boolean Approach**:
   - Ensures exactly one satellite is focused at a time
   - Easier state management (no need to loop through to find focused satellite)
   - More efficient for camera targeting and UI updates

3. **Implementation Details**:
   - Default focus to first added satellite
   - When a satellite is removed, focus shifts to another if available
   - Clear focus indicators in the UI
   - Keyboard shortcuts for cycling through focused satellites

## Migration Path

To transition from the current single-satellite system:

1. **Phase 1**: Enhance SatelliteContext with trajectory integration
2. **Phase 2**: Update visualization components to use satellite-specific trajectories
3. **Phase 3**: Update UI to support satellite management operations
4. **Phase 4**: Implement focus management and camera controls
5. **Phase 5**: Complete the removal of old TrajectoryContext once all functionality is migrated

This phased approach ensures that the application remains functional throughout the transition.

## Technical Challenges

1. **Performance Optimization**:
   - Implement trajectory simplification for distant satellites
   - Consider WebGL instancing for efficient rendering of multiple satellites

2. **State Management**:
   - Careful handling of asynchronous trajectory updates
   - Proper cleanup of removed satellite resources

3. **Camera Controls**:
   - Smooth transitions when changing focused satellites
   - Maintaining proper scale and orientation

4. **Error Handling**:
   - Per-satellite error states to isolate failures

## Conclusion

The transition from a single-satellite to a multi-satellite system requires significant restructuring of the data model and UI components. The proposed architecture provides a flexible, extensible foundation that can grow with future requirements while maintaining good performance and usability.

By centralizing satellite management and integrating trajectory data directly into the satellite objects, we create a more cohesive data model that better represents the real-world domain. 

## Additional Implementation Notes

### Camera Controls and Focus Priority

Implementation of camera controls will follow this priority order:

1. **High Priority**:
   - Data structure changes to support multiple satellites
   - Map view implementation for multiple trajectories
   - UI components for satellite management

2. **Medium Priority**:
   - 3D view centered on Earth showing multiple satellites
   - Basic camera controls for the Earth-centered view

3. **Low Priority**:
   - Satellite-centered 3D camera controls
   - This requires complex camera manipulation where all object positions are calculated relative to the focused satellite
   - The focused satellite appears stationary while Earth and other objects move around it
   - This will require specialized guidance for implementation due to its complexity

The focus management data structure (`focusedSatelliteId`) should be implemented early, even though the satellite-centered camera controls will come later. This allows the UI to provide focus selection while the visualization adapts progressively.

### UI Requirements for Satellite List Items

Each satellite in the list should have the following controls:

1. **Visibility Toggle** - Button to show/hide the satellite
2. **Delete Button** - Remove the satellite from the list and visualization
3. **Focus Checkbox/Button** - Select this satellite as the focused object
4. **Name Display** - Clearly show the satellite name, potentially allowing renaming
5. **Status Indicator** - Visual indication of loading/error states for each satellite

The satellite list UI should be designed with these controls in a compact, user-friendly layout that scales well with multiple items.

### Focus Implementation Approach

While the full satellite-centered camera view is lower priority, the implementation should:

1. Store the focus state in the context from the beginning
2. Add UI controls for changing the focused satellite 
3. Initially use focus state for highlighting the satellite in both views
4. Later extend to implement the complex camera manipulation for satellite-centered view

This approach allows for incremental development while ensuring the architecture supports the full feature set. 