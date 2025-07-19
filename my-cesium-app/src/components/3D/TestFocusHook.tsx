import React from 'react';
import { useFocusPositioning } from '../../hooks/useFocusPositioning';

const TestFocusHook: React.FC = () => {
  const { getApparentPosition, getFocusedSatellitePosition, isInFocusMode } = useFocusPositioning();

  // Test the hook by calculating some positions
  React.useEffect(() => {
    console.log('[TestFocusHook] Testing hook functionality...');
    
    // Test basic state
    console.log('[TestFocusHook] Is in focus mode:', isInFocusMode);
    
    // Test focused satellite position
    const focusedPos = getFocusedSatellitePosition();
    console.log('[TestFocusHook] Focused satellite position:', focusedPos);
    
    // Test apparent position calculation for a test object
    const testRealPosition = { x: 100, y: 200, z: 300 };
    const testApparentPosition = getApparentPosition(testRealPosition, 'test-object');
    console.log('[TestFocusHook] Test apparent position:', testApparentPosition);
  }, [getApparentPosition, getFocusedSatellitePosition, isInFocusMode]);

  return null; // This component doesn't render anything, just tests the hook
};

export default TestFocusHook; 