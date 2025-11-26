# Migration Guide: my-tsx-app to my-cesium-app

## Overview
This guide will help you migrate your complete React Three Fiber satellite visualization app from `my-tsx-app` (Create React App) to `my-cesium-app` (Vite + Cesium) while maintaining all functionality and adding Cesium's coordinate transformation capabilities.

## Phase 1: Install Required Dependencies

### Step 1: Install Core Dependencies
```bash
cd my-cesium-app

# React Three Fiber ecosystem
npm install @react-three/fiber @react-three/drei three

# Material-UI ecosystem
npm install @mui/material @emotion/react @emotion/styled @mui/x-date-pickers

# Routing
npm install react-router-dom

# Time handling
npm install luxon

# Utilities
npm install web-vitals
```

### Step 2: Install TypeScript Type Definitions
```bash
# Type definitions
npm install --save-dev @types/three @types/luxon @types/react-router-dom @types/node @types/jest

# Note: @types/cesium is already included with cesium package
```

### Step 3: Optional Dependencies (if needed)
```bash
# Only install these if you plan to keep the old coordinate transformation methods
# for comparison purposes. Otherwise, skip these as we'll replace with Cesium.

# npm install astronomy-engine satellite.js
# npm install --save-dev @types/google-map-react
```

## Phase 2: Update Configuration Files

### Step 1: Update tsconfig.json
Replace the contents of `my-cesium-app/tsconfig.json` with:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 2: Update vite.config.ts
Your current config should already be good, but ensure it looks like this:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 3000, // Match the port from your tsx app if desired
  },
});
```

## Phase 3: Copy Source Files

### Step 1: Copy the entire src directory structure
```bash
# From the r3f-test root directory
cp -r my-tsx-app/src/* my-cesium-app/src/

# Copy public assets
cp -r my-tsx-app/public/* my-cesium-app/public/
```

### Step 2: Update package.json scripts (optional)
You can update the scripts in `my-cesium-app/package.json` to match your preferences:
```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite", // Add this for familiarity
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest" // If you want to add testing later
  }
}
```

## Phase 4: Fix Import and Configuration Issues

### Step 1: Update index.html
Make sure `my-cesium-app/index.html` has the proper title and meta tags:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Satellite Visualization - Cesium</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 2: Update src/main.tsx
Ensure your main.tsx looks like this:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Step 3: Check for Create React App specific imports
Look for and update any imports that reference Create React App specifics:
- Remove any `react-scripts` references
- Update any `process.env.PUBLIC_URL` to `import.meta.env.BASE_URL`
- Update any `process.env.REACT_APP_*` to `import.meta.env.VITE_*`

## Phase 5: Test the Migration

### Step 1: Start the development server
```bash
cd my-cesium-app
npm run dev
```

### Step 2: Check for common issues
1. **Missing dependencies**: If you see import errors, install the missing packages
2. **Asset loading**: Make sure all images and assets are loading correctly
3. **Routing**: Test that React Router is working properly
4. **Three.js scenes**: Verify that your 3D scenes render correctly

### Step 3: Verify core functionality
- [ ] App loads without errors
- [ ] Navigation between views works
- [ ] 3D Earth renders correctly
- [ ] Time slider functions
- [ ] Satellite trajectories display
- [ ] All UI components work

## Phase 6: Integration with Cesium (Future Steps)

Once the migration is complete, you can:

1. **Replace coordinate transformations**: Update `src/utils/coordinateTransforms.ts` to use Cesium's functions instead of astronomy-engine/satellite.js
2. **Add Cesium-specific features**: Implement precise ICRF↔ITRF transformations
3. **Optimize performance**: Remove unused dependencies from the old implementation

## Common Issues and Solutions

### Issue 1: Module resolution errors
**Solution**: Make sure all dependencies are installed and TypeScript paths are correct

### Issue 2: CSS/styling issues
**Solution**: Ensure all CSS files are copied and imported correctly

### Issue 3: Asset loading problems
**Solution**: Check that all assets are in the `public` folder and referenced correctly

### Issue 4: Environment variables
**Solution**: Update any environment variables from `REACT_APP_*` to `VITE_*` format

### Issue 5: Build errors
**Solution**: Make sure TypeScript configuration is compatible with Vite

## Verification Checklist

After migration, verify:
- [ ] All dependencies installed successfully
- [ ] App starts without errors (`npm run dev`)
- [ ] All routes work correctly
- [ ] 3D scenes render properly
- [ ] Time controls function
- [ ] Satellite data loads and displays
- [ ] UI components respond correctly
- [ ] Console shows no critical errors

## Next Steps

Once migration is complete:
1. Remove unused dependencies (astronomy-engine, satellite.js if not needed)
2. Implement Cesium coordinate transformations
3. Test and validate new coordinate system accuracy
4. Update documentation

## Benefits of This Migration

1. **Modern Build System**: Vite provides faster development and builds
2. **Cesium Integration**: Access to professional-grade coordinate transformations
3. **Better Performance**: Vite's optimizations and tree-shaking
4. **Future-Proof**: Modern tooling and dependencies
5. **Cleaner Architecture**: Opportunity to refactor and improve code organization

---

**Note**: This migration preserves all your existing functionality while setting up the foundation for Cesium integration. The actual Cesium coordinate transformation implementation will be a separate phase after the migration is complete. 