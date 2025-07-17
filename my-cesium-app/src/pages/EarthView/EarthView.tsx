import React, { useState, useEffect, useCallback } from 'react';
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
import { useCacheContext } from '../../contexts/CacheContext';
import { CachedUIState } from '../../utils/cacheUtils';
import './EarthView.css';

const EarthView: React.FC = () => {
  const [isZoomedOutView, setIsZoomedOutView] = useState(false);
  
  // Access CacheContext for UI state caching
  const { cacheService, isCacheLoaded } = useCacheContext();
  // const { focusedSatellite } = useSatelliteContext(); // TODO: Add when focus mode is implemented

  // Cache UI state
  const cacheUIState = useCallback((): void => {
    if (!isCacheLoaded) return;
    
    try {
      const uiState: CachedUIState = {
        isAlternateView: isZoomedOutView,
        // focusedSatelliteId: focusedSatellite?.id || null, // TODO: Add when focus mode is implemented
        // Future: camera position, zoom level, etc.
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