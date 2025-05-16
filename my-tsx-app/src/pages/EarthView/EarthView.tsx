import React, { useState } from 'react';
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Earth from '../../components/3D/Earth';
import Satellite from '../../components/3D/Satellite';
import AlternateViewObjects from '../../components/3D/AlternateViewObjects';
import AlternateViewTrajectory from '../../components/3D/AlternateViewTrajectory';
import CameraManager from '../../components/3D/CameraManager';
// Temporarily disable TrajectoryVisualization until we implement multi-satellite support for 3D
// import TrajectoryVisualization from '../../components/3D/TrajectoryVisualization';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import './EarthView.css';

const EarthView: React.FC = () => {
  const [isAlternateView, setIsAlternateView] = useState(false);

  return (
    <div className="earth-view-container">
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />

        {/* Runs inside Canvas to detect zoom changes */}
        <CameraManager setIsAlternateView={setIsAlternateView} />

        <Earth isAlternateView={isAlternateView} />
        <Satellite isAlternateView={isAlternateView} />
        <AlternateViewObjects isAlternateView={isAlternateView} />
        <AlternateViewTrajectory isAlternateView={isAlternateView} />
        
        {/* Temporarily disabled until we implement multi-satellite support for 3D */}
        {/* Show trajectory in main view (not alternate view) */}
        {/* {!isAlternateView && <TrajectoryVisualization />} */}

        <OrbitControls />
      </Canvas>
      <TimeSlider />
    </div>
  );
};

export default EarthView; 