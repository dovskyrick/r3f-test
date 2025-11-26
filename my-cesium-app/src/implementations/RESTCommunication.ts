import { 
  CommunicationLayer, 
  TrajectoryData, 
  CommunicationError 
} from '../interfaces/CommunicationLayer';

// Earth radius in kilometers - same as in TrajectoryContext
const EARTH_RADIUS_KM = 6371;

// Backend to frontend scaling: converts km coordinates to scene units
// This ensures TLE coordinates are scaled to match Earth's 100-unit radius
const BACKEND_TO_FRONTEND_SCALE = 100 / EARTH_RADIUS_KM; // approx. 0.0157

/**
 * REST API implementation of the CommunicationLayer interface.
 * This class handles all REST API calls to the backend.
 */
class RESTCommunication implements CommunicationLayer {
  private lastError: CommunicationError | null = null;
  private loading: boolean = false;
  private lastOperation: (() => Promise<any>) | null = null;

  /**
   * Fetches trajectory data from the backend using TLE data
   */
  async fetchTrajectoryFromTLE(line1: string, line2: string): Promise<TrajectoryData> {
    this.loading = true;
    this.lastOperation = () => this.fetchTrajectoryFromTLE(line1, line2);
    
    try {
      const response = await fetch('http://localhost:8000/trajectory/from-tle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tle_line1: line1,
          tle_line2: line2,
          time_interval: 30 // Points every 30 seconds
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Transform the data to match our TrajectoryData interface
      const transformedData: TrajectoryData = {
        points: rawData.points.map((point: any) => ({
          spherical: {
            longitude: point.spherical.longitude,
            latitude: point.spherical.latitude
          },
          mjd: point.mjd,
          // Include cartesian coordinates if they exist
          cartesian: point.cartesian ? {
            // Step 1: Scale from km to scene units
            // Step 2: Swap Y/Z coordinates and negate Y
            x: point.cartesian.x * BACKEND_TO_FRONTEND_SCALE,                // X stays X
            y: point.cartesian.z * BACKEND_TO_FRONTEND_SCALE,             // backend Z -> frontend -Y
            z: -(point.cartesian.y * BACKEND_TO_FRONTEND_SCALE)                 // backend Y -> frontend Z
          } : undefined
        })),
        // Use the mjd values from first and last points for the time range
        startTime: rawData.points[0].mjd,
        endTime: rawData.points[rawData.points.length - 1].mjd
      };

      this.loading = false;
      this.lastError = null;
      return transformedData;
    } catch (error) {
      this.lastError = {
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        code: 'TRAJECTORY_FETCH_ERROR',
        details: error
      };
      this.loading = false;
      throw this.lastError;
    }
  }

  /**
   * Optional method for fetching attitude data - to be implemented in the future
   */
  async fetchAttitudeData?(satelliteId: string): Promise<any> {
    throw new Error('Attitude data fetching not implemented yet');
  }

  /**
   * Optional method for fetching environmental data - to be implemented in the future
   */
  async fetchEnvironmentalData?(satelliteId: string): Promise<any> {
    throw new Error('Environmental data fetching not implemented yet');
  }

  /**
   * Returns the last error that occurred during communication
   */
  getLastError(): CommunicationError | null {
    return this.lastError;
  }

  /**
   * Clears the last error
   */
  clearError(): void {
    this.lastError = null;
  }

  /**
   * Returns whether a communication operation is in progress
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Retries the last failed operation
   */
  async retryLastOperation(): Promise<void> {
    if (this.lastOperation) {
      await this.lastOperation();
    } else {
      throw new Error('No operation to retry');
    }
  }
}

export default RESTCommunication; 