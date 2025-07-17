import {
  CachedSatellite,
  CachedTimelineState,
  CachedUIState,
  CachedUserSettings,
  saveToCache,
  loadFromCache,
  clearCache,
  isCacheValid,
  getCacheSize,
  hasCachedData,
  CACHE_KEYS
} from '../utils/cacheUtils';

class CacheService {
  private static instance: CacheService;
  
  // Singleton pattern
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Satellite cache methods
  saveSatellites(satellites: CachedSatellite[]): void {
    try {
      saveToCache(CACHE_KEYS.SATELLITES, satellites);
      console.log(`Cached ${satellites.length} satellites`);
    } catch (error) {
      console.warn('Failed to cache satellites:', error);
    }
  }

  loadSatellites(): CachedSatellite[] {
    try {
      const cachedSatellites = loadFromCache(CACHE_KEYS.SATELLITES);
      if (Array.isArray(cachedSatellites)) {
        console.log(`Loaded ${cachedSatellites.length} satellites from cache`);
        return cachedSatellites;
      }
      return [];
    } catch (error) {
      console.warn('Failed to load satellites from cache:', error);
      return [];
    }
  }

  // Timeline cache methods
  saveTimelineState(timelineState: CachedTimelineState): void {
    try {
      saveToCache(CACHE_KEYS.TIMELINE_STATE, timelineState);
      console.log('Timeline state cached');
    } catch (error) {
      console.warn('Failed to cache timeline state:', error);
    }
  }

  loadTimelineState(): CachedTimelineState | null {
    try {
      const cachedTimeline = loadFromCache(CACHE_KEYS.TIMELINE_STATE);
      if (cachedTimeline) {
        console.log('Timeline state loaded from cache');
        return cachedTimeline as CachedTimelineState;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load timeline state from cache:', error);
      return null;
    }
  }

  // UI state cache methods
  saveUIState(uiState: CachedUIState): void {
    try {
      saveToCache(CACHE_KEYS.UI_STATE, uiState);
      console.log('UI state cached');
    } catch (error) {
      console.warn('Failed to cache UI state:', error);
    }
  }

  loadUIState(): CachedUIState | null {
    try {
      const cachedUI = loadFromCache(CACHE_KEYS.UI_STATE);
      if (cachedUI) {
        console.log('UI state loaded from cache');
        return cachedUI as CachedUIState;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load UI state from cache:', error);
      return null;
    }
  }

  // User settings cache methods
  saveUserSettings(settings: CachedUserSettings): void {
    try {
      saveToCache(CACHE_KEYS.USER_SETTINGS, settings);
      console.log('User settings cached');
    } catch (error) {
      console.warn('Failed to cache user settings:', error);
    }
  }

  loadUserSettings(): CachedUserSettings | null {
    try {
      const cachedSettings = loadFromCache(CACHE_KEYS.USER_SETTINGS);
      if (cachedSettings) {
        console.log('User settings loaded from cache');
        return cachedSettings as CachedUserSettings;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load user settings from cache:', error);
      return null;
    }
  }

  // General cache management
  clearAllCache(): void {
    try {
      clearCache();
      console.log('All cache data cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  validateCacheIntegrity(): boolean {
    try {
      const isValid = isCacheValid();
      if (!isValid) {
        console.warn('Cache version mismatch detected - cache may be outdated');
      }
      return isValid;
    } catch (error) {
      console.warn('Failed to validate cache integrity:', error);
      return false;
    }
  }

  getCacheInfo(): {
    hasData: boolean;
    isValid: boolean;
    size: string;
    satelliteCount: number;
    hasTimeline: boolean;
    hasUIState: boolean;
    hasSettings: boolean;
  } {
    try {
      const satellites = this.loadSatellites();
      const timeline = this.loadTimelineState();
      const uiState = this.loadUIState();
      const settings = this.loadUserSettings();

      return {
        hasData: hasCachedData(),
        isValid: this.validateCacheIntegrity(),
        size: getCacheSize(),
        satelliteCount: satellites.length,
        hasTimeline: timeline !== null,
        hasUIState: uiState !== null,
        hasSettings: settings !== null
      };
    } catch (error) {
      console.warn('Failed to get cache info:', error);
      return {
        hasData: false,
        isValid: false,
        size: '0 KB',
        satelliteCount: 0,
        hasTimeline: false,
        hasUIState: false,
        hasSettings: false
      };
    }
  }

  // Utility method for development/debugging
  exportCacheData(): any {
    try {
      return {
        satellites: this.loadSatellites(),
        timeline: this.loadTimelineState(),
        uiState: this.loadUIState(),
        settings: this.loadUserSettings(),
        info: this.getCacheInfo()
      };
    } catch (error) {
      console.warn('Failed to export cache data:', error);
      return null;
    }
  }

  // Batch operations for efficiency
  saveAllData(data: {
    satellites?: CachedSatellite[];
    timeline?: CachedTimelineState;
    uiState?: CachedUIState;
    settings?: CachedUserSettings;
  }): void {
    try {
      if (data.satellites) this.saveSatellites(data.satellites);
      if (data.timeline) this.saveTimelineState(data.timeline);
      if (data.uiState) this.saveUIState(data.uiState);
      if (data.settings) this.saveUserSettings(data.settings);
      console.log('Batch cache save completed');
    } catch (error) {
      console.warn('Failed to batch save cache data:', error);
    }
  }
}

export default CacheService; 