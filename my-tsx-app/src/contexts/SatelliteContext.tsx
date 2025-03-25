import React, { createContext, useContext, useState, ReactNode } from 'react';

// Simple function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Define the satellite interface
export interface Satellite {
  id: string;
  name: string;
  isVisible: boolean;
  // Can be expanded with TLE data, trajectory points, etc.
}

// Define the context type
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

  // Add a new satellite with the given name
  const addSatellite = (name: string) => {
    const newSatellite: Satellite = {
      id: generateId(), // Generate a unique ID
      name,
      isVisible: true, // New satellites are visible by default
    };
    
    setSatellites(prev => [...prev, newSatellite]);
  };

  // Toggle a satellite's visibility
  const toggleSatellite = (id: string) => {
    setSatellites(prev =>
      prev.map(satellite =>
        satellite.id === id
          ? { ...satellite, isVisible: !satellite.isVisible }
          : satellite
      )
    );
  };

  // Toggle the sidebar open/closed state
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Context value
  const contextValue: SatelliteContextType = {
    satellites,
    activeSatelliteId,
    isSidebarOpen,
    addSatellite,
    toggleSatellite,
    toggleSidebar,
    setActiveSatellite: setActiveSatelliteId,
  };

  return (
    <SatelliteContext.Provider value={contextValue}>
      {children}
    </SatelliteContext.Provider>
  );
}; 