# Plugin Naming Conflicts

## The Problem

When copying the template, two things conflict:

1. **Plugin ID** (in `src/plugin.json`)
   - Currently: `lucasbremond-satellitevisualizer-panel`
   - Used in: asset URLs, Grafana plugin list, docker-compose

2. **Display Name** (in `src/plugin.json`)
   - What shows in Grafana UI when adding panels

---

## Files to Change for Each New Plugin

### `src/plugin.json`
```json
{
  "id": "your-unique-plugin-id",      // ← Must be unique
  "name": "Your Plugin Display Name", // ← Shows in UI
  ...
}
```

### Asset URL Path
After changing plugin ID, the model URL becomes:
```
public/plugins/YOUR-NEW-PLUGIN-ID/static/models/model.glb
```

### `grafana-server/docker-compose.yml`
```yaml
GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: old-plugin,your-new-plugin-id
```

---

## Suggested Naming Convention

| Plugin | ID | Display Name |
|--------|-----|--------------|
| Orbit/Attitude | `myorg-orbit-attitude-panel` | 3D Orbit & Attitude |
| Ground Track | `myorg-ground-track-panel` | Ground Track Map |

---

## Quick Checklist for New Plugin

- [ ] Change `id` in `plugin.json`
- [ ] Change `name` in `plugin.json`
- [ ] Update asset URL in panel settings
- [ ] Add new ID to docker-compose
- [ ] Rebuild

