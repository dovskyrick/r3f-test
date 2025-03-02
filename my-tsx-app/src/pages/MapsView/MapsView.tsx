import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import { useTimeContext } from '../../contexts/TimeContext';
import './MapsView.css';

// Import the map image
import mapImage from '../../assets/lat-lon.jpg';

// Constants
const ORBIT_SPEED = 0.02;
const MAP_WIDTH = 1301;
const MAP_HEIGHT = 651;
const MAP_CENTER_X = 650; // center x pixel 
const MAP_CENTER_Y = 325; // center y pixel
const LONGITUDE_STEP = 30; // Draw grid lines every 30 degrees
const LATITUDE_STEP = 30; // Draw grid lines every 30 degrees

// Function to convert longitude/latitude to pixel coordinates
const geoToPixel = (longitude: number, latitude: number, mapWidth: number, mapHeight: number) => {
  // Map longitude from -180...180 to 0...mapWidth
  const x = mapWidth * (longitude + 180) / 360;
  
  // Map latitude from -90...90 to mapHeight...0 (reversed because pixel y increases downward)
  const y = mapHeight * (90 - latitude) / 180;
  
  return { x, y };
};

// Function to convert pixel coordinates to longitude/latitude
const pixelToGeo = (x: number, y: number, mapWidth: number, mapHeight: number) => {
  // Map x from 0...mapWidth to -180...180 longitude
  const longitude = (x / mapWidth * 360) - 180;
  
  // Map y from 0...mapHeight to 90...-90 latitude (reversed because pixel y increases downward)
  const latitude = 90 - (y / mapHeight * 180);
  
  return { longitude, latitude };
};

const MapsView: React.FC = () => {
  const { currentTime } = useTimeContext();
  const satelliteRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const mapRef = useRef<HTMLImageElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [satelliteCoords, setSatelliteCoords] = useState({ longitude: 0, latitude: 0 });
  const [clickedPoint, setClickedPoint] = useState<{ x: number, y: number, longitude: number, latitude: number } | null>(null);
  
  // Calculate satellite position based on time
  useEffect(() => {
    if (!satelliteRef.current || !mapRef.current || !mapContainerRef.current) return;
    
    const angle = -currentTime * ORBIT_SPEED;
    
    // Calculate the satellite position in longitude/latitude
    // For a circular orbit around Earth at the equator
    const longitude = 180 * Math.cos(angle); // -180 to 180
    const latitude = 60 * Math.sin(angle);   // -60 to 60 (not full range to stay visible)
    
    // Update state with current coordinates
    setSatelliteCoords({ longitude, latitude });
    
    // Get the scaling factor from original map size to displayed size
    const scaleX = mapSize.width / MAP_WIDTH;
    const scaleY = mapSize.height / MAP_HEIGHT;
    
    // Convert geo coordinates to pixels on the original map
    const pixelCoords = geoToPixel(longitude, latitude, MAP_WIDTH, MAP_HEIGHT);
    
    // Apply scaling to get position on the displayed map
    const x = pixelCoords.x * scaleX;
    const y = pixelCoords.y * scaleY;
    
    // Set the position
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

  // Handle map click to determine coordinates
  const handleMapClick = (event: MouseEvent<HTMLImageElement>) => {
    if (!mapRef.current) return;
    
    // Get click position relative to the image
    const rect = mapRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate relative position (0 to 1)
    const relX = x / rect.width;
    const relY = y / rect.height;
    
    // Convert to original map coordinates
    const pixelX = relX * MAP_WIDTH;
    const pixelY = relY * MAP_HEIGHT;
    
    // Convert to geo coordinates
    const { longitude, latitude } = pixelToGeo(pixelX, pixelY, MAP_WIDTH, MAP_HEIGHT);
    
    // Set the clicked point
    setClickedPoint({ 
      x: x, 
      y: y, 
      longitude, 
      latitude 
    });
  };

  // Generate longitude grid lines
  const renderLongitudeLines = () => {
    if (mapSize.width === 0 || mapSize.height === 0) return null;
    
    const lines = [];
    const scaleX = mapSize.width / MAP_WIDTH;
    
    for (let lon = -180 + LONGITUDE_STEP; lon < 180; lon += LONGITUDE_STEP) {
      if (lon === 0) continue; // Skip the 0° line as it's already the meridian
      
      // Convert longitude to pixel position using the same function as the satellite
      const pixelCoords = geoToPixel(lon, 0, MAP_WIDTH, MAP_HEIGHT);
      const x = pixelCoords.x * scaleX;
      
      lines.push(
        <div 
          key={`lon-${lon}`} 
          className="grid-line longitude-line" 
          style={{ left: `${x}px` }}
        >
          <span className="grid-label">{lon > 0 ? `${lon}°E` : `${Math.abs(lon)}°W`}</span>
        </div>
      );
    }
    return lines;
  };
  
  // Generate latitude grid lines
  const renderLatitudeLines = () => {
    if (mapSize.width === 0 || mapSize.height === 0) return null;
    
    const lines = [];
    const scaleY = mapSize.height / MAP_HEIGHT;
    
    for (let lat = -90 + LATITUDE_STEP; lat < 90; lat += LATITUDE_STEP) {
      if (lat === 0) continue; // Skip the 0° line as it's already the equator
      
      // Convert latitude to pixel position using the same function as the satellite
      const pixelCoords = geoToPixel(0, lat, MAP_WIDTH, MAP_HEIGHT);
      const y = pixelCoords.y * scaleY;
      
      lines.push(
        <div 
          key={`lat-${lat}`} 
          className="grid-line latitude-line" 
          style={{ top: `${y}px` }}
        >
          <span className="grid-label">{lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}</span>
        </div>
      );
    }
    return lines;
  };

  // Format coordinates for display
  const formatCoordinates = (longitude: number, latitude: number) => {
    const lonDir = longitude >= 0 ? 'E' : 'W';
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonAbs = Math.abs(longitude).toFixed(1);
    const latAbs = Math.abs(latitude).toFixed(1);
    
    return `${lonAbs}°${lonDir}, ${latAbs}°${latDir}`;
  };

  // Get exact coordinate positions
  const getCoordinatePosition = (longitude: number, latitude: number) => {
    if (mapSize.width === 0 || mapSize.height === 0) return { left: '0px', top: '0px' };
    
    const scaleX = mapSize.width / MAP_WIDTH;
    const scaleY = mapSize.height / MAP_HEIGHT;
    
    const pixelCoords = geoToPixel(longitude, latitude, MAP_WIDTH, MAP_HEIGHT);
    
    return {
      left: `${pixelCoords.x * scaleX}px`,
      top: `${pixelCoords.y * scaleY}px`
    };
  };

  // Get meridian and equator positions
  const meridianPosition = mapSize.width > 0 ? getCoordinatePosition(0, 0).left : '50%';
  const equatorPosition = mapSize.height > 0 ? getCoordinatePosition(0, 0).top : '50%';

  return (
    <div className="maps-view-container">
      <div className="map-container" ref={mapContainerRef}>
        <div className="map-wrapper">
          <img 
            ref={mapRef} 
            src={mapImage} 
            alt="World Map" 
            className="map-image"
            onClick={handleMapClick}
            onLoad={() => {
              if (mapRef.current) {
                setMapSize({
                  width: mapRef.current.clientWidth,
                  height: mapRef.current.clientHeight
                });
              }
            }}
          />
          
          {/* Zero longitude line (meridian) */}
          <div className="meridian-line" style={{ left: meridianPosition }}>
            <span className="grid-label">0°</span>
          </div>
          
          {/* Zero latitude line (equator) */}
          <div className="equator-line" style={{ top: equatorPosition }}>
            <span className="grid-label">0°</span>
          </div>
          
          {/* Longitude grid lines */}
          {renderLongitudeLines()}
          
          {/* Latitude grid lines */}
          {renderLatitudeLines()}
          
          {/* Coordinate labels */}
          <div 
            className="coordinate-label north-pole" 
            style={getCoordinatePosition(0, 90)}
          >
            90°N
          </div>
          <div 
            className="coordinate-label south-pole" 
            style={getCoordinatePosition(0, -90)}
          >
            90°S
          </div>
          <div 
            className="coordinate-label west-edge" 
            style={getCoordinatePosition(-180, 0)}
          >
            180°W
          </div>
          <div 
            className="coordinate-label east-edge" 
            style={getCoordinatePosition(180, 0)}
          >
            180°E
          </div>
          
          {/* Satellite marker */}
          <div 
            ref={satelliteRef} 
            className="satellite-marker"
          >
            <div className="satellite-coordinates">
              {formatCoordinates(satelliteCoords.longitude, satelliteCoords.latitude)}
            </div>
          </div>
          
          {/* Clicked point marker */}
          {clickedPoint && (
            <div 
              className="clicked-point" 
              style={{ left: clickedPoint.x, top: clickedPoint.y }}
            >
              <div className="clicked-coordinates">
                {formatCoordinates(clickedPoint.longitude, clickedPoint.latitude)}
              </div>
            </div>
          )}
        </div>
      </div>
      <TimeSlider />
    </div>
  );
};

export default MapsView; 