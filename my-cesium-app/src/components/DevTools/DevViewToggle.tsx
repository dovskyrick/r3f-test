import React, { useState } from 'react';
import './DevViewToggle.css';

interface DevViewToggleProps {
  onToggle: (isDevViewVisible: boolean) => void;
  isDevViewVisible: boolean;
}

const DevViewToggle: React.FC<DevViewToggleProps> = ({ onToggle, isDevViewVisible }) => {
  const handleToggle = () => {
    const newState = !isDevViewVisible;
    onToggle(newState);
    console.log(`[DevViewToggle] Dev view ${newState ? 'enabled' : 'disabled'}`);
  };

  return (
    <button 
      className={`dev-view-toggle ${isDevViewVisible ? 'active' : ''}`}
      onClick={handleToggle}
      title={`${isDevViewVisible ? 'Hide' : 'Show'} development view (ruler, debug elements)`}
    >
      <span className="dev-toggle-icon">🔧</span>
      <span className="dev-toggle-text">
        {isDevViewVisible ? 'Hide Dev View' : 'Show Dev View'}
      </span>
    </button>
  );
};

export default DevViewToggle; 