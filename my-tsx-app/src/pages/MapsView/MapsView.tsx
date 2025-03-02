import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import './MapsView.css';

// Import the map image
import mapImage from '../../assets/lat-lon.jpg';

// Map component that displays the map image as a plane
const MapPlane = () => {
  // Load the texture
  const texture = useLoader(THREE.TextureLoader, mapImage);
  
  // Create a reference to the mesh
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate aspect ratio to size the plane correctly
  const aspectRatio = texture.image ? texture.image.width / texture.image.height : 2;
  
  // Set the plane width and height based on aspect ratio
  const planeWidth = 10; // Base width
  const planeHeight = planeWidth / aspectRatio;
  
  return (
    // No rotation - plane facing camera directly
    <mesh ref={meshRef}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Fallback component to show while assets are loading
const LoadingFallback = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="white" wireframe />
    </mesh>
  );
};

// Custom camera controls for panning and zooming
const MapControls = () => {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  
  // Min and max zoom levels
  const MIN_ZOOM = 50;
  const MAX_ZOOM = 1000;
  const ZOOM_STEP = 50;

  // Set up event listeners for panning
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setLastPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastPosition.x;
      const deltaY = e.clientY - lastPosition.y;

      // Scale the movement based on zoom level to make panning feel natural
      const movementScale = 0.01;
      camera.position.x -= deltaX * movementScale;
      camera.position.y += deltaY * movementScale; // Inverted because Y is up in 3D space

      setLastPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    // Handle mouse wheel for zooming
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Get the current zoom value
      const orthoCam = camera as THREE.OrthographicCamera;
      
      // Calculate new zoom based on wheel direction
      let newZoom = orthoCam.zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      
      // Clamp zoom between min and max values
      newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      
      // Apply the new zoom
      orthoCam.zoom = newZoom;
      orthoCam.updateProjectionMatrix();
    };

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Clean up event listeners on unmount
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera, isDragging, lastPosition]);

  return null; // This component doesn't render anything
};

// Main MapsView component
const MapsView: React.FC = () => {
  // Reference to track container size for camera setup
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="maps-view-container" ref={containerRef}>
      <Canvas>
        {/* Orthographic camera with simplified setup */}
        <OrthographicCamera
          makeDefault
          position={[0, 0, 10]}
          zoom={150}
          near={0.1}
          far={1000}
        />
        
        {/* Enhanced lighting for better visibility */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 10]} intensity={1} />
        <directionalLight position={[0, 0, -10]} intensity={0.5} />
        
        {/* Grid helper for better spatial reference */}
        <gridHelper args={[20, 20]} />
        
        {/* Axes to help with orientation */}
        <axesHelper args={[5]} />
        
        {/* Map plane with suspense for loading */}
        <Suspense fallback={<LoadingFallback />}>
          <MapPlane />
        </Suspense>
        
        {/* Custom controls for panning and zooming */}
        <MapControls />
      </Canvas>
      
      <TimeSlider />
    </div>
  );
};

export default MapsView; 