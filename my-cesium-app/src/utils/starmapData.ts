/**
 * Star and constellation data loader
 * Loads JSON data and creates lookup maps
 */

import starsJson from '../assets/visibleStarsFormatted.json';
import constellationsJson from '../assets/ConstellationLines.json';
import { StarData, ConstellationsData } from '../types/StarData';

// Type assertions for imported JSON
export const starsData = starsJson as StarData[];
export const constellationsData = constellationsJson as ConstellationsData;

// Create HR number lookup map for fast constellation rendering
export const starsByHR: Map<number, StarData> = new Map();

// Build the lookup map
starsData.forEach(star => {
  if (star.hr !== null) {
    starsByHR.set(star.hr, star);
  }
});

// Create a Set of all HR numbers that belong to constellations
export const constellationStarHRNumbers: Set<number> = new Set();

Object.values(constellationsData).forEach(constellation => {
  constellation.stars.forEach(hrNumber => {
    constellationStarHRNumbers.add(hrNumber);
  });
});

console.log(`[StarmapData] Loaded ${starsData.length} stars`);
console.log(`[StarmapData] Loaded ${Object.keys(constellationsData).length} constellations`);
console.log(`[StarmapData] Created HR lookup map with ${starsByHR.size} entries`);
console.log(`[StarmapData] Identified ${constellationStarHRNumbers.size} constellation stars`);

