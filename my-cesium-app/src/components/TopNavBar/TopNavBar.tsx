import React, { useState } from 'react';
import './TopNavBar.css';

interface TopNavBarProps {
  isDevViewVisible?: boolean;
  onDevViewToggle?: (isVisible: boolean) => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ 
  isDevViewVisible = false, 
  onDevViewToggle 
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuItemClick = (item: string) => {
    console.log(`Menu item clicked: ${item}`);
    
    // Handle dev view toggle specifically
    if (item === 'Toggle Dev View' && onDevViewToggle) {
      onDevViewToggle(!isDevViewVisible);
    }
    
    setActiveMenu(null); // Close menu after selection
  };

  return (
    <div className="top-navbar">
      <div className="navbar-content">
        {/* App Title/Logo */}
        <div className="navbar-brand">
          Satellite Tracker
        </div>

        {/* Menu Items */}
        <div className="navbar-menu">
          
          {/* File Menu */}
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => handleMenuClick('file')}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="dropdown-menu">
                <button onClick={() => handleMenuItemClick('New Session')}>New Session</button>
                <button onClick={() => handleMenuItemClick('Save Session')}>Save Session</button>
                <button onClick={() => handleMenuItemClick('Load Session')}>Load Session</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('Export Data')}>Export Data</button>
                <button onClick={() => handleMenuItemClick('Import TLE')}>Import TLE File</button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => handleMenuClick('edit')}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div className="dropdown-menu">
                <button onClick={() => handleMenuItemClick('Add Satellite')}>Add Satellite</button>
                <button onClick={() => handleMenuItemClick('Remove All')}>Remove All Satellites</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('Preferences')}>Preferences</button>
                <button onClick={() => handleMenuItemClick('Clear Cache')}>Clear Cache</button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => handleMenuClick('view')}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="dropdown-menu">
                <button onClick={() => handleMenuItemClick('3D View')}>3D View</button>
                <button onClick={() => handleMenuItemClick('Map View')}>Map View</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('Toggle Sidebar')}>Toggle Sidebar</button>
                <button onClick={() => handleMenuItemClick('Fullscreen')}>Fullscreen</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('Reset Camera')}>Reset Camera</button>
                <button onClick={() => handleMenuItemClick('Focus Earth')}>Focus Earth</button>
                <div className="menu-separator"></div>
                <button 
                  onClick={() => handleMenuItemClick('Toggle Dev View')}
                  className={isDevViewVisible ? 'menu-item-active' : ''}
                >
                  🔧 {isDevViewVisible ? 'Hide Dev View' : 'Show Dev View'}
                </button>
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'tools' ? 'active' : ''}`}
              onClick={() => handleMenuClick('tools')}
            >
              Tools
            </button>
            {activeMenu === 'tools' && (
              <div className="dropdown-menu">
                <button onClick={() => handleMenuItemClick('Orbit Predictor')}>Orbit Predictor</button>
                <button onClick={() => handleMenuItemClick('Pass Calculator')}>Pass Calculator</button>
                <button onClick={() => handleMenuItemClick('Ground Track')}>Ground Track</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('Statistics')}>Statistics</button>
                <button onClick={() => handleMenuItemClick('Debug Info')}>Debug Info</button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => handleMenuClick('help')}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="dropdown-menu">
                <button onClick={() => handleMenuItemClick('User Guide')}>User Guide</button>
                <button onClick={() => handleMenuItemClick('Keyboard Shortcuts')}>Keyboard Shortcuts</button>
                <button onClick={() => handleMenuItemClick('TLE Format Help')}>TLE Format Help</button>
                <div className="menu-separator"></div>
                <button onClick={() => handleMenuItemClick('About')}>About</button>
                <button onClick={() => handleMenuItemClick('Version Info')}>Version Info</button>
              </div>
            )}
          </div>

        </div>

        {/* Right side items */}
        <div className="navbar-right">
          <div className="status-indicator">
            <span className="status-dot online"></span>
            <span className="status-text">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar; 