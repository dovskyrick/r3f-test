// Cache version for handling future schema changes
const CACHE_VERSION = '1.0.0';
const CACHE_KEYS = {
  VERSION: 'app_cache_version',
  SATELLITES: 'cached_satellites',
  TIMELINE_STATE: 'timeline_state',
  UI_STATE: 'ui_state',
  USER_SETTINGS: 'user_settings'
} as const;

// Interface definitions for cached data
export interface CachedSatellite {
  id: string;
  name: string;
  tleLine1: string;
  tleLine2: string;
  color: string;
  isVisible: boolean;
  timeInterval?: number; // Future extension for custom intervals
}

export interface CachedTimelineState {
  currentTime: number;
  minTime: string;
  maxTime: string;
  playbackSpeed?: number;
}

export interface CachedUIState {
  isAlternateView: boolean;
  // focusedSatelliteId: string | null; // TODO: Add when focus mode is implemented
  cameraPosition?: {x: number, y: number, z: number};
}

export interface CachedUserSettings {
  enableAutoSave: boolean;
  autoSaveInterval: number;
  theme?: string;
}

// Utility functions for cache operations
export const saveToCache = (key: string, data: any): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    
    // Update cache version when saving data
    localStorage.setItem(CACHE_KEYS.VERSION, CACHE_VERSION);
  } catch (error) {
    console.warn('Failed to save to cache:', error);
  }
};

export const loadFromCache = (key: string): any | null => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return null;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    console.warn('Failed to load from cache:', error);
    return null;
  }
};

export const clearCache = (): void => {
  try {
    // Remove all cache keys
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('Cache cleared successfully');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

export const isCacheValid = (): boolean => {
  try {
    const cachedVersion = localStorage.getItem(CACHE_KEYS.VERSION);
    return cachedVersion === CACHE_VERSION;
  } catch (error) {
    console.warn('Failed to validate cache:', error);
    return false;
  }
};

export const getCacheSize = (): string => {
  try {
    let total = 0;
    Object.values(CACHE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        total += item.length;
      }
    });
    return `${(total / 1024).toFixed(2)} KB`;
  } catch (error) {
    console.warn('Failed to calculate cache size:', error);
    return '0 KB';
  }
};

export const hasCachedData = (): boolean => {
  try {
    return Object.values(CACHE_KEYS).some(key => {
      if (key === CACHE_KEYS.VERSION) return false; // Skip version key
      return localStorage.getItem(key) !== null;
    });
  } catch (error) {
    console.warn('Failed to check for cached data:', error);
    return false;
  }
};

// Export cache keys for use in other modules
export { CACHE_KEYS }; 