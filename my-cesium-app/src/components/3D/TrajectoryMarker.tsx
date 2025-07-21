import React, { useMemo } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useTimeContext } from '../../contexts/TimeContext';
import * as THREE from 'three';
import { interpolatePosition, SatelliteTrajectoryPoint } from '../../utils/satelliteUtils';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

// Alternative View descale factor - matches Earth scaling in alternate view
const AV_DESCALE_FACTOR = 0.5;

interface TrajectoryMarkerProps {
  isAlternateView: boolean;
}

const TrajectoryMarker: React.FC<TrajectoryMarkerProps> = ({ isAlternateView }) => {
  const { satellites } = useSatelliteContext();
  const { currentTime } = useTimeContext();
  const { getApparentPosition, isInFocusMode } = useFocusPositioning();
  
  // Calculate the interpolated position for each visible satellite
  const satelliteMarkers = useMemo(() => {
    const markers: Array<{
      position: THREE.Vector3;
      color: string;
      satelliteId: string;
    }> = [];
    
    // Apply additional scaling only in alternate view to match Earth scaling
    const viewScale = isAlternateView ? AV_DESCALE_FACTOR : 1.0;
    
    satellites.forEach(satellite => {
      if (satellite.isVisible && satellite.trajectoryData) {
        // REUSE existing interpolation logic - calculate real position
        const realPosition = interpolatePosition(satellite.trajectoryData.points, currentTime, viewScale);
        if (realPosition) {
          // Apply focus mode positioning (only in normal view)
          const apparentPosition = isAlternateView || !isInFocusMode
            ? realPosition // Normal behavior - use real position
            : (() => {
                const apparent = getApparentPosition(
                  { x: realPosition.x, y: realPosition.y, z: realPosition.z }, 
                  satellite.id
                );
                return new THREE.Vector3(apparent.x, apparent.y, apparent.z);
              })();

          markers.push({
            position: apparentPosition,
            color: satellite.color,
            satelliteId: satellite.id
          });
        }
      }
    });
    
    // DEBUG: Log marker count and focus mode state
    console.log('[TrajectoryMarker] Markers calculated:', {
      markerCount: markers.length,
      isAlternateView,
      isInFocusMode,
      satellites: satellites.map(s => ({ id: s.id, isVisible: s.isVisible }))
    });

    return markers;
  }, [satellites, currentTime, isAlternateView, getApparentPosition, isInFocusMode]);

  return (
    <group>
      {satelliteMarkers.map((marker) => (
        <mesh 
          key={`trajectory-marker-${marker.satelliteId}`}
          position={marker.position}
        >
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial 
            color={marker.color} 
            emissive={marker.color}
            emissiveIntensity={0.7} 
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
};

export default TrajectoryMarker; 