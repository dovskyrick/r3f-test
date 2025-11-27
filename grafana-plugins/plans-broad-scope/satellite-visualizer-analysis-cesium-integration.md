# Satellite Visualizer Analysis - Cesium Integration in Grafana

## Overview
Analysis of the **satellite-visualizer** plugin (https://github.com/lucas-bremond/satellite-visualizer) - a working Grafana plugin using Cesium/Resium. This document compares their working implementation with our cesium-test plugin to identify why theirs works and ours doesn't.

---

## 1. Version Comparison

### Satellite Visualizer (Working)
```json
"@grafana/data": "10.0.3",
"@grafana/runtime": "10.0.3",
"@grafana/ui": "10.0.3",
"react": "18.2.0",
"react-dom": "18.2.0",
"cesium": "^1.112.0",
"resium": "^1.17.2"
```

### Our Plugin (Broken)
```json
"@grafana/data": "^12.3.0",     // ⚠️ MUCH NEWER
"@grafana/runtime": "^12.3.0",  // ⚠️ MUCH NEWER
"@grafana/ui": "^12.3.0",       // ⚠️ MUCH NEWER
"react": "^18.3.0",             // ⚠️ NEWER
"react-dom": "^18.3.0",         // ⚠️ NEWER
"cesium": "^1.135.0",           // ⚠️ MUCH NEWER
"resium": "^1.19.1"             // ⚠️ NEWER
```

### ⚠️ Critical Insight
**Grafana 10 → Grafana 12** is a MAJOR version jump. Grafana 12 may have changed how externals work or how React context is provided to plugins.

---

## 2. Webpack Configuration Comparison

### Key Configuration: CESIUM_BASE_URL

#### Satellite Visualizer (Working)
```typescript
new DefinePlugin({
  CESIUM_BASE_URL: JSON.stringify(`public/plugins/${pluginJson.id}/`),
  //                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                               NOT EMPTY! Full path to plugin directory
})
```

#### Our Plugin (Currently Broken)
```typescript
new webpack.DefinePlugin({
  CESIUM_BASE_URL: JSON.stringify(''),  // ❌ Empty string
})
```

**Impact**: Cesium needs to know where to find Workers/, Assets/, etc. An empty string means "relative to current directory" which might not work in Grafana's plugin loading system.

---

### Key Configuration: mainFiles

#### Satellite Visualizer (Working)
```typescript
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  modules: [path.resolve(process.cwd(), 'src'), 'node_modules'],
  unsafeCache: true,
  fallback: { https: false, zlib: false, http: false, url: false },
  mainFiles: ['index', 'Cesium'],  // ✅ Includes 'Cesium'
}
```

#### Our Plugin
```typescript
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  modules: [path.resolve(process.cwd(), 'src'), 'node_modules'],
  unsafeCache: true,
  mainFields: ['module', 'main', 'browser'],
  fallback: { https: false, zlib: false, http: false, url: false },
  alias: {
    cesium: path.resolve(process.cwd(), 'node_modules/cesium'),
  },
  // ❌ Missing mainFiles: ['index', 'Cesium']
}
```

**Impact**: `mainFiles` tells webpack what filenames to look for when resolving a directory. Cesium might need this to resolve `Cesium.js` correctly.

---

### Node.js Fallbacks

**Both have the same fallbacks** ✅:
```typescript
fallback: { https: false, zlib: false, http: false, url: false }
```

This is correct - Cesium tries to use Node.js modules that don't exist in browsers.

---

### CopyWebpackPlugin Configuration

**Both copy the same Cesium assets** ✅:
```typescript
{ from: '../node_modules/cesium/Build/Cesium/Workers', to: 'Workers' },
{ from: '../node_modules/cesium/Build/Cesium/ThirdParty', to: 'ThirdParty' },
{ from: '../node_modules/cesium/Build/Cesium/Assets', to: 'Assets' },
{ from: '../node_modules/cesium/Build/Cesium/Widgets', to: 'Widgets' },
```

---

## 3. Code Structure Comparison

### Imports - Almost Identical!

#### Satellite Visualizer
```typescript
import { Viewer, Clock, Entity, PointGraphics, ModelGraphics, PathGraphics, LabelGraphics } from 'resium';
import {
  Ion,
  JulianDate,
  // ... many more cesium imports
  Matrix3,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
```

#### Our Plugin
```typescript
import { Viewer, Globe, Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
```

**They're nearly identical!** Both import from `'resium'` and `'cesium'` the same way.

---

### Component Structure - Nearly Identical!

#### Satellite Visualizer
```typescript
export const SatelliteVisualizer: React.FC<Props> = ({ options, data, timeRange, width, height, eventBus }) => {
  Ion.defaultAccessToken = options.accessToken;  // Sets ion token (optional)

  return (
    <div style={{ width, height }}>
      <Viewer
        full
        animation={options.showAnimation}
        timeline={options.showTimeline}
        // ... more props
      >
        <Entity position={satellitePosition} orientation={satelliteOrientation}>
          <PointGraphics ... />
        </Entity>
      </Viewer>
    </div>
  );
};
```

#### Our Plugin
```typescript
export const SimplePanel: React.FC<Props> = ({ width, height }) => {
  // NO ion token set (intentional - we don't want ion)

  return (
    <div style={{ width, height }}>
      <Viewer
        full
        timeline={false}
        animation={false}
        // ... more props
      >
        <Globe enableLighting={false} />
        <Entity position={Cartesian3.fromDegrees(-75.5977, 40.0388, 0)}>
          <point={{ pixelSize: 10, color: Color.RED }} />
        </Entity>
      </Viewer>
    </div>
  );
};
```

**Nearly identical structure!** The only differences are:
1. They set `Ion.defaultAccessToken` (optional, for ion features)
2. They have more complex entities with animation
3. Otherwise, same React/Resium usage pattern

---

## 4. The React Context Error Analysis

### The Error We're Getting
```
TypeError: can't access property "recentlyCreatedOwnerStacks", H is undefined
at webpack-internal:///../node_modules/resium/dist/resium.mjs:712:22
```

This is a **React context error**. It means Resium's internal React context is undefined, which happens when:
1. Multiple React instances exist (but we confirmed both use externals ✅)
2. React version mismatch
3. Webpack isn't resolving modules correctly
4. Grafana 12 changed how it provides React externals

---

## 5. Critical Differences Summary

| Configuration | Satellite Visualizer | Our Plugin | Impact |
|---------------|---------------------|------------|---------|
| **Grafana Version** | 10.0.3 | 12.3.0 | 🔴 **CRITICAL** - Major version jump |
| **React Version** | 18.2.0 | 18.3.0 | 🟡 Minor, but might matter |
| **Cesium Version** | 1.112.0 | 1.135.0 | 🟡 Newer, might have breaking changes |
| **Resium Version** | 1.17.2 | 1.19.1 | 🟡 Newer, might have breaking changes |
| **CESIUM_BASE_URL** | `public/plugins/${id}/` | `''` (empty) | 🔴 **CRITICAL** - Cesium can't find assets |
| **mainFiles** | `['index', 'Cesium']` | Missing | 🟡 Might affect resolution |
| **React Externals** | ✅ External | ✅ External | ✅ Same (good) |
| **Node Fallbacks** | ✅ Has fallbacks | ✅ Has fallbacks | ✅ Same (good) |
| **Copy Assets** | ✅ Copies Workers/Assets | ✅ Copies Workers/Assets | ✅ Same (good) |

---

## 6. Root Cause Hypothesis

### Theory 1: CESIUM_BASE_URL is Wrong (Most Likely)
**Evidence**:
- Satellite Visualizer uses full path: `public/plugins/${pluginJson.id}/`
- We use empty string: `''`
- Cesium needs to dynamically load Workers and Assets at runtime
- Without correct base URL, Cesium can't find these files

**Solution**: Change `CESIUM_BASE_URL` to match satellite-visualizer.

### Theory 2: Grafana 12 Changed Externals Handling
**Evidence**:
- Satellite Visualizer works on Grafana 10.0.3
- We're on Grafana 12.3.0 (2+ major versions newer)
- Error is about React context (related to externals)
- Grafana may have changed how it provides React to plugins

**Solution**: Either:
- A) Downgrade to Grafana 10.x for testing
- B) Bundle React instead of using externals (not recommended)
- C) Find Grafana 12-specific configuration

### Theory 3: Missing mainFiles Configuration
**Evidence**:
- Satellite Visualizer explicitly includes `mainFiles: ['index', 'Cesium']`
- We don't have this
- Might affect how webpack resolves the Cesium package

**Solution**: Add `mainFiles: ['index', 'Cesium']` to resolve config.

### Theory 4: Version Incompatibility
**Evidence**:
- Resium 1.19.1 might not be compatible with Grafana 12
- Resium 1.17.2 + Grafana 10.0.3 = working
- Resium 1.19.1 + Grafana 12.3.0 = broken

**Solution**: Try downgrading Resium to 1.17.2 and Cesium to 1.112.0.

---

## 7. Recommended Fixes (In Order of Priority)

### Fix 1: Correct CESIUM_BASE_URL ⭐⭐⭐
```typescript
// Change this:
new webpack.DefinePlugin({
  CESIUM_BASE_URL: JSON.stringify(''),
})

// To this:
new webpack.DefinePlugin({
  CESIUM_BASE_URL: JSON.stringify(`public/plugins/${pluginJson.id}/`),
})
```

**Why**: Cesium absolutely needs to know where its Workers and Assets are. This is probably causing the immediate failure.

### Fix 2: Add mainFiles to resolve ⭐⭐
```typescript
resolve: {
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  modules: [path.resolve(process.cwd(), 'src'), 'node_modules'],
  unsafeCache: true,
  mainFields: ['module', 'main', 'browser'],
  mainFiles: ['index', 'Cesium'],  // ← ADD THIS
  fallback: { https: false, zlib: false, http: false, url: false },
}
```

**Why**: Helps webpack resolve Cesium package structure correctly.

### Fix 3: Try Version Downgrade ⭐
If above doesn't work, try matching their exact versions:

```bash
npm install cesium@1.112.0 resium@1.17.2
```

**Why**: Proven working combination. Newer versions might have introduced issues.

### Fix 4: Test with Grafana 10 ⭐
If still broken, the issue might be Grafana 12-specific:

```yaml
# In docker-compose.yaml, change:
grafana_version: ${GRAFANA_VERSION:-10.0.3}  # Instead of 12.3.0
```

**Why**: If it works on Grafana 10, we know Grafana 12 changed something.

---

## 8. Additional Observations

### They Don't Use sourcePrefix
Satellite Visualizer **does NOT** have:
```typescript
output: {
  sourcePrefix: '',  // We added this, they don't have it
}
```

This might actually be causing issues! Remove it if fixes above don't work.

### They Don't Have Cesium Alias
Satellite Visualizer **does NOT** have:
```typescript
resolve: {
  alias: {
    cesium: path.resolve(process.cwd(), 'node_modules/cesium'),
  }
}
```

We added this thinking it would help, but they don't use it. Remove it if fixes above don't work.

### They Don't Process Cesium Source
Satellite Visualizer **does NOT** have special loader for Cesium source:
```typescript
// We added this, they don't have it:
{
  test: /\.js$/,
  include: path.resolve(process.cwd(), 'node_modules/cesium/Source'),
  use: { loader: 'swc-loader', ... }
}
```

Remove this - it might be breaking things!

---

## 9. What We Did Wrong (Speculative)

Based on this analysis, we likely **over-configured** webpack by:

1. ❌ Setting `CESIUM_BASE_URL` to empty string (should be full path)
2. ❌ Adding `sourcePrefix: ''` (they don't have this)
3. ❌ Adding cesium alias (they don't have this)
4. ❌ Adding special loader for Cesium source (they don't have this)
5. ❌ Missing `mainFiles: ['index', 'Cesium']`

**Sometimes less is more!** We should use their minimal, working config instead of adding extra "fixes" that might break things.

---

## 10. Simplified Working Configuration

Based on satellite-visualizer, here's what the webpack config SHOULD look like:

```typescript
// .config/webpack/webpack.config.ts

export default {
  // ... other config
  
  externals: [
    'lodash', 'jquery', 'moment', 'slate', 'emotion', '@emotion/react',
    '@emotion/css', 'prismjs', 'slate-plain-serializer',
    '@grafana/slate-react', 'react', 'react-dom', 'react-redux',
    'redux', 'rxjs', 'react-router', 'react-router-dom', 'd3',
    'angular', '@grafana/ui', '@grafana/runtime', '@grafana/data',
  ],
  
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    modules: [path.resolve(process.cwd(), 'src'), 'node_modules'],
    unsafeCache: true,
    fallback: { https: false, zlib: false, http: false, url: false },
    mainFiles: ['index', 'Cesium'],  // ← ADD THIS
  },
  
  plugins: [
    // Copy Cesium assets
    new CopyWebpackPlugin({
      patterns: [
        { from: '../node_modules/cesium/Build/Cesium/Workers', to: 'Workers' },
        { from: '../node_modules/cesium/Build/Cesium/ThirdParty', to: 'ThirdParty' },
        { from: '../node_modules/cesium/Build/Cesium/Assets', to: 'Assets' },
        { from: '../node_modules/cesium/Build/Cesium/Widgets', to: 'Widgets' },
      ],
    }),
    
    // Set Cesium base URL
    new DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify(`public/plugins/${pluginJson.id}/`),  // ← FIX THIS
    }),
  ],
  
  // NO sourcePrefix, NO cesium alias, NO special loaders!
};
```

---

## 11. Testing Plan

### Step 1: Apply CESIUM_BASE_URL Fix
Change empty string to `public/plugins/${pluginJson.id}/` and test.

### Step 2: Add mainFiles
Add `mainFiles: ['index', 'Cesium']` and test.

### Step 3: Remove Extra Config
Remove:
- `sourcePrefix: ''`
- Cesium alias
- Special Cesium loader rule

### Step 4: Version Downgrade (If Needed)
```bash
npm install cesium@1.112.0 resium@1.17.2
```

### Step 5: Grafana Version Test (If Still Broken)
Test with Grafana 10.0.3 to confirm if Grafana 12 is the issue.

---

## 12. Conclusion

The satellite-visualizer plugin proves that:
- ✅ Cesium/Resium CAN work in Grafana plugins
- ✅ Using external React is the correct approach
- ✅ The code structure we're using is correct
- ❌ Our webpack configuration is wrong

**Primary suspect**: `CESIUM_BASE_URL` being empty instead of the full plugin path.

**Secondary suspects**:
1. Missing `mainFiles` configuration
2. Over-configuration (too many "fixes" that break things)
3. Grafana 12 compatibility issues
4. Version mismatches

**Next Action**: Apply webpack fixes in priority order and test incrementally.

---

## Files Referenced

### Satellite Visualizer
- `/home/rbbs/Dev/reference-projects/satellite-visualizer/package.json`
- `/home/rbbs/Dev/reference-projects/satellite-visualizer/.config/webpack/webpack.config.ts`
- `/home/rbbs/Dev/reference-projects/satellite-visualizer/src/components/SatelliteVisualizer.tsx`
- `/home/rbbs/Dev/reference-projects/satellite-visualizer/src/module.ts`

### Our Plugin
- `/home/rbbs/Dev/r3f-test/grafana-plugins/test-plugin/the-cesiumtest-panel/package.json`
- `/home/rbbs/Dev/r3f-test/grafana-plugins/test-plugin/the-cesiumtest-panel/.config/webpack/webpack.config.ts`
- `/home/rbbs/Dev/r3f-test/grafana-plugins/test-plugin/the-cesiumtest-panel/src/components/SimplePanel.tsx`

---

**Document Created**: November 27, 2024  
**Purpose**: Comparative analysis of working Cesium implementation in Grafana  
**Status**: Ready for fixes to be applied

