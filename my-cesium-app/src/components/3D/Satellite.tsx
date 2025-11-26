import React from 'react';

interface SatelliteProps {
  isAlternateView: boolean;
}

const Satellite: React.FC<SatelliteProps> = ({ isAlternateView }) => {
  if (isAlternateView) return null; // Hide satellite in alternate view

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  );
};

export default Satellite; 