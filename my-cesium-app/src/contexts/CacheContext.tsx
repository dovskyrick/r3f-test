import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import CacheService from '../services/CacheService';
import { CachedSatellite, CachedTimelineState, CachedUIState, CachedUserSettings } from '../utils/cacheUtils';

interface CacheContextType {
  // Cache state
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
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
  
  // Cache information
  cacheInfo: {
    hasData: boolean;
    isValid: boolean;
    size: string;
    satelliteCount: number;
    hasTimeline: boolean;
    hasUIState: boolean;
    hasSettings: boolean;
  };
  refreshCacheInfo: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheProviderProps {
  children: ReactNode;
}

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [enableAutoSave, setEnableAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5000); // 5 seconds default
  const [cacheInfo, setCacheInfo] = useState({
    hasData: false,
    isValid: false,
    size: '0 KB',
    satelliteCount: 0,
    hasTimeline: false,
    hasUIState: false,
    hasSettings: false
  });

  const cacheService = CacheService.getInstance();

  // Refresh cache information
  const refreshCacheInfo = useCallback(() => {
    const info = cacheService.getCacheInfo();
    setCacheInfo(info);
  }, [cacheService]);

  // Initialize cache context
  useEffect(() => {
    try {
      // Load user settings from cache if available
      const cachedSettings = cacheService.loadUserSettings();
      if (cachedSettings) {
        setEnableAutoSave(cachedSettings.enableAutoSave);
        setAutoSaveInterval(cachedSettings.autoSaveInterval);
      }

      // Refresh cache info
      refreshCacheInfo();
      
      setIsCacheLoaded(true);
      console.log('CacheContext initialized');
    } catch (error) {
      console.warn('Failed to initialize CacheContext:', error);
      setIsCacheLoaded(true); // Continue anyway
    }
  }, [cacheService, refreshCacheInfo]);

  // Cache restoration placeholder - will be implemented when contexts are integrated
  const restoreFromCache = useCallback(async (): Promise<void> => {
    setIsRestoring(true);
    try {
      console.log('Cache restoration initiated');
      
      // Validate cache integrity
      const isValid = cacheService.validateCacheIntegrity();
      if (!isValid) {
        console.warn('Cache validation failed - clearing outdated cache');
        cacheService.clearAllCache();
        refreshCacheInfo();
        return;
      }

      // TODO: This will be implemented in steps 4-6 when contexts are integrated
      // For now, just log what would be restored
      const cacheData = cacheService.exportCacheData();
      if (cacheData) {
        console.log('Cache data available for restoration:', {
          satellites: cacheData.satellites.length,
          hasTimeline: !!cacheData.timeline,
          hasUIState: !!cacheData.uiState,
          hasSettings: !!cacheData.settings
        });
      }

      console.log('Cache restoration completed (placeholder)');
    } catch (error) {
      console.error('Cache restoration failed:', error);
    } finally {
      setIsRestoring(false);
      refreshCacheInfo();
    }
  }, [cacheService, refreshCacheInfo]);

  // Save current state placeholder - will be implemented when contexts are integrated
  const saveCurrentState = useCallback((): void => {
    try {
      // TODO: This will be implemented in steps 4-6 when contexts are integrated
      // For now, just save user settings
      const userSettings: CachedUserSettings = {
        enableAutoSave,
        autoSaveInterval,
        // theme and other settings will be added later
      };
      
      cacheService.saveUserSettings(userSettings);
      refreshCacheInfo();
      
      console.log('Current state saved (user settings only for now)');
    } catch (error) {
      console.warn('Failed to save current state:', error);
    }
  }, [enableAutoSave, autoSaveInterval, cacheService, refreshCacheInfo]);

  // Clear cache with confirmation
  const clearCache = useCallback((): void => {
    try {
      cacheService.clearAllCache();
      refreshCacheInfo();
      console.log('Cache cleared successfully');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, [cacheService, refreshCacheInfo]);

  // Auto-save effect
  useEffect(() => {
    if (enableAutoSave && isCacheLoaded) {
      const interval = setInterval(() => {
        saveCurrentState();
      }, autoSaveInterval);

      console.log(`Auto-save enabled with ${autoSaveInterval}ms interval`);
      
      return () => {
        clearInterval(interval);
        console.log('Auto-save interval cleared');
      };
    }
  }, [enableAutoSave, isCacheLoaded, autoSaveInterval, saveCurrentState]);

  // Save settings when they change
  useEffect(() => {
    if (isCacheLoaded) {
      const userSettings: CachedUserSettings = {
        enableAutoSave,
        autoSaveInterval,
      };
      cacheService.saveUserSettings(userSettings);
    }
  }, [enableAutoSave, autoSaveInterval, isCacheLoaded, cacheService]);

  // Refresh cache info periodically
  useEffect(() => {
    if (isCacheLoaded) {
      const interval = setInterval(refreshCacheInfo, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isCacheLoaded, refreshCacheInfo]);

  const contextValue: CacheContextType = {
    // Cache state
    isCacheLoaded,
    isRestoring,
    cacheService,
    
    // Cache restoration methods
    restoreFromCache,
    saveCurrentState,
    clearCache,
    
    // Auto-save configuration
    enableAutoSave,
    setEnableAutoSave,
    autoSaveInterval,
    setAutoSaveInterval,
    
    // Cache information
    cacheInfo,
    refreshCacheInfo
  };

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};

// Custom hook for using cache context
export const useCacheContext = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCacheContext must be used within a CacheProvider');
  }
  return context;
};

export default CacheContext; 