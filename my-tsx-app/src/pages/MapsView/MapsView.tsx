import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import { useTimeContext } from '../../contexts/TimeContext';
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

// Moving Sphere component that represents a point moving across the map
const MovingSphere = () => {
  const { currentTime, minValue, maxValue } = useTimeContext();
  const sphereRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, mapImage);
  
  // Calculate aspect ratio to size coordinates correctly
  const aspectRatio = texture.image ? texture.image.width / texture.image.height : 2;
  
  // Set the plane width and height (same as in MapPlane)
  const planeWidth = 10; // Base width
  const planeHeight = planeWidth / aspectRatio;
  
  // Convert lat/long coordinates to 3D space
  const latLngToPosition = (lat: number, lng: number) => {
    // Map from lat/long range to plane coordinates
    // Longitude: -180 to 180 maps to -planeWidth/2 to planeWidth/2
    // Latitude: -90 to 90 maps to -planeHeight/2 to planeHeight/2
    const x = (lng / 180) * (planeWidth / 2);
    const y = (lat / 90) * (planeHeight / 2);
    
    // Z is slightly above the plane to avoid z-fighting
    return new THREE.Vector3(x, y, 0.1);
  };
  
  // Update position on each frame based on current time
  useFrame(() => {
    if (!sphereRef.current) return;
    
    // Calculate how far along the timeline we are (0 to 1)
    const min = parseFloat(minValue);
    const max = parseFloat(maxValue);
    const timeProgress = (currentTime - min) / (max - min);
    
    // Calculate the current latitude and longitude based on a linear interpolation from (-90,-90) to (90,90)
    const lat = -90 + timeProgress * 180; // From -90 to 90
    const lng = -90 + timeProgress * 180; // From -90 to 90
    
    // Update the sphere position
    const position = latLngToPosition(lat, lng);
    sphereRef.current.position.copy(position);
  });
  
  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
    </mesh>
  );
};

// Grid lines component for meridians and parallels
const GridLines = () => {
  const { scene } = useThree();
  const texture = useLoader(THREE.TextureLoader, mapImage);
  
  // Calculate aspect ratio to size the plane correctly
  const aspectRatio = texture.image ? texture.image.width / texture.image.height : 2;
  
  // Set the plane width and height based on aspect ratio
  const planeWidth = 10; // Base width
  const planeHeight = planeWidth / aspectRatio;
  
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
          <MovingSphere />
        </Suspense>
        
        {/* Custom controls for panning and zooming */}
        <MapControls />
      </Canvas>
      
      <TimeSlider />
    </div>
  );
};

export default MapsView; 