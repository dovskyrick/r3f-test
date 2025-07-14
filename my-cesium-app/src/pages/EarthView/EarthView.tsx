import React, { useState } from 'react';
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Earth from '../../components/3D/Earth';
import Satellite from '../../components/3D/Satellite';
import AlternateViewObjects from '../../components/3D/AlternateViewObjects';
import AlternateViewTrajectory from '../../components/3D/AlternateViewTrajectory';
import CameraManager from '../../components/3D/CameraManager';
import TrajectoryPoints from '../../components/3D/TrajectoryPoints';
import TrajectoryLines from '../../components/3D/TrajectoryLines';
import TrajectoryMarker from '../../components/3D/TrajectoryMarker';
import TestRuler from '../../components/3D/TestRuler';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import './EarthView.css';

const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);

  return (
    <div className="earth-view-container">
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />

        {/* Runs inside Canvas to detect zoom changes */}
        <CameraManager setIsAlternateView={setIsZoomedOutView} />

        <Earth isAlternateView={isZoomedOutView} />
        <Satellite isAlternateView={isZoomedOutView} />
        <AlternateViewObjects isAlternateView={isZoomedOutView} />
        <AlternateViewTrajectory isAlternateView={isZoomedOutView} />

        {/* Test ruler to measure Earth scale - visible in both views */}
        <TestRuler isAlternateView={isZoomedOutView} />

        {/* New multi-satellite trajectory components - only show in zoomed-out view */}
        {isZoomedOutView && (
          <>
            <TrajectoryPoints isAlternateView={isZoomedOutView} />
            <TrajectoryLines isAlternateView={isZoomedOutView} />
            <TrajectoryMarker isAlternateView={isZoomedOutView} />
          </>
        )}

        <OrbitControls />
      </Canvas>
      <TimeSlider />
    </div>
  );
};

export default EarthView; 