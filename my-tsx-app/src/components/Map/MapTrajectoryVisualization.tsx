import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import MapTrajectory from './MapTrajectory';
import MapTrajectoryPath from './MapTrajectoryPath';
import MapTrajectoryMarker from './MapTrajectoryMarker';

/**
 * Combined trajectory visualization component for the 2D map view.
 * Displays path lines and a time-based marker.
 */
const MapTrajectoryVisualization: React.FC = () => {
  const { isTrajectoryVisible, isLoading } = useTrajectoryContext();
  
  // Don't render if trajectory is not visible
  if (!isTrajectoryVisible && !isLoading) return null;
  
  return (
    <group>
      <MapTrajectoryPath />
      {/* Points are disabled per requirement to show only lines */}
      {/* <MapTrajectory /> */}
      <MapTrajectoryMarker />
    </group>
  );
};

export default MapTrajectoryVisualization; 