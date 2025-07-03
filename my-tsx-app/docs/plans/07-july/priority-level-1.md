# Priority Level 1 Features

## Overview
This document details the two highest priority features that need to be implemented before proceeding with the general roadmap:
1. MJD to Date/Time Display Conversion
2. Correct Earth Orientation in 3D View

Both features are fundamental to providing an accurate and user-friendly visualization of satellite trajectories.

## 1. MJD to Date/Time Display Conversion

### Problem Statement
Currently, the timeline displays Modified Julian Date (MJD) values directly to users. While MJD is excellent for internal calculations and positioning, it's not user-friendly. Users need to see actual dates and times while the system continues to use MJD internally.

### Implementation Details

#### Files to Modify:
- `src/components/TimeSlider/TimeSlider.tsx`
- `src/contexts/TimeContext.tsx`
- `src/utils/timeConversion.ts` (new file)

#### New Utility Functions
Create a new utility file `timeConversion.ts`:

```typescript
// src/utils/timeConversion.ts

export const MJDtoDate = (mjd: number): Date => {
  // MJD epoch starts at midnight on November 17, 1858
  const jdOffset = 2400000.5;
  const unixEpochInDays = (Date.UTC(1970, 0, 1) / 86400000) + jdOffset;
  const daysFromUnixEpoch = mjd - unixEpochInDays;
  
  return new Date(daysFromUnixEpoch * 86400000);
};

export const dateToMJD = (date: Date): number => {
  const jdOffset = 2400000.5;
  const unixEpochInDays = (Date.UTC(1970, 0, 1) / 86400000) + jdOffset;
  
  return unixEpochInDays + (date.getTime() / 86400000);
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};
```

#### TimeSlider Component Updates
Modify the TimeSlider component to display formatted dates:

```typescript
// src/components/TimeSlider/TimeSlider.tsx

import { MJDtoDate, formatDateTime } from '../../utils/timeConversion';

// Inside the component:
const renderTimeLabel = (mjd: number) => {
  const date = MJDtoDate(mjd);
  return formatDateTime(date);
};

// Update the marks prop of the Slider component:
const marks = {
  [startTime]: { 
    label: renderTimeLabel(startTime),
    style: { transform: 'rotate(-45deg)', transformOrigin: 'top left' }
  },
  [endTime]: { 
    label: renderTimeLabel(endTime),
    style: { transform: 'rotate(-45deg)', transformOrigin: 'top left' }
  }
};
```

#### TimeContext Updates
Update the context to provide both MJD and formatted time:

```typescript
// src/contexts/TimeContext.tsx

import { MJDtoDate, formatDateTime } from '../utils/timeConversion';

interface TimeContextType {
  currentTime: number;  // MJD
  currentTimeFormatted: string;
  setCurrentTime: (time: number) => void;
  // ... other existing properties
}

export const TimeProvider: React.FC = ({ children }) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  const currentTimeFormatted = useMemo(() => {
    const date = MJDtoDate(currentTime);
    return formatDateTime(date);
  }, [currentTime]);

  // ... rest of the provider implementation
};
```

### Testing Considerations
- Add unit tests for MJD conversion functions
- Test edge cases (year transitions, leap years, etc.)
- Verify timezone handling
- Test performance with rapid timeline updates

## 2. Earth Orientation in 3D View

### Problem Statement
The Earth's orientation in the 3D view needs to be accurate relative to the ICRF (International Celestial Reference Frame) coordinate system. This involves:
1. Correct axis tilt
2. Proper rotation based on time

### Implementation Details

#### Files to Modify:
- `src/components/3D/Earth.tsx`
- `src/utils/coordinateTransforms.ts` (new file)
- `src/contexts/EarthOrientationContext.tsx` (new file)

#### Coordinate Transformation Utility
Create a new utility file for coordinate transformations:

```typescript
// src/utils/coordinateTransforms.ts

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export const calculateAxisTilt = async (): Promise<Vector3> => {
  // Make API call to get ITRF (0,0,1) vector in ICRF
  // This only needs to be done once at startup since we're
  // assuming constant tilt for simplicity
  const response = await fetch('http://localhost:8000/coordinate/transform', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinate_system_from: 'ITRF',
      coordinate_system_to: 'ICRF',
      epoch: new Date().toISOString(),
      vector: [0, 0, 1000000] // Using large magnitude for better precision
    })
  });
  
  const data = await response.json();
  const magnitude = Math.sqrt(
    data.x * data.x + 
    data.y * data.y + 
    data.z * data.z
  );
  
  // Return normalized vector
  return {
    x: data.x / magnitude,
    y: data.y / magnitude,
    z: data.z / magnitude
  };
};

export const calculateEarthRotation = (mjd: number): number => {
  // Earth rotates 360° in approximately 23h 56m 4s (sidereal day)
  const siderealDayInSeconds = 86164.0905;
  const mjdSeconds = mjd * 86400;
  
  // Calculate rotation in radians
  // Add initial offset based on texture orientation
  const textureTimeOffset = -4.5; // hours, adjust based on texture
  const offsetSeconds = textureTimeOffset * 3600;
  
  return ((mjdSeconds + offsetSeconds) % siderealDayInSeconds) 
    * (2 * Math.PI / siderealDayInSeconds);
};
```

#### Earth Orientation Context
Create a context to manage Earth orientation state:

```typescript
// src/contexts/EarthOrientationContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateAxisTilt, calculateEarthRotation } from '../utils/coordinateTransforms';
import { useTime } from './TimeContext';

interface EarthOrientationContextType {
  axisTilt: Vector3 | null;
  currentRotation: number;
}

const EarthOrientationContext = createContext<EarthOrientationContextType | null>(null);

export const EarthOrientationProvider: React.FC = ({ children }) => {
  const [axisTilt, setAxisTilt] = useState<Vector3 | null>(null);
  const { currentTime } = useTime();
  
  useEffect(() => {
    const initAxisTilt = async () => {
      const tilt = await calculateAxisTilt();
      setAxisTilt(tilt);
    };
    initAxisTilt();
  }, []);
  
  const currentRotation = calculateEarthRotation(currentTime);
  
  return (
    <EarthOrientationContext.Provider value={{ axisTilt, currentRotation }}>
      {children}
    </EarthOrientationContext.Provider>
  );
};
```

#### Earth Component Updates
Update the Earth component to use the new orientation system:

```typescript
// src/components/3D/Earth.tsx

import { useFrame } from '@react-three/fiber';
import { useEarthOrientation } from '../../contexts/EarthOrientationContext';

export const Earth: React.FC = () => {
  const earthRef = useRef<THREE.Mesh>();
  const { axisTilt, currentRotation } = useEarthOrientation();
  
  useEffect(() => {
    if (axisTilt && earthRef.current) {
      // Set initial axis tilt
      earthRef.current.rotateOnWorldAxis(
        new THREE.Vector3(axisTilt.x, axisTilt.y, 0),
        Math.acos(axisTilt.z)
      );
    }
  }, [axisTilt]);
  
  useFrame(() => {
    if (earthRef.current && axisTilt) {
      // Reset rotation
      earthRef.current.setRotationFromMatrix(new THREE.Matrix4());
      
      // Apply tilt
      earthRef.current.rotateOnWorldAxis(
        new THREE.Vector3(axisTilt.x, axisTilt.y, 0),
        Math.acos(axisTilt.z)
      );
      
      // Apply time-based rotation around tilted axis
      earthRef.current.rotateOnWorldAxis(
        new THREE.Vector3(axisTilt.x, axisTilt.y, axisTilt.z),
        currentRotation
      );
    }
  });
  
  return (
    <mesh ref={earthRef}>
      {/* Existing Earth mesh implementation */}
    </mesh>
  );
};
```

### Testing Considerations
- Verify Earth's axis points to correct celestial coordinates
- Test rotation rate matches sidereal time
- Validate texture alignment with actual Earth features
- Check performance impact of continuous rotation updates

## Integration Steps

1. MJD Display Implementation:
   - Create timeConversion.ts utility
   - Update TimeContext
   - Modify TimeSlider component
   - Add unit tests
   - Verify timezone handling

2. Earth Orientation Implementation:
   - Create coordinate transformation utilities
   - Implement Earth orientation context
   - Update Earth component
   - Test with actual trajectory data
   - Fine-tune texture offset

## Success Criteria

### MJD Display
- Users see clear, formatted dates and times
- Internal calculations still use MJD
- Smooth timeline interaction
- Correct timezone handling
- Performance remains smooth during rapid timeline scrubbing

### Earth Orientation
- Earth's axis points to correct celestial coordinates
- Rotation rate matches sidereal time
- Surface features align with actual positions
- Smooth rotation animation
- Correct satellite positions relative to Earth surface

## Notes
- The Earth orientation solution assumes constant axis tilt for simplicity
- Texture offset needs to be determined empirically
- Consider adding debug visualization for axis orientation
- May need optimization if performance issues arise
- Consider caching MJD conversion results for frequently accessed times 