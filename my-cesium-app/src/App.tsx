import { useEffect, useRef } from 'react';
import { Viewer } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

function App() {
  const cesiumContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cesiumContainer.current) {
      const viewer = new Viewer(cesiumContainer.current);
      
      // Cleanup function
      return () => {
        viewer.destroy();
      };
    }
  }, []);

  return (
    <div 
      ref={cesiumContainer} 
      style={{ width: '100%', height: '100vh' }}
    />
  );
}

export default App;
