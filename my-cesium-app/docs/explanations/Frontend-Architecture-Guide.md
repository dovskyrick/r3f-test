# React Front-End Architecture: A Comprehensive Guide

## Table of Contents
1. [Introduction to the Application](#introduction-to-the-application)
2. [Understanding React and TypeScript](#understanding-react-and-typescript)
3. [Project Structure Overview](#project-structure-overview)
4. [Application Entry Points](#application-entry-points)
5. [Context API and State Management](#context-api-and-state-management)
6. [Main Views](#main-views)
7. [3D Components](#3d-components)
8. [Map Components](#map-components)
9. [Shared Components](#shared-components)
10. [Data Flow](#data-flow)
11. [Hooks and Effects](#hooks-and-effects)
12. [Trajectory Visualization](#trajectory-visualization)
13. [Component Lifecycle](#component-lifecycle)
14. [Debugging and Common Issues](#debugging-and-common-issues)

## Introduction to the Application

This application is a visualization tool for Earth and satellite orbital data. It provides two primary views:

1. **3D Earth View**: A three-dimensional representation of Earth with a satellite orbiting around it
2. **Maps View**: A two-dimensional map projection that shows the satellite ground track

Both views are synchronized using shared state, allowing users to control the time and position of the satellite. The application also includes a feature to display trajectory data from a backend server.

## Understanding React and TypeScript

### What is React?

React is a JavaScript library for building user interfaces based on components. If you're familiar with object-oriented programming, you can think of React components as specialized classes that handle their own rendering and state.

Unlike traditional imperative programming where you specify step-by-step instructions, React uses a **declarative approach**: you describe what the UI should look like for a given state, and React handles the DOM updates efficiently.

### TypeScript and TSX

TypeScript (TS) is a strongly-typed superset of JavaScript. TypeScript adds static typing to JavaScript, which helps catch errors during development rather than at runtime.

`.tsx` files are TypeScript files that include JSX (JavaScript XML) - a syntax extension that allows you to write HTML-like code directly within your JavaScript/TypeScript.

Example of JSX syntax:
```tsx
// Traditional imperative DOM manipulation
const button = document.createElement('button');
button.textContent = 'Click me';
button.className = 'primary-button';
container.appendChild(button);

// React JSX equivalent
return <button className="primary-button">Click me</button>;
```

### Components in React

A React component is a reusable piece of UI. Components can be:

1. **Function Components**: JavaScript/TypeScript functions that return JSX
2. **Class Components**: ES6 classes that extend `React.Component` (less common in modern React)

Our application exclusively uses function components. A typical function component looks like:

```tsx
const MyComponent: React.FC = () => {
  // Component logic here
  return (
    <div>
      {/* JSX representing the component's UI */}
    </div>
  );
};
```

### Props and State

- **Props**: Similar to function arguments, props are data passed to a component from its parent
- **State**: Internal data managed by a component that can change over time

Unlike purely functional programming where functions only depend on their inputs, React components can maintain internal state, making them more like objects that encapsulate both data and behavior.

## Project Structure Overview

The project is organized into the following main directories within the `src` folder:

- `/components`: Reusable UI components
  - `/3D`: Components for 3D visualization
  - `/Map`: Components for 2D map visualization
  - `/Navigation`: Navigation bar components
  - `/TimeSlider`: Components for time control
  - `/TrajectoryToggle`: Components for toggling trajectory visualization
- `/contexts`: React Context Providers for state management
- `/pages`: Top-level page components
  - `/EarthView`: 3D Earth visualization
  - `/MapsView`: 2D Map visualization
- `/assets`: Static assets like images
- `/docs`: Documentation files (like this one!)

## Application Entry Points

### index.tsx

This is the main entry point of the application. It renders the `App` component into the DOM.

```tsx
// Simplified version of index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

### App.tsx

The `App` component is the root component of our application. It sets up:
1. Routing between different views
2. Global state via Context Providers
3. Core layout of the application

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TimeProvider } from './contexts/TimeContext';
import { TrajectoryProvider } from './contexts/TrajectoryContext';
import EarthView from './pages/EarthView/EarthView';
import MapsView from './pages/MapsView/MapsView';
import Navigation from './components/Navigation/Navigation';
import './App.css';

const App: React.FC = () => {
  return (
    <TimeProvider>
      <TrajectoryProvider>
        <Router>
          <div className="app-container">
            <Navigation />
            <Routes>
              <Route path="/" element={<EarthView />} />
              <Route path="/maps" element={<MapsView />} />
            </Routes>
          </div>
        </Router>
      </TrajectoryProvider>
    </TimeProvider>
  );
};

export default App;
```

In this file:
- `TimeProvider` and `TrajectoryProvider` are context providers (explained later)
- `Router`, `Routes`, and `Route` are from React Router, handling navigation
- `Navigation` is the component for the nav bar
- `EarthView` and `MapsView` are the two main page components

## Context API and State Management

### What is React Context?

React Context provides a way to share state between components without having to pass props through every level of the component tree (known as "prop drilling").

Think of Context as a global variable accessible to a specific part of your component tree, but with controlled access patterns and reactivity to changes.

### TimeContext.tsx

```tsx
// Simplified version of src/contexts/TimeContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context data
interface TimeContextType {
  minValue: string;
  maxValue: string;
  currentTime: number;
  isPlaying: boolean;
  setMinValue: (value: string) => void;
  setMaxValue: (value: string) => void;
  setCurrentTime: (time: number) => void;
  togglePlayPause: () => void;
  stepSize: number;
}

// Create the context with a default undefined value
const TimeContext = createContext<TimeContextType | undefined>(undefined);

// Provider component that wraps parts of the app that need the context
export const TimeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [minValue, setMinValue] = useState('2023-01-01');
  const [maxValue, setMaxValue] = useState('2023-12-31');
  const [currentTime, setCurrentTime] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const stepSize = 1;

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  // Construct the value object containing all the state and functions
  const contextValue: TimeContextType = {
    minValue,
    maxValue,
    currentTime,
    isPlaying,
    setMinValue,
    setMaxValue,
    setCurrentTime,
    togglePlayPause,
    stepSize
  };

  // Provide the context value to all children components
  return (
    <TimeContext.Provider value={contextValue}>
      {children}
    </TimeContext.Provider>
  );
};

// Custom hook for consuming the context
export const useTimeContext = () => {
  const context = useContext(TimeContext);
  
  if (context === undefined) {
    throw new Error('useTimeContext must be used within a TimeProvider');
  }
  
  return context;
};
```

Key concepts in this file:
- `createContext`: Creates a new Context object
- `useState`: Hook for adding React state to function components
- `useContext`: Hook for consuming a Context value
- The Provider pattern: A component that wraps others and provides the context value
- Custom hook pattern: `useTimeContext` simplifies consuming the context

### TrajectoryContext.tsx

This context manages the trajectory data and visualization state:

```tsx
// Simplified version of src/contexts/TrajectoryContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Earth radius in kilometers
export const EARTH_RADIUS_KM = 6371;

// Scale factor for 3D visualization (100 units = Earth radius)
export const SCALE_FACTOR = 100 / EARTH_RADIUS_KM;

// Type definitions for trajectory data
export interface TrajectoryData {
  points: TrajectoryPoint[];
  start_time: string;
  end_time: string;
  point_count: number;
  status: string;
  message?: string;
}

interface TrajectoryContextType {
  trajectoryData: TrajectoryData | null;
  isTrajectoryVisible: boolean;
  isLoading: boolean;
  error: string | null;
  fetchTrajectory: () => Promise<void>;
  toggleTrajectoryVisibility: () => void;
  isTrajectoryLoaded: boolean;
  retryFetch: () => Promise<void>;
}

const TrajectoryContext = createContext<TrajectoryContextType | undefined>(undefined);

export const TrajectoryProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [isTrajectoryVisible, setIsTrajectoryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTrajectoryLoaded = trajectoryData !== null;

  // Fetch trajectory data from API
  const fetchTrajectory = async () => {
    if (isTrajectoryLoaded) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/trajectory?points=50');
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      setTrajectoryData(data);
    } catch (err) {
      console.error('Error fetching trajectory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trajectory data');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle visibility of trajectory
  const toggleTrajectoryVisibility = () => {
    if (!isTrajectoryLoaded && !isTrajectoryVisible) {
      fetchTrajectory();
    }
    
    setIsTrajectoryVisible(prev => !prev);
  };

  // Other methods...

  return (
    <TrajectoryContext.Provider value={{
      trajectoryData,
      isTrajectoryVisible,
      isLoading,
      error,
      fetchTrajectory,
      toggleTrajectoryVisibility,
      isTrajectoryLoaded,
      retryFetch: fetchTrajectory
    }}>
      {children}
    </TrajectoryContext.Provider>
  );
};

export const useTrajectoryContext = () => {
  const context = useContext(TrajectoryContext);
  
  if (context === undefined) {
    throw new Error('useTrajectoryContext must be used within a TrajectoryProvider');
  }
  
  return context;
};
```

This context introduces:
- Asynchronous data fetching with async/await
- Error handling
- Loading states
- Shared constants (EARTH_RADIUS_KM, SCALE_FACTOR)

## Main Views

### EarthView.tsx

The EarthView is one of the main page components, showing the 3D Earth and satellite:

```tsx
// Simplified version of src/pages/EarthView/EarthView.tsx
import React, { useState } from 'react';
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Earth from '../../components/3D/Earth';
import Satellite from '../../components/3D/Satellite';
import AlternateViewObjects from '../../components/3D/AlternateViewObjects';
import CameraManager from '../../components/3D/CameraManager';
import TrajectoryVisualization from '../../components/3D/TrajectoryVisualization';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import TrajectoryToggle from '../../components/TrajectoryToggle/TrajectoryToggle';
import './EarthView.css';

const EarthView: React.FC = () => {
  const [isAlternateView, setIsAlternateView] = useState(false);

  return (
    <div className="earth-view-container">
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />

        {/* Runs inside Canvas to detect zoom changes */}
        <CameraManager setIsAlternateView={setIsAlternateView} />

        <Earth isAlternateView={isAlternateView} />
        <Satellite isAlternateView={isAlternateView} />
        <AlternateViewObjects isAlternateView={isAlternateView} />
        <TrajectoryVisualization />

        <OrbitControls />
      </Canvas>
      <TrajectoryToggle />
      <TimeSlider />
    </div>
  );
};

export default EarthView;
```

Key concepts here:
- `useState`: A hook to add state to the component (in this case, tracking if we're in alternate view)
- `Canvas`: From the react-three-fiber library, creates a WebGL canvas for 3D rendering
- JSX comments: `{/* */}` lets you write comments in JSX
- Component composition: Building a complex UI from smaller components

### MapsView.tsx

The MapsView component displays a 2D map representation:

```tsx
// Simplified version of src/pages/MapsView/MapsView.tsx
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import TimeSlider from '../../components/TimeSlider/TimeSlider';
import TrajectoryToggle from '../../components/TrajectoryToggle/TrajectoryToggle';
import MapTrajectoryVisualization from '../../components/Map/MapTrajectoryVisualization';
import './MapsView.css';

// Import map image
import mapImage from '../../assets/World_location_map_(equirectangular_180).png';

// Constants for map dimensions
const MAP_IMAGE_WIDTH = 2521;
const MAP_IMAGE_HEIGHT = 1260;
const MAP_ASPECT_RATIO = MAP_IMAGE_WIDTH / MAP_IMAGE_HEIGHT;

// Sub-components defined within the file...
const MapPlane = () => { /* ... */ }
const GridLines = () => { /* ... */ }
const MovingSphere = () => { /* ... */ }
const MapControls = () => { /* ... */ }
const LoadingFallback = () => { /* ... */ }

// Main component
const MapsView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="maps-view-container" ref={containerRef}>
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
          <MovingSphere />
          <MapTrajectoryVisualization />
        </Suspense>
        
        <MapControls />
      </Canvas>
      
      <TrajectoryToggle />
      <TimeSlider />
    </div>
  );
};

export default MapsView;
```

New concepts:
- `useRef`: Creates a mutable reference object that persists across renders
- `Suspense`: React feature for handling asynchronous operations
- `OrthographicCamera`: Unlike perspective camera, maintains consistent sizes regardless of distance
- Nested component definitions: Defining smaller components within a file

The MapsView contains several inner components (MapPlane, GridLines, etc.) that are specific to this view and aren't used elsewhere in the application.

## 3D Components

### Earth.tsx

```tsx
// Simplified version of src/components/3D/Earth.tsx
import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import earthTexture from '../../assets/earth_texture.jpg';

interface EarthProps {
  isAlternateView: boolean;
}

const Earth: React.FC<EarthProps> = ({ isAlternateView }) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, earthTexture);
  
  useFrame(() => {
    if (earthRef.current) {
      // Slowly rotate Earth
      earthRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={earthRef} visible={!isAlternateView}>
      <sphereGeometry args={[10, 32, 32]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

export default Earth;
```

Key concepts:
- `interface`: TypeScript way to define the shape of props
- `useRef`: Creating a reference to the mesh object
- `useLoader`: React Three Fiber hook for loading assets
- `useFrame`: Hook that runs on every animation frame
- `THREE`: The underlying Three.js library

### Satellite.tsx

```tsx
// Simplified version of src/components/3D/Satellite.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTimeContext } from '../../contexts/TimeContext';

interface SatelliteProps {
  isAlternateView: boolean;
}

const Satellite: React.FC<SatelliteProps> = ({ isAlternateView }) => {
  const { currentTime, isPlaying } = useTimeContext();
  const satelliteRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (satelliteRef.current) {
      // Calculate position based on current time
      const angle = (currentTime / 100) * Math.PI * 2;
      const radius = 15;
      
      satelliteRef.current.position.x = Math.cos(angle) * radius;
      satelliteRef.current.position.z = Math.sin(angle) * radius;
      satelliteRef.current.position.y = Math.sin(angle * 0.5) * 5;
    }
  });

  return (
    <mesh ref={satelliteRef} visible={!isAlternateView}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

export default Satellite;
```

This component:
- Consumes the TimeContext to sync with the time slider
- Uses `useFrame` to update the satellite position on each frame
- Calculates a 3D orbit path using trigonometric functions

### TrajectoryVisualization.tsx

```tsx
// Simplified version of src/components/3D/TrajectoryVisualization.tsx
import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import TrajectoryPoints from './TrajectoryPoints';
import TrajectoryLines from './TrajectoryLines';

const TrajectoryVisualization: React.FC = () => {
  const { isTrajectoryVisible, isLoading } = useTrajectoryContext();
  
  if (!isTrajectoryVisible && !isLoading) return null;
  
  return (
    <group>
      <TrajectoryLines />
      <TrajectoryPoints />
    </group>
  );
};

export default TrajectoryVisualization;
```

This component demonstrates:
- Conditional rendering (`if (!isTrajectoryVisible) return null`)
- Composition of smaller specialized components
- React Three Fiber's `group` element (similar to a `<div>` but for 3D space)

## Map Components

### MapTrajectory.tsx

```tsx
// Simplified version of src/components/Map/MapTrajectory.tsx
import React, { useMemo } from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';

// Position converter function
const latLngToPosition = (lat, lng) => {
  const planeWidth = 10;
  const planeHeight = planeWidth / (2521 / 1260); // Based on aspect ratio
  
  // Convert geographic coordinates to plane coordinates
  const x = (lng / 180) * (planeWidth / 2);
  const y = (lat / 90) * (planeHeight / 2);
  
  return [x, y, 0.01];
};

const MapTrajectory: React.FC = () => {
  const { trajectoryData, isTrajectoryVisible } = useTrajectoryContext();
  
  // Process points - IMPORTANT: useMemo must be called unconditionally
  const mapPoints = useMemo(() => {
    if (!isTrajectoryVisible || !trajectoryData) return [];
    
    return trajectoryData.points.map(point => ({
      position: latLngToPosition(
        point.spherical.latitude, 
        point.spherical.longitude
      ),
      epoch: point.epoch,
      mjd: point.mjd
    }));
  }, [trajectoryData, isTrajectoryVisible]);
  
  // Conditional rendering after hooks
  if (!isTrajectoryVisible || !trajectoryData) return null;
  
  return (
    <group>
      {mapPoints.map((point, index) => (
        <mesh 
          key={`map-trajectory-point-${index}`} 
          position={point.position}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ff3333" />
        </mesh>
      ))}
    </group>
  );
};

export default MapTrajectory;
```

This component introduces:
- Coordinate transformation (lat/lng to 2D positions)
- `useMemo`: Performance optimization hook that memoizes expensive calculations
- Array mapping in JSX: Converting an array of data to JSX elements
- The key prop: Important for React's reconciliation algorithm

## Shared Components

### TimeSlider.tsx

```tsx
// Simplified version of src/components/TimeSlider/TimeSlider.tsx
import React from 'react';
import { useTimeContext } from '../../contexts/TimeContext';
import './TimeSlider.css';

const TimeSlider: React.FC = () => {
  const { 
    currentTime, 
    setCurrentTime, 
    minValue, 
    maxValue, 
    setMinValue,
    setMaxValue,
    isPlaying,
    togglePlayPause
  } = useTimeContext();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  return (
    <div className="slider-container">
      <div className="range-control">
        <input 
          type="text" 
          className="range-value" 
          value={minValue}
          onChange={(e) => setMinValue(e.target.value)}
        />
        
        <input
          type="range"
          min="0"
          max="100"
          value={currentTime}
          onChange={handleSliderChange}
          className="time-slider"
        />
        
        <input 
          type="text" 
          className="range-value" 
          value={maxValue}
          onChange={(e) => setMaxValue(e.target.value)}
        />
      </div>
      
      <button className="play-button" onClick={togglePlayPause}>
        {isPlaying ? (
          <div className="pause-icon">
            <span></span>
            <span></span>
          </div>
        ) : (
          <div className="play-icon"></div>
        )}
      </button>
    </div>
  );
};

export default TimeSlider;
```

This component:
- Consumes multiple values and functions from TimeContext
- Handles user inputs with event handlers
- Uses conditional rendering for play/pause icon
- Demonstrates form control handling in React

### TrajectoryToggle.tsx

```tsx
// Simplified version of src/components/TrajectoryToggle/TrajectoryToggle.tsx
import React from 'react';
import { useTrajectoryContext } from '../../contexts/TrajectoryContext';
import './TrajectoryToggle.css';

const TrajectoryToggle: React.FC = () => {
  const { 
    isTrajectoryVisible, 
    toggleTrajectoryVisibility, 
    isLoading, 
    error,
    retryFetch
  } = useTrajectoryContext();

  return (
    <div className="trajectory-toggle-container">
      <button 
        className={`trajectory-toggle-button ${isTrajectoryVisible ? 'active' : ''}`}
        onClick={toggleTrajectoryVisibility}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="loading-spinner"></span>
        ) : (
          isTrajectoryVisible ? 'Hide Trajectory' : 'Show Trajectory'
        )}
      </button>

      {error && (
        <div className="trajectory-error">
          <p>Error: {error}</p>
          <button onClick={retryFetch} className="retry-button">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default TrajectoryToggle;
```

Key features:
- Conditional CSS classes (`${isTrajectoryVisible ? 'active' : ''}`)
- Loading and error states
- Disabled state for buttons
- Error handling with retry functionality

## Data Flow

In React, data typically flows in one direction - from parent to child through props. However, our app uses Context to share state across different component branches.

Here's a diagram of data flow in the application:

```
App
├── TimeProvider (Context)
│   └── TimeContext data used by:
│       ├── TimeSlider
│       ├── Satellite
│       └── Many components that need time
│
├── TrajectoryProvider (Context)
│   └── TrajectoryContext data used by:
│       ├── TrajectoryToggle
│       ├── TrajectoryVisualization
│       └── MapTrajectoryVisualization
│
├── Router
│   ├── EarthView
│   │   ├── Canvas (React Three Fiber)
│   │   │   ├── Earth
│   │   │   ├── Satellite
│   │   │   └── TrajectoryVisualization
│   │   │       ├── TrajectoryPoints
│   │   │       └── TrajectoryLines
│   │   ├── TrajectoryToggle
│   │   └── TimeSlider
│   │
│   └── MapsView
│       ├── Canvas
│       │   ├── MapPlane
│       │   ├── GridLines
│       │   ├── MovingSphere
│       │   └── MapTrajectoryVisualization
│       │       ├── MapTrajectory
│       │       └── MapTrajectoryPath
│       ├── TrajectoryToggle
│       └── TimeSlider
```

### Handling User Events

When a user interacts with the UI (e.g., moving the time slider), the flow is:

1. Event handler in component is triggered
2. Handler calls a function from context (e.g., `setCurrentTime`)
3. Context updates its internal state
4. All components consuming that context are re-rendered with the new value
5. Visual updates appear in the UI

## Hooks and Effects

React hooks are functions that let you "hook into" React features from function components.

### useState

```tsx
const [count, setCount] = useState(0);
```

- Creates a state variable (`count`) and a function to update it (`setCount`)
- Initial value is provided as the argument (0 in this case)
- When `setCount` is called, the component re-renders with the new value

### useEffect

```tsx
useEffect(() => {
  // This code runs after every render
  
  return () => {
    // This cleanup code runs before the next effect
    // and when the component unmounts
  };
}, [dependency1, dependency2]);
```

- Handles side effects in components
- The function runs after render
- The optional return function cleans up before the next effect runs
- The dependency array controls when the effect runs (only when deps change)

### useMemo

```tsx
const memoizedValue = useMemo(() => {
  // Expensive calculation
  return computeExpensiveValue(a, b);
}, [a, b]);
```

- Memoizes a value, only recomputing it when dependencies change
- Optimizes performance by avoiding unnecessary recalculations
- Must be called unconditionally (not inside if statements or loops)

### useRef

```tsx
const myRef = useRef(initialValue);

// Later in your component
myRef.current = newValue; // Doesn't cause re-render
```

- Creates a mutable reference that persists across renders
- Changing a ref doesn't trigger a re-render
- Commonly used to access DOM elements directly

## Trajectory Visualization

Our trajectory visualization system consists of:

1. **TrajectoryContext**: Manages the data and visibility state
2. **TrajectoryToggle**: UI control for showing/hiding trajectories
3. **3D Visualization**:
   - TrajectoryPoints: Renders points in 3D space
   - TrajectoryLines: Connects points with lines
4. **Map Visualization**:
   - MapTrajectory: Renders points on 2D map
   - MapTrajectoryPath: Draws path lines on map

### Coordinate Systems

The application works with two coordinate systems:

1. **Cartesian (XYZ)**: Used for 3D Earth view
   - X, Y, Z coordinates in kilometers
   - Scaled to match Earth's radius (100 units in 3D space)

2. **Spherical (Latitude/Longitude)**: Used for Map view
   - Latitude: -90° to 90° (North/South)
   - Longitude: -180° to 180° (East/West)
   - Projected onto a 2D plane

### TrajectoryPoint Interface

```tsx
export interface TrajectoryPoint {
  epoch: string;
  cartesian: CartesianPoint;
  spherical: SphericalPoint;
  mjd: number;
}

export interface CartesianPoint {
  x: number;
  y: number;
  z: number;
}

export interface SphericalPoint {
  longitude: number;
  latitude: number;
}
```

## Component Lifecycle

In functional components with hooks, the lifecycle works differently than in class components:

1. **Component Mounting**:
   - Function component is called
   - Hooks are initialized in order
   - JSX is rendered
   - Effects (useEffect) run after render

2. **Component Updating**:
   - Function component is called again with new props/state
   - Hooks are executed in the same order
   - JSX is re-rendered
   - Effects with changed dependencies run

3. **Component Unmounting**:
   - Cleanup functions from useEffect are called
   - Component is removed from the DOM

## Debugging and Common Issues

### Rules of Hooks

React has strict rules for hooks:

1. **Only call hooks at the top level** of your component
2. **Don't call hooks inside loops, conditions, or nested functions**
3. **Only call hooks from React function components** or custom hooks

Breaking these rules can lead to bugs that are hard to trace.

### Conditional Rendering

In React, you can conditionally render components using:

```tsx
// If condition
{condition && <MyComponent />}

// If-else condition
{condition ? <ComponentA /> : <ComponentB />}

// Early return
if (condition) return null;
```

### Key Prop

When rendering lists, always use a unique `key` prop:

```tsx
{items.map((item) => (
  <ListItem key={item.id} data={item} />
))}
```

This helps React identify which items have changed, been added, or removed.

### React DevTools

React DevTools is a browser extension that helps you inspect:
- Component tree
- Props and state
- Context values
- Performance issues

## Conclusion

This guide has covered the fundamental concepts of React and the structure of our front-end application. React's component-based architecture allows us to build complex UIs by composing smaller, reusable pieces.

Remember that React uses a declarative approach - you describe what the UI should look like for a given state, and React handles the DOM manipulation. This is different from imperative programming where you would specify the exact steps to update the UI.

The combination of React, TypeScript, and Three.js gives us a powerful framework for building interactive 3D and 2D visualizations, with strong typing to catch errors during development. 