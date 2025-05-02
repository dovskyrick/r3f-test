import React, { useEffect, useState, useRef } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import './SatelliteAddModal.css';

interface SatelliteAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SatelliteAddModal: React.FC<SatelliteAddModalProps> = ({ isOpen, onClose }) => {
  const { addSatellite } = useSatelliteContext();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add keyboard event listener to close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
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
  }, [isOpen, onClose]);

  // Reset the file state when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Generate random 4-letter name
  const generateRandomName = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array(4).fill(0).map(() => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
  };

  const handleAddRandomSatellite = () => {
    // Add satellite with random name
    const randomName = generateRandomName();
    addSatellite(randomName);
    
    // Close the modal
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = () => {
    if (file) {
      // In the future, this would send the file to the backend
      // For now, we'll just add a satellite with the file name as its name
      const satelliteName = file.name.split('.')[0].substring(0, 10).toUpperCase();
      addSatellite(satelliteName);
      
      // Close the modal
      onClose();
    }
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
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Satellite</h2>
          <button className="modal-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="upload-section">
            <h3>Upload TLE File</h3>
            <div 
              className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleUploadButtonClick}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="file-input" 
                onChange={handleFileChange}
                accept=".tle,.txt"
              />
              
              {file ? (
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📄</div>
                  <div className="upload-text">
                    <p>Drag and drop a TLE file here, or click to browse</p>
                    <p className="upload-hint">Accepted formats: .tle, .txt</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="or-divider">
            <span>OR</span>
          </div>
          
          <div className="random-section">
            <p>Generate a satellite with a random name</p>
            <button className="random-satellite-button" onClick={handleAddRandomSatellite}>
              Generate Random Satellite
            </button>
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
            disabled={!file}
          >
            Upload TLE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SatelliteAddModal; 