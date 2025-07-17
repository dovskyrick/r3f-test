import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useCacheContext } from './CacheContext';
import { CachedTimelineState } from '../utils/cacheUtils';

interface TimeContextType {
  minValue: string;
  maxValue: string;
  currentTime: number;
  isPlaying: boolean;
  setMinValue: (value: string) => void;
  setMaxValue: (value: string) => void;
  setCurrentTime: (time: number) => void;
  togglePlayPause: () => void;
  stepSize: number;
  
  // New cache-related methods
  restoreTimelineFromCache: () => void;
  cacheTimelineState: () => void;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const useTimeContext = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTimeContext must be used within a TimeProvider');
  }
  return context;
};

interface TimeProviderProps {
  children: React.ReactNode;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("100");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Access CacheContext for cache operations
  const { cacheService, isCacheLoaded } = useCacheContext();

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Calculate step size as 1/1000th of the range
  const stepSize = (parseFloat(maxValue) - parseFloat(minValue)) / 1000;

  // Cache restoration method
  const restoreTimelineFromCache = useCallback((): void => {
    if (!isCacheLoaded) return;
    
    try {
      const cachedState = cacheService.loadTimelineState();
      if (cachedState) {
        console.log('Restoring timeline state from cache');
        setCurrentTime(cachedState.currentTime);
        setMinValue(cachedState.minTime);
        setMaxValue(cachedState.maxTime);
        // Restore playback speed when implemented
        console.log('Timeline state restored successfully');
      }
    } catch (error) {
      console.warn('Failed to restore timeline state from cache:', error);
    }
  }, [isCacheLoaded, cacheService]);

  // Cache current timeline state
  const cacheTimelineState = useCallback((): void => {
    if (!isCacheLoaded) return;
    
    try {
      const timelineState: CachedTimelineState = {
        currentTime,
        minTime: minValue,
        maxTime: maxValue,
        // playbackSpeed will be added when implemented
      };
      
      cacheService.saveTimelineState(timelineState);
    } catch (error) {
      console.warn('Failed to cache timeline state:', error);
    }
  }, [currentTime, minValue, maxValue, isCacheLoaded, cacheService]);

  // Auto-cache effect when timeline state changes (debounced)
  useEffect(() => {
    if (isCacheLoaded) {
      const timeoutId = setTimeout(cacheTimelineState, 1000); // Debounce caching
      return () => clearTimeout(timeoutId);
    }
  }, [currentTime, minValue, maxValue, isCacheLoaded, cacheTimelineState]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime((prevTime) => {
          const newTime = prevTime + 0.05;
          // If we reach max, loop back to min
          return newTime > parseFloat(maxValue) ? parseFloat(minValue) : newTime;
        });
      }, 50);
    }

    // Cleanup interval on component unmount or when isPlaying changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, maxValue, minValue]);

  return (
    <TimeContext.Provider
      value={{
        minValue,
        maxValue,
        currentTime,
        isPlaying,
        setMinValue,
        setMaxValue,
        setCurrentTime,
        togglePlayPause,
        stepSize,
        
        // Cache-related methods
        restoreTimelineFromCache,
        cacheTimelineState
      }}
    >
      {children}
    </TimeContext.Provider>
  );
}; 