export interface SensorOrientation {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

export interface SensorDefinition {
  id: string;
  name: string;
  fov: number;  // Field of view in degrees
  orientation: SensorOrientation;  // Relative to satellite body frame
  color?: string;  // Optional hex color (e.g., "#00FFFF") - defaults to SENSOR_COLORS if not specified
}

