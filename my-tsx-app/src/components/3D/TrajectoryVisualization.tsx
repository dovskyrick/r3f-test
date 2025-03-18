import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import TrajectoryPoints from './TrajectoryPoints';
import TrajectoryLines from './TrajectoryLines';
import TrajectoryMarker from './TrajectoryMarker';

/**
 * Combined trajectory visualization component that includes
 * lines for the 3D Earth view and a marker that follows based on time.
 */
const TrajectoryVisualization: React.FC = () => {
  const { isTrajectoryVisible, isLoading } = useTrajectoryContext();
  
  // If not visible, don't render anything
  if (!isTrajectoryVisible && !isLoading) return null;
  
  return (
    <group>
      <TrajectoryLines />
      {/* Points are disabled per requirement to show only lines */}
      {/* <TrajectoryPoints /> */}
      <TrajectoryMarker />
    </group>
  );
};

export default TrajectoryVisualization; 