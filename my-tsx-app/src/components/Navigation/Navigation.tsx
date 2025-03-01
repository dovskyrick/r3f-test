import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="navigation">
      <Link 
        to="/" 
        className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
      >
        3D Earth View
      </Link>
      <Link 
        to="/maps" 
        className={`nav-item ${location.pathname === '/maps' ? 'active' : ''}`}
      >
        Maps View
      </Link>
    </div>
  );
};

export default Navigation; 