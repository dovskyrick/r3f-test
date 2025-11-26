import React, { useRef, useEffect, useState } from 'react';
import { PanelProps } from '@grafana/data';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ options, data, width, height, timeRange, timeZone }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  
  // State for formatted time range display
  const [timeRangeText, setTimeRangeText] = useState<string>('');
  
  // Update time range text when timeRange changes
  useEffect(() => {
    if (timeRange) {
      const fromTime = timeRange.from.format('YYYY-MM-DD HH:mm:ss');
      const toTime = timeRange.to.format('YYYY-MM-DD HH:mm:ss');
      const duration = timeRange.to.valueOf() - timeRange.from.valueOf();
      const durationHours = (duration / (1000 * 60 * 60)).toFixed(1);
      
      setTimeRangeText(`${fromTime} → ${toTime} (${durationHours}h)`);
    }
  }, [timeRange]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Cube setup
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update controls (for smooth damping)
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (cubeRef.current) {
        cubeRef.current.geometry.dispose();
        if (cubeRef.current.material instanceof THREE.Material) {
          cubeRef.current.material.dispose();
        }
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [width, height]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* 3D Canvas */}
      <div ref={containerRef} style={{ width, height }} />
      
      {/* Time Range Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Time Range</div>
        <div>{timeRangeText || 'Loading...'}</div>
        <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
          Timezone: {timeZone || 'UTC'}
        </div>
      </div>
    </div>
  );
};