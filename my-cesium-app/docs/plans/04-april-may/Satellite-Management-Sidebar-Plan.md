# Satellite Management Sidebar Implementation Plan

## Overview

This document outlines the plan for implementing a satellite management sidebar in the Earth visualization application. The sidebar will allow users to view, toggle, and add multiple satellites to the visualization. When opened, the sidebar will push the main content to the left rather than overlaying it, ensuring all UI elements remain fully visible.

## Features

1. A sidebar that slides in from the right edge of the screen, pushing main content to the left
2. A toggle button fixed to the right edge of the screen to open/close the sidebar
3. A scrollable list of satellites with:
   - Satellite name display
   - Toggle button for each satellite to show/hide it
4. A "LOAD TLE" button at the bottom of the sidebar to add new satellites
5. For the initial implementation, clicking "LOAD TLE" will add a satellite with a random 4-letter name
6. Consistent appearance and functionality in both the Maps View and 3D Earth View

## Technical Components

### 1. State Management

We'll need a new context provider to manage the satellite list:

```typescript
// SatelliteContext.tsx
interface Satellite {
  id: string;
  name: string;
  isVisible: boolean;
  // Later can be expanded with TLE data, trajectory points, etc.
}

interface SatelliteContextType {
  satellites: Satellite[];
  activeSatelliteId: string | null;
  isSidebarOpen: boolean;
  addSatellite: (name: string) => void;
  toggleSatellite: (id: string) => void;
  toggleSidebar: () => void;
  setActiveSatellite: (id: string | null) => void;
}
```

### 2. App Layout Structure

To implement a push-style sidebar, we need to adjust the overall layout:

```typescript
// App.tsx with push-style layout
const App: React.FC = () => {
  return (
    <TimeProvider>
      <TrajectoryProvider>
        <SatelliteProvider>
          <Router>
            <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
              <div className="main-content">
                <Navigation />
                <Routes>
                  <Route path="/" element={<EarthView />} />
                  <Route path="/maps" element={<MapsView />} />
                </Routes>
                <TimeSlider />
                <TrajectoryToggle />
              </div>
              <SatelliteSidebar />
              <SidebarToggle />
            </div>
          </Router>
        </SatelliteProvider>
      </TrajectoryProvider>
    </TimeProvider>
  );
};
```

### 3. UI Components

#### Sidebar Toggle Button

A fixed button on the right edge of the screen:

```typescript
// SidebarToggle.tsx
const SidebarToggle: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useSatelliteContext();
  
  return (
    <button 
      className="sidebar-toggle-button" 
      onClick={toggleSidebar}
    >
      {isSidebarOpen ? '❯' : '❮'}
    </button>
  );
};
```

#### Satellite Sidebar

The main sidebar component:

```typescript
// SatelliteSidebar.tsx
const SatelliteSidebar: React.FC = () => {
  const { satellites, isSidebarOpen, addSatellite } = useSatelliteContext();
  
  const generateRandomName = () => {
    // Generate random 4-letter name
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array(4).fill(0).map(() => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
  };
  
  const handleLoadTLE = () => {
    addSatellite(generateRandomName());
  };
  
  return (
    <div className="satellite-sidebar">
      <h2>Satellites</h2>
      <div className="satellite-list">
        {satellites.map(satellite => (
          <SatelliteListItem key={satellite.id} satellite={satellite} />
        ))}
      </div>
      <button className="load-tle-button" onClick={handleLoadTLE}>
        LOAD TLE
      </button>
    </div>
  );
};
```

#### Satellite List Item

Individual satellite list items:

```typescript
// SatelliteListItem.tsx
interface SatelliteListItemProps {
  satellite: Satellite;
}

const SatelliteListItem: React.FC<SatelliteListItemProps> = ({ satellite }) => {
  const { toggleSatellite } = useSatelliteContext();
  
  return (
    <div className="satellite-list-item">
      <span className="satellite-name">{satellite.name}</span>
      <button 
        className={`satellite-toggle ${satellite.isVisible ? 'active' : ''}`}
        onClick={() => toggleSatellite(satellite.id)}
      >
        {satellite.isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
};
```

### 4. CSS for Push Layout

```css
/* App.css - Push sidebar layout */
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.main-content {
  flex: 1;
  width: 100%;
  position: relative;
  transition: width 0.3s ease;
}

/* When sidebar is open, main content gets squeezed */
.app-container.sidebar-open .main-content {
  width: calc(100% - 300px);
}

.satellite-sidebar {
  width: 300px;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-toggle-button {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 1001;
  /* Button styling */
}

.satellite-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

/* Additional styling for list items, etc. */
```

## Implementation Steps

### Phase 1: Basic Structure

1. Create the `SatelliteContext.tsx` with state management
2. Update the App component to implement the flex layout structure
3. Implement the sidebar toggle button component
4. Create the basic sidebar component
5. Add CSS for the push-style layout and transitions

### Phase 2: Sidebar Content Implementation

1. Implement the satellite list view with scrolling
2. Create the satellite list item component 
3. Add "LOAD TLE" button that generates random satellite names
4. Implement toggle functionality for each satellite

### Phase 3: Responsive Behavior

1. Ensure the layout works correctly when the sidebar is opened/closed
2. Test that all UI elements (nav buttons, time slider) remain fully visible
3. Verify that both Maps View and 3D View adapt properly to the layout changes
4. Optimize the transitions for smooth animation

### Phase 4: Integration with Visualization

1. Connect the satellite visibility state to the rendering components
2. Ensure proper z-indexing and interaction with other UI elements
3. Test with multiple satellites to ensure performance

## Cross-View Consistency

To ensure the sidebar appears and functions consistently in both the Maps View and 3D View:

1. The `SatelliteContext` provider will be placed at the App level, above the routing
2. The sidebar and toggle button will be part of the main App layout, not tied to any specific view
3. Satellite state will persist when switching between views
4. The layout adaptation will affect both views in the same way

## Future Enhancements

After the initial implementation, the system can be expanded to:

1. Connect to actual TLE data from the backend
2. Allow satellite selection for detailed information
3. Add satellite color customization
4. Support grouping of satellites
5. Add filtering and searching capabilities
6. Implement drag-and-drop reordering of satellites

## Testing Plan

1. Verify layout behavior when the sidebar opens and closes
2. Test that all UI elements remain fully accessible in both views
3. Test with a large number of satellites to ensure scrolling works
4. Verify toggle buttons correctly update the state
5. Test on different screen sizes to ensure responsive behavior
6. Verify the transition is smooth and doesn't cause performance issues

## Conclusion

This implementation plan provides a roadmap for adding a satellite management sidebar that pushes the main content rather than overlaying it. This approach ensures all UI elements remain visible while providing a clean, intuitive interface for managing multiple satellites across both view modes. 