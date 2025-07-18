import React, { useState, useEffect } from 'react';
import { useCacheContext } from '../../contexts/CacheContext';
import { useCacheRestoration } from '../../hooks/useCacheRestoration';
import './CacheManager.css';

const CacheManager: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const { cacheService, cacheInfo, refreshCacheInfo, clearCache } = useCacheContext();
  const { isRestoring, restorationStep, progress, error, restoreFromCache, clearError } = useCacheRestoration();

  // Check for cached data on mount
  useEffect(() => {
    refreshCacheInfo();
  }, []); // Only run once on mount

  // Separate effect to handle banner visibility based on cache info
  useEffect(() => {
    // Show banner if there's meaningful cached data
    const hasMeaningfulData = cacheInfo.hasData && (
      cacheInfo.satelliteCount > 0 || 
      cacheInfo.hasTimeline || 
      cacheInfo.hasUIState
    );
    
    if (hasMeaningfulData && !isRestoring) {
      setShowBanner(true);
    } else if (!hasMeaningfulData) {
      setShowBanner(false);
    }
  }, [cacheInfo.hasData, cacheInfo.satelliteCount, cacheInfo.hasTimeline, cacheInfo.hasUIState, isRestoring]);

  const handleRestore = async () => {
    // Component 2: Real restoration using the hook
    try {
      await restoreFromCache();
      setShowBanner(false); // Hide banner after successful restoration
    } catch (error) {
      console.error('Restoration failed:', error);
      // Error is handled by the restoration hook
    }
  };

  const handleStartFresh = () => {
    // Clear cache and start fresh
    clearCache();
    setShowBanner(false);
    console.log('User chose to start fresh - cache cleared');
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

  // Component 2: Real Progress Overlay
  if (isRestoring) {
    return (
      <div className="cache-restoration-overlay">
        <div className="restoration-modal">
          <h3>Restoring Session</h3>
          
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              {progress}% Complete
            </div>
          </div>
          
          <p className="restoration-step">
            {restorationStep}
          </p>
          
          {error && (
            <div className="restoration-error">
              <p>❌ {error}</p>
              <button 
                className="cache-btn cache-btn-secondary"
                onClick={clearError}
              >
                Dismiss Error
              </button>
            </div>
          )}
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
              className="cache-btn cache-btn-danger" 
              onClick={handleStartFresh}
            >
              Start Fresh
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