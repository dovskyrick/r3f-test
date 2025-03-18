import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import { useTimeContext } from '../../contexts/TimeContext';
import './MapsView.css';
import TrajectoryToggle from '../../components/TrajectoryToggle/TrajectoryToggle';
import MapTrajectoryVisualization from '../../components/Map/MapTrajectoryVisualization';

// Update the map image to the new PNG
import mapImage from '../../assets/World_location_map_(equirectangular_180).png';

// Constants for map image dimensions
const MAP_IMAGE_WIDTH = 2521;
const MAP_IMAGE_HEIGHT = 1260;
const MAP_ASPECT_RATIO = MAP_IMAGE_WIDTH / MAP_IMAGE_HEIGHT;

// Map component that displays the map image as a plane
const MapPlane = () => {
  // Load the texture
  const texture = useLoader(THREE.TextureLoader, mapImage);
  
  // Create a reference to the mesh
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Set the plane width and height based on aspect ratio
  const planeWidth = 10; // Base width
  const planeHeight = planeWidth / MAP_ASPECT_RATIO;
  
  return (
    // No rotation - plane facing camera directly
    <mesh ref={meshRef}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Grid lines component for meridians and parallels
const GridLines = () => {
  const { scene } = useThree();
  const texture = useLoader(THREE.TextureLoader, mapImage);
  
  // Set the plane width and height based on aspect ratio
  const planeWidth = 10; // Base width
  const planeHeight = planeWidth / MAP_ASPECT_RATIO;
  
  // Create grid lines on component mount
  useEffect(() => {
    // Create a material for grid lines - red with higher opacity
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0.8
    });
    
    // Create meridian (vertical line through center)
    const meridianGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -planeHeight/2, 0.01), // Slight offset in z to prevent z-fighting
      new THREE.Vector3(0, planeHeight/2, 0.01)
    ]);
    const meridianLine = new THREE.Line(meridianGeometry, lineMaterial);
    scene.add(meridianLine);
    
    // Create equator (horizontal line through center)
    const equatorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-planeWidth/2, 0, 0.01),
      new THREE.Vector3(planeWidth/2, 0, 0.01)
    ]);
    const equatorLine = new THREE.Line(equatorGeometry, lineMaterial);
    scene.add(equatorLine);
    
    // Add longitude grid lines (vertical lines)
    // We'll add lines at 30-degree intervals (-180 to 180 degrees)
    const longitudeLines: THREE.Line[] = [];
    
    // Calculate spacing between longitude lines
    // Map width represents 360 degrees of longitude
    const lonSpacing = planeWidth / 12; // 12 segments for 30-degree intervals
    
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue; // Skip the prime meridian as we already added it
      
      const x = i * lonSpacing;
      const lonGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -planeHeight/2, 0.01),
        new THREE.Vector3(x, planeHeight/2, 0.01)
      ]);
      // Secondary grid lines also red but more transparent
      const lonLine = new THREE.Line(lonGeometry, new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.6
      }));
      scene.add(lonLine);
      longitudeLines.push(lonLine);
    }
    
    // Add latitude grid lines (horizontal lines)
    // We'll add lines at 30-degree intervals (-90 to 90 degrees)
    const latitudeLines: THREE.Line[] = [];
    
    // Calculate spacing between latitude lines
    // Map height represents 180 degrees of latitude
    const latSpacing = planeHeight / 6; // 6 segments for 30-degree intervals
    
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue; // Skip the equator as we already added it
      
      const y = i * latSpacing;
      const latGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-planeWidth/2, y, 0.01),
        new THREE.Vector3(planeWidth/2, y, 0.01)
      ]);
      // Secondary grid lines also red but more transparent
      const latLine = new THREE.Line(latGeometry, new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.6
      }));
      scene.add(latLine);
      latitudeLines.push(latLine);
    }
    
    // Cleanup on component unmount
    return () => {
      scene.remove(meridianLine);
      scene.remove(equatorLine);
      longitudeLines.forEach(line => scene.remove(line));
      latitudeLines.forEach(line => scene.remove(line));
    };
  }, [scene, planeWidth, planeHeight]);
  
  return null; // This component doesn't render anything directly
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
  const MIN_ZOOM = 150;
  const MAX_ZOOM = 1000;
  const ZOOM_STEP = 5; // Reduced from 50 to 5 for more gradual zooming

  // Vertical movement limits based on map height
  const planeHeight = 10 / MAP_ASPECT_RATIO; // Same calculation as in MapPlane
  const VERTICAL_LIMIT = planeHeight / 2; // Half the map height

  // Helper function to clamp vertical position
  const clampVerticalPosition = (newY: number) => {
    return Math.max(-VERTICAL_LIMIT, Math.min(VERTICAL_LIMIT, newY));
  };

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
      
      // Calculate new Y position and clamp it
      const newY = camera.position.y + (deltaY * movementScale);
      camera.position.y = clampVerticalPosition(newY);

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
      
      // Calculate a more gradual zoom change based on current zoom level
      // This makes zooming smoother at different zoom levels
      const zoomFactor = orthoCam.zoom / 200; // Makes zoom step proportional to current zoom
      const zoomChange = Math.max(1, zoomFactor * ZOOM_STEP);
      
      // Calculate new zoom based on wheel direction with more gradual change
      let newZoom = orthoCam.zoom + (e.deltaY < 0 ? zoomChange : -zoomChange);
      
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
        
        {/* Map plane with suspense for loading */}
        <Suspense fallback={<LoadingFallback />}>
          <MapPlane />
          <GridLines />
          <MapTrajectoryVisualization />
        </Suspense>
        
        {/* Custom controls for panning and zooming */}
        <MapControls />
      </Canvas>
      
      <TrajectoryToggle />
      <TimeSlider />
    </div>
  );
};

export default MapsView; 