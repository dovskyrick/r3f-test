import React from 'react';
import { Satellite, useSatelliteContext } from '../../contexts/SatelliteContext';
import './SatelliteListItem.css';

interface SatelliteListItemProps {
  satellite: Satellite;
}

const SatelliteListItem: React.FC<SatelliteListItemProps> = ({ satellite }) => {
  const { toggleSatellite, focusedSatelliteId, setFocusedSatellite } = useSatelliteContext();
  
  // Check if this satellite is focused
  const isFocused = focusedSatelliteId === satellite.id;
  
  // Click handler for the entire satellite item
  const handleSatelliteClick = () => {
    // Toggle focus: if already focused, unfocus; if not focused, focus
    const newFocusId = isFocused ? null : satellite.id;
    setFocusedSatellite(newFocusId);
  };
  
  return (
    <div 
      className={`satellite-list-item ${isFocused ? 'focused' : ''}`}
      onClick={handleSatelliteClick}
    >
      <span className={`satellite-name ${isFocused ? 'focused-name' : ''}`}>
        {satellite.name}
      </span>
      <button 
        className={`satellite-toggle ${satellite.isVisible ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering the focus click
          toggleSatellite(satellite.id);
        }}
        aria-label={satellite.isVisible ? `Hide ${satellite.name}` : `Show ${satellite.name}`}
      >
        {satellite.isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
};

export default SatelliteListItem; 