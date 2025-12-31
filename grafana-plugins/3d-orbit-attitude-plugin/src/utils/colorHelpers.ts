/**
 * Color Helper Utilities
 * 
 * Conversion functions between different color formats for sensor customization.
 */

/**
 * Convert hex color string to RGB object
 * @param hex - Hex color string (e.g., "#00FFFF" or "00FFFF")
 * @returns RGB object with r, g, b values (0-255) or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Validate hex format (3 or 6 characters)
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    console.warn(`Invalid hex color: ${hex}`);
    return null;
  }
  
  // Expand shorthand hex (e.g., "FFF" -> "FFFFFF")
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  return { r, g, b, a: 0.6 };  // Default alpha for sensors
}

/**
 * Convert RGB object to hex color string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string (e.g., "#00FFFF")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

