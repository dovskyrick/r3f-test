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
