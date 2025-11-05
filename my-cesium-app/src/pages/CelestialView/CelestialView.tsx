import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import Starfield from '../../components/3D/Starfield';
import Earth from '../../components/3D/Earth';
import './CelestialView.css';

const CelestialView: React.FC = () => {
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
        
        {/* Starfield background - temporary, will be replaced with three-starmap */}
        <Starfield count={5000} />
        
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

