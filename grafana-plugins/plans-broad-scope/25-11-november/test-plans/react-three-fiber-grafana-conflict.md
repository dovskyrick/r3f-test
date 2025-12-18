# React Three Fiber vs Three.js in Grafana Plugins

**Date:** November 26, 2025  
**Decision:** Use vanilla Three.js instead of React Three Fiber

---

## The Problem: Internalization Conflict

### What is the Conflict?

**React Three Fiber (R3F)** and **Grafana** have incompatible bundling strategies:

```
┌─────────────────────────────────────┐
│  React Three Fiber                  │
│  - Internalizes React               │  ← R3F bundles React into itself
│  - Expects to control React version │
│  - Uses react-reconciler            │
└─────────────────────────────────────┘
                 ❌ CONFLICT
┌─────────────────────────────────────┐
│  Grafana Panel System               │
│  - Externalizes React               │  ← Grafana provides React externally
│  - React is a peer dependency       │
│  - All panels share one React       │
└─────────────────────────────────────┘
```

### Why This is a Problem

1. **R3F expects to bundle React** - it uses `react-reconciler` which creates a custom React renderer
2. **Grafana externalizes React** - it provides React as a shared dependency to all plugins
3. **Result:** Two different React instances trying to work together = runtime errors, hooks breaking, context not working

### Symptoms

- "Invalid hook call" errors
- Context providers not working across R3F components
- State not updating properly
- React DevTools showing duplicate React roots
- Bundle size issues (React bundled twice)

---

## The Solution: Use Vanilla Three.js

### Why Vanilla Three.js Works

```
┌─────────────────────────────────────┐
│  Three.js (vanilla)                 │
│  - No React dependency              │  ← Just 3D rendering library
│  - Works with any React version     │
│  - No reconciler needed             │
└─────────────────────────────────────┘
                 ✅ COMPATIBLE
┌─────────────────────────────────────┐
│  Grafana Panel System               │
│  - Provides React 18                │
│  - Our component uses it normally   │
│  - Three.js is just imported        │
└─────────────────────────────────────┘
```

### What We Keep

- ✅ **Three.js** (`three`) - Core 3D library
- ✅ **React 18** (pinned to 18.x) - Provided by Grafana
- ✅ **React-DOM 18** - For React rendering

### What We Remove

- ❌ **@react-three/fiber** - Causes internalization conflict
- ❌ **@react-three/drei** - Depends on fiber, so also removed
- ❌ **react-reconciler** - Only needed by R3F

---

## Implementation Approach

### Before (With R3F)

```typescript
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export const Panel = () => {
  return (
    <Canvas>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
};
```

### After (Vanilla Three.js)

```typescript
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const Panel = ({ width, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Setup scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    renderer.setSize(width, height);
    containerRef.current?.appendChild(renderer.domElement);
    
    // Create cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 'orange' });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Cleanup
    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [width, height]);
  
  return <div ref={containerRef} />;
};
```

---

## Trade-offs

### What We Lose

- ❌ Declarative JSX syntax for 3D scenes
- ❌ React hooks like `useFrame`, `useThree`
- ❌ Helper components from drei (OrbitControls, etc.)
- ❌ Automatic React integration

### What We Gain

- ✅ **No conflicts with Grafana's React**
- ✅ Full control over Three.js lifecycle
- ✅ Smaller bundle size (no R3F reconciler)
- ✅ More predictable behavior
- ✅ Standard Three.js patterns (easier to find docs/examples)

### Is It Worth It?

**YES**, for Grafana plugins:

1. **Compatibility** > Convenience - plugins must work reliably
2. **Bundle concerns** - Grafana has strict requirements
3. **Maintainability** - vanilla Three.js is standard and stable
4. **Performance** - no reconciler overhead

---

## React Version Strategy

### Why Pin React to 18.x?

```json
{
  "dependencies": {
    "react": "~18.3.0",      // ← Tilde: allows 18.3.x, blocks 18.4+
    "react-dom": "~18.3.0"
  }
}
```

**Reasoning:**

1. **Grafana uses React 18** - must match exactly
2. **Prevent automatic upgrades** - don't accidentally get React 19
3. **Peer dependency compatibility** - other Grafana packages expect 18
4. **Stability** - lock to a known-good version

### Version Range Comparison

| Range | Meaning | Example | Should Use? |
|-------|---------|---------|-------------|
| `^18.3.0` | `>=18.3.0 <19.0.0` | Could install 18.99.0 | ⚠️ Too permissive |
| `~18.3.0` | `>=18.3.0 <18.4.0` | Only patch updates | ✅ **Best choice** |
| `18.3.0` | Exact version | Only 18.3.0 | ⚠️ Too strict |

**We use `~18.3.0`** because:
- ✅ Allows security patches (18.3.1, 18.3.2, etc.)
- ✅ Blocks minor version bumps that could break things
- ✅ Matches Grafana's React version closely

---

## Package.json Configuration

### Final Dependencies

```json
{
  "dependencies": {
    "@emotion/css": "11.10.6",
    "@grafana/data": "^12.3.0",
    "@grafana/i18n": "^12.3.0",
    "@grafana/runtime": "^12.3.0",
    "@grafana/schema": "^12.3.0",
    "@grafana/ui": "^12.3.0",
    "react": "~18.3.0",
    "react-dom": "~18.3.0",
    "three": "^0.181.2"
  }
}
```

### What's Included

- **Grafana packages** - Required for plugin functionality
- **React & React-DOM** - Pinned to 18.3.x for compatibility
- **Three.js** - Core 3D library, no React dependency

### What's Excluded

- ❌ `@react-three/fiber` - Removed due to internalization conflict
- ❌ `@react-three/drei` - Depends on fiber
- ❌ `react-reconciler` - Only needed by R3F

---

## Development Implications

### Learning Curve

**If you're familiar with R3F:**
- Must learn vanilla Three.js patterns
- Manual scene setup instead of `<Canvas>`
- Imperative instead of declarative
- More boilerplate code

**Resources:**
- Three.js documentation: https://threejs.org/docs/
- Three.js examples: https://threejs.org/examples/
- Your existing my-cesium-app uses Three.js directly (good reference!)

### Code Reusability

**From my-cesium-app:**
- ✅ Can copy Three.js scene setup code
- ✅ Can reuse utility functions (coordinate conversion, etc.)
- ✅ Can share Three.js knowledge
- ❌ Cannot copy R3F components directly (need to convert)

---

## Alternative Considered: Legacy Peer Deps

### Why NOT Use --legacy-peer-deps?

```bash
# This was suggested but REJECTED:
npm install --legacy-peer-deps
```

**Problems:**

1. **Hides real issues** - the internalization conflict still exists
2. **Runtime errors** - React will still be bundled twice
3. **Unpredictable behavior** - hooks might break randomly
4. **Harder to debug** - errors will be cryptic
5. **Not a real solution** - just bypasses the warning

**Better approach:** Fix the root cause by removing R3F

---

## Comparison: R3F vs Vanilla Three.js

| Aspect | React Three Fiber | Vanilla Three.js |
|--------|-------------------|------------------|
| Grafana Compatible | ❌ No (conflict) | ✅ Yes |
| Bundle Size | Large (~200KB) | Small (~600KB total) |
| React Integration | Automatic | Manual |
| Learning Curve | Easier (if know React) | Steeper (imperative) |
| Performance | Good | Excellent |
| Debugging | React DevTools | Browser DevTools |
| Community Examples | R3F specific | Universal (largest) |
| Stability | Depends on React version | Independent |
| **Recommended for Grafana?** | ❌ **NO** | ✅ **YES** |

---

## Summary

### The Decision

**Use vanilla Three.js** because:

1. ✅ No internalization conflict with Grafana
2. ✅ React 18 compatibility guaranteed
3. ✅ Smaller, more predictable bundle
4. ✅ Standard patterns, better docs
5. ✅ Already used successfully in my-cesium-app

### The React Strategy

**Pin React to ~18.3.0** because:

1. ✅ Matches Grafana's version exactly
2. ✅ Allows patch updates for security
3. ✅ Prevents accidental major version bumps
4. ✅ Ensures peer dependency compatibility

### Next Steps

1. Remove R3F and drei from package.json ✅
2. Pin React to ~18.3.0 ✅
3. Run `npm install` - should work cleanly ✅
4. Convert R3F code to vanilla Three.js
5. Test in Grafana to verify no conflicts

---

## References

- Grafana Plugin Development: https://grafana.com/docs/grafana/latest/developers/plugins/
- Three.js Documentation: https://threejs.org/docs/
- React 18 Release Notes: https://react.dev/blog/2022/03/29/react-v18
- Previous project (my-cesium-app) - good vanilla Three.js examples

---

**Conclusion:** This architectural decision prioritizes compatibility and stability over developer convenience. For Grafana plugins, this is the correct trade-off.

