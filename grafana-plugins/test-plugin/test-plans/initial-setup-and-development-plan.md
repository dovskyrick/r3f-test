# Test Plugin Setup and Development Plan

**Date:** November 25, 2025  
**Goal:** Create a basic Grafana plugin with React Three Fiber displaying a 3D cube  
**Status:** Planning Phase

---

## Table of Contents
1. [Strategy Evaluation](#strategy-evaluation)
2. [Prerequisites](#prerequisites)
3. [Grafana Self-Hosted Server Setup](#grafana-self-hosted-server-setup)
4. [Plugin Development Workflow](#plugin-development-workflow)
5. [Development Roadmap](#development-roadmap)
6. [Potential Challenges](#potential-challenges)
7. [Resources](#resources)

---

## Strategy Evaluation

### Proposed Approach Analysis

**Your Proposed Strategy:**
- Use Docker for self-hosted Grafana server
- Mount the plugin's `dist` folder to Grafana's plugin directory
- Run `npm run dev` outside Docker for continuous building
- Enable hot-reloading during development

### ✅ Validation & Recommendations

**GOOD ASPECTS:**
1. ✅ Docker for Grafana is the recommended approach - provides isolation and consistency
2. ✅ Volume mounting the `dist` folder is the correct strategy for plugin development
3. ✅ Keeping the build process outside Docker allows for faster iteration

**IMPORTANT CORRECTIONS & ADDITIONS:**

1. **Plugin Signing Requirement**
   - Grafana requires plugins to be signed by default
   - For development, we need to configure Grafana to allow unsigned plugins
   - Add environment variable: `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS`

2. **Hot Reload Limitation**
   - Grafana doesn't fully support hot-reloading like a typical React app
   - After rebuilding, you'll need to **refresh the browser** or **restart the panel**
   - For major changes, a Grafana restart may be needed (but not frequent)

3. **Build Mode Consideration**
   - Use `npm run dev` with watch mode, not hot-module-replacement
   - The build output should go to `dist/` folder
   - Grafana reads from `dist/`, so each rebuild updates what Grafana serves

4. **Plugin Structure**
   - Need proper `plugin.json` manifest file
   - Must follow Grafana's plugin directory structure
   - The `dist/` folder must contain all necessary files (module.js, plugin.json, etc.)

**CONFIRMED STRATEGY:**
Your approach is fundamentally sound with the corrections above. The workflow will be:
- Docker Grafana ← (volume mount) ← `test-plugin/dist/` ← (built by) ← `npm run dev` (watch mode)

---

## Prerequisites

### Software Requirements
- **Docker Desktop** (for Windows): Install from https://www.docker.com/products/docker-desktop
- **Node.js** (v18 or higher): Already should be installed (check with `node --version`)
- **npm** or **yarn**: Already installed with Node.js
- **Git**: Already installed (confirmed from your workspace)
- **Grafana CLI Tools**: We'll use `@grafana/toolkit` or `@grafana/create-plugin`

### Knowledge Prerequisites
- Basic understanding of Docker volumes and containers
- React development experience (you have this from my-cesium-app)
- Basic understanding of Grafana dashboards (can learn as we go)

---

## Grafana Self-Hosted Server Setup

### Phase 1: Create Docker Configuration

**Directory Structure:**
```
grafana-plugins/
├── docker/
│   ├── docker-compose.yml
│   ├── grafana.ini (optional custom config)
│   └── README.md
└── test-plugin/
    ├── src/
    ├── dist/
    └── package.json
```

**Step 1.1: Create `docker-compose.yml`**

Location: `grafana-plugins/docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: grafana-dev
    ports:
      - "3000:3000"
    environment:
      # Allow unsigned plugins (required for development)
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=test-plugin
      # Enable development mode
      - GF_DEFAULT_APP_MODE=development
      # Disable plugin signature validation
      - GF_PLUGINS_ENABLE_ALPHA=true
      # Optional: Set admin credentials
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      # Enable logging for debugging
      - GF_LOG_LEVEL=debug
    volumes:
      # Mount the plugin dist folder
      - ../test-plugin:/var/lib/grafana/plugins/test-plugin
      # Persist Grafana data
      - grafana-storage:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-storage:
```

**Step 1.2: Start Grafana**

Open PowerShell and navigate to the docker directory:
```powershell
cd C:\Dev\r3f-test\grafana-plugins\docker
docker-compose up -d
```

**Step 1.3: Verify Grafana is Running**

1. Check container status: `docker-compose ps`
2. View logs: `docker-compose logs -f grafana`
3. Access Grafana: Open browser to `http://localhost:3000`
4. Login with: username `admin`, password `admin`

**Step 1.4: Verify Plugin Directory Mount**

Check if the volume mount is working:
```powershell
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/test-plugin
```

This should show the contents of your `test-plugin` directory.

---

## Plugin Development Workflow

### Phase 2: Initialize Plugin Structure

**Step 2.1: Scaffold the Plugin**

We'll use Grafana's official plugin template with **Webpack** (Grafana's default and recommended build tool). From the `grafana-plugins/test-plugin` directory:

```powershell
cd C:\Dev\r3f-test\grafana-plugins\test-plugin
npx @grafana/create-plugin@latest
```

When prompted:
- Plugin name: `test-plugin`
- Organization: Your name or `test-org`
- Plugin type: `panel`
- Use React: `Yes`
- Use TypeScript: `Yes`
- Build tool: `Webpack` (default)

**Alternative Manual Setup:**
If the CLI doesn't work, we'll manually create:
- `package.json` with necessary dependencies (using Webpack)
- `plugin.json` manifest following Grafana specifications
- Basic source structure with React + R3F
- Webpack configuration based on Grafana's recommended setup

**Step 2.2: Install Dependencies**

```powershell
npm install
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

**Step 2.3: Configure Build to Output to `dist/`**

Ensure your build configuration (webpack/vite/rollup) outputs to the `dist/` folder:
- `dist/module.js` - The main plugin code
- `dist/plugin.json` - Plugin manifest
- `dist/img/` - Any images/logos

### Phase 3: Development Cycle

**Step 3.1: Start Watch Mode**

In a PowerShell terminal:
```powershell
cd C:\Dev\r3f-test\grafana-plugins\test-plugin
npm run dev
```

This should:
- Watch for file changes
- Rebuild automatically
- Output to `dist/`

**Step 3.2: Verify Plugin in Grafana**

1. Navigate to `http://localhost:3000`
2. Go to: Configuration (⚙️) → Plugins
3. Search for "test-plugin" or your plugin name
4. If not visible, check Docker logs: `docker-compose logs -f grafana`

**Step 3.3: Create a Test Dashboard**

1. In Grafana UI: Dashboards → New Dashboard
2. Add new panel
3. In the visualization dropdown, find your plugin (should be listed)
4. You should see your React Three Fiber cube

**Step 3.4: Iteration Workflow**

```
1. Make code changes in src/
2. npm run dev automatically rebuilds → dist/
3. Refresh browser (F5) or click "Refresh" in panel edit mode
4. See changes immediately (no Docker restart needed)
```

**When to Restart Grafana:**
- Changes to `plugin.json` manifest
- Major structural changes
- If plugin stops loading properly

Restart command:
```powershell
cd C:\Dev\r3f-test\grafana-plugins\docker
docker-compose restart grafana
```

---

## Development Roadmap

### 🎯 Milestone 1: Basic Plugin Setup (First Goal)

**Tasks:**
1. ✅ Write this planning document
2. ⏳ Create Docker configuration files
3. ⏳ Start Grafana container and verify it works
4. ⏳ Access Grafana UI and confirm login

**Success Criteria:**
- Grafana running on `http://localhost:3000`
- Can log in to Grafana dashboard
- Volume mount verified

---

### 🎯 Milestone 2: Scaffold Plugin Structure

**Tasks:**
1. ⏳ Initialize plugin using Grafana toolkit or manual setup
2. ⏳ Install base dependencies (React, Grafana SDK)
3. ⏳ Verify `dist/` folder builds correctly
4. ⏳ Confirm plugin appears in Grafana plugins list

**Success Criteria:**
- Plugin shows up in Grafana → Configuration → Plugins
- Can add plugin as a panel (even if it shows "Hello World")

---

### 🎯 Milestone 3: React Three Fiber Integration

**Tasks:**
1. ⏳ Install R3F dependencies (`three`, `@react-three/fiber`, `@react-three/drei`)
2. ⏳ Create basic R3F Canvas component
3. ⏳ Add a simple rotating cube
4. ⏳ Verify rendering in Grafana panel

**Success Criteria:**
- 3D cube visible in Grafana panel
- Cube rotates smoothly
- No console errors

---

### 🎯 Milestone 4: Development Workflow Optimization

**Tasks:**
1. ⏳ Configure watch mode for automatic rebuilds
2. ⏳ Test hot-reload workflow (edit → save → refresh browser)
3. ⏳ Document any gotchas or issues
4. ⏳ Create troubleshooting guide

**Success Criteria:**
- Changes in code reflect in browser within 5 seconds
- No need to restart Docker frequently
- Development feels smooth and responsive

---

## Potential Challenges

### Challenge 1: Plugin Not Appearing in Grafana

**Possible Causes:**
- Plugin not properly signed → Check `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS` env var
- Volume mount incorrect → Verify with `docker exec` command
- `plugin.json` malformed → Validate JSON syntax
- Wrong plugin type in manifest → Should be `"type": "panel"`

**Debugging Steps:**
1. Check Grafana logs: `docker-compose logs -f grafana`
2. Look for plugin loading errors
3. Verify file permissions on mounted volume
4. Check plugin.json structure

### Challenge 2: Three.js / R3F Not Rendering

**Possible Causes:**
- Canvas size not set correctly (Grafana panels have specific dimensions)
- Missing peer dependencies
- WebGL not supported in browser (unlikely)
- CSS conflicts with Grafana's styles

**Solutions:**
- Use Grafana's width/height props passed to your component
- Ensure Canvas fills the panel: `<Canvas style={{ width: '100%', height: '100%' }}>`
- Check browser console for THREE.js errors

### Challenge 3: Build Configuration Issues

**Possible Causes:**
- Webpack/bundler not configured for Grafana's module system
- Dependencies not externalized properly
- Source maps causing issues

**Solutions:**
- Use Grafana's recommended webpack config (usually provided by toolkit)
- Externalize React, ReactDOM (Grafana provides these)
- Check `package.json` scripts

### Challenge 4: Slow Rebuild Times

**Solutions:**
- Use incremental builds
- Disable source maps in development if not needed
- Consider using esbuild or swc for faster compilation
- Only watch necessary files

---

## Resources

### Official Documentation
- **Grafana Plugin Development:** https://grafana.com/docs/grafana/latest/developers/plugins/
- **Grafana Plugin Tools:** https://grafana.com/developers/plugin-tools/
- **React Three Fiber Docs:** https://docs.pmnd.rs/react-three-fiber/
- **Three.js Docs:** https://threejs.org/docs/

### Useful Commands Reference

**Docker Commands:**
```powershell
# Start Grafana
docker-compose up -d

# Stop Grafana
docker-compose down

# Restart Grafana
docker-compose restart grafana

# View logs
docker-compose logs -f grafana

# Access Grafana shell
docker exec -it grafana-dev /bin/bash

# Check plugin directory
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/
```

**Development Commands:**
```powershell
# Install dependencies
npm install

# Start development (watch mode)
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

### Comparison with my-cesium-app

**Similarities:**
- Both use React and TypeScript
- Both use Three.js for 3D rendering (via R3F)
- Both have similar component architecture
- Can reuse utility functions and 3D components

**Differences:**
- Grafana plugins are more constrained (run in panels)
- Different build process (webpack/module federation)
- Different data flow (Grafana provides data through props)
- No standalone routing (panels don't have routes)
- Must work with Grafana's theming and styling

**Reusability Strategy:**
- Extract pure 3D components from my-cesium-app (like orbit views)
- Create **shared utility library** in `grafana-plugins/shared/` for code reused across plugins
- Adapt components to work in Grafana's panel context
- Handle data differently (Grafana queries vs. REST API)

**Shared Folder Structure:**
```
grafana-plugins/
├── shared/
│   ├── utils/           # Shared utilities (time conversion, calculations, etc.)
│   ├── components/      # Reusable 3D components
│   ├── types/           # TypeScript types/interfaces
│   └── hooks/           # Custom React hooks
├── test-plugin/
├── 3d-orbit-attitude-plugin/
└── ground-track-r3f-plugin/
```

---

## Next Steps

### For You (User):
1. Review this document and confirm the approach
2. Install Docker Desktop if not already installed
3. Let me know when you're ready to proceed with implementation

### For Me (AI):
**Once you give the go-ahead, I will:**

1. **Create Docker setup files:**
   - `docker-compose.yml` with proper configuration
   - Documentation for running the container

2. **Initialize plugin structure:**
   - Create `package.json` with all dependencies
   - Create `plugin.json` manifest
   - Set up TypeScript configuration
   - Configure build system (webpack or vite)

3. **Implement basic R3F cube:**
   - Create plugin entry point
   - Set up React Three Fiber Canvas
   - Add animated 3D cube
   - Ensure proper panel sizing

4. **Test and verify:**
   - Document any issues encountered
   - Provide troubleshooting steps
   - Update this plan based on learnings

---

## Configuration Decisions Made

**Confirmed setup based on user requirements:**

1. ✅ **Docker Desktop:** Already installed and ready to use
2. ✅ **Build Tool:** Webpack (Grafana's default and recommended tool)
3. ✅ **Plugin Name:** `test-plugin`
4. ✅ **Shared Folder:** Will create `grafana-plugins/shared/` for reusable code across multiple plugins
5. ✅ **Grafana Compliance:** Following Grafana's recommendations to make future official plugin submission easier (see separate compliance document)

**Note:** A separate document (`grafana-plugin-compliance-guide.md`) has been created to outline best practices for developing plugins that align with Grafana's official plugin requirements from the start.

---

## Timeline Estimate

**Assuming no major blockers:**
- Docker setup: 10-15 minutes
- Plugin scaffolding: 15-20 minutes  
- R3F integration: 20-30 minutes
- Testing and troubleshooting: 15-30 minutes
- **Total: 1-2 hours for basic working plugin**

**Additional time for:**
- Learning Grafana's plugin APIs: Ongoing
- Porting complex components from my-cesium-app: Per component
- Multiple plugin development: Multiply by number of plugins

---

**End of Planning Document**

*This is a living document and will be updated as we progress through development and encounter new learnings.*

