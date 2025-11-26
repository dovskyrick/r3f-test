# Implementation Plan: 3D Map View with Orthographic Camera

## Feasibility Assessment

### 1. Orthographic Camera in React Three Fiber

**Status: Possible**

React Three Fiber fully supports orthographic cameras through the `OrthographicCamera` component. This camera projects 3D objects in a way that preserves parallel lines and removes perspective distortion, making it ideal for map-like applications. The camera can be configured with:

```
<OrthographicCamera 
  makeDefault 
  zoom={zoom} 
  position={[0, 0, 5]} 
  left={left} 
  right={right} 
  top={top} 
  bottom={bottom} 
/>
```

The orthographic camera can be controlled to pan (move in x/y directions) without rotation, exactly as required for this implementation.

### 2. Using JPG Images in React Three Fiber

**Status: Possible**

There are two primary methods to use a JPG image in a React Three Fiber scene:

1. **Direct method**: Use a `TextureLoader` to load the image and apply it to a plane mesh
   ```
   const texture = useLoader(TextureLoader, '/path/to/map.jpg')
   return <mesh><planeGeometry /><meshBasicMaterial map={texture} /></mesh>
   ```

2. **Using a GLB with texture**: Create a 3D model in Blender with the image as a texture

For this implementation, the direct method is preferable as it's simpler and doesn't require external 3D modeling. The JPG can be directly applied to a plane in the 3D scene.

## Implementation Steps

### Phase 1: Basic Setup

1. Create a new component for the 3D map view
2. Set up React Three Fiber canvas with an orthographic camera
3. Position the camera directly above the scene, looking down
4. Disable camera rotation controls, allowing only panning

### Phase 2: Map Implementation (First Verification Point)

1. Load the map JPG image as a texture
2. Create a plane geometry with appropriate dimensions (matching the image aspect ratio)
3. Apply the texture to the plane
4. Position the plane at the center of the reference frame (0,0,0)
5. Draw only a vertical line (meridian) and a horizontal line (equator) passing through the center
6. **STOP HERE FOR VERIFICATION**

### Phase 3: Coordinate System & Grid (After Verification)

1. Implement coordinate conversion functions (between lat/long and 3D space)
2. Add grid lines at specified longitude and latitude intervals
3. Add coordinate labels for grid lines
4. Mark cardinal points (90°N, 90°S, 180°W, 180°E)

### Phase 4: Interactive Elements

1. Implement satellite object with orbital motion
2. Add click detection for displaying coordinates
3. Create coordinate markers for clicked points
4. Implement panning controls that respect the orthographic view

### Phase 5: Camera Controls & UI Integration

1. Set up zoom controls for the orthographic camera
2. Integrate the TimeSlider component
3. Maintain fixed UI elements position while allowing map panning/zooming
4. Implement smooth transitions for camera movements

## Important Implementation Notes

- The orthographic camera's frustum dimensions must be calculated based on the aspect ratio of the container
- Maintain correct aspect ratio for the map plane to avoid distortion
- Ensure all UI elements maintain fixed positions while the map can be panned
- The zoom level should affect the orthographic camera's zoom parameter, not the scale of objects
- Text elements (labels) should be implemented as HTML overlays or sprites to maintain readability

## Development Approach

Each phase will be implemented separately and verified before moving to the next:

1. Start with implementing only Phase 1 and Phase 2
2. Verify that the map displays correctly with meridian and equator lines
3. WAIT FOR USER CONFIRMATION before proceeding with additional phases
4. Implement each subsequent phase only after the previous one is verified working

This incremental approach ensures we can identify and fix issues early in the implementation process. 