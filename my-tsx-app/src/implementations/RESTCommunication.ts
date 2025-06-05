import { 
  CommunicationLayer, 
  TrajectoryData, 
  CommunicationError 
} from '../interfaces/CommunicationLayer';

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
          mjd: point.mjd
        })),
        startTime: parseFloat(rawData.start_time.split(' ')[0]),
        endTime: parseFloat(rawData.end_time.split(' ')[0])
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