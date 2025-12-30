export interface GroundStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;  // Total altitude (terrain + antenna height) in meters
}

