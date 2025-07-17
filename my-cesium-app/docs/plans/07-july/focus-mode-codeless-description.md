# Satellite Focus Mode Development Plan

## Project Overview

This document outlines the development of a satellite focus mode feature for our 3D Earth visualization application. The feature allows users to select a specific satellite from a list and view the Earth from that satellite's perspective, creating an immersive orbital experience.

## Current System Context

Our application currently displays multiple satellites orbiting Earth in two view modes:
- **Normal View**: Close-up Earth with basic satellite representations
- **Alternate View**: Zoomed-out perspective showing satellite trajectories as colored points and lines

The system already calculates real-time satellite positions using trajectory data from TLE (Two-Line Element) orbital parameters and displays satellites at their correct positions as time progresses.

## Proposed Feature: Satellite Focus Mode

### Core Functionality

The focus mode will enable users to:

1. **Select a satellite** by clicking on its entry in the satellite management list
2. **Visual feedback** showing which satellite is currently focused (orange text highlighting)
3. **Perspective shift** where the selected satellite appears stationary at the center of the view while Earth moves beneath it, creating the illusion of viewing Earth from the satellite's perspective

### User Experience Flow

**Step 1: Selection**
Users click on any satellite name in the sidebar list. The selected satellite's name turns orange and shows a "FOCUSED" indicator.

**Step 2: Perspective Change**
In normal view mode, the camera perspective shifts to center on the selected satellite. The satellite appears fixed at the center while Earth and all other satellites move to maintain their relative orbital positions.

**Step 3: Orbital Simulation**
As time progresses (using the time slider), Earth rotates and moves beneath the focused satellite, accurately simulating the view from that satellite's orbital position.

## Technical Implementation Strategy

### Architecture Decision: State Management

The system will use a **centralized focus state** approach rather than individual flags on each satellite. This means having a single variable that points to the currently focused satellite object, which is more efficient and easier to manage than having boolean flags on every satellite.

### Implementation Phases

**Phase 1: User Interface Updates**
- Modify the satellite list to detect mouse clicks on satellite entries
- Add visual styling to highlight the focused satellite with orange text
- Create a focus indicator component showing which satellite is active

**Phase 2: State Management System**
- Extend the existing satellite management system to track which satellite is focused
- Implement functions to set, clear, and query the focus state
- Ensure focus automatically clears if the focused satellite is removed from the list
- Update the focused satellite data when new trajectory information arrives

**Phase 3: Position Calculation System**
- Extract and enhance the existing satellite position calculation logic into a reusable utility module
- Create a centralized system for calculating the offset needed to center the focused satellite
- Reuse the proven trajectory interpolation code that already works correctly in alternate view mode

**Phase 4: 3D Scene Coordination**
- Modify the Earth component to shift its position based on the focused satellite's location
- Update all trajectory visualizations (points, lines, markers) to apply the same positional offset
- Ensure the focused satellite appears stationary at the scene center while everything else moves appropriately
- Coordinate the offset calculations so all scene objects move together consistently

**Phase 5: Integration and Testing**
- Integrate all components to work together seamlessly
- Ensure smooth transitions when entering and exiting focus mode
- Verify that the time slider continues to work correctly in focus mode
- Test performance with multiple satellites to ensure no degradation 