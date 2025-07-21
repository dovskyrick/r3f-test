import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryLinesProps {
  isAlternateView: boolean;
}

const TrajectoryLines: React.FC<TrajectoryLinesProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();
  
  // Create line points for each visible satellite
  const satelliteLines = useMemo(() => {
    const lines: Array<{
      points: THREE.Vector3[];
      color: string;
      satelliteId: string;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // Filter points that have 3D cartesian coordinates
        const validPoints = satellite.trajectoryData.points.filter(point => point.cartesian);
        
        if (validPoints.length > 1) { // Need at least 2 points to draw a line
          const linePoints = validPoints.map(point => {
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
            satelliteId: satellite.id
          });
        }
      }
    });
    
    // DEBUG: Log trajectory line processing
    console.log('[TrajectoryLines] Lines calculated:', {
      lineCount: lines.length,
      isAlternateView,
      isInFocusMode,
      satellites: satellites.map(s => ({ 
        id: s.id, 
        isVisible: s.isVisible, 
        pointCount: s.trajectoryData?.points.length || 0 
      }))
    });

    return lines;
  }, [satellites, isAlternateView, getApparentPosition, isInFocusMode]);
  
  return (
    <group>
      {satelliteLines.map((line, index) => (
        <Line
          key={`trajectory-line-${line.satelliteId}`}
          points={line.points}
          color={line.color}
          lineWidth={1}
          dashed={false}
          transparent={true}
          opacity={0.7}
        />
      ))}
    </group>
  );
};

export default TrajectoryLines; 