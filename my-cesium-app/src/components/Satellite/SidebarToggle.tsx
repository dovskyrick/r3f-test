import React from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import './SidebarToggle.css';

const SidebarToggle: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useSatelliteContext();
  
  return (
    <button 
      className="sidebar-toggle-button" 
      onClick={toggleSidebar}
      aria-label={isSidebarOpen ? 'Close satellite sidebar' : 'Open satellite sidebar'}
      title={isSidebarOpen ? 'Close satellite sidebar' : 'Open satellite sidebar'}
    >
      {isSidebarOpen ? '❯' : '❮'}
    </button>
  );
};

export default SidebarToggle; 