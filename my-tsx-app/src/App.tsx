import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TimeProvider } from './contexts/TimeContext';
import EarthView from './pages/EarthView/EarthView';
import MapsView from './pages/MapsView/MapsView';
import Navigation from './components/Navigation/Navigation';
import './App.css';

const App: React.FC = () => {
  return (
    <TimeProvider>
      <Router>
        <div className="app-container">
          <Navigation />
          <Routes>
            <Route path="/" element={<EarthView />} />
            <Route path="/maps" element={<MapsView />} />
          </Routes>
        </div>
      </Router>
    </TimeProvider>
  );
};

export default App;
