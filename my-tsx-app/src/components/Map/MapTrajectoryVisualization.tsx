import React from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import MapTrajectoryPath from './MapTrajectoryPath';
import MapTrajectoryMarker from './MapTrajectoryMarker';

/**
 * Combined trajectory visualization component for the 2D map view.
 * Displays path lines and a time-based marker for multiple satellites.
 */
const MapTrajectoryVisualization: React.FC = () => {
  // Get satellites from SatelliteContext instead of using TrajectoryContext
  const { satellites } = useSatelliteContext();
  
  // Filter visible satellites with trajectory data
  const visibleSatellites = satellites.filter(
    satellite => satellite.isVisible && satellite.trajectoryData !== null
  );
  
  // Don't render if no visible satellites
  if (visibleSatellites.length === 0) return null;
  
  return (
    <group>
      {/* Render a trajectory path for each visible satellite */}
      {visibleSatellites.map(satellite => (
        <React.Fragment key={satellite.id}>
          <MapTrajectoryPath satellite={satellite} />
          <MapTrajectoryMarker satellite={satellite} />
        </React.Fragment>
      ))}
    </group>
  );
};

export default MapTrajectoryVisualization; 