import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useTimeContext } from './TimeContext';

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
  
  // Create points along the line
  const numPoints = 20;
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const mjd = startMJD + fraction * (endMJD - startMJD);
    const lon = startLon + fraction * (endLon - startLon);
    const lat = startLat + fraction * (endLat - startLat);
    
    points.push({
      longitude: lon,
      latitude: lat,
      mjd: mjd
    });
  }
  
  return {
    points,
    startTime: startMJD,
    endTime: endMJD
  };
};

// Fetch trajectory from backend using TLE data
const fetchTrajectoryFromTLE = async (tleLine1: string, tleLine2: string) => {
  try {
    const response = await fetch('http://localhost:8000/trajectory/from-tle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tle_line1: tleLine1,
        tle_line2: tleLine2,
        time_interval: 30 // Points every 30 seconds
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch trajectory:', error);
    throw error;
  }
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

  // Access TimeContext to get and set current time range
  const { minValue, maxValue, setMinValue, setMaxValue, setCurrentTime } = useTimeContext();

  // Update timeline limits based on trajectory data
  const updateTimelineLimits = (trajectoryData: { startTime: number, endTime: number }) => {
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
      // Validate TLE format
      if (!validateTLE(tleLine1, tleLine2)) {
        throw new Error(`Invalid TLE format, ${tleLine1.startsWith('1 ')} ${tleLine2.startsWith('2 ')} ${tleLine1.length === 69} ${tleLine2.length === 69}`);
      }

      // Create a new satellite with loading state
      const newId = generateId();
      const randomColor = generateRandomColor();

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
      setSatellites(prevSatellites => [...prevSatellites, newSatellite]);

      // If this is the first satellite, make it active
      if (satellites.length === 0) {
        setActiveSatelliteId(newId);
      }

      // Set global loading state
      setIsGlobalLoading(true);

      try {
        // Fetch trajectory from backend
        const trajectoryData = await fetchTrajectoryFromTLE(tleLine1, tleLine2);
        
        // Transform backend response to our format
        const transformedTrajectory = {
          points: trajectoryData.points.map((point: any) => ({
            longitude: point.spherical.longitude,
            latitude: point.spherical.latitude,
            mjd: point.mjd
          })),
          startTime: parseFloat(trajectoryData.start_time.split(' ')[0]),
          endTime: parseFloat(trajectoryData.end_time.split(' ')[0])
        };

        // Update the satellite with trajectory data
        setSatellites(prevSatellites => 
          prevSatellites.map(satellite => 
            satellite.id === newId 
              ? { 
                  ...satellite, 
                  trajectoryData: transformedTrajectory,
                  isLoading: false,
                  error: null
                } 
              : satellite
          )
        );

        // Update timeline limits to match the new trajectory
        updateTimelineLimits(transformedTrajectory);
        
        return newId;
      } catch (error) {
        // Update the satellite with error state
        setSatellites(prevSatellites => 
          prevSatellites.map(satellite => 
            satellite.id === newId 
              ? { 
                  ...satellite, 
                  isLoading: false, 
                  error: error instanceof Error ? error.message : "Failed to fetch trajectory"
                } 
              : satellite
          )
        );
        
        throw error;
      } finally {
        setIsGlobalLoading(false);
      }
    } catch (error) {
      console.error('Error adding satellite from TLE:', error);
      throw error;
    }
  };

  // Toggle satellite visibility
  const toggleSatellite = (id: string) => {
    setSatellites(prevSatellites => 
      prevSatellites.map(satellite => 
        satellite.id === id 
          ? { ...satellite, isVisible: !satellite.isVisible } 
          : satellite
      )
    );
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Set the active satellite
  const setActiveSatellite = (id: string | null) => {
    setActiveSatelliteId(id);
  };

  // Context value
  const contextValue: SatelliteContextType = {
    satellites,
    activeSatelliteId,
    isSidebarOpen,
    isGlobalLoading,
    addSatellite,
    addSatelliteFromTLE,
    toggleSatellite,
    toggleSidebar,
    setActiveSatellite
  };

  return (
    <SatelliteContext.Provider value={contextValue}>
      {children}
    </SatelliteContext.Provider>
  );
}; 