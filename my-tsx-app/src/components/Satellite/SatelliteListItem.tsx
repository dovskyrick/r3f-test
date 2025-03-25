import React from 'react';
import { Satellite, useSatelliteContext } from '../../contexts/SatelliteContext';
import './SatelliteListItem.css';

interface SatelliteListItemProps {
  satellite: Satellite;
}

const SatelliteListItem: React.FC<SatelliteListItemProps> = ({ satellite }) => {
  const { toggleSatellite } = useSatelliteContext();
  
  return (
    <div className="satellite-list-item">
      <span className="satellite-name">{satellite.name}</span>
      <button 
        className={`satellite-toggle ${satellite.isVisible ? 'active' : ''}`}
        onClick={() => toggleSatellite(satellite.id)}
        aria-label={satellite.isVisible ? `Hide ${satellite.name}` : `Show ${satellite.name}`}
      >
        {satellite.isVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
};

export default SatelliteListItem; 