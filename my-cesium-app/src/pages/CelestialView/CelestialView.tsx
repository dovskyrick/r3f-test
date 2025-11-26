import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import CustomStarmap from '../../components/3D/CustomStarmap';
import Earth from '../../components/3D/Earth';
import './CelestialView.css';

const CelestialView: React.FC = () => {
  // Toggle constellation line visibility by changing this variable
  const SHOW_CONSTELLATION_LINES = true;

  return (
    <div className="celestial-view-container">
      <Canvas 
        camera={{ position: [20, 20, 20] }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        {/* Lighting - matches EarthView zoomed-in mode */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        
        {/* Custom starmap with real astronomical data (~9000 stars) */}
        <CustomStarmap 
          minMagnitude={6.5}
          showConstellations={SHOW_CONSTELLATION_LINES} // Toggle with variable above
          highlightConstellationStars={true} // Make constellation stars larger
          constellationColor="#d1d9e6" // Light gray-blue
          rotation={[0, 0, 0]} // Can add rotation logic later
        />
        
        {/* Earth - same as EarthView, locked to zoomed-in appearance */}
        <Earth isAlternateView={false} />
        
        {/* NO Satellite - cleaner view */}
        {/* NO Trajectory - cleaner celestial view */}
        
        {/* Camera controls - same as EarthView */}
        <OrbitControls 
          minDistance={1}
          maxDistance={2}
        />
      </Canvas>
      
      {/* Time control - same as EarthView */}
      <TimeSlider />
    </div>
  );
};

export default CelestialView;

