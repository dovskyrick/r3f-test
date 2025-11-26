/**
 * Star data types based on visibleStarsFormatted.json structure
 */

export interface StarData {
  x: number;              // Cartesian X coordinate
  y: number;              // Cartesian Y coordinate  
  z: number;              // Cartesian Z coordinate
  ra: number;             // Right Ascension (hours)
  dec: number;            // Declination (degrees)
  mag: number;            // Apparent magnitude (brightness)
  ci: number | null;      // Color index (B-V)
  bf: string | null;      // Bayer/Flamsteed designation
  hr: number | null;      // Harvard Revised (HR) catalog number
  proper: string | null;  // Proper name (e.g., "Sirius", "Betelgeuse")
  az: number;             // Azimuth (radians)
  alt: number;            // Altitude (radians)
}

export interface ConstellationData {
  count: number;          // Number of line segments
  stars: number[];        // Array of HR catalog numbers to connect
}

export interface ConstellationsData {
  [key: string]: ConstellationData; // Constellation abbreviation as key
}

export interface ProcessedStarData {
  position: [number, number, number];
  magnitude: number;
  color: [number, number, number]; // RGB based on color index
  size: number;                    // Derived from magnitude
  brightness: number;              // Opacity/intensity
  name?: string;
  hrNumber?: number;
}

