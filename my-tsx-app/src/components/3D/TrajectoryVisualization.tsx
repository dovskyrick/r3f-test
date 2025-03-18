import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import TrajectoryPoints from './TrajectoryPoints';
import TrajectoryLines from './TrajectoryLines';

/**
 * Combined trajectory visualization component that includes
 * lines for the 3D Earth view. Points are removed to show only lines.
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
    </group>
  );
};

export default TrajectoryVisualization; 