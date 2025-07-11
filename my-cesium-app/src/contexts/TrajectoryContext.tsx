import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTimeContext } from './TimeContext';

// Earth radius in kilometers
export const EARTH_RADIUS_KM = 6371;

// Scale factor for 3D visualization (100 units = Earth radius)
export const SCALE_FACTOR = 100 / EARTH_RADIUS_KM; // approx. 0.0157

// Define types for trajectory data
export interface CartesianPoint {
  x: number;
  y: number;
  z: number;
}

export interface SphericalPoint {
  longitude: number;
  latitude: number;
}

export interface TrajectoryPoint {
  epoch: string;
  cartesian: CartesianPoint;
  spherical: SphericalPoint;
  mjd: number;
}

export interface TrajectoryData {
  points: TrajectoryPoint[];
  start_time: string;
  end_time: string;
  point_count: number;
  status: string;
  message?: string;
}

// Context type definition
interface TrajectoryContextType {
  trajectoryData: TrajectoryData | null;
  isTrajectoryVisible: boolean;
  isLoading: boolean;
  error: string | null;
  fetchTrajectory: () => Promise<void>;
  toggleTrajectoryVisibility: () => void;
  isTrajectoryLoaded: boolean;
  retryFetch: () => Promise<void>;
}

// Create the context
const TrajectoryContext = createContext<TrajectoryContextType | undefined>(undefined);

// Provider props type
interface TrajectoryProviderProps {
  children: ReactNode;
}

// Provider component
export const TrajectoryProvider: React.FC<TrajectoryProviderProps> = ({ children }) => {
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [isTrajectoryVisible, setIsTrajectoryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Access the TimeContext to update min/max values
  const { setMinValue, setMaxValue, setCurrentTime } = useTimeContext();

  // Track if trajectory has been loaded
  const isTrajectoryLoaded = trajectoryData !== null;

  // Fetch trajectory data from API
  const fetchTrajectory = async () => {
    if (isTrajectoryLoaded) return; // Don't fetch if already loaded
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/trajectory?time_interval=30');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTrajectoryData(data);
    } catch (err) {
      console.error('Error fetching trajectory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trajectory data');
    } finally {
      setIsLoading(false);
    }
  };

  // Update time slider range when trajectory data is loaded
  useEffect(() => {
    if (trajectoryData && trajectoryData.points.length > 0) {
      // Find min and max MJD values in the trajectory data
      const mjdValues = trajectoryData.points.map(point => point.mjd);
      const minMJD = Math.min(...mjdValues);
      const maxMJD = Math.max(...mjdValues);
      
      // Round to 4 decimal places for readability
      const roundedMinMJD = Math.floor(minMJD * 10000) / 10000;
      const roundedMaxMJD = Math.ceil(maxMJD * 10000) / 10000;
      
      console.log(`Setting time range to MJD: ${roundedMinMJD} - ${roundedMaxMJD}`);
      
      // Update the time slider range
      setMinValue(roundedMinMJD.toString());
      setMaxValue(roundedMaxMJD.toString());
      
      // Set current time to the minimum value to start
      setCurrentTime(roundedMinMJD);
    }
  }, [trajectoryData, setMinValue, setMaxValue, setCurrentTime]);

  // Retry function for error recovery
  const retryFetch = async () => {
    setTrajectoryData(null); // Clear existing data
    await fetchTrajectory(); // Try again
  };

  // Toggle visibility of trajectory
  const toggleTrajectoryVisibility = () => {
    if (!isTrajectoryLoaded && !isTrajectoryVisible) {
      // First time showing - need to fetch data
      fetchTrajectory();
    }
    
    // Toggle visibility
    setIsTrajectoryVisible(prev => !prev);
  };

  // Context value
  const contextValue: TrajectoryContextType = {
    trajectoryData,
    isTrajectoryVisible,
    isLoading,
    error,
    fetchTrajectory,
    toggleTrajectoryVisibility,
    isTrajectoryLoaded,
    retryFetch
  };

  return (
    <TrajectoryContext.Provider value={contextValue}>
      {children}
    </TrajectoryContext.Provider>
  );
};

// Custom hook for accessing the context
export const useTrajectoryContext = () => {
  const context = useContext(TrajectoryContext);
  
  if (context === undefined) {
    throw new Error('useTrajectoryContext must be used within a TrajectoryProvider');
  }
  
  return context;
}; 