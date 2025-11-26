/**
 * Types for trajectory data received from the backend
 */
interface TrajectoryPoint {
  cartesian: {
    x: number;
    y: number;
    z: number;
  };
  spherical: {
    latitude: number;
    longitude: number;
  };
  epoch: string;
  mjd: number;
}

interface TrajectoryData {
  points: TrajectoryPoint[];
  startTime: number;  // MJD
  endTime: number;    // MJD
}

/**
 * Future data types - these will be implemented as needed
 */
interface AttitudeData {
  // To be defined based on future requirements
  // Example structure:
  // quaternion?: { w: number; x: number; y: number; z: number };
  // eulerAngles?: { roll: number; pitch: number; yaw: number };
  // timestamp: number;
}

interface EnvironmentalData {
  // To be defined based on future requirements
  // Example structure:
  // temperature?: number;
  // radiation?: number;
  // timestamp: number;
}

/**
 * Error handling types
 */
interface CommunicationError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Main communication interface
 * This interface defines all methods for communicating with the backend.
 * Methods marked with ? are optional and can be implemented as needed.
 */
interface CommunicationLayer {
  // Current Methods - These are actively used
  fetchTrajectoryFromTLE(line1: string, line2: string): Promise<TrajectoryData>;
  
  // Future Methods - These will be implemented as needed
  fetchAttitudeData?(satelliteId: string): Promise<AttitudeData>;
  fetchEnvironmentalData?(satelliteId: string): Promise<EnvironmentalData>;
  
  // Error Handling
  getLastError(): CommunicationError | null;
  clearError(): void;
  
  // State Management
  isLoading(): boolean;
  retryLastOperation(): Promise<void>;
}

export type {
  CommunicationLayer,
  TrajectoryData,
  TrajectoryPoint,
  AttitudeData,
  EnvironmentalData,
  CommunicationError
}; 