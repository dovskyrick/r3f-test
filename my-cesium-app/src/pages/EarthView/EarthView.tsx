import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import { useCacheContext } from '../../contexts/CacheContext';
import Earth from '../../components/3D/Earth';
import Satellite from '../../components/3D/Satellite';
import TrajectoryMarker from '../../components/3D/TrajectoryMarker';
import TrajectoryLines from '../../components/3D/TrajectoryLines';
import AlternateViewObjects from '../../components/3D/AlternateViewObjects';
import AlternateViewTrajectory from '../../components/3D/AlternateViewTrajectory';
import TestRuler from '../../components/3D/TestRuler';
import CameraManager from '../../components/3D/CameraManager';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import DevViewToggle from '../../components/DevTools/DevViewToggle';
import './EarthView.css';

const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);
  const [isDevViewVisible, setIsDevViewVisible] = useState(false); // New state for dev view
  const { focusedSatelliteId } = useSatelliteContext();
  const { cacheService, isCacheLoaded } = useCacheContext();

  // Cache UI state (isZoomedOutView) whenever it changes
  const cacheUIState = useCallback((): void => {
    if (!isCacheLoaded) return;
    
    try {
      const uiState = {
        isAlternateView: isZoomedOutView,
        // TODO: Add focus state when focus mode is implemented
        focusedSatelliteId: focusedSatelliteId || null,
        timestamp: Date.now()
      };
      
      cacheService.saveUIState(uiState);
    } catch (error) {
      console.warn('Failed to cache UI state:', error);
    }
  }, [isZoomedOutView, isCacheLoaded, cacheService]);

  // Restore UI state from cache
  const restoreUIState = useCallback((): void => {
    if (!isCacheLoaded) return;
    
    try {
      const cachedUI = cacheService.loadUIState();
      if (cachedUI) {
        console.log('Restoring UI state from cache');
        setIsZoomedOutView(cachedUI.isAlternateView);
        // TODO: Restore focus state when focus mode is implemented
        console.log('UI state restored successfully');
      }
    } catch (error) {
      console.warn('Failed to restore UI state from cache:', error);
    }
  }, [isCacheLoaded, cacheService]);

  // Restore UI state on component mount
  useEffect(() => {
    if (isCacheLoaded) {
      restoreUIState();
    }
  }, [isCacheLoaded, restoreUIState]);

  // Auto-cache UI state changes (debounced)
  useEffect(() => {
    if (isCacheLoaded) {
      const timeoutId = setTimeout(cacheUIState, 500); // Shorter debounce for UI changes
      return () => clearTimeout(timeoutId);
    }
  }, [isZoomedOutView, isCacheLoaded, cacheUIState]);

  // Handle dev view toggle
  const handleDevViewToggle = (isVisible: boolean) => {
    setIsDevViewVisible(isVisible);
    console.log(`[EarthView] Dev view ${isVisible ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="earth-view-container">
      {/* Dev View Toggle Button */}
      <DevViewToggle 
        onToggle={handleDevViewToggle}
        isDevViewVisible={isDevViewVisible}
      />
      
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />

        {/* Runs inside Canvas to detect zoom changes */}
        <CameraManager setIsAlternateView={setIsZoomedOutView} />

        <Earth isAlternateView={isZoomedOutView} />
        <Satellite isAlternateView={isZoomedOutView} />
        <AlternateViewObjects isAlternateView={isZoomedOutView} />
        <AlternateViewTrajectory isAlternateView={isZoomedOutView} />

        {/* Development/Debug Components - controlled by dev view toggle */}
        {isDevViewVisible && (
          <>
            {/* Test ruler to measure Earth scale - visible in both views when dev mode is on */}
            <TestRuler isAlternateView={isZoomedOutView} />
            
            {/* Add other dev components here in the future */}
            {/* Example: <DebugGrid />, <CoordinateDisplay />, etc. */}
          </>
        )}

        {/* Satellite trajectory components - show in BOTH views */}
        <TrajectoryMarker isAlternateView={isZoomedOutView} />
        <TrajectoryLines 
          isAlternateView={isZoomedOutView} 
          futureSegmentCount={12} // Show next 12 trajectory segments
        />

        {/* Trajectory points - only show in zoomed-out view (if enabled) */}
        {isZoomedOutView && (
          <>
            {/* <TrajectoryPoints isAlternateView={isZoomedOutView} /> */}
          </>
        )}

        <OrbitControls 
          minDistance={focusedSatelliteId ? 5 : 80.5} // Prevent zoom beyond alternate view when no satellite focused
          maxDistance={200}
        />
      </Canvas>
      <TimeSlider />
    </div>
  );
};

export default EarthView; 