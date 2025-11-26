# React Three Fiber vs Plain Three.js: Capabilities and Limitations

**Context:** This plugin now uses plain Three.js instead of React Three Fiber due to compatibility issues with Grafana's externalized React architecture.

**Date:** November 26, 2025

---

## Executive Summary

**Decision:** Switched from React Three Fiber (R3F) to plain Three.js for the test plugin.

**Reason:** R3F's internal `react-reconciler` cannot properly connect to Grafana's externalized React, causing runtime errors (`ReactSharedInternals is undefined`).

**Outcome:** Plain Three.js works perfectly with Grafana's architecture and provides full 3D capabilities.

---

## 🔴 CRITICAL DIFFERENCES (Most Important)

### 1. Compatibility with Grafana

**React Three Fiber:**
- ❌ **INCOMPATIBLE** with Grafana's plugin architecture
- ❌ Requires bundled `react-reconciler` that can't access Grafana's externalized React
- ❌ Runtime error: "can't access property 'S', ReactSharedInternals is undefined"
- ❌ Cannot load plugin at all - complete failure

**Plain Three.js:**
- ✅ **FULLY COMPATIBLE** with Grafana
- ✅ Works with externalized React (no reconciler needed)
- ✅ Plugin loads and renders successfully
- ✅ No compatibility issues whatsoever

**Impact:** This is the deciding factor. R3F simply doesn't work in Grafana plugins.

---

### 2. Development Complexity

**React Three Fiber:**
- ✅ Declarative JSX syntax (feels like React)
- ✅ Automatic scene management
- ✅ Less boilerplate code
- ✅ Hooks-based (useFrame, useThree, etc.)

**Plain Three.js:**
- ⚠️ Imperative API (manual object creation)
- ⚠️ Manual scene/renderer setup required
- ⚠️ More boilerplate (setup, cleanup, resize handling)
- ⚠️ useEffect for lifecycle management

**Example Comparison:**

**R3F (declarative):**
```typescript
<Canvas>
  <ambientLight intensity={0.5} />
  <mesh>
    <boxGeometry args={[2, 2, 2]} />
    <meshStandardMaterial color="orange" />
  </mesh>
  <OrbitControls />
</Canvas>
```

**Three.js (imperative):**
```typescript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xff8800 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
// ... more setup code
```

**Impact:** More code to write, but straightforward and explicit.

---

### 3. Performance

**React Three Fiber:**
- ✅ Optimized reconciliation (only updates changed objects)
- ✅ Automatic dirty checking
- ⚠️ Slight overhead from React reconciler
- ✅ Good for complex, dynamic scenes with many state changes

**Plain Three.js:**
- ✅ Direct WebGL access (no abstraction layer)
- ✅ Maximum performance potential
- ⚠️ Manual optimization required (frustum culling, LOD, etc.)
- ✅ Predictable performance characteristics

**Benchmark (for reference):**
- Simple scenes (like our cube): **No noticeable difference**
- Complex scenes (1000+ objects): Three.js can be 5-10% faster if optimized properly
- Real-time updates: R3F's reconciliation can actually be faster for selective updates

**Impact:** For our use case (satellite visualization), performance difference is negligible.

---

## 🟡 SIGNIFICANT DIFFERENCES (Important)

### 4. State Management Integration

**React Three Fiber:**
- ✅ Seamless React state integration
- ✅ Props-driven updates (just change state, scene updates automatically)
- ✅ React Context works naturally
- ✅ Can use Redux, Zustand, etc. directly

**Plain Three.js:**
- ⚠️ Manual synchronization between React state and Three.js objects
- ⚠️ Need to manually update scene when React state changes
- ⚠️ More code for state → visual updates
- ✅ Still achievable, just requires more explicit code

**Example:**

**R3F:**
```typescript
const [color, setColor] = useState('orange');
return <meshStandardMaterial color={color} />; // Automatic update
```

**Three.js:**
```typescript
const [color, setColor] = useState('orange');
useEffect(() => {
  if (meshRef.current) {
    meshRef.current.material.color.set(color); // Manual update
  }
}, [color]);
```

**Impact:** More boilerplate for interactive features, but manageable.

---

### 5. Animation Capabilities

**React Three Fiber:**
- ✅ `useFrame` hook for animation loop (clean API)
- ✅ Built-in integration with `react-spring` for animations
- ✅ Declarative animation libraries (`@react-three/drei` helpers)

**Plain Three.js:**
- ✅ Manual `requestAnimationFrame` loop
- ⚠️ Need to manage animation loop lifecycle manually
- ✅ Full control over animation timing
- ✅ Can use GSAP, Tween.js, or any animation library

**Example:**

**R3F:**
```typescript
useFrame(() => {
  meshRef.current.rotation.y += 0.01;
});
```

**Three.js:**
```typescript
const animate = () => {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
};
animate();
```

**Impact:** Slightly more verbose, but functionally equivalent.

---

### 6. Community Ecosystem

**React Three Fiber:**
- ✅ Large React-focused community
- ✅ `@react-three/drei` - 100+ ready-made helpers
- ✅ `@react-three/postprocessing` - effects library
- ✅ Many React-specific examples and tutorials
- ⚠️ Ecosystem tied to React compatibility (our issue)

**Plain Three.js:**
- ✅ Massive established community (10+ years)
- ✅ `three-stdlib` - curated utilities
- ✅ Extensive documentation and examples
- ✅ Compatible with any framework or vanilla JS
- ✅ More Stack Overflow answers

**Impact:** Three.js has broader support and more universal solutions.

---

## 🟢 MODERATE DIFFERENCES (Noteworthy)

### 7. Learning Curve

**React Three Fiber:**
- ✅ Easier for React developers
- ⚠️ Abstracts away Three.js fundamentals
- ⚠️ Need to learn R3F-specific patterns
- ⚠️ Can be confusing when debugging (React + Three.js layers)

**Plain Three.js:**
- ✅ Direct learning of Three.js concepts
- ✅ Transferable knowledge to any 3D context
- ⚠️ Steeper initial curve for React developers
- ✅ Easier to debug (one layer of abstraction)

**Recommendation:** Learning plain Three.js is valuable regardless, as it's the foundation for all web 3D.

---

### 8. Code Organization

**React Three Fiber:**
- ✅ Component-based architecture (natural in React)
- ✅ Can create reusable 3D components
- ✅ Props for configuration
- ✅ React patterns (composition, HOCs, etc.)

**Plain Three.js:**
- ⚠️ Need to manually organize 3D objects
- ✅ Can still use React components for wrappers
- ⚠️ More imperative setup/teardown code
- ✅ Clear separation between React UI and 3D scene

**Best Practice for Three.js in React:**
- Create custom hooks for 3D logic (`useThreeScene`, `useCube`, etc.)
- Separate 3D concerns into utility functions
- Use React components for UI controls, Three.js for rendering

---

### 9. TypeScript Support

**React Three Fiber:**
- ✅ Full TypeScript support
- ✅ Type-safe props for 3D objects
- ✅ Autocomplete for Three.js properties in JSX
- ⚠️ Some types can be complex (generic props)

**Plain Three.js:**
- ✅ Excellent TypeScript support (Three.js has great types)
- ✅ `@types/three` provides complete definitions
- ✅ Direct type imports from Three.js
- ✅ Simpler type inference

**Impact:** Both have excellent TypeScript support, minimal difference.

---

### 10. Bundle Size

**React Three Fiber:**
- ⚠️ R3F library: ~100KB (gzipped)
- ⚠️ react-reconciler: ~50KB
- ✅ Three.js: ~600KB (same for both)
- ⚠️ Total overhead: ~150KB extra

**Plain Three.js:**
- ✅ No extra abstraction layer
- ✅ Three.js only: ~600KB
- ✅ Smaller bundle by ~150KB

**Impact:** 150KB savings, but relatively small in context of full application.

---

## 🔵 MINOR DIFFERENCES (Less Critical)

### 11. Hot Module Replacement (HMR)

**React Three Fiber:**
- ✅ Better HMR support (React's HMR handles scene updates)
- ✅ Can update scene without full reload
- ✅ Faster iteration during development

**Plain Three.js:**
- ⚠️ HMR requires manual cleanup/reinit
- ⚠️ Often needs full page reload for 3D changes
- ⚠️ Slightly slower development iteration

**Impact:** Minor inconvenience during development, not a dealbreaker.

---

### 12. Advanced Features

**React Three Fiber:**
- ✅ Portals for rendering to different targets
- ✅ Built-in raycasting helpers
- ✅ Pointer events system (onPointerOver, onClick, etc.)
- ✅ `@react-three/xr` for WebXR

**Plain Three.js:**
- ⚠️ Manual raycasting setup
- ⚠️ Manual event handling
- ✅ Full WebXR API access
- ✅ Complete control over all features

**Impact:** Some convenience features missing, but all capabilities still available.

---

### 13. Testing

**React Three Fiber:**
- ✅ Can use React Testing Library
- ✅ Component-based testing approach
- ⚠️ Mocking 3D context can be complex

**Plain Three.js:**
- ⚠️ More integration-focused testing
- ⚠️ Need to mock WebGL context
- ✅ Can test 3D logic in isolation

**Impact:** Testing 3D is challenging regardless of approach.

---

### 14. Server-Side Rendering (SSR)

**React Three Fiber:**
- ⚠️ Complex SSR setup
- ⚠️ Need headless GL for Node.js
- ⚠️ Limited benefits for 3D content

**Plain Three.js:**
- ⚠️ No SSR (WebGL is client-only)
- ✅ Simpler - explicitly client-side only
- ✅ No false expectations about SSR

**Impact:** Not relevant for Grafana plugins (client-side only).

---

## Practical Implications for Our Project

### What We Keep (Capabilities)

✅ **All 3D functionality:**
- 3D rendering
- Orbit controls
- Lighting and materials
- Animations
- Complex geometries
- Post-processing effects
- Shaders

✅ **Performance:**
- Excellent performance for real-time visualization
- Potentially better performance for complex scenes

✅ **Compatibility:**
- Works perfectly with Grafana
- No runtime errors
- Stable and reliable

---

### What We Lose (Trade-offs)

⚠️ **Development convenience:**
- More boilerplate code
- Manual scene management
- Imperative instead of declarative

⚠️ **React integration:**
- Manual state synchronization
- More useEffect hooks for updates
- Less "React-like" 3D code

⚠️ **Ecosystem helpers:**
- Can't use `@react-three/drei` components directly
- Need to implement helpers manually (or port them)
- Fewer ready-made examples

---

## Migration Path for Future Plugins

### For Simple 3D Visualizations (like test-plugin):
**Recommendation: Plain Three.js** ✅
- Less complexity
- Better compatibility
- Easier to debug
- Sufficient for static/simple scenes

### For Complex Interactive 3D Apps:
**Consider: Plain Three.js with Custom Hooks** ✅
- Create abstraction layer on top of Three.js
- Custom hooks for common patterns
- Best of both worlds (compatibility + organization)

### If Grafana Fixes External React Issues:
**Future Option: React Three Fiber** 🔮
- Monitor Grafana plugin architecture updates
- R3F may become viable if React externalization changes
- Keep code modular for potential migration

---

## Code Volume Comparison

**For a simple rotating cube with orbit controls:**

| Metric | React Three Fiber | Plain Three.js | Difference |
|--------|------------------|----------------|------------|
| Lines of code | ~30 lines | ~100 lines | +70 lines |
| Imports | 5 | 4 | -1 |
| Concepts to understand | 3 (Canvas, JSX, hooks) | 5 (Scene, Camera, Renderer, Animation Loop, Controls) | +2 |
| Setup complexity | Low | Medium | +1 |
| Cleanup required | Automatic | Manual | +1 |

**For a complex satellite visualization (estimated):**

| Feature | R3F Lines | Three.js Lines | Difference |
|---------|-----------|----------------|------------|
| Scene setup | 10 | 50 | +40 |
| Satellite model | 20 | 35 | +15 |
| Orbit path | 25 | 40 | +15 |
| Camera controls | 5 | 20 | +15 |
| Time controls | 30 | 45 | +15 |
| **Total** | **90** | **190** | **+100 lines (~2x)** |

**Impact:** Approximately 2x more code, but still manageable and maintainable.

---

## Recommendations for Presentation

### Key Points to Highlight:

1. **"React Three Fiber incompatibility forced architecture decision"**
   - Technical limitation, not a choice
   - Grafana's externalized React prevents R3F from working

2. **"Plain Three.js provides 100% of required functionality"**
   - All 3D capabilities preserved
   - No feature loss for end users
   - Actually better performance potential

3. **"Trade-off: Development velocity vs. Compatibility"**
   - ~2x more code to write
   - But guaranteed to work in Grafana
   - More maintainable in this specific context

4. **"Knowledge investment in Three.js is valuable"**
   - Transferable to any web 3D project
   - Industry standard for WebGL
   - Not tied to React ecosystem

5. **"Future-proof architecture"**
   - Can create custom abstraction layer if needed
   - Modular design allows migration if R3F becomes viable
   - Works today, scales for tomorrow

---

## Conclusion

**For Grafana Plugins: Plain Three.js is the correct choice.**

The compatibility issues with React Three Fiber are fundamental to how Grafana plugins work, not something we can easily fix. Plain Three.js provides:

- ✅ **100% functionality** (all 3D features available)
- ✅ **100% compatibility** (works reliably in Grafana)
- ⚠️ **~2x code volume** (manageable trade-off)
- ✅ **Better performance** (direct access, no overhead)
- ✅ **Broader ecosystem** (Three.js community is massive)

**The extra code is a worthwhile trade-off for a working, stable plugin.**

---

## Understanding React Externalization (Technical Deep Dive)

### What Does "Externalized React" Mean?

**For Newbie Programmers:**

Think of React like a shared library in a apartment building:

**Normal React App (Bundled/Internal):**
- Each apartment (plugin) has its own copy of every book (React library)
- Your apartment has React, your neighbor's apartment has React
- Everyone has their own complete copy
- **Size:** Wasteful (10 apartments = 10 copies of the same books)
- **Independence:** Each apartment is self-sufficient

**Grafana's Architecture (Externalized/Shared):**
- There's ONE community library (React) in the building's lobby
- All apartments (plugins) share the same books (React instance)
- You can't bring books into your apartment, you must use the lobby's copy
- **Size:** Efficient (10 apartments = 1 shared copy)
- **Coordination:** Everyone must use the same version

---

### The Technical Details

**Externalized React in Grafana:**

```
┌─────────────────────────────────────┐
│         Grafana Core                │
│  ┌─────────────────────────────┐   │
│  │   React 18.3.1 (Shared)     │   │
│  │   ReactDOM                   │   │
│  │   React Internals            │   │
│  └─────────────────────────────┘   │
│         ↑         ↑         ↑       │
│         │         │         │       │
│    ┌────┘    ┌────┘    └────┐      │
│    │         │              │       │
│ Plugin A  Plugin B     Plugin C     │
│ (uses     (uses        (uses        │
│  shared   shared       shared       │
│  React)   React)       React)       │
└─────────────────────────────────────┘
```

**How It Works:**

1. **Grafana loads ONE copy of React** when it starts
2. **Plugins DON'T bundle React** - they expect it to be provided
3. **Webpack externals config** tells the plugin: "Don't include React, it will be available at runtime"
4. **All plugins share** the same React instance

**Why Grafana Does This:**
- ✅ Reduces bundle size (each plugin is smaller)
- ✅ Ensures compatibility (all plugins use same React version)
- ✅ Faster loading (React only downloaded once)
- ✅ Shared state management possible

---

### Internal vs External: The Scope Problem

**Internal (Bundled):**
```javascript
// Plugin bundles its own React
import React from 'react';
// This React is INSIDE the plugin's code
// Plugin has full access to React's internals
// Like having books in your own room - full access
```

**External (Grafana's approach):**
```javascript
// Plugin expects React from outside
import React from 'react'; // Points to Grafana's React
// This React is PROVIDED by Grafana
// Plugin can only access what Grafana exposes
// Like borrowing from library - limited access
```

---

### The React Three Fiber Problem Explained

**Why R3F Doesn't Work:**

React Three Fiber needs access to **React's internal implementation details** - specifically something called `react-reconciler` and `ReactSharedInternals`.

**The Analogy:**

Imagine you're trying to tune a car engine:

**Normal scenario (R3F in regular app):**
- You own the car (React is bundled in your app)
- You can open the hood and access the engine internals
- You can modify timing, adjust components, tune everything
- **R3F works** because it can access React's "engine"

**Grafana scenario (R3F with externalized React):**
- You're renting a car (React is provided by Grafana)
- The hood is locked - you can drive but can't access internals
- The rental company (Grafana) only gives you the steering wheel and pedals
- **R3F fails** because it needs to "tune the engine" but can't access it

---

### What Are "React Internals"?

**Public API (Externalized - Available):**
```javascript
// These work fine with externalized React:
import React from 'react';
const [state, setState] = React.useState(0);  // ✅ Works
const ref = React.useRef(null);                // ✅ Works
React.createElement('div', {}, 'Hello');       // ✅ Works
```

**Internal API (Not Externalized - Blocked):**
```javascript
// These are internal and NOT available:
import { ReactSharedInternals } from 'react';  // ❌ Blocked
import { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from 'react'; // ❌ Blocked

// R3F tries to do something like:
const reconciler = ReactReconciler({
  createInstance: () => { /* create 3D objects */ },
  // This needs ReactSharedInternals.S
  // But can't access it in Grafana!
});
```

---

### Why Does R3F Need Internals?

**React Three Fiber's Job:**

R3F creates a "bridge" between React's rendering system and Three.js:

```
React Component Tree          Three.js Scene Graph
     <Canvas>          →→→     Scene
       <mesh>          →→→       Mesh
         <boxGeometry> →→→         BoxGeometry
```

**To build this bridge, R3F needs to:**

1. **Hook into React's rendering lifecycle** (needs internals)
2. **Create custom renderer** (needs react-reconciler)
3. **Track React's update cycle** (needs ReactSharedInternals)
4. **Diff and update 3D objects** (needs reconciler internals)

**The Problem:**
```javascript
// R3F somewhere in its code:
import { ReactSharedInternals } from 'react';

// Tries to access:
const currentDispatcher = ReactSharedInternals.S;

// But in Grafana's externalized React:
// ReactSharedInternals is undefined!
// Error: "can't access property 'S', ReactSharedInternals is undefined"
```

---

### Variable Scope Analogy

**Think of it like JavaScript scope:**

**Block Scope (Internal React):**
```javascript
function MyApp() {
  const secretData = "internal"; // Accessible inside
  const publicData = "external";
  
  return {
    public: publicData,     // Exported - others can use
    // secretData NOT exported - stays internal
  };
}

// R3F when bundled with React:
const app = MyApp();
app.public;        // ✅ Works
app.secretData;    // ✅ Works (same scope)
```

**Module Scope (External React):**
```javascript
// Grafana provides only the public interface:
const grafanaReact = {
  public: "external"
  // secretData is NOT included
};

// R3F trying to use Grafana's React:
grafanaReact.public;        // ✅ Works
grafanaReact.secretData;    // ❌ undefined - not exported!
```

---

### Why Plain Three.js Works

**Plain Three.js doesn't need React internals:**

```javascript
// Three.js only needs:
import * as THREE from 'three';  // Own library, no React dependency
import React, { useEffect } from 'react';  // Only public React API

// No reconciler needed - just:
useEffect(() => {
  const scene = new THREE.Scene();  // Direct Three.js
  const renderer = new THREE.WebGLRenderer();
  // Render manually - no React bridge needed
}, []);
```

**Why this works:**
- ✅ Uses only public React hooks (useState, useEffect, useRef)
- ✅ Three.js is independent (not integrated with React's internals)
- ✅ No need for react-reconciler
- ✅ No need for ReactSharedInternals
- ✅ Works perfectly with externalized React

---

### Key Takeaways

**Externalized React = Shared Library:**
- One React instance for entire Grafana
- Plugins can't bundle their own React
- Only public API available
- Internals are "locked away"

**R3F Needs Internals:**
- Must access react-reconciler
- Needs ReactSharedInternals
- Can't work without "opening the hood"
- Incompatible with externalized architecture

**Plain Three.js Only Needs Public API:**
- Uses only standard React hooks
- No internal access required
- Works perfectly with limitations
- Compatible with Grafana's architecture

**The Trade-off:**
- Lose: Declarative React-style 3D code
- Gain: Compatibility, reliability, control
- Result: More code, but it actually works

---

## Additional Resources

### Three.js Learning:
- Official docs: https://threejs.org/docs/
- Examples: https://threejs.org/examples/
- Journey course: https://threejs-journey.com/

### Integration Patterns:
- Three.js + React hooks patterns
- Custom hooks for 3D scenes
- State synchronization strategies

### Future Considerations:
- Monitor Grafana plugin architecture updates
- Track R3F compatibility discussions
- Consider custom abstraction layer if multiple plugins share 3D code

---

**Last Updated:** November 26, 2025  
**Status:** Plain Three.js implementation successful ✅

