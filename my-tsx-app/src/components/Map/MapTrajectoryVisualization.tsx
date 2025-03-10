import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import MapTrajectory from './MapTrajectory';
import MapTrajectoryPath from './MapTrajectoryPath';

/**
 * Combined trajectory visualization component for the 2D map view.
 * Displays both points and connecting lines.
 */
const MapTrajectoryVisualization: React.FC = () => {
  const { isTrajectoryVisible, isLoading } = useTrajectoryContext();
  
  // Don't render if trajectory is not visible
  if (!isTrajectoryVisible && !isLoading) return null;
  
  return (
    <group>
      <MapTrajectoryPath />
      <MapTrajectory />
    </group>
  );
};

export default MapTrajectoryVisualization; 