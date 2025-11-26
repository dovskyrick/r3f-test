# Focus Mode Step 1: Satellite Selection Implementation Plan

## Overview

Implementing the ability to click on satellite names in the sidebar to select/focus them, with visual feedback showing the focused satellite name in orange text.

## Data Structure Decision Recall

From our previous focus mode planning, we decided on:
- **Single context variable**: `focusedSatelliteId: string | null` in SatelliteContext
- **Architecture**: One focused satellite at a time (not boolean flags on each satellite)
- **Storage**: Just the ID of the focused satellite, or null if none focused

## Files to Modify

### 1. **SatelliteContext.tsx** (Modify)
**Purpose**: Add focused satellite state management

**Changes**:
```typescript
// Add to SatelliteContextType interface
interface SatelliteContextType {
  // ... existing properties
  focusedSatelliteId: string | null;
  setFocusedSatellite: (id: string | null) => void;
}

// Add to SatelliteProvider component
const SatelliteProvider: React.FC<SatelliteProviderProps> = ({ children }) => {
  // ... existing state
  const [focusedSatelliteId, setFocusedSatelliteId] = useState<string | null>(null);

  const setFocusedSatellite = (id: string | null) => {
    setFocusedSatelliteId(id);
    console.log('Focused satellite changed:', id);
  };

  // Add to context value
  const value = {
    // ... existing properties
    focusedSatelliteId,
    setFocusedSatellite
  };
};
```

### 2. **SatelliteItem.tsx** (Modify)
**Purpose**: Add click handler and visual styling for focused state

**Changes**:
```typescript
// Import focus context
import { useSatelliteContext } from '../../contexts/SatelliteContext';

const SatelliteItem: React.FC<SatelliteItemProps> = ({ satellite }) => {
  const { focusedSatelliteId, setFocusedSatellite } = useSatelliteContext();
  
  // Check if this satellite is focused
  const isFocused = focusedSatelliteId === satellite.id;
  
  // Click handler for the entire satellite item
  const handleSatelliteClick = () => {
    // Toggle focus: if already focused, unfocus; if not focused, focus
    const newFocusId = isFocused ? null : satellite.id;
    setFocusedSatellite(newFocusId);
  };

  return (
    <div 
      className={`satellite-item ${isFocused ? 'focused' : ''}`}
      onClick={handleSatelliteClick} // Make entire area clickable
    >
      <div className="satellite-info">
        {/* Apply orange styling to name when focused */}
        <h3 className={`satellite-name ${isFocused ? 'focused-name' : ''}`}>
          {satellite.name}
        </h3>
        {/* ... rest of existing content */}
      </div>
      {/* ... existing toggle and other elements */}
    </div>
  );
};
```

### 3. **SatelliteItem.css** (Modify)
**Purpose**: Add visual styling for focused satellite

**Changes**:
```css
/* Focused satellite item styling */
.satellite-item.focused {
  border-left: 3px solid #ff9800; /* Orange left border indicator */
  background-color: rgba(255, 152, 0, 0.05); /* Very subtle orange background */
}

/* Focused satellite name styling */
.satellite-name.focused-name {
  color: #ff9800 !important; /* Orange text color */
  font-weight: 600; /* Slightly bolder */
}

/* Add cursor pointer to indicate clickability */
.satellite-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.satellite-item:hover {
  background-color: rgba(255, 255, 255, 0.05); /* Subtle hover effect */
}

/* Ensure focused state overrides hover */
.satellite-item.focused:hover {
  background-color: rgba(255, 152, 0, 0.08);
}
```

## Implementation Logic & Rationale

### **Why This Approach?**

1. **Minimal State Addition**: Only adds 2 new properties to existing SatelliteContext
2. **Single Source of Truth**: `focusedSatelliteId` controls all focus-related behavior
3. **Reuses Existing Infrastructure**: No new contexts or major architectural changes
4. **Toggle Behavior**: Click to focus, click again to unfocus (intuitive UX)
5. **Visual Feedback Only**: No functional changes yet, just visual indication

### **Click Behavior Design**
```
Initial State: No satellite focused
├─ User clicks "ISS" → ISS becomes focused (orange name)
├─ User clicks "Hubble" → Hubble becomes focused, ISS unfocused
├─ User clicks "Hubble" again → Hubble unfocused, no satellite focused
└─ User clicks "GPS" → GPS becomes focused
```

### **State Management Logic**
```typescript
// Simple toggle logic
const handleSatelliteClick = () => {
  const newFocusId = (focusedSatelliteId === satellite.id) ? null : satellite.id;
  setFocusedSatellite(newFocusId);
};
```

### **Visual Design**
- **Orange name text**: Clear indication of focused satellite
- **Orange left border**: Secondary visual cue
- **Subtle background**: Tertiary visual enhancement
- **Hover effects**: Interactive feedback
- **Cursor pointer**: Indicates clickability

## Files NOT Modified

- **No 3D behavior changes**: Focus doesn't affect camera or satellite positioning yet
- **No cache integration**: Focused state not persisted yet
- **No other contexts**: TimeContext, CacheContext unchanged
- **No new components**: Reusing existing SatelliteItem

## Testing Strategy

### **Manual Testing Steps**:
1. **No Selection**: All satellite names appear normal
2. **Click Satellite**: Name turns orange, left border appears
3. **Click Different Satellite**: Previous unfocuses, new one focuses
4. **Click Same Satellite**: Unfocuses (returns to normal)
5. **Multiple Satellites**: Only one focused at a time
6. **Visual Feedback**: Hover effects work properly

### **Console Verification**:
```
Focused satellite changed: sat-123-id
Focused satellite changed: null
Focused satellite changed: sat-456-id
```

## Future Integration Points

### **Ready for Step 2**:
- Camera positioning logic can read `focusedSatelliteId`
- 3D focus behavior can be triggered by state changes
- Cache system can save/restore `focusedSatelliteId`

### **Architecture Benefits**:
- **Single state variable**: Easy to extend with camera logic
- **Clean separation**: Visual focus vs functional focus can be independent
- **Context integration**: Already fits into existing SatelliteContext

## Risk Assessment

### **Low Risk Changes**:
- ✅ Only modifies existing files (no new architecture)
- ✅ Additive changes (doesn't break existing functionality)
- ✅ Visual-only impact (no behavioral changes)
- ✅ Easy to revert (just remove the added lines)

### **Potential Issues**:
- **Click conflicts**: Satellite item already has toggle button (solution: event.stopPropagation on toggle)
- **Performance**: Minimal impact (just state updates and CSS changes)
- **UX confusion**: Users might not understand click behavior (solution: hover cursor indicates clickability)

## Summary

This implementation provides the foundation for focus mode with minimal code changes:
- **3 files modified**: SatelliteContext.tsx, SatelliteItem.tsx, SatelliteItem.css
- **2 new state properties**: focusedSatelliteId, setFocusedSatellite
- **Visual feedback only**: Orange text and subtle styling
- **Toggle interaction**: Click to focus/unfocus
- **Foundation ready**: For camera positioning and other focus behaviors

The approach maintains the existing architecture while adding the essential focus selection capability as the first step toward full focus mode implementation. 