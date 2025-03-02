# Earth & Satellite Visualization

This project provides two different views to visualize Earth and satellite orbit:

1. **3D Earth View** - A Three.js-powered 3D view with an orbiting satellite
2. **Map View** - A 2D map showing the satellite orbit path

Both views share the same time control slider to synchronize the satellite position.

## Features

- Interactive 3D Earth model with orbiting satellite
- 2D map view with synchronized orbit path
- Shared time controls across both views
- Ability to play/pause the satellite movement
- Custom min/max time range controls

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Controls

- Use the navigation buttons in the top-right to switch between views
- Use the slider at the bottom to control the time/position of the satellite
- Click the play/pause button to automate the satellite movement
- You can edit the min/max time values by typing in the input fields and pressing Enter

## 3D View Specific Controls

- Use mouse to rotate, zoom, and pan the camera
- Zooming out beyond a certain threshold will switch to the alternate view showing the orbit path

# React Three Fiber Map Application

This project implements an interactive map visualization using React Three Fiber, allowing users to explore geographical coordinates in 3D space.

## Features Implemented

- 3D map visualization with orthographic camera
- Smooth panning controls
- Gradual mouse wheel zooming with adaptive sensitivity
- Map grid lines showing meridians (longitude) and parallels (latitude)
  - Prime meridian (0° longitude) highlighted in center
  - Equator (0° latitude) highlighted in center
  - Additional grid lines at 30° intervals

## Next Feature to Implement

### Keyboard Mode Switching (H/P Keys)

The next feature to implement is keyboard-based mode switching between panning and coordinate pointing:

1. **H Key - Pan Mode**
   - When the user presses the 'H' key, the application switches to "pan mode"
   - In this mode, mouse dragging pans the map view (default behavior)
   - The cursor should change to indicate pan functionality (e.g., grab cursor)

2. **P Key - Pointer Mode** 
   - When the user presses the 'P' key, the application switches to "pointer mode"
   - In this mode, clicking on the map displays the latitude/longitude coordinates of the clicked point
   - The cursor should change to indicate the coordinate selection functionality (e.g., crosshair)
   - Coordinates should be displayed in a small info panel near the click point

3. **Implementation Requirements**
   - Add state tracking for the current mode (pan or pointer)
   - Implement keyboard event listeners for 'H' and 'P' keys
   - Create visual feedback to indicate the current mode
   - Calculate accurate lat/long coordinates based on click position relative to the map
   - Create a UI element to display the selected coordinates

This feature will enhance the interactive experience by allowing users to easily switch between navigating the map and retrieving specific geographical coordinates.

## Future Enhancements

After implementing mode switching, potential future enhancements include:
- Adding satellite tracking visualization
- Implementing time-based animation controls
- Adding the ability to save and label points of interest
- Enhancing the visual appearance with additional map overlays
