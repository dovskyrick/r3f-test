# SatelliteVisualizer.tsx Refactoring Plan - Component Extraction

**Date**: December 30, 2025  
**Purpose**: Plan the extraction of rendering logic from `SatelliteVisualizer.tsx` into a separate, maintainable component file  
**Status**: Planning Phase - No Implementation Yet

---

## 🎯 Refactoring Goals

### Primary Objectives:
1. **Reduce complexity** of the main `SatelliteVisualizer.tsx` file
2. **Improve maintainability** by separating concerns
3. **Enable easier testing** of individual entity renderers
4. **Facilitate future additions** of new visualization types
5. **Maintain current functionality** without breaking changes

### Success Criteria:
- Main file reduced from ~1400 lines to ~800-900 lines
- Clear separation between orchestration and rendering
- No functionality loss
- All existing features work identically

---

## 📊 Current State Analysis

### SatelliteVisualizer.tsx Structure (Current):

```
SatelliteVisualizer.tsx (~1400 lines)
├── Imports & Types (50 lines)
├── Styles Definition (300 lines)
├── Component State (20 lines)
├── useEffects (200 lines)
│   ├── Data parsing
│   ├── Viewer initialization
│   ├── Camera setup
│   └── Imagery configuration
├── Helper Functions (100 lines)
│   ├── toggleSatelliteVisibility
│   ├── handleSatelliteClick
│   └── isSatelliteVisible
└── JSX Rendering (730 lines) ⚠️ TOO LARGE
    ├── Viewer setup (50 lines)
    ├── Satellite entities (200 lines)
    ├── Sensor cones (150 lines)
    ├── FOV projections (150 lines)
    ├── Body axes (80 lines)
    ├── Celestial grid (100 lines)
    ├── Ground stations (30 lines)
    └── Sidebar UI (200 lines)
```

### Problems with Current Structure:
1. **Monolithic JSX block** - hard to read and maintain
2. **Mixed concerns** - UI controls + 3D rendering in same component
3. **Deep nesting** - multiple levels of conditionals
4. **Repetitive patterns** - similar entity structures for different objects
5. **Hard to test** - can't test rendering logic in isolation
6. **Difficult navigation** - finding specific entity code is time-consuming

---

## 🎯 Proposed Refactoring: Extract Entity Renderers

### New File Structure:

```
components/
├── SatelliteVisualizer.tsx (Main orchestrator, ~900 lines)
└── entities/
    └── CesiumEntityRenderers.tsx (NEW, ~500 lines)
```

### Why This Split?

**Separation of Concerns:**
- **SatelliteVisualizer.tsx**: Orchestration, state management, data flow, UI controls
- **CesiumEntityRenderers.tsx**: Pure rendering components for 3D entities

**Benefits:**
- Clear mental model: "orchestrator" vs "renderers"
- Each file has single responsibility
- Easier to find and modify specific entity code
- Can test renderers with mock data
- Future: easily split further if needed

---

## 📁 New File: `CesiumEntityRenderers.tsx`

### Location:
```
src/components/entities/CesiumEntityRenderers.tsx
```

### Contents - What Gets Extracted:

#### 1. **SatelliteEntityRenderer** Component
```typescript
interface SatelliteEntityProps {
  satellite: ParsedSatellite;
  options: SimpleOptions;
  isTracked: boolean;
  isVisible: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  satelliteResource?: IonResource | string;
  attitudeVectors: Array<{ axis: Cartesian3; color: Color; name: string }>;
}

export const SatelliteEntityRenderer: React.FC<SatelliteEntityProps> = ({ ... }) => {
  // Extract all satellite rendering logic here
  // Returns: <Entity> with model/point, path, label
}
```

**Lines extracted**: ~200 lines

**Responsibilities:**
- Render satellite model or point
- Render trajectory path
- Render satellite label
- Handle tracked highlighting

---

#### 2. **SensorVisualizationRenderer** Component
```typescript
interface SensorVisualizationProps {
  satellite: ParsedSatellite;
  sensor: ParsedSensor;
  options: SimpleOptions;
  isTracked: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  sensorColor: Color;
}

export const SensorVisualizationRenderer: React.FC<SensorVisualizationProps> = ({ ... }) => {
  // Extract sensor cone + FOV footprint + celestial projection logic
  // Returns: Fragment with cone entity, footprint polygon, celestial polygon
}
```

**Lines extracted**: ~300 lines

**Responsibilities:**
- Render 3D sensor cone (with scaling)
- Render ground FOV footprint
- Render celestial FOV projection
- Handle visibility based on options

---

#### 3. **BodyAxesRenderer** Component
```typescript
interface BodyAxesProps {
  satellite: ParsedSatellite;
  options: SimpleOptions;
  isTracked: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  attitudeVectors: Array<{ axis: Cartesian3; color: Color; name: string }>;
}

export const BodyAxesRenderer: React.FC<BodyAxesProps> = ({ ... }) => {
  // Extract body axes (X, Y, Z) rendering logic
  // Returns: Multiple <Entity> components with PolylineGraphics
}
```

**Lines extracted**: ~80 lines

**Responsibilities:**
- Render X/Y/Z body axes
- Handle dynamic scaling
- Apply proper quaternion transformations

---

#### 4. **CelestialGridRenderer** Component
```typescript
interface CelestialGridProps {
  options: SimpleOptions;
  raLines: Cartesian3[][];
  decLines: Cartesian3[][];
  gridLabels: Array<{ position: Cartesian3; text: string }>;
}

export const CelestialGridRenderer: React.FC<CelestialGridProps> = ({ ... }) => {
  // Extract RA/Dec grid rendering logic
  // Returns: Multiple <Entity> components for grid lines and labels
}
```

**Lines extracted**: ~100 lines

**Responsibilities:**
- Render RA lines
- Render Dec lines
- Render coordinate labels
- Handle visibility based on options

---

#### 5. **GroundStationRenderer** Component
```typescript
interface GroundStationProps {
  groundStation: GroundStation;
}

export const GroundStationRenderer: React.FC<GroundStationProps> = ({ ... }) => {
  // Extract ground station rendering logic
  // Returns: <Entity> with PointGraphics and label
}
```

**Lines extracted**: ~30 lines

**Responsibilities:**
- Render ground station marker (PointGraphics)
- Render ground station label
- Future: handle visibility toggle, line-of-sight

---

### Total Extraction Summary:

| Component | Lines Extracted | Purpose |
|-----------|----------------|---------|
| `SatelliteEntityRenderer` | ~200 | Satellite model/point + path + label |
| `SensorVisualizationRenderer` | ~300 | Sensor cones + FOV projections |
| `BodyAxesRenderer` | ~80 | Body axes X/Y/Z vectors |
| `CelestialGridRenderer` | ~100 | RA/Dec grid lines + labels |
| `GroundStationRenderer` | ~30 | Ground station markers |
| **TOTAL** | **~710 lines** | Moved to new file |

---

## 📝 Updated `SatelliteVisualizer.tsx` Structure

### After Refactoring (~900 lines):

```typescript
// SatelliteVisualizer.tsx

// 1. IMPORTS (70 lines)
import { ... } from 'cesium';
import { ... } from 'resium';
import { SimpleOptions } from 'types';
import { parseSatellites, parseGroundStations } from 'parsers';
// NEW: Import entity renderers
import {
  SatelliteEntityRenderer,
  SensorVisualizationRenderer,
  BodyAxesRenderer,
  CelestialGridRenderer,
  GroundStationRenderer
} from './entities/CesiumEntityRenderers';

// 2. STYLES (300 lines - unchanged)
const getStyles = () => { ... };

// 3. COMPONENT STATE (30 lines)
export const SatelliteVisualizer: React.FC<Props> = ({ ... }) => {
  const [satellites, setSatellites] = useState<ParsedSatellite[]>([]);
  const [groundStations, setGroundStations] = useState<GroundStation[]>([]);
  // ... other state
  
  // 4. useEFFECTS (200 lines - unchanged)
  useEffect(() => { /* data parsing */ }, [data]);
  useEffect(() => { /* viewer setup */ }, [isLoaded]);
  // ... other effects
  
  // 5. HELPER FUNCTIONS (100 lines - unchanged)
  const toggleSatelliteVisibility = (id: string) => { ... };
  const handleSatelliteClick = (id: string) => { ... };
  
  // 6. RENDER (200 lines - SIMPLIFIED)
  return (
    <div>
      <Viewer>
        {/* Clock */}
        <Clock />
        
        {/* Satellites - NOW CLEAN */}
        {satellites.map((satellite) => {
          const isVisible = isSatelliteVisible(satellite.id);
          if (!isVisible) return null;
          
          const isTracked = trackedSatelliteId === satellite.id;
          
          return (
            <React.Fragment key={satellite.id}>
              {/* Main satellite entity */}
              <SatelliteEntityRenderer
                satellite={satellite}
                options={options}
                isTracked={isTracked}
                isVisible={isVisible}
                viewerRef={viewerRef}
                timestamp={timestamp}
                satelliteResource={satelliteResource}
                attitudeVectors={attitudeVectors}
              />
              
              {/* Sensors (if attitude viz enabled) */}
              {options.showAttitudeVisualization && satellite.sensors.map((sensor) => (
                <SensorVisualizationRenderer
                  key={sensor.id}
                  satellite={satellite}
                  sensor={sensor}
                  options={options}
                  isTracked={isTracked}
                  viewerRef={viewerRef}
                  timestamp={timestamp}
                  sensorColor={SENSOR_COLORS[satellite.sensors.indexOf(sensor)]}
                />
              ))}
              
              {/* Body axes */}
              {options.showAttitudeVisualization && options.showBodyAxes && (
                <BodyAxesRenderer
                  satellite={satellite}
                  options={options}
                  isTracked={isTracked}
                  viewerRef={viewerRef}
                  timestamp={timestamp}
                  attitudeVectors={attitudeVectors}
                />
              )}
            </React.Fragment>
          );
        })}
        
        {/* Celestial Grid */}
        {options.showAttitudeVisualization && options.showRADecGrid && (
          <CelestialGridRenderer
            options={options}
            raLines={raLines}
            decLines={decLines}
            gridLabels={gridLabels}
          />
        )}
        
        {/* Ground Stations */}
        {groundStations.map((gs) => (
          <GroundStationRenderer key={gs.id} groundStation={gs} />
        ))}
      </Viewer>
      
      {/* Sidebar UI (unchanged) */}
      <div className={styles.sidebar}>
        { /* ... sidebar content ... */ }
      </div>
    </div>
  );
};
```

### Key Improvements:
- **Main JSX reduced from 730 lines to ~200 lines**
- **Clear component hierarchy** - easy to read
- **Declarative rendering** - props describe what to render
- **No deep nesting** - maximum 2-3 levels
- **Easy to modify** - change one renderer without affecting others

---

## 🔄 Migration Strategy

### Phase 1: Create New File
1. Create `src/components/entities/CesiumEntityRenderers.tsx`
2. Add exports for all 5 renderer components (initially empty)
3. Import in `SatelliteVisualizer.tsx`

### Phase 2: Extract One Component at a Time
**Order of extraction** (safest to riskiest):

1. **GroundStationRenderer** (simplest, newest code)
   - Only 30 lines
   - No complex dependencies
   - Good for testing the pattern

2. **CelestialGridRenderer** (low risk)
   - Self-contained
   - Clear input/output
   - Minimal coupling

3. **BodyAxesRenderer** (medium risk)
   - Some complexity with quaternions
   - Uses `getScaledLength` utility

4. **SatelliteEntityRenderer** (medium-high risk)
   - Core functionality
   - Many conditional branches
   - Critical for basic operation

5. **SensorVisualizationRenderer** (highest complexity)
   - Most complex logic
   - Multiple sub-features
   - Many dependencies

### Phase 3: Testing After Each Extraction
**For each component:**
1. Extract code to new component
2. Update main file to use new component
3. Build plugin: `npm run build`
4. Test in Grafana:
   - Verify entity renders correctly
   - Test with/without tracking
   - Test visibility toggles
   - Test with different options
5. Only proceed to next component if tests pass

### Phase 4: Cleanup
1. Remove unused imports from main file
2. Update comments/documentation
3. Final integration test with all features

---

## 🎨 Design Patterns Used

### 1. **Component Composition**
Instead of one giant component, compose smaller focused components:
```typescript
<SatelliteEntityRenderer> + <SensorRenderer> + <BodyAxesRenderer>
= Complete satellite visualization
```

### 2. **Props Drilling (Acceptable Here)**
Pass required data down as props. Not ideal for deep hierarchies, but:
- Only 2 levels deep (main → renderer)
- Clear data flow
- Easy to trace
- Alternative (Context) would be overkill

### 3. **Separation of Concerns**
- **SatelliteVisualizer**: "WHAT to render" (orchestration)
- **EntityRenderers**: "HOW to render" (implementation)

### 4. **Single Responsibility**
Each renderer component:
- Renders exactly one type of entity
- Has clear inputs (props)
- Has clear outputs (JSX)
- No side effects

---

## 🚨 Potential Challenges & Solutions

### Challenge 1: Shared State
**Problem**: Some renderers need access to `viewerRef`, `timestamp`, etc.

**Solution**: Pass as props. It's explicit and traceable.

### Challenge 2: Callbacks Between Entities
**Problem**: Some entities might need to communicate (future features).

**Solution**: 
- For now: props drilling is fine
- Future: Context or custom hooks if needed

### Challenge 3: Performance with Many Components
**Problem**: React re-renders all components when state changes.

**Solution**:
- Use `React.memo()` for renderer components
- Only re-render when relevant props change
- Cesium handles actual 3D rendering efficiently

### Challenge 4: Testing Complexity
**Problem**: Components depend on Cesium types and viewer.

**Solution**:
- Mock Cesium types for unit tests
- Integration tests in Grafana for full validation
- Start with simple smoke tests

---

## 📈 Future Refactoring Opportunities

### After This Refactoring:

**If `CesiumEntityRenderers.tsx` grows >800 lines**, further split:

```
entities/
├── CesiumEntityRenderers.tsx (main exports)
├── satellites/
│   ├── SatelliteEntityRenderer.tsx
│   └── SensorVisualizationRenderer.tsx
├── celestial/
│   ├── CelestialGridRenderer.tsx
│   └── BodyAxesRenderer.tsx
└── groundstations/
    └── GroundStationRenderer.tsx
```

**Other possible extractions**:
1. **Styles** → `styles/SatelliteVisualizerStyles.ts`
2. **Helper functions** → `utils/satelliteHelpers.ts`
3. **Sidebar UI** → `components/SatelliteSidebar.tsx`

---

## ✅ Success Metrics

### Code Quality:
- [ ] Main file <1000 lines
- [ ] New file <600 lines
- [ ] Each component <150 lines
- [ ] No code duplication
- [ ] All TypeScript types defined

### Functionality:
- [ ] All satellites render correctly
- [ ] Sensors/FOV projections work
- [ ] Tracking mode functional
- [ ] Visibility toggles work
- [ ] Ground stations visible
- [ ] No performance regression

### Maintainability:
- [ ] Code is easier to navigate
- [ ] Components are self-documenting
- [ ] Future additions are straightforward
- [ ] Team can understand structure quickly

---

## 🎯 Recommendation

**Proceed with this refactoring?**

**YES**, because:
1. ✅ Clear benefit: 40% reduction in main file size
2. ✅ Low risk: Extract incrementally with testing
3. ✅ High value: Much easier to maintain long-term
4. ✅ Enables future features: Ground station interactions, new entity types
5. ✅ Industry standard: Component composition is React best practice

**Timeline Estimate**:
- Phase 1 (Setup): 30 minutes
- Phase 2 (Extraction): 2-3 hours (5 components × 30-40 min each)
- Phase 3 (Testing): 1-2 hours
- Phase 4 (Cleanup): 30 minutes

**Total: 4-6 hours of focused development**

---

## 📚 References & Related Patterns

### React Best Practices:
- [React Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Thinking in React](https://react.dev/learn/thinking-in-react)

### Similar Refactorings:
- Previous: `satelliteParser.ts` + `sensorParser.ts` split (successful)
- Similar: Cesium's own Entity component architecture

### Code Organization:
- Uncle Bob's Clean Code: Single Responsibility Principle
- Martin Fowler's Refactoring: Extract Component pattern

---

## 🎓 Learning Outcomes

### For Future Development:
1. **Component size matters**: Keep components <500 lines when possible
2. **Separation wins**: Even slight overhead of props is worth clarity
3. **Incremental refactoring**: Don't wait until it's "too big"
4. **Test-driven extraction**: Extract + test + repeat

### For the Team:
1. New developers can understand entity renderers independently
2. Easier to assign tasks: "Update sensor cone rendering" = one file
3. Better code reviews: Changes are localized
4. Reduced merge conflicts: Less likely to touch same lines

---

**Status**: Ready for implementation when approved  
**Next Step**: Create `CesiumEntityRenderers.tsx` and begin Phase 1

**Author**: Development Team  
**Reviewer**: _Pending review_

