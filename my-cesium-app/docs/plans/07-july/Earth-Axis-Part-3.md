# Earth Axis Implementation Plan - Part 3

## Files to Modify/Create

### 1. New Components
```
src/components/3D/ReferenceFrames/
├── TerrestrialFrame.tsx      # T100, T010, T001 vectors and rings (existing functionality renamed)
├── CelestialFrame.tsx        # C100, C010, C001 vectors (ICRF)
└── types.ts                  # Shared types and interfaces
```

### 2. Files to Modify
```
src/components/3D/Earth.tsx               # Main Earth component, add rotation logic
src/components/3D/AxisVisualization.tsx   # Rename to TerrestrialFrame.tsx and update
src/utils/timeConversion.ts              # Add MJD to Date conversion utilities
```

## Date Conversion Details

### MJD to Date Conversion Example

```typescript
// Example MJD: 60000.5 (approximately July 17, 2023 12:00:00 UTC)

// Step 1: Convert MJD to Julian Date
JD = MJD + 2400000.5

// Step 2: Convert JD to JavaScript Date
milliseconds = (JD - 2440587.5) * 86400000

// Example:
MJD = 60000.5
JD = 60000.5 + 2400000.5 = 2460001
milliseconds = (2460001 - 2440587.5) * 86400000
date = new Date(milliseconds)
// Result: 2023-07-17T12:00:00.000Z
```

### Date Format Requirements for astronomy-engine

The astronomy-engine library expects JavaScript Date objects in UTC. Important considerations:

1. Input MJD examples:
   - 60000.0 = 00:00:00 UTC
   - 60000.5 = 12:00:00 UTC
   - 60000.75 = 18:00:00 UTC

2. Precision handling:
   - Keep full precision in calculations
   - Round only for display
   - Store intermediate results as numbers, not strings

## Implementation Details

### 1. TerrestrialFrame Component (renamed from AxisVisualization)
- Move existing arrows and rings
- Rename vector labels to T100, T010, T001
- Keep existing color scheme (red, green, blue)
- Add prop for visibility toggle

### 2. New CelestialFrame Component
- Create orange arrows for ICRF
- Labels: C100, C010, C001
- Same scale as terrestrial frame
- Independent visibility toggle
- Initially aligned with React Three Fiber coordinates

### 3. Earth Component Updates
- Add astronomy-engine integration
- Implement rotation matrix calculations
- Group terrestrial frame with Earth
- Keep celestial frame static
- Add test mode controls for both frames

### 4. Rotation Matrix Calculation

The transformation sequence will be:

1. ICRF to Ecliptic
2. Ecliptic to Equatorial (obliquity)
3. Equatorial to Local (Earth rotation)

```typescript
// Pseudo-code for rotation sequence
const rotations = {
  icrf_to_ecliptic: function(date: Date) {
    // Use astronomy-engine to get transformation
  },
  ecliptic_to_equatorial: function(date: Date) {
    // Apply obliquity rotation
  },
  equatorial_to_local: function(date: Date) {
    // Apply Earth rotation based on GMST
  }
};
```

## Visual Debug Features

### 1. Reference Frame Toggle Controls
```
[✓] Terrestrial Frame (T)
[✓] Celestial Frame (C)
[✓] Show Labels
```

### 2. Important Test Configurations
- Vernal Equinox: March 20, 2025 (MJD ≈ 61021.5)
- Summer Solstice: June 21, 2025 (MJD ≈ 61114.5)
- Test at 00:00, 06:00, 12:00, 18:00 UTC

## Performance Considerations

1. Caching Strategy:
   - Cache obliquity (changes very slowly)
   - Update GMST every frame
   - Update sun position every minute
   - Cache matrix calculations between updates

2. Animation Smoothing:
   - Interpolate between matrix states
   - Use requestAnimationFrame for smooth rotation
   - Decouple update frequency from frame rate

## Testing Procedure

1. Verify Alignments:
   - C100 should point to vernal equinox
   - T010 should match Earth's rotation axis
   - At UTC noon, T100 should point to sun

2. Verify Rotations:
   - Earth should complete one rotation per sidereal day
   - Axis tilt should match current season
   - Greenwich meridian alignment with T100 at expected times

## Next Steps

1. Install astronomy-engine following installation guide
2. Rename and refactor AxisVisualization to TerrestrialFrame
3. Create CelestialFrame component
4. Implement rotation calculations
5. Add debug controls
6. Test with specific dates and times
7. Optimize performance
8. Add documentation for future maintenance 