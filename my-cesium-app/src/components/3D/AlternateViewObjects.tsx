import React from 'react';
import * as THREE from "three";

// Constants
export const DESCALE_FACTOR = 0.3;

interface AlternateViewObjectsProps {
  isAlternateView: boolean;
}

const AlternateViewObjects: React.FC<AlternateViewObjectsProps> = ({ isAlternateView }) => {
  // Don't render if not in alternate view
  if (!isAlternateView) return null;
  
  return (
    <>
      {/* Any additional alternate view elements can be added here */}
    </>
  );
};

export default AlternateViewObjects; 