import { useState, useCallback } from 'react';
import { useCacheContext } from '../contexts/CacheContext';
import { useTimeContext } from '../contexts/TimeContext';
import { useSatelliteContext } from '../contexts/SatelliteContext';

interface CacheRestorationState {
  isRestoring: boolean;
  restorationStep: string;
  error: string | null;
  progress: number;
}

export const useCacheRestoration = () => {
  const [state, setState] = useState<CacheRestorationState>({
    isRestoring: false,
    restorationStep: '',
    error: null,
    progress: 0
  });

  const { cacheService } = useCacheContext();
  const { restoreTimelineFromCache } = useTimeContext();
  const { restoreSatellitesFromCache } = useSatelliteContext();

  const restoreFromCache = useCallback(async (): Promise<void> => {
    setState(prev => ({ 
      ...prev, 
      isRestoring: true, 
      progress: 0, 
      error: null,
      restorationStep: 'Starting restoration...'
    }));

    try {
      // Step 1: Validate cache (20% progress)
      setState(prev => ({ 
        ...prev, 
        restorationStep: 'Validating cache...', 
        progress: 20 
      }));
      
      const isValid = cacheService.validateCacheIntegrity();
      if (!isValid) {
        throw new Error('Cache validation failed - cache may be outdated');
      }

      // Check if there's actually data to restore
      const cacheInfo = cacheService.getCacheInfo();
      if (!cacheInfo.hasData) {
        setState(prev => ({ 
          ...prev, 
          restorationStep: 'No cached data found', 
          progress: 100 
        }));
        return;
      }

      // Step 2: Restore timeline (40% progress)
      setState(prev => ({ 
        ...prev, 
        restorationStep: 'Restoring timeline...', 
        progress: 40 
      }));
      
      restoreTimelineFromCache();

      // Step 3: Restore satellites (80% progress)
      setState(prev => ({ 
        ...prev, 
        restorationStep: 'Restoring satellites...', 
        progress: 60 
      }));
      
      await restoreSatellitesFromCache();

      // Step 4: Restore UI state (90% progress)
      setState(prev => ({ 
        ...prev, 
        restorationStep: 'Restoring UI state...', 
        progress: 80 
      }));
      
      // UI state restoration is handled automatically by EarthView on mount
      // We don't need to call it explicitly here

      // Step 5: Complete (100% progress)
      setState(prev => ({ 
        ...prev, 
        restorationStep: 'Restoration complete', 
        progress: 100 
      }));

      console.log('Cache restoration completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Cache restoration failed:', errorMessage);
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        restorationStep: 'Restoration failed'
      }));
    } finally {
      // Clear restoration state after a short delay to show completion
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          isRestoring: false 
        }));
      }, 1000);
    }
  }, [cacheService, restoreTimelineFromCache, restoreSatellitesFromCache]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetRestoration = useCallback(() => {
    setState({
      isRestoring: false,
      restorationStep: '',
      error: null,
      progress: 0
    });
  }, []);

  return {
    ...state,
    restoreFromCache,
    clearError,
    resetRestoration
  };
}; 