import React, { useState, useEffect } from 'react';
import { useCacheContext } from '../../contexts/CacheContext';
import './CacheManager.css';

const CacheManager: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { cacheService, cacheInfo, refreshCacheInfo, clearCache } = useCacheContext();

  // Check for cached data on mount
  useEffect(() => {
    refreshCacheInfo();
    
    // Show banner if there's meaningful cached data
    const hasMeaningfulData = cacheInfo.hasData && (
      cacheInfo.satelliteCount > 0 || 
      cacheInfo.hasTimeline || 
      cacheInfo.hasUIState
    );
    
    if (hasMeaningfulData && !isRestoring) {
      setShowBanner(true);
    }
  }, [cacheInfo, isRestoring, refreshCacheInfo]);

  const handleRestore = () => {
    // PLACEHOLDER: Component 2 will replace this
    alert('Cache restoration will be implemented in Phase 2!\n\nFor now, this is a placeholder. The restoration system is ready but needs the progress UI.');
    console.log('Restore clicked - placeholder for Component 2');
    
    // Simulate restoration for testing
    setIsRestoring(true);
    setTimeout(() => {
      setIsRestoring(false);
      setShowBanner(false);
    }, 2000);
  };

  const handleContinueFresh = () => {
    setShowBanner(false);
    console.log('User chose to continue with fresh session');
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached data? This cannot be undone.')) {
      clearCache();
      setShowBanner(false);
      console.log('Cache cleared by user');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    console.log('Cache banner dismissed');
  };

  // Create cache summary message
  const createCacheMessage = () => {
    const parts = [];
    
    if (cacheInfo.satelliteCount > 0) {
      parts.push(`${cacheInfo.satelliteCount} satellite${cacheInfo.satelliteCount === 1 ? '' : 's'}`);
    }
    
    if (cacheInfo.hasTimeline) {
      parts.push('timeline position');
    }
    
    if (cacheInfo.hasUIState) {
      parts.push('view settings');
    }
    
    if (parts.length === 0) {
      return 'Previous session data found';
    }
    
    return `Previous session found - ${parts.join(', ')} saved`;
  };

  // PLACEHOLDER: Component 2 (Progress Overlay) will go here
  if (isRestoring) {
    return (
      <div className="cache-restoration-overlay">
        <div className="restoration-modal">
          <h3>PLACEHOLDER: Progress Overlay</h3>
          <p>Component 2 will show restoration progress here</p>
          <div className="placeholder-progress">
            <div>Progress bar will go here</div>
            <div>Step descriptions will go here</div>
          </div>
        </div>
      </div>
    );
  }

  // Component 1: Cache Detection Banner
  if (showBanner) {
    return (
      <div className="cache-manager-banner">
        <div className="cache-banner-content">
          <div className="cache-banner-icon">⚠️</div>
          <div className="cache-banner-message">
            {createCacheMessage()}
            <div className="cache-banner-details">
              Cache size: {cacheInfo.size}
            </div>
          </div>
          <div className="cache-banner-actions">
            <button 
              className="cache-btn cache-btn-primary" 
              onClick={handleRestore}
            >
              Restore
            </button>
            <button 
              className="cache-btn cache-btn-secondary" 
              onClick={handleContinueFresh}
            >
              Continue Fresh
            </button>
            <button 
              className="cache-btn cache-btn-danger" 
              onClick={handleClearCache}
            >
              Clear Cache
            </button>
          </div>
          <button 
            className="cache-banner-dismiss" 
            onClick={handleDismiss}
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // No banner to show
  return null;
};

export default CacheManager; 