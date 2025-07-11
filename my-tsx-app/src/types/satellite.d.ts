// Additional type exports for satellite.js types that aren't exported from main module
declare module 'satellite.js' {
  export interface EciVec3<T> {
    x: T;
    y: T;
    z: T;
  }

  export interface EcfVec3<T> {
    x: T;
    y: T;
    z: T;
  }

  export type GMSTime = number;
} 