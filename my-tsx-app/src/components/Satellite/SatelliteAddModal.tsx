import React, { useEffect, useState, useRef } from 'react';
import { useSatelliteContext } from '../../contexts/SatelliteContext';
import SatelliteNameModal from './SatelliteNameModal';
import './SatelliteAddModal.css';

interface SatelliteAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// TLE data interface to store parsed TLE information
interface TLEData {
  name?: string;
  line1: string;
  line2: string;
}

const SatelliteAddModal: React.FC<SatelliteAddModalProps> = ({ isOpen, onClose }) => {
  const { addSatellite, addSatelliteFromTLE } = useSatelliteContext();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tleData, setTleData] = useState<TLEData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);

  // Add keyboard event listener to close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isNameModalOpen) {
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
  }, [isOpen, onClose, isNameModalOpen]);

  // Reset the file state when the modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setTleData(null);
      setIsDragging(false);
      setError(null);
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
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setError(null);
      readTLEFile(selectedFile);
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
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError(null);
      readTLEFile(droppedFile);
    }
  };

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Read TLE file content
  const readTLEFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error("Could not read file content");
        }
        
        // Split the content into lines and remove empty lines
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        // Always take the last two lines for TLE data
        // For 2-line TLE: both lines are the TLE
        // For 3-line+ TLE: last two lines are the TLE, first line is name
        if (lines.length < 2) {
          setError("Invalid TLE file: The file must contain at least 2 lines");
          return;
        }
        
        if (lines.length === 2) {
          // 2-line TLE without a name
          setTleData({
            line1: lines[0].padEnd(69, ' ').substring(0, 69),
            line2: lines[1]
          });
        } else {
          // 3-line or more TLE with a name
          setTleData({
            name: lines[0].trim(),
            line1: lines[lines.length - 2].padEnd(69, ' ').substring(0, 69),
            line2: lines[lines.length - 1]
          });
        }
        
        setIsFileUploaded(true);
        setFile(file);
        setError(null);
      } catch (err) {
        setError("Failed to read the TLE file. Please ensure it's a valid text file.");
      }
    };
    
    reader.onerror = () => {
      setError("Error reading the file. Please try again.");
    };
    
    reader.readAsText(file);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!file || !tleData) {
      setError("Please upload a valid TLE file first");
      return;
    }
    
    // If there's no name in the TLE, open the name modal
    if (!tleData.name) {
      setIsNameModalOpen(true);
    } else {
      // Use the name from the TLE
      addSatelliteFromTLE(tleData.name, tleData.line1, tleData.line2)
        .then(() => {
          onClose();
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : "Failed to process TLE");
        });
    }
  };
  
  // Handle name submission from the name modal
  const handleNameSubmit = (name: string) => {
    if (tleData) {
      addSatelliteFromTLE(name, tleData.line1, tleData.line2)
        .then(() => {
          setIsNameModalOpen(false);
          onClose();
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : "Failed to process TLE");
        });
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
    <>
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
                className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${error ? 'has-error' : ''}`}
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
                    {tleData?.name && (
                      <div className="file-satellite-name">
                        Satellite: <span>{tleData.name}</span>
                      </div>
                    )}
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
              
              {error && (
                <div className="upload-error">
                  {error}
                </div>
              )}
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
              disabled={!file || !!error}
            >
              Upload TLE
            </button>
          </div>
        </div>
      </div>
      
      {/* Satellite Name Modal */}
      <SatelliteNameModal 
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        onSubmit={handleNameSubmit}
      />
    </>
  );
};

export default SatelliteAddModal; 