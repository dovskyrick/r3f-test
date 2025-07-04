import React, { useState } from 'react';
import { useTimeContext } from '../../contexts/TimeContext';
import { TimePickerDialog } from './TimePickerDialog';
import { mjdToFormattedString } from '../../utils/timeConversion';
import './TimeSlider.css';

const TimeSlider: React.FC = () => {
  const {
    minValue,
    maxValue,
    currentTime,
    isPlaying,
    setMinValue,
    setMaxValue,
    setCurrentTime,
    togglePlayPause,
    stepSize
  } = useTimeContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'min' | 'max'>('min');

  const handleOpenDialog = (type: 'min' | 'max') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveDialog = (mjd: number) => {
    if (dialogType === 'min') {
      setMinValue(mjd.toString());
    } else {
      setMaxValue(mjd.toString());
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  // Format MJD to a readable format
  const formatTime = (mjd: number) => {
    return mjdToFormattedString(mjd, true);
  };

  return (
    <div className="slider-container">
      <div className="slider-header">
        <span className="current-time-label">Time: {formatTime(currentTime)}</span>
      </div>
      <div className="slider-controls">
        <button className="play-button" onClick={togglePlayPause}>
          {isPlaying ? (
            <div className="pause-icon">
              <span></span>
              <span></span>
            </div>
          ) : (
            <div className="play-icon"></div>
          )}
        </button>
        <button
          className="range-value time-button"
          onClick={() => handleOpenDialog('min')}
        >
          {formatTime(parseFloat(minValue))}
        </button>
        <input
          type="range"
          min={parseFloat(minValue)}
          max={parseFloat(maxValue)}
          step={stepSize}
          value={currentTime}
          onChange={handleSliderChange}
          className="time-slider"
        />
        <button
          className="range-value time-button"
          onClick={() => handleOpenDialog('max')}
        >
          {formatTime(parseFloat(maxValue))}
        </button>
      </div>

      <TimePickerDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveDialog}
        initialMJD={dialogType === 'min' ? parseFloat(minValue) : parseFloat(maxValue)}
        title={`Select ${dialogType === 'min' ? 'Start' : 'End'} Time`}
      />
    </div>
  );
};

export default TimeSlider; 