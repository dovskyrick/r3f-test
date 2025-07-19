# Focus Mode Step 2: 3D Positioning Implementation Plan

## Mission Understanding

Implement a positioning system where in **normal 3D view** (not alternate view):
- All 3D objects get **apparent positions** = real position - focused satellite position
- **Focused satellite becomes the center** (appears at 0,0,0)
- **All other objects orbit around** the focused satellite
- **Real positions remain unchanged** for recalculation purposes
- **Only apparent positions** are rendered in normal view
- **Time slider updates** trigger position recalculations

## Architecture Overview

```
Time Slider Change
    ↓
Calculate Current Positions (at current time) [REUSE EXISTING LOGIC]
    ↓
Get Focused Satellite Position (if any) [REUSE interpolatePosition from TrajectoryMarker]
    ↓
Calculate Apparent Positions = Real Position - Focused Position
    ↓
Update 3D Component Positions
```

## Data Flow Strategy

### **Position Calculation Logic:**
```typescript
// For each 3D object at current time:
if (focusedSatelliteId) {
  const focusedPosition = getFocusedSatellitePosition(currentTime);
  const apparentPosition = realPosition - focusedPosition;
  render(apparentPosition);
} else {
  render(realPosition); // Normal behavior when no focus
}
```

## Files to Create

### 1. **utils/satelliteUtils.ts** (New)
**Purpose**: Shared utility functions for satellite position calculations

**Code**:
```typescript
import * as THREE from 'three';

// Define trajectory point type for satellites
export interface SatelliteTrajectoryPoint {
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
 * and interpolate position between them
 * 
 * EXTRACTED from TrajectoryMarker.tsx to avoid code duplication
 */
export const interpolatePosition = (
  points: SatelliteTrajectoryPoint[], 
  currentMJD: number,
  viewScale: number
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
```

### 2. **hooks/useFocusPositioning.ts** (New)
**Purpose**: Custom hook to manage focus-based positioning calculations

**Code**:
```typescript
import { useCallback } from 'react';
import { useSatelliteContext } from '../contexts/SatelliteContext';
import { useTimeContext } from '../contexts/TimeContext';
import { interpolatePosition } from '../utils/satelliteUtils'; // IMPORT from shared utility

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface FocusPositioning {
  getApparentPosition: (realPosition: Position3D, objectId?: string) => Position3D;
  getFocusedSatellitePosition: () => Position3D | null;
  isInFocusMode: boolean;
}

export const useFocusPositioning = (): FocusPositioning => {
  const { focusedSatelliteId, satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();

  // REUSE existing position calculation - no new computation needed!
  const getFocusedSatellitePosition = useCallback((): Position3D | null => {
    if (!focusedSatelliteId) return null;
    
    const focusedSatellite = satellites.find(sat => sat.id === focusedSatelliteId);
    if (!focusedSatellite || !focusedSatellite.trajectoryData) return null;

    // IMPORT and use the same interpolation logic from TrajectoryMarker.tsx
    const position = interpolatePosition(focusedSatellite.trajectoryData.points, currentTime, 1.0);
    if (!position) return null;

    return {
      x: position.x,
      y: position.y,
      z: position.z
    };
  }, [focusedSatelliteId, satellites, currentTime]);

  // Calculate apparent position for any object
  const getApparentPosition = useCallback((realPosition: Position3D, objectId?: string): Position3D => {
    // If this is the focused satellite itself, place it at center
    if (objectId === focusedSatelliteId) {
      return { x: 0, y: 0, z: 0 };
    }

    const focusCenter = getFocusedSatellitePosition();
    if (!focusCenter) {
      return realPosition; // No focus mode, return real position
    }

    // Calculate apparent position = real position - focus center
    return {
      x: realPosition.x - focusCenter.x,
      y: realPosition.y - focusCenter.y,
      z: realPosition.z - focusCenter.z
    };
  }, [focusedSatelliteId, getFocusedSatellitePosition]);

  return {
    getApparentPosition,
    getFocusedSatellitePosition,
    isInFocusMode: !!focusedSatelliteId
  };
};
```

## Files to Modify

### 3. **components/3D/TrajectoryMarker.tsx** (Modify)
**Purpose**: Update to use shared interpolation function

**Changes**:
```typescript
// REPLACE the local interpolatePosition function with import
import { interpolatePosition, SatelliteTrajectoryPoint } from '../../utils/satelliteUtils';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

// REMOVE the local interpolatePosition function and SatelliteTrajectoryPoint interface
// REMOVE lines 8-85 (the duplicated function and interface)

const TrajectoryMarker: React.FC<TrajectoryMarkerProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();

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
        // USE shared interpolation function - no changes to logic!
        const realPosition = interpolatePosition(satellite.trajectoryData.points, currentTime, viewScale);
        if (realPosition) {
          // Apply focus mode positioning (only in normal view)
          const apparentPosition = isAlternateView || !isInFocusMode
            ? realPosition // Normal behavior
            : (() => {
                const apparent = getApparentPosition(
                  { x: realPosition.x, y: realPosition.y, z: realPosition.z }, 
                  satellite.id
                );
                return new THREE.Vector3(apparent.x, apparent.y, apparent.z);
              })();

          markers.push({
            position: apparentPosition,
            color: satellite.color,
            satelliteId: satellite.id
          });
        }
      }
    });
    
    return markers;
  }, [satellites, currentTime, isAlternateView, getApparentPosition, isInFocusMode]);

  // Keep existing return statement unchanged...
};
```

### 4. **components/3D/Earth.tsx** (Modify)
**Purpose**: Position Earth relative to focused satellite

**Changes**:
```typescript
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();

  // Calculate Earth's apparent position (only in normal view)
  const earthPosition = isAlternateView || !isInFocusMode 
    ? [0, 0, 0] // Normal position
    : getApparentPosition({ x: 0, y: 0, z: 0 }); // Apparent position

  return (
    <primitive 
      object={scene} 
      position={[earthPosition.x, earthPosition.y, earthPosition.z]}
      scale={isAlternateView ? DESCALE_FACTOR : 1} 
    />
  );
};
```

### 5. **components/3D/TrajectoryLines.tsx** (Modify - IF EXISTS)
**Purpose**: Position trajectory lines relative to focused satellite

**Changes**: (Only if this component exists)
```typescript
import { interpolatePosition } from '../../utils/satelliteUtils'; // IMPORT shared function
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

// Apply apparent positioning to trajectory line points
// USE shared interpolation function for consistency
```

### 6. **components/3D/TestRuler.tsx** (Modify)
**Purpose**: Position test ruler relative to focused satellite

**Changes**:
```typescript
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

const TestRuler: React.FC<TestRulerProps> = ({ isAlternateView }) => {
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();

  // Fixed ruler position in world coordinates (keep existing logic)
  const realRulerPosition = { x: 0, y: 0, z: 0 }; // Ruler at origin

  const apparentPosition = isAlternateView || !isInFocusMode
    ? realRulerPosition
    : getApparentPosition(realRulerPosition);

  return (
    <group position={[apparentPosition.x, apparentPosition.y, apparentPosition.z]}>
      {/* Keep ALL existing ruler geometry unchanged */}
    </group>
  );
};
```

## Implementation Strategy

### **Phase 1: Extract Shared Utility** 🔧 REFACTOR FIRST
1. Create `utils/satelliteUtils.ts` with **extracted** interpolation logic
2. **Move** `interpolatePosition` from `TrajectoryMarker.tsx` to shared utility
3. **Update** `TrajectoryMarker.tsx` to import from shared utility
4. **Test** that existing functionality works unchanged

### **Phase 2: Create Position Hook** ✨ IMPORT SHARED LOGIC  
1. Create `useFocusPositioning.ts` **importing** shared interpolation function
2. **No duplicate code** - leverage existing optimized logic
3. Test hook with console logging

### **Phase 3: Integrate Earth Positioning** 🌍 MINIMAL CHANGE
1. Modify `Earth.tsx` - **only change position prop**
2. Test Earth movement when satellite is focused
3. **Keep all existing Earth rendering logic**

### **Phase 4: Test Incrementally** 🧪 SAFETY FIRST
1. Test each component individually
2. Verify no performance degradation
3. **Ensure existing functionality unchanged when no focus**

## Key Design Principles

### **DRY (Don't Repeat Yourself)** 🚀
- **Single source of truth**: `interpolatePosition` in `utils/satelliteUtils.ts`
- **Shared interface**: `SatelliteTrajectoryPoint` exported from utility
- **Zero code duplication**: All components import from same utility

### **ZERO Duplicate Computation** 🚀
- **Reuse existing**: `interpolatePosition` from shared utility
- **No new calculations**: Position interpolation already optimized
- **Performance maintained**: Same computation, just transformed for focus mode

### **Real vs Apparent Position Separation**
- **Real positions**: Calculated by shared `interpolatePosition` function
- **Apparent positions**: Simple subtraction transformation for focus mode
- **Clean separation**: Easy to switch between focus and normal modes

### **Minimal Code Changes**
- **Existing logic preserved**: All current position calculations unchanged
- **Refactor first**: Extract shared utility before adding new features
- **Backward compatible**: Normal mode behavior completely unchanged 