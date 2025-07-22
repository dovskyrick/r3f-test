import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';
import { getFutureTrajectorySegments, DEFAULT_FUTURE_CONFIG } from '../../utils/trajectoryUtils';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryLinesProps {
  isAlternateView: boolean;
  futureSegmentCount?: number; // Optional override for segment count
}

const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ 
  isAlternateView,
  futureSegmentCount = 12 
}) => {
  const { satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();
  
  // Create future trajectory lines for each visible satellite
  const satelliteLines = useMemo(() => {
    const lines: Array<{
      points: THREE.Vector3[];
      color: string;
      satelliteId: string;
      opacity: number;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    console.log('[TrajectoryLines] Processing satellite lines with time-based future segments, currentTime:', currentTime);
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Filter points that have 3D cartesian coordinates
        const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
        
        if (validPoints.length > 1) {
          // Use time-based future trajectory filtering
          const futurePoints = getFutureTrajectorySegments(validPoints, currentTime, {
            ...DEFAULT_FUTURE_CONFIG,
            segmentCount: futureSegmentCount
          });
          
          console.log(`[TrajectoryLines] Time-based filtering for satellite ${satellite.id}:`, {
            currentTime,
            totalPoints: validPoints.length,
            futurePointsCount: futurePoints.length,
            timeRange: validPoints.length > 0 ? {
              start: validPoints[0].mjd,
              end: validPoints[validPoints.length - 1].mjd
            } : null
          });
          
          if (futurePoints.length > 1) { // Need at least 2 points to draw a line
            const linePoints = futurePoints.map(point => {
              // Calculate real position for this trajectory point
              const realPosition = new THREE.Vector3(
                point.cartesian!.x * viewScale,
                point.cartesian!.y * viewScale,
                point.cartesian!.z * viewScale
              );
              
              // Apply focus mode positioning (only in normal view)
              if (isAlternateView || !isInFocusMode) {
                return realPosition; // Normal behavior - use real position
              } else {
                // Focus mode - transform trajectory points relative to focused satellite
                // NOTE: For trajectory lines, we DON'T use satellite.id as objectId
                // because that would collapse focused satellite's trajectory to origin
                const apparent = getApparentPosition(
                  { x: realPosition.x, y: realPosition.y, z: realPosition.z },
                  undefined // No objectId - treat as generic object, not the satellite itself
                );
                return new THREE.Vector3(apparent.x, apparent.y, apparent.z);
              }
            });
            
            lines.push({
              points: linePoints,
              color: satellite.color,
              satelliteId: satellite.id,
              opacity: 0.8
            });
          }
        }
      }
    });
    
    // DEBUG: Log trajectory processing
    console.log('[TrajectoryLines] Time-based trajectory lines calculated:', {
      currentTime,
      lineCount: lines.length,
      isAlternateView,
      isInFocusMode,
      futureSegmentCount,
      satellites: satellites.map(s => ({ 
        id: s.id, 
        isVisible: s.isVisible, 
        pointCount: s.trajectoryData?.points.length || 0 
      }))
    });

    return lines;
  }, [satellites, currentTime, isAlternateView, getApparentPosition, isInFocusMode, futureSegmentCount]);
  
  return (
    <group>
      {satelliteLines.map((line) => (
        <Line
          key={`future-trajectory-line-${line.satelliteId}`}
          points={line.points}
          color={line.color}
          lineWidth={2} // Slightly thicker for better visibility
          dashed={false}
          transparent={true}
          opacity={line.opacity}
        />
      ))}
    </group>
  );
};

export default TrajectoryLines; 