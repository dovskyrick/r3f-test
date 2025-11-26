# Future Trajectory Preview Implementation Plan

## Mission Understanding

Replace the current **full orbit visualization** with a **future trajectory preview** that shows only the **next 10-15 segments** of each satellite's trajectory after its current position. This creates a cleaner, more focused visualization that shows "where satellites are going" rather than overwhelming the screen with complete orbital paths.

## Benefits

### **🎯 User Experience:**
- **Cleaner visualization** - No orbital clutter overwhelming the screen
- **Forward-looking perspective** - Shows where satellites are heading
- **Better focus mode experience** - Less visual noise when examining focused satellite
- **Performance improvement** - Fewer line segments to render

### **📊 Technical Benefits:**
- **Reduced rendering load** - 10-15 points vs hundreds of points per satellite
- **Dynamic trajectory** - Updates as time progresses
- **Contextual information** - Shows immediate future path only

## Architecture Analysis

### **Current Implementation:**
```typescript
// TrajectoryLines.tsx - Current approach
const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
const linePoints = validPoints.map(point => {
  // Transform ALL trajectory points
  return transformedPosition;
});
```

### **New Implementation Approach:**
```typescript
// TrajectoryLines.tsx - Future approach  
const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
const futurePoints = getFutureTrajectorySegments(validPoints, currentTime, segmentCount);
const linePoints = futurePoints.map(point => {
  // Transform only FUTURE trajectory points
  return transformedPosition;
});
```

## Files to Create

### 1. **utils/trajectoryUtils.ts** (New)
**Purpose**: Utility functions for trajectory segment filtering and time-based calculations

**Code**:
```typescript
import { SatelliteTrajectoryPoint } from './satelliteUtils';

/**
 * Configuration for future trajectory preview
 */
export interface FutureTrajectoryConfig {
  segmentCount: number;        // Number of future segments to show (10-15)
  smoothing: boolean;          // Whether to interpolate between segments
  fadeEffect: boolean;         // Whether to fade segments into the future
}

/**
 * Default configuration for future trajectory preview
 */
export const DEFAULT_FUTURE_CONFIG: FutureTrajectoryConfig = {
  segmentCount: 12,            // 12 segments ahead
  smoothing: true,             // Smooth interpolation
  fadeEffect: true             // Fade effect for distant segments
};

/**
 * Find the current trajectory position index for given time
 */
export const findCurrentTrajectoryIndex = (
  points: SatelliteTrajectoryPoint[], 
  currentMJD: number
): number => {
  if (!points || points.length === 0) return -1;
  
  // If current time is before first point
  if (currentMJD <= points[0].mjd) return 0;
  
  // If current time is after last point  
  if (currentMJD >= points[points.length - 1].mjd) return points.length - 1;
  
  // Find the index where current time falls between two points
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].mjd <= currentMJD && points[i + 1].mjd >= currentMJD) {
      return i; // Return the "before" index
    }
  }
  
  return -1;
};

/**
 * Extract future trajectory segments from current time forward
 */
export const getFutureTrajectorySegments = (
  points: SatelliteTrajectoryPoint[],
  currentMJD: number,
  config: FutureTrajectoryConfig = DEFAULT_FUTURE_CONFIG
): SatelliteTrajectoryPoint[] => {
  if (!points || points.length === 0) return [];
  
  const currentIndex = findCurrentTrajectoryIndex(points, currentMJD);
  if (currentIndex === -1) return [];
  
  // Calculate end index for future segments
  const startIndex = currentIndex;
  const endIndex = Math.min(startIndex + config.segmentCount + 1, points.length);
  
  // Extract future segments
  const futureSegments = points.slice(startIndex, endIndex);
  
  // If smoothing is enabled and we have enough points, add interpolated current position
  if (config.smoothing && futureSegments.length > 1 && currentIndex < points.length - 1) {
    // Calculate interpolated current position
    const beforePoint = points[currentIndex];
    const afterPoint = points[currentIndex + 1];
    const timeDiff = afterPoint.mjd - beforePoint.mjd;
    const factor = timeDiff === 0 ? 0 : (currentMJD - beforePoint.mjd) / timeDiff;
    
    // Create interpolated point at current time
    const interpolatedPoint: SatelliteTrajectoryPoint = {
      longitude: beforePoint.longitude + factor * (afterPoint.longitude - beforePoint.longitude),
      latitude: beforePoint.latitude + factor * (afterPoint.latitude - beforePoint.latitude),
      mjd: currentMJD,
      cartesian: beforePoint.cartesian && afterPoint.cartesian ? {
        x: beforePoint.cartesian.x + factor * (afterPoint.cartesian.x - beforePoint.cartesian.x),
        y: beforePoint.cartesian.y + factor * (afterPoint.cartesian.y - beforePoint.cartesian.y),
        z: beforePoint.cartesian.z + factor * (afterPoint.cartesian.z - beforePoint.cartesian.z)
      } : undefined
    };
    
    // Replace first point with interpolated current position
    futureSegments[0] = interpolatedPoint;
  }
  
  return futureSegments;
};

/**
 * Calculate opacity for trajectory segment based on distance into future
 */
export const calculateSegmentOpacity = (
  segmentIndex: number,
  totalSegments: number,
  config: FutureTrajectoryConfig
): number => {
  if (!config.fadeEffect) return 0.7; // Default opacity
  
  // Linear fade from 1.0 (current) to 0.3 (distant future)
  const fadeRatio = 1 - (segmentIndex / totalSegments);
  return 0.3 + (fadeRatio * 0.7); // Range: 0.3 to 1.0
};
```

### 2. **hooks/useFutureTrajectory.ts** (New)
**Purpose**: Custom hook for managing future trajectory preview logic

**Code**:
```typescript
import { useMemo, useCallback } from 'react';
import { useTimeContext } from '../contexts/TimeContext';
import { 
  getFutureTrajectorySegments, 
  FutureTrajectoryConfig, 
  DEFAULT_FUTURE_CONFIG,
  calculateSegmentOpacity 
} from '../utils/trajectoryUtils';
import { SatelliteTrajectoryPoint } from '../utils/satelliteUtils';
import * as THREE from 'three';

interface FutureTrajectoryResult {
  futurePoints: SatelliteTrajectoryPoint[];
  segmentOpacities: number[];
  isInRange: boolean;
}

interface UseFutureTrajectoryProps {
  trajectoryPoints: SatelliteTrajectoryPoint[];
  config?: FutureTrajectoryConfig;
}

export const useFutureTrajectory = ({
  trajectoryPoints,
  config = DEFAULT_FUTURE_CONFIG
}: UseFutureTrajectoryProps): FutureTrajectoryResult => {
  const { currentTime } = useTimeContext();
  
  // Calculate future trajectory segments
  const futureTrajectoryData = useMemo(() => {
    const futurePoints = getFutureTrajectorySegments(trajectoryPoints, currentTime, config);
    
    // Calculate opacity for each segment
    const segmentOpacities = futurePoints.map((_, index) => 
      calculateSegmentOpacity(index, futurePoints.length, config)
    );
    
    // Determine if satellite is within trajectory time range
    const isInRange = trajectoryPoints.length > 0 && 
      currentTime >= trajectoryPoints[0].mjd && 
      currentTime <= trajectoryPoints[trajectoryPoints.length - 1].mjd;
    
    return {
      futurePoints,
      segmentOpacities, 
      isInRange
    };
  }, [trajectoryPoints, currentTime, config]);
  
  return futureTrajectoryData;
};
```

## Files to Modify

### 3. **components/3D/TrajectoryLines.tsx** (Major Modification)
**Purpose**: Replace full trajectory rendering with future trajectory preview

**Changes**:
```typescript
import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';
import { useFutureTrajectory } from '../../hooks/useFutureTrajectory';
import { DEFAULT_FUTURE_CONFIG } from '../../utils/trajectoryUtils';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryLinesProps {
  isAlternateView: boolean;
  futureSegmentCount?: number; // Optional override for segment count
}

const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ 
  isAlternateView,
  futureSegmentCount = DEFAULT_FUTURE_CONFIG.segmentCount 
}) => {
  const { satellites } = useSatelliteContext();
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();
  
  // Create future trajectory lines for each visible satellite
  const satelliteLines = useMemo(() => {
    const lines: Array<{
      points: THREE.Vector3[];
      color: string;
      satelliteId: string;
      opacity: number;
      segmentOpacities: number[];
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Filter points that have 3D cartesian coordinates
        const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
        
        // Use future trajectory hook to get only upcoming segments
        const { futurePoints, segmentOpacities, isInRange } = useFutureTrajectory({
          trajectoryPoints: validPoints,
          config: {
            ...DEFAULT_FUTURE_CONFIG,
            segmentCount: futureSegmentCount
          }
        });
        
        if (futurePoints.length > 1 && isInRange) { // Need at least 2 points to draw a line
          const linePoints = futurePoints.map(point => {
            // Calculate real position for this trajectory point
            const realPosition = new THREE.Vector3(
              point.cartesian!.x * viewScale,
              point.cartesian!.y * viewScale,
              point.cartesian!.z * viewScale
            );
            
            // Apply focus mode positioning (only in normal view)
            if (isAlternateView || !isInFocusMode) {
              return realPosition; // Normal behavior - use real position
            } else {
              // Focus mode - transform trajectory points relative to focused satellite
              const apparent = getApparentPosition(
                { x: realPosition.x, y: realPosition.y, z: realPosition.z },
                undefined // No objectId - treat as generic object
              );
              return new THREE.Vector3(apparent.x, apparent.y, apparent.z);
            }
          });
          
          lines.push({
            points: linePoints,
            color: satellite.color,
            satelliteId: satellite.id,
            opacity: isInRange ? 0.8 : 0.3, // Dimmed if outside time range
            segmentOpacities
          });
        }
      }
    });
    
    // DEBUG: Log future trajectory processing
    console.log('[TrajectoryLines] Future trajectory lines calculated:', {
      lineCount: lines.length,
      isAlternateView,
      isInFocusMode,
      futureSegmentCount,
      satellites: satellites.map(s => ({ 
        id: s.id, 
        isVisible: s.isVisible, 
        pointCount: s.trajectoryData?.points.length || 0 
      }))
    });

    return lines;
  }, [satellites, isAlternateView, getApparentPosition, isInFocusMode, futureSegmentCount]);
  
  return (
    <group>
      {satelliteLines.map((line) => (
        <Line
          key={`future-trajectory-line-${line.satelliteId}`}
          points={line.points}
          color={line.color}
          lineWidth={2} // Slightly thicker for better visibility
          dashed={false}
          transparent={true}
          opacity={line.opacity}
        />
      ))}
    </group>
  );
};

export default TrajectoryLines;
```

### 4. **pages/EarthView/EarthView.tsx** (Minor Modification)
**Purpose**: Add configuration option for future trajectory segment count

**Changes**:
```typescript
// Add optional prop for trajectory configuration
const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);
  const [futureSegmentCount, setFutureSegmentCount] = useState(12); // Configurable
  
  // ... existing code ...
  
  return (
    <div className="earth-view-container">
      <Canvas camera={{ position: [20, 20, 20] }}>
        {/* ... existing components ... */}
        
        {/* Satellite trajectory components - show in BOTH views */}
        <TrajectoryMarker isAlternateView={isZoomedOutView} />
        <TrajectoryLines 
          isAlternateView={isZoomedOutView} 
          futureSegmentCount={futureSegmentCount} // Pass configuration
        />
        
        {/* ... existing components ... */}
      </Canvas>
      <TimeSlider />
    </div>
  );
};
```

## Implementation Strategy

### **Phase 1: Create Utility Functions** 🔧 FOUNDATION
1. Create `utils/trajectoryUtils.ts` with segment filtering logic
2. Implement `findCurrentTrajectoryIndex()` function
3. Implement `getFutureTrajectorySegments()` function
4. Add opacity calculation for fade effects
5. **Test utility functions** with console logging

### **Phase 2: Create Future Trajectory Hook** 🪝 LOGIC LAYER
1. Create `hooks/useFutureTrajectory.ts` 
2. Integrate with `useTimeContext` for current time
3. Use trajectory utilities for segment calculation
4. **Test hook** with sample trajectory data

### **Phase 3: Integrate with TrajectoryLines** 📈 VISUAL IMPLEMENTATION
1. **Import** new trajectory utilities and hook
2. **Replace** full trajectory processing with future segment processing
3. **Maintain** existing focus mode logic
4. **Add** fade effect support for distant segments
5. **Test** visual results with multiple satellites

### **Phase 4: Configuration and Polish** ⚙️ USER CONTROL
1. **Add** configuration props to EarthView
2. **Test** different segment counts (10, 12, 15)
3. **Optimize** performance with fewer rendered segments
4. **Polish** visual effects (opacity, line width)

## Expected Behavior

### **Current Time Tracking:**
- **Dynamic start point**: Trajectory always starts from satellite's current position
- **Future segments**: Shows next 10-15 trajectory points ahead
- **Smooth updates**: As time progresses, trajectory "moves forward"

### **Visual Results:**
- **Clean visualization**: No overwhelming orbital clutter
- **Forward-looking**: Shows "where satellite is going"
- **Focus mode compatible**: Works with satellite-centered view
- **Performance improvement**: ~90% fewer line segments rendered

### **Example Timeline:**
```
Current Time: 12:30
Trajectory shown: 12:30 → 12:35 (next 12 segments)

Current Time: 12:31  
Trajectory shown: 12:31 → 12:36 (next 12 segments)
```

## Performance Benefits

### **Rendering Optimization:**
- **Before**: 100+ points per satellite × 5 satellites = 500+ line segments
- **After**: 12 points per satellite × 5 satellites = 60 line segments
- **Performance gain**: ~90% reduction in line rendering

### **Memory Benefits:**
- **Reduced point calculations** for focus mode transformations
- **Fewer Three.js Vector3 objects** created per frame
- **Less complex line geometry** for Three.js to process

## User Experience

### **Cleaner Interface:**
- **No orbital spaghetti** - Only relevant future paths shown
- **Better focus mode** - Less visual distraction when examining focused satellite
- **Easier tracking** - Can see where each satellite is heading

### **Dynamic Visualization:**
- **Moving trajectory** - Path updates as time progresses
- **Contextual information** - Always shows relevant upcoming path
- **Smooth time slider** - Trajectory smoothly advances with time changes

This implementation provides a much cleaner, more focused trajectory visualization that emphasizes "where satellites are going" rather than "where they've been", significantly improving both performance and user experience. 