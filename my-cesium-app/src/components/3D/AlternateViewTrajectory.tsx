import React from 'react';

interface AlternateViewTrajectoryProps {
  isAlternateView: boolean;
}

/**
 * This component is temporarily disabled until we implement multi-satellite support for 3D.
 * It will be updated in a future phase to visualize trajectories in the alternate 3D view.
 */
const AlternateViewTrajectory: React.FC<AlternateViewTrajectoryProps> = ({ isAlternateView }) => {
  // Temporarily disabled until we implement multi-satellite support
  // This will be updated in a future phase
  return null;
};

export default AlternateViewTrajectory; 