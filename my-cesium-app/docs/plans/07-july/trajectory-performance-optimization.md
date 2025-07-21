# Trajectory Performance Optimization: Calculation Strategies Analysis

## Mission Understanding

Analyze the **computational efficiency** of trajectory segment calculations, particularly focusing on:
- **Continuous segment exposure** as time progresses
- **Redundant calculations** when slider moves
- **Caching strategies** for computed segments
- **Optimal calculation windows** (past/present/future segments)
- **Alternate view scaling** optimization

## Current Implementation Analysis

### **Naive Approach (Future Trajectory Plan):**

```typescript
// TrajectoryLines.tsx - Current planned approach
const TrajectoryLines = ({ isAlternateView }) => {
  const { currentTime } = useTimeContext();
  
  const satelliteLines = useMemo(() => {
    satellites.forEach(satellite => {
      // PROBLEM: Recalculates EVERYTHING on every time change
      const { futurePoints } = useFutureTrajectory({
        trajectoryPoints: validPoints,
        config: { segmentCount: 12 }
      });
      
      // PROBLEM: Transforms all 12 points every time
      const linePoints = futurePoints.map(point => {
        const realPosition = new THREE.Vector3(/*...*/);
        
        // EXPENSIVE: Focus positioning for all 12 points
        const apparent = getApparentPosition(realPosition, undefined);
        return new THREE.Vector3(apparent.x, apparent.y, apparent.z);
      });
    });
  }, [satellites, currentTime, isAlternateView]); // Recalculates on EVERY time change!
};
```

### **Performance Issues Identified:**

#### **1. Time Slider Movement Problem:**
```
Time: 12:30 → Calculate segments 0-12
Time: 12:31 → Calculate segments 1-13 (11 points overlap!)
Time: 12:32 → Calculate segments 2-14 (10 points overlap!)
```
**Issue**: 90%+ of calculations are redundant between time steps.

#### **2. Focus Mode Redundancy:**
```typescript
// Every time slider move triggers:
getFocusedSatellitePosition(); // Called 12 times
// Same focused satellite position, but recalculated 12 times!

getApparentPosition(point1, undefined); // Focused position - point1  
getApparentPosition(point2, undefined); // Same focused position - point2
getApparentPosition(point3, undefined); // Same focused position - point3
// ... 12 times with same focused position!
```

#### **3. Alternate View Scaling:**
```typescript
// Alternate view still needs calculations:
if (isAlternateView) {
  const viewScale = AV_DESCALE_FACTOR; // 0.5
  // Still transforms 12 points, just with different scale
  const scaledPosition = new THREE.Vector3(
    point.cartesian!.x * viewScale,  // 12 calculations
    point.cartesian!.y * viewScale,  // 12 calculations  
    point.cartesian!.z * viewScale   // 12 calculations
  );
}
```
**Note**: Alternate view still requires scaling calculations, just simpler ones.

## Optimization Strategies

### **Strategy 1: Simple Caching (Baseline Improvement)**

```typescript
// hooks/useFutureTrajectory.ts - With basic caching
export const useFutureTrajectory = ({ trajectoryPoints, config }) => {
  const { currentTime } = useTimeContext();
  const { getFocusedSatellitePosition } = useFocusPositioning();
  
  // Cache focused satellite position (calculate once per frame)
  const focusedPosition = useMemo(() => {
    return getFocusedSatellitePosition();
  }, [getFocusedSatellitePosition]);
  
  const futureTrajectoryData = useMemo(() => {
    const futurePoints = getFutureTrajectorySegments(trajectoryPoints, currentTime, config);
    
    // Transform points with cached focused position
    const transformedPoints = futurePoints.map(point => {
      const realPosition = {
        x: point.cartesian!.x,
        y: point.cartesian!.y, 
        z: point.cartesian!.z
      };
      
      // Use cached focused position instead of recalculating
      if (focusedPosition) {
        return {
          x: realPosition.x - focusedPosition.x,
          y: realPosition.y - focusedPosition.y,
          z: realPosition.z - focusedPosition.z
        };
      }
      return realPosition;
    });
    
    return { transformedPoints, isInRange: true };
  }, [trajectoryPoints, currentTime, config, focusedPosition]);
  
  return futureTrajectoryData;
};
```

**Improvement**: Calculates focused position once per frame instead of 12 times.

### **Strategy 2: Sliding Window Caching (Better)**

```typescript
// utils/trajectoryCache.ts - Sliding window approach
interface CachedSegment {
  startIndex: number;
  endIndex: number;
  realPositions: THREE.Vector3[];
  apparentPositions: THREE.Vector3[];
  lastFocusedPosition: Position3D | null;
  isValid: boolean;
}

class TrajectorySegmentCache {
  private cache = new Map<string, CachedSegment>(); // satelliteId -> cached segments
  private windowSize = 36; // 12 past + 12 present + 12 future
  private segmentSize = 12;
  
  getSegments(
    satelliteId: string,
    trajectoryPoints: SatelliteTrajectoryPoint[],
    currentTime: number,
    focusedPosition: Position3D | null,
    viewScale: number
  ): THREE.Vector3[] {
    const currentIndex = findCurrentTrajectoryIndex(trajectoryPoints, currentTime);
    const windowStart = Math.max(0, currentIndex - this.segmentSize);
    const windowEnd = Math.min(trajectoryPoints.length, currentIndex + this.windowSize);
    
    const cached = this.cache.get(satelliteId);
    
    // Check if cached window is still valid
    if (cached && this.isWindowValid(cached, windowStart, windowEnd, focusedPosition)) {
      // Extract current future segments from cached window
      const futureStart = currentIndex - windowStart;
      const futureEnd = Math.min(futureStart + this.segmentSize, cached.realPositions.length);
      
      return cached.apparentPositions.slice(futureStart, futureEnd);
    }
    
    // Recalculate entire window
    const windowSegment = this.calculateWindow(
      trajectoryPoints.slice(windowStart, windowEnd),
      focusedPosition,
      viewScale
    );
    
    // Cache the window
    this.cache.set(satelliteId, {
      startIndex: windowStart,
      endIndex: windowEnd,
      realPositions: windowSegment.real,
      apparentPositions: windowSegment.apparent,
      lastFocusedPosition: focusedPosition,
      isValid: true
    });
    
    // Return current future segments
    const futureStart = currentIndex - windowStart;
    const futureEnd = Math.min(futureStart + this.segmentSize, windowSegment.apparent.length);
    return windowSegment.apparent.slice(futureStart, futureEnd);
  }
  
  private isWindowValid(
    cached: CachedSegment,
    newStart: number,
    newEnd: number,
    currentFocusedPosition: Position3D | null
  ): boolean {
    // Window is valid if:
    // 1. New window fits within cached window
    // 2. Focused position hasn't changed
    return (
      newStart >= cached.startIndex &&
      newEnd <= cached.endIndex &&
      this.focusedPositionEquals(cached.lastFocusedPosition, currentFocusedPosition)
    );
  }
  
  private calculateWindow(
    windowPoints: SatelliteTrajectoryPoint[],
    focusedPosition: Position3D | null,
    viewScale: number
  ): { real: THREE.Vector3[], apparent: THREE.Vector3[] } {
    const real: THREE.Vector3[] = [];
    const apparent: THREE.Vector3[] = [];
    
    windowPoints.forEach(point => {
      // Calculate real position
      const realPos = new THREE.Vector3(
        point.cartesian!.x * viewScale,
        point.cartesian!.y * viewScale,
        point.cartesian!.z * viewScale
      );
      real.push(realPos);
      
      // Calculate apparent position
      if (focusedPosition) {
        const apparentPos = new THREE.Vector3(
          realPos.x - focusedPosition.x,
          realPos.y - focusedPosition.y,
          realPos.z - focusedPosition.z
        );
        apparent.push(apparentPos);
      } else {
        apparent.push(realPos.clone());
      }
    });
    
    return { real, apparent };
  }
}
```

**Improvement**: 
- Calculates 36-point window once
- Reuses calculations for multiple time steps
- Only recalculates when window shifts significantly

### **Strategy 3: Differential Updates (Optimal)**

```typescript
// utils/trajectoryDifferentialCache.ts - Most efficient approach
class DifferentialTrajectoryCache {
  private cache = new Map<string, CachedTrajectoryWindow>();
  private segmentSize = 12;
  
  interface CachedTrajectoryWindow {
    segments: CachedSegment[];           // Array of calculated segments
    focusedPosition: Position3D | null;  // Last focused position
    lastUpdateTime: number;              // Last calculation time
  }
  
  interface CachedSegment {
    timeIndex: number;                   // Trajectory point index
    realPosition: THREE.Vector3;         // Cached real position
    apparentPosition: THREE.Vector3;     // Cached apparent position
    isDirty: boolean;                    // Needs recalculation?
  }
  
  getVisibleSegments(
    satelliteId: string,
    trajectoryPoints: SatelliteTrajectoryPoint[],
    currentTime: number,
    focusedPosition: Position3D | null,
    viewScale: number
  ): THREE.Vector3[] {
    const currentIndex = findCurrentTrajectoryIndex(trajectoryPoints, currentTime);
    const cached = this.cache.get(satelliteId);
    
    // Determine which segments we need
    const neededIndices = this.getFutureIndices(currentIndex, this.segmentSize);
    
    if (!cached) {
      // First time calculation
      return this.calculateAndCacheSegments(
        satelliteId, 
        trajectoryPoints, 
        neededIndices, 
        focusedPosition, 
        viewScale
      );
    }
    
    // Check what needs updating
    const updates = this.planUpdates(cached, neededIndices, focusedPosition);
    
    if (updates.recalculateAll) {
      // Focused satellite changed - recalculate apparent positions only
      return this.recalculateApparentPositions(cached, neededIndices, focusedPosition);
    }
    
    if (updates.newSegments.length > 0) {
      // Time moved forward - calculate only new segments
      this.calculateNewSegments(cached, updates.newSegments, trajectoryPoints, focusedPosition, viewScale);
    }
    
    // Return visible segments
    return this.extractVisibleSegments(cached, neededIndices);
  }
  
  private planUpdates(
    cached: CachedTrajectoryWindow,
    neededIndices: number[],
    currentFocusedPosition: Position3D | null
  ): UpdatePlan {
    // Check if focused position changed
    const focusChanged = !this.focusedPositionEquals(
      cached.focusedPosition, 
      currentFocusedPosition
    );
    
    if (focusChanged) {
      return { recalculateAll: true, newSegments: [] };
    }
    
    // Check which segments are missing
    const existingIndices = new Set(cached.segments.map(s => s.timeIndex));
    const newSegments = neededIndices.filter(index => !existingIndices.has(index));
    
    return { recalculateAll: false, newSegments };
  }
  
  private recalculateApparentPositions(
    cached: CachedTrajectoryWindow,
    neededIndices: number[],
    newFocusedPosition: Position3D | null
  ): THREE.Vector3[] {
    // Only recalculate apparent positions (real positions stay same)
    const result: THREE.Vector3[] = [];
    
    neededIndices.forEach(index => {
      const segment = cached.segments.find(s => s.timeIndex === index);
      if (segment) {
        if (newFocusedPosition) {
          segment.apparentPosition = new THREE.Vector3(
            segment.realPosition.x - newFocusedPosition.x,
            segment.realPosition.y - newFocusedPosition.y,
            segment.realPosition.z - newFocusedPosition.z
          );
        } else {
          segment.apparentPosition = segment.realPosition.clone();
        }
        result.push(segment.apparentPosition);
      }
    });
    
    // Update cached focused position
    cached.focusedPosition = newFocusedPosition;
    
    return result;
  }
}
```

## Performance Comparison

### **Calculation Counts Per Time Step:**

| Strategy | Initial Load | Time +1 | Time +5 | Focus Change | Notes |
|----------|-------------|---------|---------|--------------|-------|
| **Naive** | 12 calculations | 12 calculations | 12 calculations | 12 calculations | Recalculates everything |
| **Simple Cache** | 12 calculations | 12 calculations | 12 calculations | 12 calculations | Caches focused position only |
| **Sliding Window** | 36 calculations | 0 calculations | 0 calculations | 36 calculations | Reuses window |
| **Differential** | 12 calculations | 1 calculation | 5 calculations | 12 calculations | Only new segments |

### **Memory Usage:**

| Strategy | Memory per Satellite | Cache Invalidation | Complexity |
|----------|---------------------|-------------------|------------|
| **Naive** | Minimal | N/A | Low |
| **Simple Cache** | +1 focused position | On focus change | Low |
| **Sliding Window** | +36 Vector3 objects | On window shift | Medium |
| **Differential** | +Variable segments | Granular | High |

## Recommended Implementation Strategy

### **Phase 1: Start with Simple Caching**
```typescript
// Implement focused position caching first
const focusedPosition = useMemo(() => {
  return getFocusedSatellitePosition();
}, [focusedSatelliteId, satellites, currentTime]);

// Use cached position for all segment calculations
const apparentPosition = {
  x: realPosition.x - focusedPosition.x,
  y: realPosition.y - focusedPosition.y,
  z: realPosition.z - focusedPosition.z
};
```
**Benefits**: 90% of focus mode calculation redundancy eliminated with minimal complexity.

### **Phase 2: Add Segment-Level Caching**
```typescript
// Cache calculated segments with time-based invalidation
const segmentCache = useMemo(() => {
  return calculateSegments(futurePoints, focusedPosition, viewScale);
}, [futurePoints, focusedPosition, viewScale]);
```
**Benefits**: Eliminates Vector3 creation redundancy.

### **Phase 3: Advanced Caching (If Needed)**
Only implement sliding window or differential caching if profiling shows it's necessary.

## Alternate View Optimization

### **Separate Scaling Pipeline:**
```typescript
// Optimize alternate view with separate code path
const TrajectoryLines = ({ isAlternateView }) => {
  if (isAlternateView) {
    // Simplified pipeline for alternate view
    return <AlternateViewTrajectoryLines />;
  }
  
  // Full-featured pipeline for normal view
  return <NormalViewTrajectoryLines />;
};

const AlternateViewTrajectoryLines = () => {
  // No focus mode calculations needed
  // Only simple scaling
  const scaledPoints = futurePoints.map(point => new THREE.Vector3(
    point.cartesian!.x * AV_DESCALE_FACTOR,
    point.cartesian!.y * AV_DESCALE_FACTOR,
    point.cartesian!.z * AV_DESCALE_FACTOR
  ));
};
```

## Conclusion

### **Best Performance Strategy:**
1. **Start simple**: Cache focused position calculation
2. **Profile performance**: Measure actual bottlenecks
3. **Optimize incrementally**: Add complexity only when needed
4. **Separate alternate view**: Use simpler pipeline for alternate view

### **Key Insights:**
- **Simple caching** eliminates 90% of redundant calculations
- **Sliding window** helps with frequent time slider movement
- **Differential updates** are optimal but complex
- **Alternate view** should use simplified pipeline

The goal is to achieve **maximum performance improvement** with **minimum implementation complexity**. Start with simple focused position caching and measure the results before adding more sophisticated strategies. 