/**
 * constants.ts
 * 
 * Color maps and helper utilities for the Satellite Visualizer.
 * 
 * Refactored: January 14, 2026 (Phase 1 Refactoring)
 * Extracted from SatelliteVisualizer.tsx for better maintainability.
 */

import { Color } from 'cesium';

/**
 * Grafana color label to hex mapping
 * Handles Grafana's custom color preset labels (e.g., "dark-red", "light-yellow")
 * that can be returned by the ColorPicker component instead of hex values.
 */
export const grafanaColorMap: Record<string, string> = {
  // Reds
  'dark-red': '#8B0000', 'semi-dark-red': '#B22222', 'red': '#FF0000', 'light-red': '#FF6B6B', 'super-light-red': '#FFB3B3',
  // Oranges
  'dark-orange': '#CC5500', 'semi-dark-orange': '#E56717', 'orange': '#FFA500', 'light-orange': '#FFB84D', 'super-light-orange': '#FFD699',
  // Yellows
  'dark-yellow': '#B8860B', 'semi-dark-yellow': '#DAA520', 'yellow': '#FFFF00', 'light-yellow': '#FFFF66', 'super-light-yellow': '#FFFFB3',
  // Greens
  'dark-green': '#006400', 'semi-dark-green': '#228B22', 'green': '#00FF00', 'light-green': '#90EE90', 'super-light-green': '#C1FFC1',
  // Blues
  'dark-blue': '#00008B', 'semi-dark-blue': '#0000CD', 'blue': '#0000FF', 'light-blue': '#6B6BFF', 'super-light-blue': '#B3B3FF',
  // Purples
  'dark-purple': '#4B0082', 'semi-dark-purple': '#6A0DAD', 'purple': '#800080', 'light-purple': '#DA70D6', 'super-light-purple': '#E6B3E6',
};

/**
 * Safe color parser - handles hex, CSS names, AND Grafana's custom labels
 * 
 * @param colorString - Color string to parse (hex, CSS name, or Grafana label)
 * @param fallback - Fallback Cesium Color if parsing fails
 * @returns Cesium Color object
 * 
 * @example
 * safeColor('#FF0000', Color.WHITE)          // Returns red color
 * safeColor('dark-red', Color.WHITE)         // Returns Grafana's dark red (#8B0000)
 * safeColor('invalid', Color.WHITE)          // Returns fallback (white)
 */
export const safeColor = (colorString: string | undefined, fallback: Color): Color => {
  if (!colorString) {
    return fallback;
  }
  
  // Check if it's a Grafana preset label (e.g., "dark-red", "light-yellow")
  const lowerColor = colorString.toLowerCase().trim();
  if (grafanaColorMap[lowerColor]) {
    return Color.fromCssColorString(grafanaColorMap[lowerColor]);
  }
  
  // Try standard CSS parsing (hex, rgb, named colors)
  try {
    const parsed = Color.fromCssColorString(colorString);
    return parsed || fallback;
  } catch {
    return fallback;
  }
};

