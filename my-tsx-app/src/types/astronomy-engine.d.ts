declare module 'astronomy-engine' {
  export interface RotationMatrix {
    rot: [
      [number, number, number],
      [number, number, number],
      [number, number, number]
    ];
  }

  /**
   * Calculates a rotation matrix for converting J2000 mean equator (EQJ) to equatorial of-date (EQD).
   * This is the function we need for converting between ICRF (celestial) and terrestrial frames.
   */
  export function Rotation_EQJ_EQD(date: Date): RotationMatrix;
} 