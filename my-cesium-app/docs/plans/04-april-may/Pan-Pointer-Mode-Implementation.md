# Pan and Pointer Mode Implementation

This document outlines the step-by-step implementation plan for adding keyboard shortcut-based mode switching between Pan mode (H key) and Pointer mode (P key) in the Maps View.

## Feature Requirements

1. **H Key - Pan Mode**
   - When pressing the 'H' key, the application switches to "pan mode"
   - In this mode, mouse dragging pans the map (default behavior)
   - The cursor appears as a "grab" hand when hovering over the map

2. **P Key - Pointer Mode**
   - When pressing the 'P' key, the application switches to "pointer mode"
   - In this mode, clicking on the map displays lat/long coordinates of the clicked point
   - The cursor appears as a crosshair when hovering over the map
   - Coordinates are displayed in a small info panel near the click point
   - Zooming with the mouse wheel remains functional in this mode

## Implementation Steps

### Step 1: Add Mode State to MapsView Component

Update the MapsView component to track the current interaction mode:

```typescript
// Main MapsView component
const MapsView: React.FC = () => {
  // Reference to track container size for camera setup
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add state for tracking the current interaction mode
  // Default to 'pan' mode
  const [interactionMode, setInteractionMode] = useState<'pan' | 'pointer'>('pan');
  
  // ... rest of the component
}
```

### Step 2: Add Keyboard Event Listeners

Add global keyboard event listeners to detect 'H' and 'P' key presses:

```typescript
// Main MapsView component
const MapsView: React.FC = () => {
  // ...existing state
  const [interactionMode, setInteractionMode] = useState<'pan' | 'pointer'>('pan');
  
  // Add keyboard event listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Convert to lowercase to handle both upper and lower case
      const key = e.key.toLowerCase();
      
      if (key === 'h') {
        setInteractionMode('pan');
      } else if (key === 'p') {
        setInteractionMode('pointer');
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  
  // ... rest of the component
}
```

### Step 3: Create Coordinate Display Component

Create a new component to display the coordinates when clicking in pointer mode:

```typescript
// Coordinate display component
const CoordinateDisplay: React.FC<{
  position: { x: number, y: number } | null;
  coordinates: { lat: number, lng: number } | null;
}> = ({ position, coordinates }) => {
  if (!position || !coordinates) return null;
  
  return (
    <div 
      className="coordinate-display"
      style={{
        position: 'absolute',
        left: `${position.x + 15}px`, // Offset slightly from cursor
        top: `${position.y + 15}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        zIndex: 2000,
        pointerEvents: 'none' // Prevents interfering with map interaction
      }}
    >
      <div>Lat: {coordinates.lat.toFixed(2)}°</div>
      <div>Lng: {coordinates.lng.toFixed(2)}°</div>
    </div>
  );
};
```

### Step 4: Modify MapControls Component

Update the MapControls component to be aware of the current interaction mode:

```typescript
// Custom camera controls for panning and zooming
const MapControls = ({ 
  interactionMode, 
  onCoordinateClick 
}: { 
  interactionMode: 'pan' | 'pointer';
  onCoordinateClick: (e: MouseEvent, worldPos: THREE.Vector3) => void;
}) => {
  const { camera, gl, raycaster, scene } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  
  // Min and max zoom levels
  const MIN_ZOOM = 150;
  const MAX_ZOOM = 1000;
  const ZOOM_STEP = 5;

  // Set up event listeners for panning and coordinate picking
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (interactionMode === 'pan') {
        setIsDragging(true);
        setLastPosition({ x: e.clientX, y: e.clientY });
      } else if (interactionMode === 'pointer') {
        // Get normalized device coordinates
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Set up raycaster
        raycaster.setFromCamera({ x, y }, camera);
        
        // Find intersections with the map plane
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
          // Pass the world position where the click occurred
          onCoordinateClick(e, intersects[0].point);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (interactionMode === 'pan' && isDragging) {
        const deltaX = e.clientX - lastPosition.x;
        const deltaY = e.clientY - lastPosition.y;

        // Scale the movement based on zoom level
        const movementScale = 0.01;
        camera.position.x -= deltaX * movementScale;
        camera.position.y += deltaY * movementScale;

        setLastPosition({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      if (interactionMode === 'pan') {
        setIsDragging(false);
      }
    };
    
    // Handle mouse wheel for zooming (works in both modes)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Get the current zoom value
      const orthoCam = camera as THREE.OrthographicCamera;
      
      // Calculate zoom change
      const zoomFactor = orthoCam.zoom / 200;
      const zoomChange = Math.max(1, zoomFactor * ZOOM_STEP);
      
      // Calculate new zoom
      let newZoom = orthoCam.zoom + (e.deltaY < 0 ? zoomChange : -zoomChange);
      
      // Clamp zoom
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
  }, [camera, gl, raycaster, scene, interactionMode, isDragging, lastPosition, onCoordinateClick]);

  return null; // This component doesn't render anything
};
```

### Step 5: Add Coordinate Calculation Logic

Create a utility function to convert world coordinates to latitude/longitude:

```typescript
/**
 * Convert world coordinates to latitude/longitude
 * @param point The point in 3D world space
 * @param planeWidth The width of the map plane
 * @param planeHeight The height of the map plane
 * @returns An object containing lat and lng values
 */
const worldToLatLng = (
  point: THREE.Vector3,
  planeWidth: number,
  planeHeight: number
): { lat: number; lng: number } => {
  // Calculate normalized position on the plane (range -0.5 to 0.5)
  const normalizedX = point.x / planeWidth;
  const normalizedY = point.y / planeHeight;
  
  // Convert to lat/lng
  // Map plane X coordinates from -planeWidth/2 to planeWidth/2 map to -180° to 180° longitude
  // Map plane Y coordinates from -planeHeight/2 to planeHeight/2 map to -90° to 90° latitude
  const lng = normalizedX * 360;
  const lat = normalizedY * 180;
  
  return { lat, lng };
};
```

### Step 6: Update CSS for Cursor Styles

Modify the CSS to update cursor styles based on interaction mode:

```css
/* Add to MapsView.css */
.maps-view-container.pan-mode canvas:hover {
  cursor: grab;
}

.maps-view-container.pan-mode canvas:active {
  cursor: grabbing;
}

.maps-view-container.pointer-mode canvas:hover {
  cursor: crosshair;
}
```

### Step 7: Update the MapsView Component

Integrate all the pieces in the main MapsView component:

```typescript
// Main MapsView component
const MapsView: React.FC = () => {
  // Reference to track container size for camera setup
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add state for tracking the current interaction mode
  const [interactionMode, setInteractionMode] = useState<'pan' | 'pointer'>('pan');
  
  // Add state for coordinate display
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const [clickedCoordinates, setClickedCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  
  // Add keyboard event listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Convert to lowercase to handle both upper and lower case
      const key = e.key.toLowerCase();
      
      if (key === 'h') {
        setInteractionMode('pan');
      } else if (key === 'p') {
        setInteractionMode('pointer');
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  
  // Handle coordinate clicks
  const handleCoordinateClick = (e: MouseEvent, worldPos: THREE.Vector3) => {
    // Get dimension information to calculate coordinates
    const mapPlaneWidth = 10; // Same as in MapPlane component
    const texture = new Image();
    texture.src = mapImage;
    const aspectRatio = texture.width / texture.height || 2;
    const mapPlaneHeight = mapPlaneWidth / aspectRatio;
    
    // Convert world position to lat/lng
    const coordinates = worldToLatLng(worldPos, mapPlaneWidth, mapPlaneHeight);
    
    // Update state with click position (for display positioning) and coordinates
    setClickPosition({ x: e.clientX, y: e.clientY });
    setClickedCoordinates(coordinates);
  };
  
  return (
    <div 
      className={`maps-view-container ${interactionMode}-mode`} 
      ref={containerRef}
    >
      <div className="mode-indicator">
        Mode: {interactionMode === 'pan' ? 'Pan (H)' : 'Pointer (P)'}
      </div>
      
      <Canvas>
        <OrthographicCamera
          makeDefault
          position={[0, 0, 10]}
          zoom={150}
          near={0.1}
          far={1000}
        />
        
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 0, 10]} intensity={1} />
        <directionalLight position={[0, 0, -10]} intensity={0.5} />
        
        <Suspense fallback={<LoadingFallback />}>
          <MapPlane />
          <GridLines />
        </Suspense>
        
        <MapControls 
          interactionMode={interactionMode}
          onCoordinateClick={handleCoordinateClick}
        />
      </Canvas>
      
      {/* Coordinate display */}
      <CoordinateDisplay 
        position={clickPosition}
        coordinates={clickedCoordinates}
      />
      
      <TimeSlider />
    </div>
  );
};
```

### Step 8: Add Mode Indicator UI

Add a simple mode indicator UI to show the current mode:

```css
/* Add to MapsView.css */
.mode-indicator {
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1500;
}
```

## Testing

After implementation, test the feature by:

1. Pressing 'H' to enter pan mode and verifying that:
   - The cursor changes to a hand icon when hovering over the map
   - Dragging the map works as expected
   - The mode indicator shows "Pan Mode"

2. Pressing 'P' to enter pointer mode and verifying that:
   - The cursor changes to a crosshair when hovering over the map
   - Clicking on the map displays lat/long coordinates
   - Zooming with the mouse wheel still works
   - The mode indicator shows "Pointer Mode"

## Potential Enhancements

Future enhancements could include:

1. Adding a toggle button UI in addition to keyboard shortcuts
2. Saving clicked points for later reference
3. Displaying a marker at clicked points
4. Adding distance calculation between points
5. Importing/exporting coordinates 