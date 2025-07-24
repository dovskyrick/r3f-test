import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CacheProvider } from './contexts/CacheContext';
import { TimeProvider } from './contexts/TimeContext';
import { SatelliteProvider } from './contexts/SatelliteContext';
import { useSatelliteContext } from './contexts/SatelliteContext';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { theme } from './theme';
import EarthView from './pages/EarthView/EarthView';
import MapsView from './pages/MapsView/MapsView';
import Navigation from './components/Navigation/Navigation';
import SidebarToggle from './components/Satellite/SidebarToggle';
import SatelliteSidebar from './components/Satellite/SatelliteSidebar';
import CacheManager from './components/CacheManager/CacheManager';
import TopNavBar from './components/TopNavBar/TopNavBar';
import './App.css';

// Wrapper component to access context
const AppContent: React.FC = () => {
  const { isSidebarOpen } = useSatelliteContext();
  const [isDevViewVisible, setIsDevViewVisible] = React.useState(false);

  // Handle dev view toggle from TopNavBar
  const handleDevViewToggle = (isVisible: boolean) => {
    setIsDevViewVisible(isVisible);
    console.log(`[App] Dev view ${isVisible ? 'enabled' : 'disabled'}`);
  };
  
  return (
    <Router>
      {/* Top Navigation Bar - overlays everything */}
      <TopNavBar 
        isDevViewVisible={isDevViewVisible}
        onDevViewToggle={handleDevViewToggle}
      />
      
      <CacheManager />
      <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Main content */}
        <div className="main-content">
          <Navigation />
          <Routes>
            <Route 
              path="/" 
              element={<EarthView isDevViewVisible={isDevViewVisible} />} 
            />
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
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <CacheProvider>
            <TimeProvider>
              <SatelliteProvider>
                <AppContent />
              </SatelliteProvider>
            </TimeProvider>
          </CacheProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
