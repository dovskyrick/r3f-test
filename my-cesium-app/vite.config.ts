import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 3000, // Match the port from your tsx app if desired
  },
  assetsInclude: [
    '**/*.glb',
    '**/*.gltf', 
    '**/*.fbx',
    '**/*.obj',
    '**/*.mtl',
    '**/*.dae',
    '**/*.3ds',
    '**/*.ply',
    '**/*.stl'
  ],
});