import React from 'react';
import { useFrame } from "@react-three/fiber";

// Threshold for when we switch views
const ZOOM_THRESHOLD = 80;

interface CameraManagerProps {
  setIsAlternateView: React.Dispatch<React.SetStateAction<boolean>>;
}

const CameraManager: React.FC<CameraManagerProps> = ({ setIsAlternateView }) => {
  useFrame(({ camera }) => {
    const distance = camera.position.length();
    if (distance > ZOOM_THRESHOLD) {
      setIsAlternateView(true);
    } else {
      setIsAlternateView(false);
    }
  });

  return null; // No visible UI, just logic
};

export default CameraManager; 