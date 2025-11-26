# Test Plugin Development and Testing Workflow

**Date:** November 26, 2025  
**Status:** Ready to Begin Development

**Goal:** Successfully develop and test a basic Grafana panel plugin with React Three Fiber

---

## Table of Contents
1. [Overview](#overview)
2. [Pre-Development Checklist](#pre-development-checklist)
3. [Phase 1: Fix Docker Mount Path](#phase-1-fix-docker-mount-path)
4. [Phase 2: Build and Test Hello World Panel](#phase-2-build-and-test-hello-world-panel)
5. [Phase 3: Add React Three Fiber Cube](#phase-3-add-react-three-fiber-cube)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Current Situation
- ✅ Grafana server is set up and working
- ✅ Plugin scaffolded with `@grafana/create-plugin`
- ✅ Dependencies installed (including React Three Fiber)
- ⏳ Need to fix Docker mount path
- ⏳ Need to build plugin
- ⏳ Need to test in Grafana

### Plugin Structure
```
grafana-plugins/
└── test-plugin/
    ├── test-plans/              # Planning documents (you are here)
    └── the-cube-panel/          # Actual plugin code
        ├── src/                 # Source code
        ├── dist/                # Built plugin (created by npm run dev)
        ├── package.json
        └── node_modules/
```

**Important:** The plugin is in `the-cube-panel/` subfolder, not directly in `test-plugin/`.

---

## Pre-Development Checklist

### ✅ Verify Before Starting:

1. **Node/npm versions correct (in WSL):**
   ```bash
   node --version  # Should be v22.x.x
   npm --version   # Should be v10.x.x
   ```

2. **Dependencies installed:**
   ```bash
   cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel
   ls node_modules  # Should show lots of folders
   ```

3. **Grafana server can be started:**
   ```bash
   cd /mnt/c/Dev/r3f-test/grafana-server
   docker-compose ps  # Check if running or stopped
   ```

---

## Phase 1: Fix Docker Mount Path

### Problem

The docker-compose.yml currently mounts:
```yaml
- ../grafana-plugins/test-plugin:/var/lib/grafana/plugins/test-plugin
```

But the actual plugin is in:
```
grafana-plugins/test-plugin/the-cube-panel/
```

**So Grafana is looking in the wrong place!**

### Solution: Update docker-compose.yml

**Step 1.1: Stop Grafana (if running)**

```powershell
cd C:\Dev\r3f-test\grafana-server
docker-compose down
```

**Step 1.2: Edit docker-compose.yml**

Open `grafana-server/docker-compose.yml`

**Find this line:**
```yaml
      - ../grafana-plugins/test-plugin:/var/lib/grafana/plugins/test-plugin
```

**Change it to:**
```yaml
      - ../grafana-plugins/test-plugin/the-cube-panel:/var/lib/grafana/plugins/the-cube-panel
```

**Also update the allowed unsigned plugins:**

**Find:**
```yaml
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=test-plugin
```

**Change to:**
```yaml
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=cube
```

(The plugin ID comes from the `plugin.json` file, which likely uses "cube" based on the folder name)

**Step 1.3: Verify plugin.json ID**

Before restarting, check what the actual plugin ID is:

```bash
# In WSL
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel
cat src/plugin.json | grep '"id"'
```

**You should see something like:**
```json
"id": "yourorg-cube-panel"
```

**Make note of this ID!** This is what you'll use in:
- The unsigned plugins environment variable
- The Grafana UI when searching for your plugin

**Step 1.4: Update docker-compose.yml with correct ID**

If the plugin ID is `yourorg-cube-panel`, then update:

```yaml
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=yourorg-cube-panel
```

**Step 1.5: Start Grafana with new configuration**

```powershell
cd C:\Dev\r3f-test\grafana-server
docker-compose up -d
```

**Step 1.6: Verify mount is correct**

```powershell
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/the-cube-panel/
```

**Expected:** Should show the contents of your plugin folder (even though `dist/` doesn't exist yet).

---

## Phase 2: Build and Test Hello World Panel

### Objective
Get the default scaffolded plugin working in Grafana (before adding any custom code).

---

### Step 2.1: Build the Plugin

**In WSL terminal:**

```bash
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel

# Start development build with watch mode
npm run dev
```

**What happens:**
- Webpack compiles your code
- Creates `dist/` folder with built plugin
- Watches for changes (keeps running)
- Rebuilds automatically when you edit files

**Expected output:**
```
webpack compiled successfully
```

**Verify dist folder was created:**

```bash
ls -la dist/
```

**Should contain:**
- `module.js` or `module.js.map`
- `plugin.json`
- Possibly other files

**Leave this terminal running!** (Or run in background)

---

### Step 2.2: Access Grafana UI

**Open your browser:**

1. Navigate to: `http://localhost:3000`
2. Login:
   - Username: `admin`
   - Password: `admin`
3. Skip the password change prompt (or change it if you want)

---

### Step 2.3: Verify Plugin is Loaded

**In Grafana UI:**

1. **Click the menu icon (≡)** in the top left
2. **Go to:** Administration → Plugins and data → Plugins
3. **Search for:** Your plugin name (e.g., "cube" or whatever name you gave it)

**Expected Result:**
- ✅ Your plugin appears in the list
- ✅ Shows as "unsigned" (this is expected for development)

**If plugin doesn't appear:**
- Check Grafana logs: `docker-compose logs -f grafana`
- Verify `dist/plugin.json` exists
- Check the plugin ID matches the unsigned plugins list
- Restart Grafana: `docker-compose restart grafana`

---

### Step 2.4: Create a Test Dashboard

**In Grafana UI:**

1. **Click the menu (≡)** → Dashboards → New dashboard
2. **Click:** Add visualization
3. **Select a data source:** Choose "TestData DB" (it's built-in)
4. **Leave default query as-is** (it generates random data)
5. **In the panel editor on the right:**
   - Look for the **visualization picker** (dropdown showing current viz type)
   - Click it to see all available visualizations
6. **Scroll down** to find your plugin (e.g., "Cube Panel" or similar)
7. **Select your plugin**

**Expected Result:**
- ✅ Panel changes to show your plugin's default view
- ✅ You should see whatever the default panel shows (likely "Hello World" or similar text)
- ✅ No console errors (press F12 to check browser console)

---

### Step 2.5: Save the Dashboard

1. **Click "Apply"** (top right) to save the panel
2. **Click the save icon** (💾) at the top
3. **Name it:** "Test Plugin Dashboard"
4. **Click "Save"**

---

### Step 2.6: Verify Everything Works

**Checklist:**
- ✅ Plugin appears in Grafana plugins list
- ✅ Can add plugin as a panel to dashboard
- ✅ Panel displays without errors
- ✅ No errors in browser console (F12)
- ✅ No errors in Grafana logs

**If all checks pass, you're ready for Phase 3!**

---

## Phase 3: Add React Three Fiber Cube

### Objective
Replace the default panel content with a React Three Fiber scene showing a rotating 3D cube.

---

### Step 3.1: Understand the Panel Component

**The main panel file is located at:**
```
the-cube-panel/src/components/SimplePanel.tsx
```

This is what renders in the Grafana panel. It receives props from Grafana (data, width, height, etc.).

---

### Step 3.2: Add React Three Fiber Imports

**At the top of SimplePanel.tsx, add:**

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
```

---

### Step 3.3: Create a Cube Component

**Add this component (can be in same file or separate):**

```typescript
function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
```

**Required additional imports:**
```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
```

---

### Step 3.4: Replace Panel Content with Canvas

**In the SimplePanel component's return statement, replace the content with:**

```typescript
return (
  <div style={{ width, height }}>
    <Canvas>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <RotatingCube />
      <OrbitControls />
    </Canvas>
  </div>
);
```

**Important:** Use the `width` and `height` props provided by Grafana to size the container div.

---

### Step 3.5: Complete Code Structure

**Your SimplePanel.tsx should look something like:**

```typescript
import React, { useRef } from 'react';
import { PanelProps } from '@grafana/data';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SimpleOptions } from 'types';

interface Props extends PanelProps<SimpleOptions> {}

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export const SimplePanel: React.FC<Props> = ({ options, data, width, height }) => {
  return (
    <div style={{ width, height }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RotatingCube />
        <OrbitControls />
      </Canvas>
    </div>
  );
};
```

---

### Step 3.6: Save and Watch Auto-Rebuild

**After saving the file:**

1. **Check the terminal** where `npm run dev` is running
2. **Should see:** "webpack compiled successfully"
3. **Wait a few seconds** for the rebuild to complete

---

### Step 3.7: Refresh Grafana

**In your browser:**

1. Go back to your test dashboard
2. **Press F5** to refresh the page
3. **You should now see:**
   - ✅ An orange rotating cube
   - ✅ Ability to orbit with mouse (click and drag)
   - ✅ Zoom with scroll wheel

**If you see the cube - SUCCESS!** 🎉

---

### Step 3.8: Test Panel Functionality

**Try these interactions:**

1. **Resize the panel:**
   - Drag the corner of the panel to make it bigger/smaller
   - Canvas should resize accordingly

2. **Orbit controls:**
   - Click and drag to rotate view
   - Scroll to zoom
   - Right-click and drag to pan (if enabled)

3. **Check for errors:**
   - Open browser console (F12)
   - Should see no red errors
   - Three.js might show some info logs (that's fine)

---

### Step 3.9: Customize and Experiment

**Now that it works, try modifying:**

1. **Cube color:**
   ```typescript
   <meshStandardMaterial color="blue" />
   ```

2. **Cube size:**
   ```typescript
   <boxGeometry args={[3, 3, 3]} />  // Bigger cube
   ```

3. **Rotation speed:**
   ```typescript
   meshRef.current.rotation.x += 0.02;  // Faster
   ```

4. **Add multiple cubes:**
   ```typescript
   <RotatingCube />
   <mesh position={[3, 0, 0]}>
     <boxGeometry args={[1, 1, 1]} />
     <meshStandardMaterial color="cyan" />
   </mesh>
   ```

**Each time you save:**
- Webpack rebuilds (check terminal)
- Refresh browser to see changes

---

## Development Workflow Summary

### Daily Development Cycle

```
┌─────────────────────────────────────┐
│ 1. Start Grafana (if not running)  │
│    cd grafana-server                │
│    docker-compose up -d             │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ 2. Start build watch (in WSL)      │
│    cd the-cube-panel                │
│    npm run dev                      │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ 3. Open Grafana in browser          │
│    http://localhost:3000            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ 4. Edit code in Cursor              │
│    src/components/SimplePanel.tsx   │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ 5. Save → Auto-rebuild → F5 browser│
└─────────────────┬───────────────────┘
                  │
                  └────► Repeat step 4-5
```

---

## Troubleshooting

### Issue: Plugin Doesn't Appear in Grafana

**Check:**
1. Is `dist/` folder created? → Run `npm run dev`
2. Is Docker mount correct? → Check docker-compose.yml
3. Is plugin ID in unsigned list? → Check environment variable
4. Any errors in Grafana logs? → `docker-compose logs -f grafana`

**Solution:**
```bash
# Restart everything
cd /mnt/c/Dev/r3f-test/grafana-server
docker-compose restart grafana
```

---

### Issue: Cube Not Rendering (Black Screen)

**Check:**
1. Browser console errors (F12)
2. Are lights added to scene? (ambientLight, pointLight)
3. Is Canvas sized properly? (using width/height props)
4. Is camera positioned correctly? (Canvas default should work)

**Common fixes:**
```typescript
// Make sure Canvas has explicit size
<div style={{ width, height, background: '#000' }}>
  <Canvas>
    {/* Make sure lights exist */}
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} />
    {/* Your content */}
  </Canvas>
</div>
```

---

### Issue: Build Errors After Adding R3F

**Check:**
1. TypeScript errors in terminal
2. Missing imports
3. Webpack errors

**Common missing imports:**
```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
```

---

### Issue: Panel Size Not Working

**Make sure you're using Grafana's width/height props:**

```typescript
export const SimplePanel: React.FC<Props> = ({ width, height }) => {
  return (
    <div style={{ width, height }}>  {/* Use these props! */}
      <Canvas>
        {/* ... */}
      </Canvas>
    </div>
  );
};
```

---

### Issue: Changes Not Appearing

**Workflow to force update:**

1. **Check webpack rebuilt:**
   ```
   Look at npm run dev terminal - should say "compiled successfully"
   ```

2. **Hard refresh browser:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

3. **Restart Grafana (nuclear option):**
   ```bash
   cd /mnt/c/Dev/r3f-test/grafana-server
   docker-compose restart grafana
   ```

4. **Clear browser cache:**
   ```
   F12 → Network tab → Check "Disable cache"
   ```

---

### Issue: npm run dev Fails

**Check:**
1. Node version: `node --version` (should be v22.x)
2. Dependencies installed: `ls node_modules` (should be full)
3. No port conflicts (webpack dev server)

**Solution:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Terminal Windows Reference

**You'll typically have 3 terminals open:**

### Terminal 1: PowerShell (Grafana Docker)
```powershell
# Location: C:\Dev\r3f-test\grafana-server
cd C:\Dev\r3f-test\grafana-server

# Commands:
docker-compose up -d          # Start
docker-compose logs -f        # View logs
docker-compose restart        # Restart
docker-compose down           # Stop
```

### Terminal 2: WSL (Build Watch)
```bash
# Location: /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel

# Command:
npm run dev    # Keep running
```

### Terminal 3: WSL (General Commands)
```bash
# For git commits, file operations, etc.
cd /mnt/c/Dev/r3f-test

git status
git add .
git commit -m "Add R3F cube to test plugin"
```

---

## Key Files Reference

### Configuration Files
- `grafana-server/docker-compose.yml` - Grafana server config
- `the-cube-panel/package.json` - Dependencies
- `the-cube-panel/webpack.config.ts` - Build configuration
- `the-cube-panel/src/plugin.json` - Plugin metadata

### Source Files
- `the-cube-panel/src/plugin.ts` - Plugin entry point
- `the-cube-panel/src/components/SimplePanel.tsx` - Main panel component
- `the-cube-panel/src/module.ts` - Module exports
- `the-cube-panel/src/types.ts` - TypeScript types

### Build Output
- `the-cube-panel/dist/` - Built plugin (created by webpack)
- `the-cube-panel/dist/module.js` - Main bundle
- `the-cube-panel/dist/plugin.json` - Plugin manifest

---

## Success Criteria

### Phase 1 Complete ✅
- [ ] Docker compose updated with correct mount path
- [ ] Grafana starts without errors
- [ ] Plugin directory visible inside container

### Phase 2 Complete ✅
- [ ] `npm run dev` runs successfully
- [ ] `dist/` folder created
- [ ] Plugin appears in Grafana plugins list
- [ ] Can add plugin to dashboard
- [ ] Default panel renders without errors

### Phase 3 Complete ✅
- [ ] React Three Fiber cube visible
- [ ] Cube rotates automatically
- [ ] Orbit controls work (mouse drag/zoom)
- [ ] Panel resizes correctly
- [ ] No console errors
- [ ] Can modify and see changes

---

## Next Steps After Success

Once you have the rotating cube working:

1. **Experiment with more complex 3D scenes**
2. **Add panel options** (color picker, rotation speed slider, etc.)
3. **Test with real data from Grafana queries**
4. **Start developing the other plugins** (orbit-attitude, ground-track)
5. **Create shared utilities** in `grafana-plugins/shared/`
6. **Document learnings and best practices**

---

## Quick Command Cheat Sheet

```bash
# Start everything
cd /mnt/c/Dev/r3f-test/grafana-server && docker-compose up -d
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel && npm run dev

# Stop everything
# Ctrl+C in the npm run dev terminal
cd /mnt/c/Dev/r3f-test/grafana-server && docker-compose down

# View logs
docker-compose logs -f grafana

# Rebuild plugin
cd /mnt/c/Dev/r3f-test/grafana-plugins/test-plugin/the-cube-panel
npm run build

# Check plugin in container
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/the-cube-panel/dist/
```

---

**Good luck! You're all set to start development!** 🚀

Remember: If you get stuck at any step, check the Troubleshooting section or review the error messages carefully. Most issues are related to:
1. Incorrect paths/mounts
2. Missing dist folder (need to run npm run dev)
3. Plugin ID mismatch
4. Missing imports in TypeScript

