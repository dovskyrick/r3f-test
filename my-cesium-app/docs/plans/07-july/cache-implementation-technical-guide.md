# Cache System Technical Implementation Guide

## Overview

This document provides a detailed technical implementation plan for the browser-based cache system. React supports localStorage and sessionStorage natively through the Web Storage API, which we'll use for persistent data storage.

> **Important Note**: This cache implementation is designed to be extensible and non-breaking. Features not yet implemented (like focus mode) are commented out with TODO markers and can be easily added later without affecting existing cache functionality or requiring cache data migration.

## Browser Storage Capabilities

React applications can use:
- **localStorage**: Persists data across browser sessions (survives browser restart)
- **sessionStorage**: Persists data only for the current tab session
- **IndexedDB**: For more complex data structures (not needed for this implementation)

We'll primarily use **localStorage** for persistence across browser restarts.

## Step 1: Create Cache Utility Module

**File to Create**: `src/utils/cacheUtils.ts`

This utility will handle all cache operations:

```typescript
// Cache version for handling future schema changes
const CACHE_VERSION = '1.0.0';
const CACHE_KEYS = {
  VERSION: 'app_cache_version',
  SATELLITES: 'cached_satellites',
  TIMELINE_STATE: 'timeline_state',
  UI_STATE: 'ui_state',
  USER_SETTINGS: 'user_settings'
};

// Interface definitions for cached data
interface CachedSatellite {
  id: string;
  name: string;
  tleLine1: string;
  tleLine2: string;
  color: string;
  isVisible: boolean;
  timeInterval?: number; // Future extension for custom intervals
}

interface CachedTimelineState {
  currentTime: number;
  minTime: string;
  maxTime: string;
  playbackSpeed?: number;
}

interface CachedUIState {
  isAlternateView: boolean;
  // focusedSatelliteId: string | null; // TODO: Add when focus mode is implemented
  cameraPosition?: {x: number, y: number, z: number};
}

// Utility functions for cache operations
const saveToCache = (key: string, data: any): void => { /* implementation */ }
const loadFromCache = (key: string): any | null => { /* implementation */ }
const clearCache = (): void => { /* implementation */ }
const isCacheValid = (): boolean => { /* implementation */ }
```

## Step 2: Create Cache Service Class

**File to Create**: `src/services/CacheService.ts`

This service will manage all cache operations:

```typescript
class CacheService {
  private static instance: CacheService;
  
  // Satellite cache methods
  saveSatellites(satellites: Satellite[]): void { /* implementation */ }
  loadSatellites(): CachedSatellite[] { /* implementation */ }
  
  // Timeline cache methods
  saveTimelineState(timelineState: CachedTimelineState): void { /* implementation */ }
  loadTimelineState(): CachedTimelineState | null { /* implementation */ }
  
  // UI state cache methods
  saveUIState(uiState: CachedUIState): void { /* implementation */ }
  loadUIState(): CachedUIState | null { /* implementation */ }
  
  // General cache management
  clearAllCache(): void { /* implementation */ }
  validateCacheIntegrity(): boolean { /* implementation */ }
  
  static getInstance(): CacheService { /* singleton pattern */ }
}

export default CacheService;
```

## Step 3: Create Cache Context

**File to Create**: `src/contexts/CacheContext.tsx`

This context will manage cache state and provide cache operations to components:

```typescript
interface CacheContextType {
  isCacheLoaded: boolean;
  isRestoring: boolean;
  cacheService: CacheService;
  
  // Cache restoration methods
  restoreFromCache: () => Promise<void>;
  saveCurrentState: () => void;
  clearCache: () => void;
  
  // Auto-save configuration
  enableAutoSave: boolean;
  setEnableAutoSave: (enabled: boolean) => void;
}

const CacheProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [enableAutoSave, setEnableAutoSave] = useState(true);
  
  const cacheService = CacheService.getInstance();
  
  // Restoration logic
  const restoreFromCache = async (): Promise<void> => { /* implementation */ };
  
  // Auto-save effect
  useEffect(() => {
    if (enableAutoSave && isCacheLoaded) {
      const interval = setInterval(saveCurrentState, 5000); // Auto-save every 5 seconds
      return () => clearInterval(interval);
    }
  }, [enableAutoSave, isCacheLoaded]);
  
  // Context value and provider
};
```

## Step 4: Modify SatelliteContext for Cache Integration

**File to Modify**: `src/contexts/SatelliteContext.tsx`

Add cache-related functionality to the existing satellite context:

```typescript
// Add to existing SatelliteContext interface
interface SatelliteContextType {
  // ... existing properties
  
  // New cache-related properties
  isRestoringFromCache: boolean;
  restoreSatellitesFromCache: () => Promise<void>;
  cacheSatellites: () => void;
}

// Modify SatelliteProvider
const SatelliteProvider: React.FC<SatelliteProviderProps> = ({ children }) => {
  // ... existing state
  const [isRestoringFromCache, setIsRestoringFromCache] = useState(false);
  const { cacheService } = useCacheContext();
  
  // Cache restoration method
  const restoreSatellitesFromCache = async (): Promise<void> => {
    setIsRestoringFromCache(true);
    try {
      const cachedSatellites = cacheService.loadSatellites();
      
      // Convert cached satellites back to full satellite objects
      for (const cached of cachedSatellites) {
        await addSatelliteFromTLE(cached.name, cached.tleLine1, cached.tleLine2);
        // Restore cached properties like color and visibility
      }
    } finally {
      setIsRestoringFromCache(false);
    }
  };
  
  // Cache current satellites
  const cacheSatellites = (): void => {
    const satellitesToCache = satellites.map(sat => ({
      id: sat.id,
      name: sat.name,
      tleLine1: sat.tle?.line1 || '',
      tleLine2: sat.tle?.line2 || '',
      color: sat.color,
      isVisible: sat.isVisible,
      timeInterval: sat.timeInterval // Future extension
    }));
    
    cacheService.saveSatellites(satellitesToCache);
  };
  
  // Auto-cache effect when satellites change
  useEffect(() => {
    if (!isRestoringFromCache && satellites.length > 0) {
      cacheSatellites();
    }
  }, [satellites, isRestoringFromCache]);
};
```

## Step 5: Modify TimeContext for Cache Integration

**File to Modify**: `src/contexts/TimeContext.tsx`

Add cache functionality to preserve timeline state:

```typescript
// Add to existing TimeContext interface
interface TimeContextType {
  // ... existing properties
  
  // New cache-related methods
  restoreTimelineFromCache: () => void;
  cacheTimelineState: () => void;
}

// Modify TimeProvider
const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  // ... existing state
  const { cacheService } = useCacheContext();
  
  // Cache restoration method
  const restoreTimelineFromCache = (): void => {
    const cachedState = cacheService.loadTimelineState();
    if (cachedState) {
      setCurrentTime(cachedState.currentTime);
      setMinValue(cachedState.minTime);
      setMaxValue(cachedState.maxTime);
      // Restore other timeline properties
    }
  };
  
  // Cache current timeline state
  const cacheTimelineState = (): void => {
    const timelineState: CachedTimelineState = {
      currentTime,
      minTime,
      maxTime,
      playbackSpeed: playbackSpeed // If implemented
    };
    
    cacheService.saveTimelineState(timelineState);
  };
  
  // Auto-cache effect when timeline state changes
  useEffect(() => {
    const timeoutId = setTimeout(cacheTimelineState, 1000); // Debounce caching
    return () => clearTimeout(timeoutId);
  }, [currentTime, minTime, maxTime]);
};
```

## Step 6: Modify EarthView for UI State Caching

**File to Modify**: `src/pages/EarthView/EarthView.tsx`

Add caching for view state and focus mode:

```typescript
const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);
  const { cacheService } = useCacheContext();
  // const { focusedSatellite } = useSatelliteContext(); // TODO: Add when focus mode is implemented
  
  // Cache UI state
  const cacheUIState = useCallback((): void => {
    const uiState: CachedUIState = {
      isAlternateView: isZoomedOutView,
      // focusedSatelliteId: focusedSatellite?.id || null, // TODO: Add when focus mode is implemented
      // Future: camera position, zoom level, etc.
    };
    
    cacheService.saveUIState(uiState);
  }, [isZoomedOutView]);
  
  // Restore UI state from cache
  const restoreUIState = useCallback((): void => {
    const cachedUI = cacheService.loadUIState();
    if (cachedUI) {
      setIsZoomedOutView(cachedUI.isAlternateView);
      // TODO: Restore focus state when focus mode is implemented
    }
  }, []);
  
  // Auto-cache UI state changes
  useEffect(() => {
    const timeoutId = setTimeout(cacheUIState, 500);
    return () => clearTimeout(timeoutId);
  }, [isZoomedOutView]);
  
  // ... rest of component
};
```

## Step 7: Create Cache Restoration Hook

**File to Create**: `src/hooks/useCacheRestoration.ts`

Custom hook to manage the restoration process:

```typescript
interface CacheRestorationState {
  isRestoring: boolean;
  restorationStep: string;
  error: string | null;
  progress: number;
}

const useCacheRestoration = () => {
  const [state, setState] = useState<CacheRestorationState>({
    isRestoring: false,
    restorationStep: '',
    error: null,
    progress: 0
  });
  
  const { cacheService } = useCacheContext();
  const { restoreSatellitesFromCache } = useSatelliteContext();
  const { restoreTimelineFromCache } = useTimeContext();
  
  const restoreFromCache = async (): Promise<void> => {
    setState(prev => ({ ...prev, isRestoring: true, progress: 0 }));
    
    try {
      // Step 1: Validate cache
      setState(prev => ({ ...prev, restorationStep: 'Validating cache...', progress: 20 }));
      
      // Step 2: Restore satellites
      setState(prev => ({ ...prev, restorationStep: 'Restoring satellites...', progress: 40 }));
      await restoreSatellitesFromCache();
      
      // Step 3: Restore timeline
      setState(prev => ({ ...prev, restorationStep: 'Restoring timeline...', progress: 60 }));
      restoreTimelineFromCache();
      
      // Step 4: Restore UI state
      setState(prev => ({ ...prev, restorationStep: 'Restoring UI state...', progress: 80 }));
      // UI restoration logic
      
      setState(prev => ({ ...prev, restorationStep: 'Complete', progress: 100 }));
      
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
    } finally {
      setState(prev => ({ ...prev, isRestoring: false }));
    }
  };
  
  return { ...state, restoreFromCache };
};
```

## Step 8: Create Cache Management UI Component

**File to Create**: `src/components/CacheManager/CacheManager.tsx`

UI component for cache management and restoration status:

```typescript
const CacheManager: React.FC = () => {
  const { isRestoring, restorationStep, progress, restoreFromCache } = useCacheRestoration();
  const { clearCache, cacheService } = useCacheContext();
  const [showManager, setShowManager] = useState(false);
  
  // Check for cached data on mount
  useEffect(() => {
    const hasCachedData = cacheService.loadSatellites().length > 0;
    if (hasCachedData && !isRestoring) {
      setShowManager(true);
    }
  }, []);
  
  if (isRestoring) {
    return (
      <div className="cache-restoration-overlay">
        <div className="restoration-modal">
          <h3>Restoring Session</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{restorationStep}</p>
        </div>
      </div>
    );
  }
  
  if (showManager) {
    return (
      <div className="cache-manager-banner">
        <span>Previous session found</span>
        <button onClick={restoreFromCache}>Restore</button>
        <button onClick={() => setShowManager(false)}>Continue Fresh</button>
        <button onClick={clearCache}>Clear Cache</button>
      </div>
    );
  }
  
  return null;
};
```

## Step 9: Modify App Component for Cache Integration

**File to Modify**: `src/App.tsx`

Integrate cache providers and restoration UI:

```typescript
const App: React.FC = () => {
  return (
    <CacheProvider>
      <TimeProvider>
        <SatelliteProvider>
          <TrajectoryProvider>
            <div className="App">
              <CacheManager />
              <Router>
                <div className="app-container">
                  <Navigation />
                  <Routes>
                    <Route path="/" element={<EarthView />} />
                    <Route path="/maps" element={<MapsView />} />
                  </Routes>
                </div>
              </Router>
            </div>
          </TrajectoryProvider>
        </SatelliteProvider>
      </TimeProvider>
    </CacheProvider>
  );
};
```

## Step 10: Create Cache Debugging and Development Tools

**File to Create**: `src/components/CacheDebugger/CacheDebugger.tsx`

Development tool for cache inspection and management:

```typescript
const CacheDebugger: React.FC = () => {
  const [cacheData, setCacheData] = useState<any>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const { cacheService } = useCacheContext();
  
  const inspectCache = (): void => {
    const data = {
      satellites: cacheService.loadSatellites(),
      timeline: cacheService.loadTimelineState(),
      uiState: cacheService.loadUIState(),
      cacheSize: calculateCacheSize()
    };
    setCacheData(data);
  };
  
  const calculateCacheSize = (): string => {
    // Calculate total localStorage usage
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    return `${(total / 1024).toFixed(2)} KB`;
  };
  
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="cache-debugger">
      <button 
        className="debug-toggle"
        onClick={() => setShowDebugger(!showDebugger)}
      >
        🔧 Cache Debug
      </button>
      
      {showDebugger && (
        <div className="debug-panel">
          <button onClick={inspectCache}>Inspect Cache</button>
          <button onClick={() => cacheService.clearAllCache()}>Clear All</button>
          
          {cacheData && (
            <pre className="cache-data">
              {JSON.stringify(cacheData, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
```

## Implementation Summary

### Files to Create:
1. `src/utils/cacheUtils.ts` - Core cache utility functions
2. `src/services/CacheService.ts` - Cache service class
3. `src/contexts/CacheContext.tsx` - Cache context provider
4. `src/hooks/useCacheRestoration.ts` - Restoration management hook
5. `src/components/CacheManager/CacheManager.tsx` - Cache UI component
6. `src/components/CacheDebugger/CacheDebugger.tsx` - Development tool

### Files to Modify:
1. `src/contexts/SatelliteContext.tsx` - Add cache integration
2. `src/contexts/TimeContext.tsx` - Add timeline state caching
3. `src/pages/EarthView/EarthView.tsx` - Add UI state caching
4. `src/App.tsx` - Integrate cache providers

### Data Mechanisms to Cache:
- **Satellites**: TLE data, names, colors, visibility from SatelliteContext
- **Timeline**: Current time, range, speed from TimeContext
- **UI State**: View mode from EarthView (focused satellite will be added when focus mode is implemented)
- **Future Extensions**: Time intervals, user settings, camera positions, focused satellite state

### What NOT to Cache:
- Trajectory calculation results (points, lines)
- Loading states and temporary UI elements
- Server response data
- Runtime-only variables

This implementation provides a robust foundation for caching while maintaining flexibility for future extensions. 