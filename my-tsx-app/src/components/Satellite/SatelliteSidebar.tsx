import React from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import SatelliteListItem from './SatelliteListItem';
import './SatelliteSidebar.css';

const SatelliteSidebar: React.FC = () => {
  const { satellites, isSidebarOpen, addSatellite } = useSatelliteContext();
  
  const generateRandomName = () => {
    // Generate random 4-letter name
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array(4).fill(0).map(() => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
  };
  
  const handleLoadTLE = () => {
    addSatellite(generateRandomName());
  };
  
  // Use a CSS class to show/hide the sidebar instead of not rendering
  return (
    <div className={`satellite-sidebar ${isSidebarOpen ? 'visible' : ''}`}>
      <div className="sidebar-header">
        <h2>Satellites</h2>
      </div>
      
      <div className="satellite-list">
        {satellites.length === 0 ? (
          <div className="empty-list-message">
            No satellites added yet.
          </div>
        ) : (
          satellites.map(satellite => (
            <SatelliteListItem 
              key={satellite.id} 
              satellite={satellite} 
            />
          ))
        )}
      </div>
      
      <div className="sidebar-footer">
        <button className="load-tle-button" onClick={handleLoadTLE}>
          LOAD TLE
        </button>
      </div>
    </div>
  );
};

export default SatelliteSidebar; 