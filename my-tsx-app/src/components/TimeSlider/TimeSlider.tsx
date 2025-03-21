import React from 'react';
import { useTimeContext } from '../../contexts/TimeContext';
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, type: 'min' | 'max') => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      target.blur();
      const value = parseFloat(target.value);
      if (!isNaN(value)) {
        if (type === 'min') {
          setMinValue(value.toString());
        } else {
          setMaxValue(value.toString());
        }
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  // Format MJD to a readable format
  const formatTime = (mjd: number) => {
    // Round to 4 decimal places
    return mjd.toFixed(4);
  };

  return (
    <div className="slider-container">
      <div className="slider-header">
        <span className="current-time-label">MJD: {formatTime(currentTime)}</span>
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
        <input
          type="text"
          className="range-value"
          value={minValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, 'min')}
        />
        <input
          type="range"
          min={parseFloat(minValue)}
          max={parseFloat(maxValue)}
          step={stepSize}
          value={currentTime}
          onChange={handleSliderChange}
          className="time-slider"
        />
        <input
          type="text"
          className="range-value"
          value={maxValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, 'max')}
        />
      </div>
    </div>
  );
};

export default TimeSlider; 