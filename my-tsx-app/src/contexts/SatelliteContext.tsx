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

// Enhanced Satellite interface with trajectory data
export interface Satellite {
  id: string;
  name: string;
  isVisible: boolean;
  color: string;
  trajectoryData: {
    points: {
      longitude: number;
      latitude: number;
      mjd: number;
    }[];
    startTime: number;
    endTime: number;
  } | null;
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

// Context type definition
interface SatelliteContextType {
  satellites: Satellite[];
  activeSatelliteId: string | null;
  isSidebarOpen: boolean;
  addSatellite: (name: string) => void;
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
  
  // Access TimeContext to get current time range
  const { minValue, maxValue } = useTimeContext();

  // Add a new satellite
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
    addSatellite,
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