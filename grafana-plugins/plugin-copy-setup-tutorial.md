# Plugin Copy Setup Tutorial

## Creating a New Plugin from Template

### Step 1: Copy the template
```bash
cp -r cesium-plugin-template/ your-new-plugin-name/
```

### Step 2: Install dependencies
```bash
cd your-new-plugin-name
npm install
```

### Step 3: Build
```bash
npm run build
```

### Step 4: Add to Grafana
Update `grafana-server/docker-compose.yml`:
- Add plugin ID to `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS`
- Add volume mount for the dist folder

---

## Setting Up the 3D Model

The default model is a rubber ducky. To use a satellite model:

1. Place your `.glb` file in `src/static/models/`

2. In Grafana panel settings, set **Asset URI** to:
```
public/plugins/lucasbremond-satellitevisualizer-panel/static/models/YOUR-MODEL.glb
```

### Example (ACRIMSAT satellite):
```
public/plugins/lucasbremond-satellitevisualizer-panel/static/models/ACRIMSAT-A.glb
```

---

## Folder Structure
```
your-new-plugin/
├── src/
│   ├── static/
│   │   └── models/      ← Put .glb files here
│   ├── components/
│   └── ...
├── dist/                 ← Built output (mount this in Grafana)
└── package.json
```

