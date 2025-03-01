import React, { createContext, useState, useEffect, useContext } from 'react';

interface TimeContextType {
  minValue: string;
  maxValue: string;
  currentTime: number;
  isPlaying: boolean;
  setMinValue: (value: string) => void;
  setMaxValue: (value: string) => void;
  setCurrentTime: (time: number) => void;
  togglePlayPause: () => void;
  stepSize: number;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const useTimeContext = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTimeContext must be used within a TimeProvider');
  }
  return context;
};

interface TimeProviderProps {
  children: React.ReactNode;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ children }) => {
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("100");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Calculate step size as 1/1000th of the range
  const stepSize = (parseFloat(maxValue) - parseFloat(minValue)) / 1000;

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime((prevTime) => {
          const newTime = prevTime + 0.05;
          // If we reach max, loop back to min
          return newTime > parseFloat(maxValue) ? parseFloat(minValue) : newTime;
        });
      }, 50);
    }

    // Cleanup interval on component unmount or when isPlaying changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, maxValue, minValue]);

  return (
    <TimeContext.Provider
      value={{
        minValue,
        maxValue,
        currentTime,
        isPlaying,
        setMinValue,
        setMaxValue,
        setCurrentTime,
        togglePlayPause,
        stepSize
      }}
    >
      {children}
    </TimeContext.Provider>
  );
}; 