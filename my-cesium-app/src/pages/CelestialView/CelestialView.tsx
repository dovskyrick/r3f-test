import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import Starfield from '../../components/3D/Starfield';
import CelestialEarth from '../../components/3D/CelestialEarth';
import CelestialCamera from '../../components/3D/CelestialCamera';
import './CelestialView.css';

const CelestialView: React.FC = () => {
  const { focusedSatelliteId } = useSatelliteContext();

  return (
    <div className="celestial-view-container">
      {/* Info overlay when no satellite is focused */}
      {!focusedSatelliteId && (
        <div className="celestial-info-overlay">
          <div className="celestial-info-card">
            <h2>Celestial Map View</h2>
            <p>This view shows the perspective from a satellite looking out into space.</p>
            <p className="celestial-instruction">
              Please select and focus a satellite from the sidebar to activate this view.
            </p>
          </div>
        </div>
      )}

      <Canvas 
        camera={{ position: [0, 0, 0], fov: 75 }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        {/* Camera positioning - view from satellite */}
        <CelestialCamera />
        
        {/* Lighting setup - simulating space lighting with Sun as primary source */}
        <ambientLight intensity={0.15} />
        {/* Main directional light (simulating the Sun) */}
        <directionalLight position={[10, 5, 10]} intensity={1.2} color="#ffffff" />
        {/* Secondary fill light for Earth */}
        <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#4488ff" />
        
        {/* Starfield background */}
        <Starfield count={5000} />
        
        {/* Earth positioned relative to satellite */}
        <CelestialEarth />
        
        {/* OrbitControls for manual camera control */}
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
      <TimeSlider />
    </div>
  );
};

export default CelestialView;

