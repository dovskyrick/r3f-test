import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import './TrajectoryToggle.css';

const TrajectoryToggle: React.FC = () => {
  const { 
    isTrajectoryVisible, 
    toggleTrajectoryVisibility, 
    isLoading, 
    error,
    retryFetch
  } = useTrajectoryContext();

  return (
    <div className="trajectory-toggle-container">
      <button 
        className={`trajectory-toggle-button ${isTrajectoryVisible ? 'active' : ''}`}
        onClick={toggleTrajectoryVisibility}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="loading-spinner"></span>
        ) : (
          isTrajectoryVisible ? 'Hide Trajectory' : 'Show Trajectory'
        )}
      </button>

      {error && (
        <div className="trajectory-error">
          <p>Error: {error}</p>
          <button onClick={retryFetch} className="retry-button">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TrajectoryToggle; 