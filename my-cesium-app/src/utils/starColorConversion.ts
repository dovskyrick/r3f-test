/**
 * Utilities for converting astronomical data to visual properties
 */

/**
 * Converts B-V color index to RGB color
 * Based on approximate blackbody radiation color
 * 
 * B-V ranges from about -0.4 (blue) to +2.0 (red)
 * 
 * Reference: https://en.wikipedia.org/wiki/Color_index
 */
export function colorIndexToRGB(colorIndex: number | null): [number, number, number] {
  if (colorIndex === null) {
    // Default to white if no color index
    return [1.0, 1.0, 1.0];
  }

  // Clamp color index to reasonable range
  const bv = Math.max(-0.4, Math.min(2.0, colorIndex));

  let r: number, g: number, b: number;

  if (bv < 0) {
    // Blue-white stars (hot, O and B type stars)
    r = 0.7 + (bv + 0.4) * 0.75;
    g = 0.8 + (bv + 0.4) * 0.5;
    b = 1.0;
  } else if (bv < 0.6) {
    // White to yellow stars (A, F, G type stars like our Sun)
    r = 1.0;
    g = 1.0 - (bv * 0.3);
    b = 1.0 - (bv * 0.7);
  } else if (bv < 1.5) {
    // Orange stars (K type stars)
    r = 1.0;
    g = 0.8 - ((bv - 0.6) * 0.4);
    b = 0.6 - ((bv - 0.6) * 0.5);
  } else {
    // Red stars (M type stars)
    r = 1.0;
    g = 0.4;
    b = 0.2;
  }

  return [r, g, b];
}

/**
 * Converts apparent magnitude to star size in pixels
 * Lower magnitude = brighter = larger size
 * 
 * Magnitude scale:
 * - Sirius (brightest star): -1.44
 * - Faint visible stars: ~6.5
 * 
 * @param magnitude Apparent magnitude of the star
 * @returns Size in pixels (range: 1.0 to 4.0)
 */
export function magnitudeToSize(magnitude: number): number {
  // Invert scale: brighter stars (lower magnitude) get larger size
  const normalized = (6.5 - magnitude) / 8.0; // Normalize to 0-1 range
  const size = 1.0 + (normalized * 3.0); // Scale to 1.0-4.0 range
  
  return Math.max(1.0, Math.min(4.0, size));
}

/**
 * Converts apparent magnitude to opacity/brightness
 * Brighter stars are more opaque
 * 
 * @param magnitude Apparent magnitude of the star
 * @returns Opacity value (range: 0.3 to 1.0)
 */
export function magnitudeToBrightness(magnitude: number): number {
  // Brighter stars (lower magnitude) more opaque
  const normalized = (6.5 - magnitude) / 8.0;
  const brightness = 0.3 + (normalized * 0.7);
  
  return Math.max(0.3, Math.min(1.0, brightness));
}

/**
 * Get a human-readable description of star color
 * Useful for debugging or UI display
 */
export function colorIndexToDescription(colorIndex: number | null): string {
  if (colorIndex === null) return 'White';
  
  if (colorIndex < -0.2) return 'Blue-White';
  if (colorIndex < 0.3) return 'White';
  if (colorIndex < 0.6) return 'Yellow-White';
  if (colorIndex < 1.0) return 'Yellow';
  if (colorIndex < 1.5) return 'Orange';
  return 'Red';
}

