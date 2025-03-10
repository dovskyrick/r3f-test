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
