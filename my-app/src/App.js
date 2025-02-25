import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";
import "./App.css";
import model from "./assets/earth.glb"; // Earth model

const ORBIT_RADIUS = 105; // Satellite orbit radius
const ORBIT_SPEED = 0.02; // Speed of orbit
const DESCALE_FACTOR = 0.3; 
const ZOOM_THRESHOLD = 80; // Distance at which we switch views

function Earth({ isAlternateView }) {
  const { scene } = useGLTF(model);
  const [angle, setAngle] = useState(0);

  useFrame((state, delta) => {
    if (!isAlternateView) {
      setAngle((prev) => prev + delta * ORBIT_SPEED);

      // Compute Earth position using circular motion
      const x = ORBIT_RADIUS * Math.cos(angle);
      const y = ORBIT_RADIUS * Math.sin(angle);

      scene.position.set(x, 0, y);
    } else {
      scene.position.set(0, 0, 0);
    }
  });

  return <primitive object={scene} scale={isAlternateView ? DESCALE_FACTOR : 1} />;
}

function Satellite({ isAlternateView }) {
  if (isAlternateView) return null; // Hide satellite in alternate view

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
}

function AlternateViewObjects({ isAlternateView }) {
  if (!isAlternateView) return null; // Hide these objects when not in alternate view

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}> {/* Rotate to lay flat on XY plane */}
      <ringGeometry args={[ORBIT_RADIUS*DESCALE_FACTOR, ORBIT_RADIUS*DESCALE_FACTOR + 0.5, 64]} /> {/* Inner radius, outer radius, segments */}
      <meshBasicMaterial color="white" opacity={0.5} transparent={true} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ✅ This component runs inside <Canvas> and correctly manages zoom level
function CameraManager({ setIsAlternateView }) {
  useFrame(({ camera }) => {
    const distance = camera.position.length();
    if (distance > ZOOM_THRESHOLD) {
      setIsAlternateView(true);
    } else {
      setIsAlternateView(false);
    }
  });

  return null; // No visible UI, just logic
}

export default function App() {
  const [isAlternateView, setIsAlternateView] = useState(false);
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("100");
  const [isEditingMin, setIsEditingMin] = useState(false);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.target.blur();
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        if (type === 'min') {
          setMinValue(value.toString());
        } else {
          setMaxValue(value.toString());
        }
      }
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [20, 20, 20] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />

        {/* Runs inside Canvas to detect zoom changes */}
        <CameraManager setIsAlternateView={setIsAlternateView} />

        <Earth isAlternateView={isAlternateView} />
        <Satellite isAlternateView={isAlternateView} />
        <AlternateViewObjects isAlternateView={isAlternateView} />

        <OrbitControls />
      </Canvas>
      <div className="slider-container">
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
        <input
          type="text"
          className="range-value"
          value={minValue}
          onChange={(e) => setMinValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, 'min')}
        />
        <input
          type="range"
          min={parseFloat(minValue)}
          max={parseFloat(maxValue)}
          defaultValue={parseFloat(minValue)}
          className="time-slider"
        />
        <input
          type="text"
          className="range-value"
          value={maxValue}
          onChange={(e) => setMaxValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, 'max')}
        />
      </div>
    </div>
  );
}
