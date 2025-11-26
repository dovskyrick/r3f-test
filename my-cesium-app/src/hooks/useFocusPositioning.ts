import { useCallback } from 'react';
import { useSatelliteContext } from '../contexts/SatelliteContext';
import { useTimeContext } from '../contexts/TimeContext';
import { interpolatePosition } from '../utils/satelliteUtils'; // IMPORT from shared utility

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface FocusPositioning {
  getApparentPosition: (realPosition: Position3D, objectId?: string) => Position3D;
  getFocusedSatellitePosition: () => Position3D | null;
  isInFocusMode: boolean;
}

export const useFocusPositioning = (): FocusPositioning => {
  const { focusedSatelliteId, satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();

  // REUSE existing position calculation - no new computation needed!
  const getFocusedSatellitePosition = useCallback((): Position3D | null => {
    if (!focusedSatelliteId) return null;
    
    const focusedSatellite = satellites.find(sat => sat.id === focusedSatelliteId);
    if (!focusedSatellite || !focusedSatellite.trajectoryData) return null;

    // IMPORT and use the same interpolation logic from TrajectoryMarker.tsx
    const position = interpolatePosition(focusedSatellite.trajectoryData.points, currentTime, 1.0);
    if (!position) return null;

    return {
      x: position.x,
      y: position.y,
      z: position.z
    };
  }, [focusedSatelliteId, satellites, currentTime]);

  // Calculate apparent position for any object
  const getApparentPosition = useCallback((realPosition: Position3D, objectId?: string): Position3D => {
    // If this is the focused satellite itself, place it at center
    if (objectId === focusedSatelliteId) {
      return { x: 0, y: 0, z: 0 };
    }

    const focusCenter = getFocusedSatellitePosition();
    if (!focusCenter) {
      return realPosition; // No focus mode, return real position
    }

    // Calculate apparent position = real position - focus center
    const apparentPosition = {
      x: realPosition.x - focusCenter.x,
      y: realPosition.y - focusCenter.y,
      z: realPosition.z - focusCenter.z
    };

    return apparentPosition;
  }, [focusedSatelliteId, getFocusedSatellitePosition]);

  return {
    getApparentPosition,
    getFocusedSatellitePosition,
    isInFocusMode: !!focusedSatelliteId
  };
}; 