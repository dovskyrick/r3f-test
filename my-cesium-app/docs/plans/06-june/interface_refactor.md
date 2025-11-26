# Communication Interface Layer Refactor Plan

## Overview
This document outlines the plan to implement a communication interface layer that abstracts the backend communication methods. Currently, the application uses RESTful API calls directly, but we want to create an interface that allows for different implementations in the future.

## Current API Usage Analysis

### Satellite Components
1. `SatelliteAddModal.tsx`:
   - Uses `addSatelliteFromTLE` from context for TLE processing
   - Handles file upload and TLE parsing locally
   - Communicates with backend through context methods

2. `SatelliteContext.tsx` (referenced in components):
   - Contains the main API communication logic
   - Handles TLE data processing and trajectory fetching
   - Primary target for refactoring

### Map Components
The Map components (`MapTrajectoryVisualization.tsx`, `MapTrajectoryPath.tsx`, `MapTrajectoryMarker.tsx`) do not contain direct API calls. They:
- Consume data from SatelliteContext
- Handle visualization logic locally
- Use trajectory data that was already fetched

### 3D Components
The 3D components are currently in transition to support multiple satellites. They:
- Do not contain direct API calls
- Will be updated in a future phase
- Currently disabled or using local visualization logic

### Navigation & Time Control Components
The Navigation and TimeSlider components:
- Handle purely UI interactions
- No direct API calls
- Use React Router for navigation
- Manage time control through TimeContext

### TrajectoryToggle Component
The TrajectoryToggle component:
- Uses context for state management
- Handles loading and error states
- Includes retry functionality
- No direct API calls

## Key Findings
1. All API communications are centralized in the SatelliteContext
2. Components use contexts for data access and state management
3. Error handling and loading states are managed through contexts
4. File processing is handled locally before API calls

## Interface Structure

### Location
New files to be created:
- `src/interfaces/CommunicationLayer.ts` - Main interface definition
- `src/implementations/RESTCommunication.ts` - Current REST implementation
- `src/providers/CommunicationProvider.tsx` - Context provider for the communication layer

## Interface Definition

```typescript
interface CommunicationLayer {
  // Current Methods
  fetchTrajectoryFromTLE(line1: string, line2: string): Promise<TrajectoryData>;
  
  // Future Methods (to be implemented as needed)
  fetchAttitudeData?(satelliteId: string): Promise<AttitudeData>;
  fetchEnvironmentalData?(satelliteId: string): Promise<EnvironmentalData>;
  
  // Error Handling
  getLastError(): string | null;
  clearError(): void;
  
  // State Management
  isLoading(): boolean;
  retryLastOperation(): Promise<void>;
}

// Data Types
interface TrajectoryData {
  points: Array<{
    cartesian: { x: number; y: number; z: number };
    spherical: { latitude: number; longitude: number };
    epoch: string;
    mjd: number;
  }>;
  startTime: number;
  endTime: number;
}

interface AttitudeData {
  // To be defined based on future requirements
}

interface EnvironmentalData {
  // To be defined based on future requirements
}
```

## Required Changes

### 1. Create Interface Definition
- Define all current backend communications
- Include TypeScript types for request/response data
- Document error handling expectations
- Add loading and retry functionality

### 2. Context Updates
`src/contexts/SatelliteContext.tsx`:
- Remove direct API calls
- Inject communication layer through props or context
- Update error handling to use interface standards
- Implement retry logic using the interface

### 3. Component Updates
`src/components/Satellite/SatelliteAddModal.tsx`:
- Update to use new error handling patterns
- Ensure TLE processing follows interface standards
- Integrate with loading states from the interface

## Implementation Steps

1. **Phase 1: Interface Creation**
   - Define the communication interface
   - Create type definitions for all data structures
   - Document error handling patterns
   - Add loading and retry functionality

2. **Phase 2: REST Implementation**
   - Create REST implementation of the interface
   - Move current API calls to implementation
   - Add standardized error handling
   - Implement loading and retry logic

3. **Phase 3: Context Updates**
   - Modify SatelliteContext to use interface
   - Inject communication implementation
   - Update error handling patterns
   - Add loading state management

4. **Phase 4: Testing**
   - Verify all existing functionality works
   - Test error scenarios
   - Test retry functionality
   - Document implementation process

## Future Considerations

- Allow for easy addition of new communication methods
- Consider caching strategies at the interface level
- Plan for authentication handling
- Consider retry strategies and timeout handling
- Prepare for 3D visualization updates
- Consider batch operations for multiple satellites
- Add request cancellation support
- Implement request queuing for concurrent operations

## Next Steps

1. Create the interface file with complete type definitions
2. Implement the REST version with error handling and loading states
3. Update SatelliteContext to use the new interface
4. Test the implementation with existing components
5. Document the new communication layer architecture 