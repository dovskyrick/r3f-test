# Satellite Focus Mode Implementation Plan

## Overview

This document outlines the implementation of a satellite focus mode feature that allows users to:
1. Select a single satellite from the satellite list by clicking
2. Visual feedback with orange text for the focused satellite
3. In normal view (not alternate view): center the camera on the focused satellite while maintaining the illusion of orbital motion around Earth

## Architecture Decision: Focus State Management

**Chosen Approach**: Single context variable pointing to the focused satellite object
- ✅ **Pros**: Clean, efficient, single source of truth
- ✅ **Pros**: Easy to check `if (focusedSatellite?.id === satellite.id)`
- ✅ **Pros**: No need to update multiple objects when focus changes
- ✅ **Pros**: Natural fit with React's state management patterns

**Alternative Approach**: Boolean flag on each satellite
- ❌ **Cons**: Requires updating multiple objects when focus changes
- ❌ **Cons**: Risk of multiple satellites being marked as focused
- ❌ **Cons**: More complex state management and validation needed

## Phase 1: Context and State Management

### 1.1 Extended SatelliteContext

```typescript
// Update SatelliteContext.tsx
interface SatelliteContextType {
  satellites: Satellite[];
  addSatellite: (satellite: Satellite) => void;
  removeSatellite: (id: string) => void;
  toggleSatelliteVisibility: (id: string) => void;
  addSatelliteFromTLE: (name: string, tleLine1: string, tleLine2: string) => Promise<string>;
  
  // NEW: Focus mode functionality
  focusedSatellite: Satellite | null;
  setFocusedSatellite: (satellite: Satellite | null) => void;
  focusOnSatellite: (satelliteId: string) => void;
  clearFocus: () => void;
}

// Implementation in SatelliteProvider
const SatelliteProvider: React.FC<SatelliteProviderProps> = ({ children }) => {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [focusedSatellite, setFocusedSatellite] = useState<Satellite | null>(null);
  
  // Focus a satellite by ID
  const focusOnSatellite = useCallback((satelliteId: string) => {
    const satellite = satellites.find(sat => sat.id === satelliteId);
    if (satellite) {
      setFocusedSatellite(satellite);
      console.log(`Focused on satellite: ${satellite.name}`);
    }
  }, [satellites]);
  
  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedSatellite(null);
    console.log('Cleared satellite focus');
  }, []);
  
  // Auto-clear focus if focused satellite is removed
  useEffect(() => {
    if (focusedSatellite && !satellites.find(sat => sat.id === focusedSatellite.id)) {
      setFocusedSatellite(null);
    }
  }, [satellites, focusedSatellite]);
  
  // Update focused satellite data when satellites array changes
  useEffect(() => {
    if (focusedSatellite) {
      const updatedSatellite = satellites.find(sat => sat.id === focusedSatellite.id);
      if (updatedSatellite && updatedSatellite !== focusedSatellite) {
        setFocusedSatellite(updatedSatellite);
      }
    }
  }, [satellites, focusedSatellite]);
  
  return (
    <SatelliteContext.Provider value={{
      satellites,
      addSatellite,
      removeSatellite,
      toggleSatelliteVisibility,
      addSatelliteFromTLE,
      focusedSatellite,
      setFocusedSatellite,
      focusOnSatellite,
      clearFocus
    }}>
      {children}
    </SatelliteContext.Provider>
  );
};
```

### 1.2 Hook for Focus State

```typescript
// Custom hook for easier access to focus functionality
export const useSatelliteFocus = () => {
  const context = useContext(SatelliteContext);
  if (!context) {
    throw new Error('useSatelliteFocus must be used within SatelliteProvider');
  }
  
  return {
    focusedSatellite: context.focusedSatellite,
    focusOnSatellite: context.focusOnSatellite,
    clearFocus: context.clearFocus,
    isFocused: (satelliteId: string) => context.focusedSatellite?.id === satelliteId
  };
};
```

## Phase 2: UI Implementation

### 2.1 Satellite List Item Styling

```typescript
// Update SatelliteListItem component
interface SatelliteListItemProps {
  satellite: Satellite;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;  // NEW
  isFocused: boolean;             // NEW
}

const SatelliteListItem: React.FC<SatelliteListItemProps> = ({
  satellite,
  onToggleVisibility,
  onRemove,
  onFocus,
  isFocused
}) => {
  return (
    <div 
      className={`satellite-item ${isFocused ? 'focused' : ''}`}
      onClick={() => onFocus(satellite.id)}
      style={{ cursor: 'pointer' }}
    >
      <div className="satellite-info">
        <span 
          className="satellite-name"
          style={{ 
            color: isFocused ? '#ff8c00' : '#ffffff',  // Orange when focused
            fontWeight: isFocused ? 'bold' : 'normal'
          }}
        >
          {satellite.name}
        </span>
        <div className="satellite-controls">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent focus when clicking visibility
              onToggleVisibility(satellite.id);
            }}
            className={`visibility-btn ${satellite.isVisible ? 'visible' : 'hidden'}`}
          >
            {satellite.isVisible ? '👁️' : '🙈'}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent focus when clicking remove
              onRemove(satellite.id);
            }}
            className="remove-btn"
          >
            ❌
          </button>
        </div>
      </div>
      
      {/* Focus indicator */}
      {isFocused && (
        <div className="focus-indicator">
          🎯 FOCUSED
        </div>
      )}
    </div>
  );
};
```

### 2.2 CSS Styling for Focus Mode

```css
/* Add to satellite list styles */
.satellite-item {
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0;
}

.satellite-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.satellite-item.focused {
  background-color: rgba(255, 140, 0, 0.2);
  border: 2px solid #ff8c00;
}

.satellite-name {
  transition: color 0.2s ease;
}

.focus-indicator {
  font-size: 12px;
  color: #ff8c00;
  margin-top: 4px;
  font-weight: bold;
}
```

### 2.3 Updated Satellite List Container

```typescript
// Update SatelliteList component
const SatelliteList: React.FC = () => {
  const { satellites, toggleSatelliteVisibility, removeSatellite } = useSatelliteContext();
  const { focusOnSatellite, isFocused } = useSatelliteFocus();
  
  return (
    <div className="satellite-list">
      {satellites.map(satellite => (
        <SatelliteListItem
          key={satellite.id}
          satellite={satellite}
          onToggleVisibility={toggleSatelliteVisibility}
          onRemove={removeSatellite}
          onFocus={focusOnSatellite}
          isFocused={isFocused(satellite.id)}
        />
      ))}
    </div>
  );
};
```

## Phase 3: 3D Visualization Implementation

### 3.1 Shared Position Calculation Utility

**Reuse Existing Code**: Instead of creating new position calculation logic, we'll extract and enhance the existing `interpolatePosition` function from `TrajectoryMarker.tsx` into a shared utility.

```typescript
// Create new file: src/utils/satellitePositionUtils.ts
import * as THREE from 'three';

interface SatelliteTrajectoryPoint {
  longitude: number;
  latitude: number;
  mjd: number;
  cartesian?: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Find the two trajectory points that surround the current MJD time
 * and interpolate position between them.
 * 
 * This function is extracted from TrajectoryMarker.tsx to be reused
 * for focus mode calculations.
 */
export const interpolateSatellitePosition = (
  points: SatelliteTrajectoryPoint[], 
  currentMJD: number,
  viewScale: number = 1.0
): THREE.Vector3 | null => {
  // Filter points that have cartesian coordinates
  const validPoints = points.filter(point => point.cartesian);
  
  // Early return for edge cases
  if (!validPoints || validPoints.length === 0) return null;
  
  // If current time is before first point, return first point position
  if (currentMJD <= validPoints[0].mjd) {
    const p = validPoints[0];
    return new THREE.Vector3(
      p.cartesian!.x * viewScale,
      p.cartesian!.y * viewScale,
      p.cartesian!.z * viewScale
    );
  }
  
  // If current time is after last point, return last point position
  if (currentMJD >= validPoints[validPoints.length - 1].mjd) {
    const p = validPoints[validPoints.length - 1];
    return new THREE.Vector3(
      p.cartesian!.x * viewScale,
      p.cartesian!.y * viewScale,
      p.cartesian!.z * viewScale
    );
  }
  
  // Find the two points that surround the current time
  let beforeIndex = 0;
  for (let i = 0; i < validPoints.length - 1; i++) {
    if (validPoints[i].mjd <= currentMJD && validPoints[i + 1].mjd >= currentMJD) {
      beforeIndex = i;
      break;
    }
  }
  
  const beforePoint = validPoints[beforeIndex];
  const afterPoint = validPoints[beforeIndex + 1];
  
  // Calculate the interpolation factor (0 to 1)
  const timeDiff = afterPoint.mjd - beforePoint.mjd;
  const factor = timeDiff === 0 ? 0 : (currentMJD - beforePoint.mjd) / timeDiff;
  
  // Linear interpolation between the two points
  const x = beforePoint.cartesian!.x + factor * (afterPoint.cartesian!.x - beforePoint.cartesian!.x);
  const y = beforePoint.cartesian!.y + factor * (afterPoint.cartesian!.y - beforePoint.cartesian!.y);
  const z = beforePoint.cartesian!.z + factor * (afterPoint.cartesian!.z - beforePoint.cartesian!.z);
  
  // Return the interpolated position scaled to scene units
  return new THREE.Vector3(
    x * viewScale,
    y * viewScale,
    z * viewScale
  );
};

/**
 * Calculate the focus offset for centering a satellite in normal view.
 * Returns the negative position to offset all other objects.
 */
export const calculateFocusOffset = (
  satellite: Satellite | null,
  currentTime: number,
  isAlternateView: boolean,
  viewScale: number = 1.0
): THREE.Vector3 => {
  if (isAlternateView || !satellite?.trajectoryData) {
    return new THREE.Vector3(0, 0, 0);
  }
  
  const position = interpolateSatellitePosition(
    satellite.trajectoryData.points,
    currentTime,
    viewScale
  );
  
  if (!position) {
    return new THREE.Vector3(0, 0, 0);
  }
  
  // Return negative position to offset everything else
  return new THREE.Vector3(-position.x, -position.y, -position.z);
};
```

### 3.2 Update Existing TrajectoryMarker to Use Shared Utility

```typescript
// Update TrajectoryMarker.tsx to use the shared function
import { interpolateSatellitePosition } from '../../utils/satellitePositionUtils';

const TrajectoryMarker: React.FC<TrajectoryMarkerProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();
  
  // Calculate the interpolated position for each visible satellite
  const satelliteMarkers = useMemo(() => {
    const markers: Array<{
      position: THREE.Vector3;
      color: string;
      satelliteId: string;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Use shared utility function
        const position = interpolateSatellitePosition(
          satellite.trajectoryData.points, 
          currentTime, 
          viewScale
        );
        
        if (position) {
          markers.push({
            position,
            color: satellite.color,
            satelliteId: satellite.id
          });
        }
      }
    });
    
    return markers;
  }, [satellites, currentTime, isAlternateView]);
  
  // ... rest of component unchanged
};
```

### 3.3 Focus Mode Manager Using Shared Logic

```typescript
// Create new component: FocusModeManager.tsx
import { useSatelliteFocus } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import { calculateFocusOffset } from '../../utils/satellitePositionUtils';

interface FocusModeManagerProps {
  isAlternateView: boolean;
  onFocusOffsetChange: (offset: THREE.Vector3) => void;
}

const FocusModeManager: React.FC<FocusModeManagerProps> = ({ 
  isAlternateView, 
  onFocusOffsetChange 
}) => {
  const { focusedSatellite } = useSatelliteFocus();
  const { currentTime } = useTimeContext();
  
  // Calculate focus offset using existing interpolation logic
  const focusOffset = useMemo(() => {
    const viewScale = isAlternateView ? 0.5 : 1.0; // AV_DESCALE_FACTOR
    
    return calculateFocusOffset(
      focusedSatellite,
      currentTime,
      isAlternateView,
      viewScale
    );
  }, [focusedSatellite, currentTime, isAlternateView]);
  
  // Update parent component with current offset
  useEffect(() => {
    onFocusOffsetChange(focusOffset);
  }, [focusOffset, onFocusOffsetChange]);
  
  // This component manages the offset calculation but doesn't render anything
  return null;
};
```

### 3.4 Earth Position Offset System (Updated)

```typescript
// Update Earth.tsx to receive calculated offset
interface EarthProps {
  isAlternateView: boolean;
  focusOffset: THREE.Vector3;  // Receive calculated offset
}

const Earth: React.FC<EarthProps> = ({ isAlternateView, focusOffset }) => {
  const { scene } = useGLTF(model) as { scene: THREE.Group };
  const { focusedSatellite } = useSatelliteFocus();
  
  // Calculate Earth position based on focus mode
  const earthPosition = useMemo(() => {
    if (!isAlternateView && focusedSatellite) {
      // In focus mode: apply the calculated offset
      return [focusOffset.x, focusOffset.y, focusOffset.z];
    }
    return [0, 0, 0]; // Normal position
  }, [isAlternateView, focusedSatellite, focusOffset]);
  
  // ... rest of component unchanged
};
```

### 3.5 Trajectory Offset System (Simplified)

```typescript
// Update trajectory components to use shared offset calculation
// Example for TrajectoryPoints.tsx

const TrajectoryPoints: React.FC<TrajectoryPointsProps> = ({ 
  isAlternateView,
  focusOffset  // Receive calculated offset as prop
}) => {
  const { satellites } = useSatelliteContext();
  
  const allScaledPoints = useMemo(() => {
    const pointsWithSatelliteInfo: Array<{
      x: number;
      y: number;
      z: number;
      mjd: number;
      color: string;
      satelliteId: string;
      pointIndex: number;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        satellite.trajectoryData.points.forEach((point, index) => {
          // Only render points that have 3D cartesian coordinates
          if (point.cartesian) {
            pointsWithSatelliteInfo.push({
              // Apply view scale and focus offset (calculated externally)
              x: (point.cartesian.x * viewScale) + focusOffset.x,
              y: (point.cartesian.y * viewScale) + focusOffset.y,
              z: (point.cartesian.z * viewScale) + focusOffset.z,
              mjd: point.mjd,
              color: satellite.color,
              satelliteId: satellite.id,
              pointIndex: index
            });
          }
        });
      }
    });
    
    return pointsWithSatelliteInfo;
  }, [satellites, isAlternateView, focusOffset]);
  
  // ... rest of component unchanged
};
```

## Phase 4: Integration and Coordination

### 4.1 Updated EarthView Integration (Cleaner Approach)

```typescript
// Update EarthView.tsx to use the FocusModeManager for offset calculation
const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);
  const [focusOffset, setFocusOffset] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  // Callback to receive focus offset from FocusModeManager
  const handleFocusOffsetChange = useCallback((offset: THREE.Vector3) => {
    setFocusOffset(offset);
  }, []);
  
  return (
    <div className="earth-view-container">
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        
        <CameraManager setIsAlternateView={setIsZoomedOutView} />
        
        {/* Focus mode manager calculates offset for all components */}
        <FocusModeManager 
          isAlternateView={isZoomedOutView}
          onFocusOffsetChange={handleFocusOffsetChange}
        />
        
        {/* Pass calculated offset to all components that need it */}
        <Earth 
          isAlternateView={isZoomedOutView} 
          focusOffset={focusOffset}
        />
        
        {/* Regular satellite component (hidden in focus mode) */}
        <Satellite isAlternateView={isZoomedOutView} />
        
        {/* Focused satellite renderer (only in normal view) */}
        <FocusedSatelliteRenderer isAlternateView={isZoomedOutView} />
        
        <AlternateViewObjects isAlternateView={isZoomedOutView} />
        <AlternateViewTrajectory isAlternateView={isZoomedOutView} />
        
        <TestRuler 
          isAlternateView={isZoomedOutView}
          focusOffset={focusOffset}  // Ruler also needs offset
        />
        
        {/* Trajectory components with focus offset support */}
        {isZoomedOutView && (
          <>
            <TrajectoryPoints 
              isAlternateView={isZoomedOutView}
              focusOffset={focusOffset}
            />
            <TrajectoryLines 
              isAlternateView={isZoomedOutView}
              focusOffset={focusOffset}
            />
            <TrajectoryMarker 
              isAlternateView={isZoomedOutView}
              focusOffset={focusOffset}
            />
          </>
        )}
        
        <OrbitControls />
      </Canvas>
      
      {/* Focus mode indicator UI */}
      <FocusModeIndicator />
      <TimeSlider />
    </div>
  );
};
```

### 4.2 Refactoring Benefits

**Code Reuse**: 
- ✅ Existing `interpolatePosition` logic extracted to shared utility
- ✅ No duplication of position calculation code
- ✅ Consistent behavior across all components using satellite positions

**Separation of Concerns**:
- ✅ `FocusModeManager` calculates offset once
- ✅ Components receive offset as prop instead of calculating independently
- ✅ Cleaner component interfaces and easier testing

**Performance Optimization**:
- ✅ Single position calculation per frame instead of multiple
- ✅ Shared utility allows for optimization without breaking existing code
- ✅ Easier to add caching/memoization in the future

### 4.3 Migration Strategy

1. **Extract Utility First**: Create `satellitePositionUtils.ts` with existing logic
2. **Update TrajectoryMarker**: Migrate to use shared utility (test that it still works)
3. **Add Focus Calculations**: Add `calculateFocusOffset` function
4. **Implement FocusModeManager**: Create centralized offset calculation
5. **Update Components**: Modify Earth, trajectories to receive offset as prop
6. **Test Integration**: Ensure all components work together correctly

This approach leverages our existing, tested position interpolation code while creating a clean architecture for the focus mode feature.

### 4.2 Focus Mode Indicator UI

```typescript
// Create FocusModeIndicator.tsx
const FocusModeIndicator: React.FC = () => {
  const { focusedSatellite, clearFocus } = useSatelliteFocus();
  
  if (!focusedSatellite) {
    return null;
  }
  
  return (
    <div className="focus-mode-indicator">
      <div className="focus-info">
        🎯 Focused on: <strong>{focusedSatellite.name}</strong>
      </div>
      <button 
        onClick={clearFocus}
        className="clear-focus-btn"
      >
        Clear Focus
      </button>
    </div>
  );
};
```

## Phase 5: Future Enhancements

### 5.1 GLB Model Loading
- Replace placeholder box geometry with actual satellite GLB models
- Implement model caching and loading states
- Add model rotation to match satellite orientation

### 5.2 Camera Controls in Focus Mode
- Implement smoother camera transitions when entering/exiting focus mode
- Add orbital camera controls around the focused satellite
- Implement zoom limits and collision detection

### 5.3 Advanced Focus Features
- Double-click to enter focus mode
- Keyboard shortcuts (ESC to clear focus)
- Focus mode persistence across view switches
- Animation transitions when switching focus

## Implementation Timeline

1. **Week 1**: Context and state management (Phase 1)
2. **Week 2**: UI implementation and styling (Phase 2)
3. **Week 3**: 3D visualization and offset system (Phase 3)
4. **Week 4**: Integration and testing (Phase 4)
5. **Week 5**: Enhancements and polish (Phase 5)

## Testing Strategy

### Unit Tests
- Context state management
- Focus state transitions
- Position calculations

### Integration Tests
- UI interaction flows
- 3D scene updates
- Coordinate transformations

### User Testing
- Click interaction responsiveness
- Visual feedback clarity
- Performance with multiple satellites

## Risk Assessment

### Technical Risks
- **Performance**: Recalculating offsets on every frame
  - *Mitigation*: Use useMemo and useCallback extensively
- **Precision**: Floating-point errors in position calculations
  - *Mitigation*: Use appropriate precision thresholds
- **Memory**: Multiple position calculations
  - *Mitigation*: Optimize calculation frequency

### UX Risks
- **Confusion**: Users not understanding focus mode
  - *Mitigation*: Clear visual indicators and help text
- **Performance**: Sluggish interactions with many satellites
  - *Mitigation*: Optimize rendering and state updates

## Success Metrics

- ✅ Single satellite can be selected by clicking
- ✅ Visual feedback shows focused satellite clearly
- ✅ Earth and trajectories offset correctly in focus mode
- ✅ Smooth transitions between normal and focus modes
- ✅ No performance degradation with up to 10 satellites
- ✅ Focus state persists during time slider interactions 