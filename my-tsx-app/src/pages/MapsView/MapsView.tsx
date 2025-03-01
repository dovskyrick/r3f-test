import React, { useEffect, useState, useRef } from 'react';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import { useTimeContext } from '../../contexts/TimeContext';
import './MapsView.css';

// Import the map image
import mapImage from '../../assets/lat-lon.jpg';

// Constants
const ORBIT_SPEED = 0.02;

const MapsView: React.FC = () => {
  const { currentTime } = useTimeContext();
  const satelliteRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const mapRef = useRef<HTMLImageElement>(null);
  
  // Calculate satellite position based on time
  useEffect(() => {
    if (!satelliteRef.current || !mapRef.current) return;
    
    const angle = -currentTime * ORBIT_SPEED;
    
    // Map coordinates are between -180 to 180 longitude and -90 to 90 latitude
    // We'll use a circular orbit around the center (0,0)
    const radius = Math.min(mapSize.width, mapSize.height) * 0.3;
    
    // Map from angle to screen coordinates
    const centerX = mapSize.width / 2;
    const centerY = mapSize.height / 2;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    satelliteRef.current.style.left = `${x}px`;
    satelliteRef.current.style.top = `${y}px`;
  }, [currentTime, mapSize]);

  // Update map size when the image loads or window resizes
  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight
        });
      }
    };

    // Update size initially and on resize
    updateMapSize();
    window.addEventListener('resize', updateMapSize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateMapSize);
    };
  }, []);

  return (
    <div className="maps-view-container">
      <div className="map-container">
        <img 
          ref={mapRef} 
          src={mapImage} 
          alt="World Map" 
          className="map-image"
          onLoad={() => {
            if (mapRef.current) {
              setMapSize({
                width: mapRef.current.clientWidth,
                height: mapRef.current.clientHeight
              });
            }
          }}
        />
        <div 
          ref={satelliteRef} 
          className="satellite-marker"
        />
        <div className="orbit-circle"></div>
      </div>
      <TimeSlider />
    </div>
  );
};

export default MapsView; 