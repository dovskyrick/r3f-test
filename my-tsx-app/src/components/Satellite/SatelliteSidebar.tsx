import React, { useState } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import SatelliteListItem from './SatelliteListItem';
import SatelliteAddModal from './SatelliteAddModal';
import './SatelliteSidebar.css';

const SatelliteSidebar: React.FC = () => {
  const { satellites, isSidebarOpen } = useSatelliteContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  // Use a CSS class to show/hide the sidebar instead of not rendering
  return (
    <>
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
          <button className="load-tle-button" onClick={openModal}>
            LOAD TLE
          </button>
        </div>
      </div>
      
      {/* Add the modal component */}
      <SatelliteAddModal 
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
};

export default SatelliteSidebar; 