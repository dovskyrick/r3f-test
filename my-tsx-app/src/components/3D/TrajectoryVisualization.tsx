import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import TrajectoryPoints from './TrajectoryPoints';
import TrajectoryLines from './TrajectoryLines';

/**
 * Combined trajectory visualization component that includes both
 * points and connecting lines for the 3D Earth view.
 */
const TrajectoryVisualization: React.FC = () => {
  const { isTrajectoryVisible, isLoading } = useTrajectoryContext();
  
  // If not visible, don't render anything
  if (!isTrajectoryVisible && !isLoading) return null;
  
  return (
    <group>
      <TrajectoryLines />
      <TrajectoryPoints />
    </group>
  );
};

export default TrajectoryVisualization; 