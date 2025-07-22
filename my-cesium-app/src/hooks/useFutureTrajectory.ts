import { useMemo } from 'react';
import { useTimeContext } from '../contexts/TimeContext';
import { 
  getFutureTrajectorySegments, 
  FutureTrajectoryConfig, 
  DEFAULT_FUTURE_CONFIG,
  calculateSegmentOpacity 
} from '../utils/trajectoryUtils';
import { SatelliteTrajectoryPoint } from '../utils/satelliteUtils';

interface FutureTrajectoryResult {
  futurePoints: SatelliteTrajectoryPoint[];
  segmentOpacities: number[];
  isInRange: boolean;
}

interface UseFutureTrajectoryProps {
  trajectoryPoints: SatelliteTrajectoryPoint[];
  config?: FutureTrajectoryConfig;
}

export const useFutureTrajectory = ({
  trajectoryPoints,
  config = DEFAULT_FUTURE_CONFIG
}: UseFutureTrajectoryProps): FutureTrajectoryResult => {
  const { currentTime } = useTimeContext();
  
  // Calculate future trajectory segments
  const futureTrajectoryData = useMemo(() => {
    console.log('[useFutureTrajectory] Starting calculation:', {
      currentTime,
      totalPoints: trajectoryPoints.length,
      segmentCount: config.segmentCount,
      smoothing: config.smoothing,
      fadeEffect: config.fadeEffect
    });

    const futurePoints = getFutureTrajectorySegments(trajectoryPoints, currentTime, config);
    
    console.log('[useFutureTrajectory] Future segments calculated:', {
      futurePointsCount: futurePoints.length,
      firstPointTime: futurePoints[0]?.mjd,
      lastPointTime: futurePoints[futurePoints.length - 1]?.mjd,
      currentTime
    });
    
    // Calculate opacity for each segment
    const segmentOpacities = futurePoints.map((_, index) => 
      calculateSegmentOpacity(index, futurePoints.length, config)
    );
    
    // Determine if satellite is within trajectory time range
    const isInRange = trajectoryPoints.length > 0 && 
      currentTime >= trajectoryPoints[0].mjd && 
      currentTime <= trajectoryPoints[trajectoryPoints.length - 1].mjd;
    
    console.log('[useFutureTrajectory] Result summary:', {
      futurePointsCount: futurePoints.length,
      segmentOpacities: segmentOpacities.slice(0, 3), // Show first 3 opacities
      isInRange,
      timeRange: trajectoryPoints.length > 0 ? {
        start: trajectoryPoints[0].mjd,
        end: trajectoryPoints[trajectoryPoints.length - 1].mjd,
        current: currentTime
      } : null
    });
    
    return {
      futurePoints,
      segmentOpacities, 
      isInRange
    };
  }, [trajectoryPoints, currentTime, config]);
  
  return futureTrajectoryData;
}; 