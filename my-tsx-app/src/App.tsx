import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TimeProvider } from './contexts/TimeContext';
import { TrajectoryProvider } from './contexts/TrajectoryContext';
import { SatelliteProvider } from './contexts/SatelliteContext';
import { useSatelliteContext } from './contexts/SatelliteContext';
import EarthView from './pages/EarthView/EarthView';
import MapsView from './pages/MapsView/MapsView';
import Navigation from './components/Navigation/Navigation';
import SidebarToggle from './components/Satellite/SidebarToggle';
import SatelliteSidebar from './components/Satellite/SatelliteSidebar';
import './App.css';

// Wrapper component to access context
const AppContent: React.FC = () => {
  const { isSidebarOpen } = useSatelliteContext();
  
  return (
    <Router>
      <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Main content */}
        <div className="main-content">
          <Navigation />
          <Routes>
            <Route path="/" element={<EarthView />} />
            <Route path="/maps" element={<MapsView />} />
          </Routes>
        </div>
        
        {/* Sidebar */}
        <SatelliteSidebar />
        
        {/* Toggle Button */}
        <SidebarToggle />
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <TimeProvider>
      <TrajectoryProvider>
        <SatelliteProvider>
          <AppContent />
        </SatelliteProvider>
      </TrajectoryProvider>
    </TimeProvider>
  );
};

export default App;
