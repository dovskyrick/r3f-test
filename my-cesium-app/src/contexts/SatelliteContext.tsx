import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useTimeContext } from './TimeContext';
import RESTCommunication from '../implementations/RESTCommunication';
import type { TrajectoryData } from '../interfaces/CommunicationLayer';
import { useCacheContext } from './CacheContext';
import { CachedSatellite } from '../utils/cacheUtils';

// Initialize communication layer
const communication = new RESTCommunication();

// Utility function to generate a unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Generate a random color that's visually distinct
const generateRandomColor = (): string => {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 80%, 60%)`;
};

// Basic TLE validation function
const validateTLE = (line1: string, line2: string): boolean => {
  // TLE line 1 should start with '1 ' and be 69 characters long
  // TLE line 2 should start with '2 ' and be 69 characters long
  return (
    line1.startsWith('1 ') && 
    line2.startsWith('2 ') && 
    line1.length === 69 && 
    line2.length === 69
  );
};

// Enhanced Satellite interface with trajectory data
export interface Satellite {
  id: string;
  name: string;
  isVisible: boolean;
  color: string;
  tle?: {
    line1: string;
    line2: string;
  };
  trajectoryData: {
    points: {
      longitude: number;
      latitude: number;
      mjd: number;
      // 3D cartesian coordinates in ITRF frame
      cartesian?: {
        x: number;
        y: number;
        z: number;
      };
    }[];
    startTime: number;
    endTime: number;
  } | null;
  isLoading?: boolean;
  error?: string | null;
}

// Generate a simple straight-line trajectory with a random angle
const generateSimpleTrajectory = (startMJD: number, endMJD: number) => {
  // Random starting position near center of map
  const startLon = (Math.random() - 0.5) * 60; // -30 to 30 degrees
  const startLat = (Math.random() - 0.5) * 30; // -15 to 15 degrees
  
  // Random angle for trajectory
  const angle = Math.random() * Math.PI * 2;
  
  // Length of trajectory (in degrees)
  const length = 30 + Math.random() * 60; // 30 to 90 degrees
  
  // End position
  const endLon = startLon + length * Math.cos(angle);
  const endLat = startLat + length * Math.sin(angle);
  
  // 3D trajectory parameters - well above Earth surface
  const earthRadius = 6371; // km
  const startAltitude = 500 + Math.random() * 1000; // 500-1500 km altitude
  const endAltitude = 500 + Math.random() * 1000; // 500-1500 km altitude
  
  // Create points along the line
  const numPoints = 20;
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const mjd = startMJD + fraction * (endMJD - startMJD);
    const lon = startLon + fraction * (endLon - startLon);
    const lat = startLat + fraction * (endLat - startLat);
    
    // Convert lat/lon to 3D cartesian coordinates (ITRF frame)
    const altitude = startAltitude + fraction * (endAltitude - startAltitude);
    const radius = earthRadius + altitude;
    
    // Convert spherical to cartesian
    const lonRad = lon * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    
    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.cos(latRad) * Math.sin(lonRad);
    const z = radius * Math.sin(latRad);
    
    points.push({
      longitude: lon,
      latitude: lat,
      mjd: mjd,
      // Add 3D cartesian coordinates in ITRF frame
      cartesian: {
        x: x,
        y: y,
        z: z
      }
    });
  }
  
  return {
    points,
    startTime: startMJD,
    endTime: endMJD
  };
};

// Context type definition
interface SatelliteContextType {
  satellites: Satellite[];
  activeSatelliteId: string | null;
  isSidebarOpen: boolean;
  isGlobalLoading: boolean;
  addSatellite: (name: string) => void;
  addSatelliteFromTLE: (name: string, tleLine1: string, tleLine2: string) => Promise<string>;
  toggleSatellite: (id: string) => void;
  toggleSidebar: () => void;
  setActiveSatellite: (id: string | null) => void;
  getLastError: () => string | null;
  retryLastOperation: () => Promise<void>;
  
  // New cache-related properties
  isRestoringFromCache: boolean;
  restoreSatellitesFromCache: () => Promise<void>;
  cacheSatellites: () => void;
}

// Create the context
const SatelliteContext = createContext<SatelliteContextType | undefined>(undefined);

// Custom hook for using the context
export const useSatelliteContext = () => {
  const context = useContext(SatelliteContext);
  if (context === undefined) {
    throw new Error('useSatelliteContext must be used within a SatelliteProvider');
  }
  return context;
};

// Provider props type
interface SatelliteProviderProps {
  children: ReactNode;
}

// Provider component
export const SatelliteProvider: React.FC<SatelliteProviderProps> = ({ children }) => {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [activeSatelliteId, setActiveSatelliteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);
  const [isRestoringFromCache, setIsRestoringFromCache] = useState<boolean>(false);

  // Access TimeContext to get and set current time range
  const { minValue, maxValue, setMinValue, setMaxValue, setCurrentTime } = useTimeContext();
  
  // Access CacheContext for cache operations
  const { cacheService, isCacheLoaded } = useCacheContext();

  // Update timeline limits based on trajectory data
  const updateTimelineLimits = (trajectoryData: TrajectoryData) => {
    // Only update if trajectory exists
    if (!trajectoryData) return;

    // Update the timeline limits
    setMinValue(trajectoryData.startTime.toString());
    setMaxValue(trajectoryData.endTime.toString());
    
    // Set current time to start time
    setCurrentTime(trajectoryData.startTime);
  };

  // Add a new satellite with a random trajectory
  const addSatellite = (name: string) => {
    // Check for duplicate names (case-insensitive)
    const existingSatellite = satellites.find(sat => 
      sat.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingSatellite) {
      console.warn(`Satellite with name "${name}" already exists. Skipping duplicate.`);
      return;
    }
    
    const newId = generateId();
    const randomColor = generateRandomColor();
    
    // Generate a simple trajectory using current time range
    const startMJD = parseFloat(minValue);
    const endMJD = parseFloat(maxValue);
    const trajectory = generateSimpleTrajectory(startMJD, endMJD);

    const newSatellite: Satellite = {
      id: newId,
      name,
      isVisible: true,
      color: randomColor,
      trajectoryData: trajectory
    };
    
    setSatellites(prevSatellites => [...prevSatellites, newSatellite]);

    // If this is the first satellite, make it active
    if (satellites.length === 0) {
      setActiveSatelliteId(newId);
    }
  };

  // Add a new satellite from TLE data
  const addSatelliteFromTLE = async (name: string, tleLine1: string, tleLine2: string): Promise<string> => {
    try {
      // Check for duplicate names (case-insensitive)
      const existingSatellite = satellites.find(sat => 
        sat.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingSatellite) {
        console.warn(`Satellite with name "${name}" already exists. Skipping duplicate.`);
        throw new Error(`Satellite "${name}" already exists`);
      }
      
      // Validate TLE format
      if (!validateTLE(tleLine1, tleLine2)) {
        throw new Error('Invalid TLE format');
      }

      const newId = generateId();
      const randomColor = generateRandomColor();

      // Create new satellite with loading state
      const newSatellite: Satellite = {
        id: newId,
        name,
        isVisible: true,
        color: randomColor,
        tle: {
          line1: tleLine1,
          line2: tleLine2
        },
        trajectoryData: null,
        isLoading: true,
        error: null
      };

      // Add the satellite to the list
      setSatellites(prev => [...prev, newSatellite]);

      // Fetch trajectory data using our communication layer
      const trajectoryData = await communication.fetchTrajectoryFromTLE(tleLine1, tleLine2);

      // Update the satellite with the trajectory data
      setSatellites(prev => prev.map(sat => 
        sat.id === newId 
          ? {
              ...sat,
              trajectoryData: {
                points: trajectoryData.points.map(point => ({
                  longitude: point.spherical.longitude,
                  latitude: point.spherical.latitude,
                  mjd: point.mjd,
                  // Add 3D cartesian coordinates from ITRF frame (only if available)
                  cartesian: point.cartesian ? {
                    x: point.cartesian.x,
                    y: point.cartesian.y,
                    z: point.cartesian.z
                  } : undefined
                })),
                startTime: trajectoryData.startTime,
                endTime: trajectoryData.endTime
              },
              isLoading: false
            }
          : sat
      ));

      // Update timeline limits based on the new trajectory
      updateTimelineLimits(trajectoryData);

      // If this is the first satellite, make it active
      if (satellites.length === 0) {
        setActiveSatelliteId(newId);
      }

      return newId;
    } catch (error) {
      // Get the error from the communication layer
      const lastError = communication.getLastError();
      const errorMessage = lastError?.message || 'Failed to add satellite';

      // Update the satellite with error state if it was added
      setSatellites(prev => prev.map(sat => 
        sat.name === name && sat.isLoading 
          ? { ...sat, isLoading: false, error: errorMessage }
          : sat
      ));

      throw new Error(errorMessage);
    }
  };

  const toggleSatellite = (id: string) => {
    setSatellites(prevSatellites =>
      prevSatellites.map(satellite =>
        satellite.id === id
          ? { ...satellite, isVisible: !satellite.isVisible }
          : satellite
      )
    );
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const setActiveSatellite = (id: string | null) => {
    setActiveSatelliteId(id);
  };

  const getLastError = () => {
    const error = communication.getLastError();
    return error ? error.message : null;
  };

  const retryLastOperation = async () => {
    setIsGlobalLoading(true);
    try {
      await communication.retryLastOperation();
      setIsGlobalLoading(false);
    } catch (error) {
      setIsGlobalLoading(false);
      throw error;
    }
  };

  // Cache restoration method
  const restoreSatellitesFromCache = useCallback(async (): Promise<void> => {
    if (!isCacheLoaded) return;
    
    setIsRestoringFromCache(true);
    try {
      const cachedSatellites = cacheService.loadSatellites();
      
      if (cachedSatellites.length === 0) {
        console.log('No cached satellites to restore');
        return;
      }

      // Filter out satellites that already exist (prevent duplicates by name)
      const currentSatelliteNames = satellites.map(sat => sat.name.toLowerCase());
      const satellitesToRestore = cachedSatellites.filter(cached => 
        !currentSatelliteNames.includes(cached.name.toLowerCase())
      );
      
      if (satellitesToRestore.length === 0) {
        console.log('No new satellites to restore (all already exist)');
        return;
      }
      
      console.log(`Restoring ${satellitesToRestore.length} new satellites from cache (${cachedSatellites.length - satellitesToRestore.length} duplicates skipped)`);
      
      // Convert cached satellites back to full satellite objects
      for (const cached of satellitesToRestore) {
        try {
          // Add satellite using existing TLE method if TLE data exists
          if (cached.tleLine1 && cached.tleLine2) {
            const newId = await addSatelliteFromTLE(cached.name, cached.tleLine1, cached.tleLine2);
            
            // Restore cached properties like color and visibility
            setSatellites(prev => prev.map(sat => 
              sat.id === newId 
                ? { 
                    ...sat, 
                    color: cached.color, 
                    isVisible: cached.isVisible,
                    id: cached.id // Use original cached ID for consistency
                  }
                : sat
            ));
          } else {
            // For satellites without TLE data, add as random trajectory
            addSatellite(cached.name);
            
            // Update with cached properties
            setSatellites(prev => prev.map((sat, index) => 
              index === prev.length - 1 // Last added satellite
                ? { 
                    ...sat, 
                    color: cached.color, 
                    isVisible: cached.isVisible,
                    id: cached.id // Use original cached ID
                  }
                : sat
            ));
          }
        } catch (error) {
          console.warn(`Failed to restore satellite ${cached.name}:`, error);
        }
      }
      
      console.log('Satellite restoration completed');
    } catch (error) {
      console.error('Failed to restore satellites from cache:', error);
    } finally {
      setIsRestoringFromCache(false);
    }
  }, [isCacheLoaded, cacheService, addSatelliteFromTLE, addSatellite]);

  // Cache current satellites
  const cacheSatellites = useCallback((): void => {
    if (!isCacheLoaded || isRestoringFromCache) return;
    
    try {
             const satellitesToCache: CachedSatellite[] = satellites.map(sat => ({
         id: sat.id,
         name: sat.name,
         tleLine1: sat.tle?.line1 || '',
         tleLine2: sat.tle?.line2 || '',
         color: sat.color,
         isVisible: sat.isVisible
         // timeInterval will be added later when the feature is implemented
       }));
      
      cacheService.saveSatellites(satellitesToCache);
    } catch (error) {
      console.warn('Failed to cache satellites:', error);
    }
  }, [satellites, isCacheLoaded, isRestoringFromCache, cacheService]);

  // Auto-cache effect when satellites change
  useEffect(() => {
    if (isCacheLoaded && !isRestoringFromCache && satellites.length > 0) {
      const timeoutId = setTimeout(cacheSatellites, 1000); // Debounce caching
      return () => clearTimeout(timeoutId);
    }
  }, [satellites, isCacheLoaded, isRestoringFromCache, cacheSatellites]);

  const value = {
    satellites,
    activeSatelliteId,
    isSidebarOpen,
    isGlobalLoading,
    addSatellite,
    addSatelliteFromTLE,
    toggleSatellite,
    toggleSidebar,
    setActiveSatellite,
    getLastError,
    retryLastOperation,
    
    // Cache-related properties
    isRestoringFromCache,
    restoreSatellitesFromCache,
    cacheSatellites
  };

  return (
    <SatelliteContext.Provider value={value}>
      {children}
    </SatelliteContext.Provider>
  );
}; 