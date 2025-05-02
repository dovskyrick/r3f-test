import React, { useEffect, useState } from 'react';
import './SatelliteAddModal.css'; // Reuse the same CSS

interface SatelliteNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const SatelliteNameModal: React.FC<SatelliteNameModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const [satelliteName, setSatelliteName] = useState('');
  const [error, setError] = useState('');

  // Add keyboard event listener to close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
      if (event.key === 'Enter' && isOpen && satelliteName.trim()) {
        handleSubmit();
      }
    };

    // Add event listener when the modal is open
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // Clean up the event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, satelliteName]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSatelliteName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!satelliteName.trim()) {
      setError('Please enter a satellite name');
      return;
    }
    
    onSubmit(satelliteName.trim());
  };

  // Close modal when clicking overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the user clicked the overlay, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={{ width: '400px' }}>
        <div className="modal-header">
          <h2>Enter Satellite Name</h2>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>The TLE file you provided does not include a satellite name. Please enter a name for this satellite:</p>
          
          <div className="input-group">
            <input
              type="text"
              className={`satellite-name-input ${error ? 'has-error' : ''}`}
              value={satelliteName}
              onChange={(e) => {
                setSatelliteName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter satellite name"
              autoFocus
            />
            {error && <div className="input-error">{error}</div>}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-cancel-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="modal-submit-button" 
            onClick={handleSubmit}
            disabled={!satelliteName.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default SatelliteNameModal; 