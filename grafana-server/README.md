# Grafana Development Server

This directory contains the Docker configuration for running a self-hosted Grafana server for plugin development.

## Quick Start

### 1. Start Grafana Server

```powershell
cd C:\Dev\r3f-test\grafana-server
docker-compose up -d
```

### 2. Access Grafana

- **URL:** http://localhost:3000
- **Username:** `admin`
- **Password:** `admin`

### 3. Verify Server is Running

```powershell
# Check container status
docker-compose ps

# View logs
docker-compose logs -f grafana

# Check if plugin directory is mounted correctly
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/
```

## Configuration

### Environment Variables (docker-compose.yml)

- `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=test-plugin` - Allows unsigned plugins during development
- `GF_DEFAULT_APP_MODE=development` - Enables development mode
- `GF_PLUGINS_ENABLE_ALPHA=true` - Enables alpha/experimental plugins
- `GF_LOG_LEVEL=debug` - Detailed logging for troubleshooting

### Volume Mounts

The plugin directory is mounted from your local machine:
```
../grafana-plugins/test-plugin → /var/lib/grafana/plugins/test-plugin
```

This means any changes to the `dist/` folder in your plugin will be immediately available to Grafana (refresh browser to see changes).

## Common Commands

### Start/Stop Server

```powershell
# Start server (detached)
docker-compose up -d

# Stop server
docker-compose down

# Restart server (useful after plugin.json changes)
docker-compose restart grafana

# Stop and remove volumes (fresh start)
docker-compose down -v
```

### Debugging

```powershell
# View real-time logs
docker-compose logs -f grafana

# Access Grafana container shell
docker exec -it grafana-dev /bin/bash

# Check plugin directory contents
docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/test-plugin

# Check if plugin is recognized
docker exec -it grafana-dev grafana-cli plugins ls
```

### Updating Grafana

```powershell
# Pull latest Grafana image
docker-compose pull grafana

# Restart with new image
docker-compose up -d
```

## Plugin Directory Structure

Grafana expects the following structure in the mounted plugin directory:

```
test-plugin/
├── dist/
│   ├── module.js        # Main plugin code (built)
│   ├── plugin.json      # Plugin manifest
│   ├── README.md        # Plugin documentation
│   └── img/             # Plugin icons/images
├── src/                 # Source code
└── package.json
```

**Important:** The entire `test-plugin/` folder is mounted, but Grafana primarily looks in the `dist/` subdirectory for the compiled plugin files.

## Troubleshooting

### Plugin Not Appearing

1. Check if plugin directory is mounted:
   ```powershell
   docker exec -it grafana-dev ls -la /var/lib/grafana/plugins/test-plugin/dist
   ```

2. Verify `plugin.json` exists and is valid JSON

3. Check Grafana logs for plugin loading errors:
   ```powershell
   docker-compose logs -f grafana | findstr "plugin"
   ```

4. Ensure plugin is listed in `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS`

### Port Already in Use

If port 3000 is already taken:

1. Edit `docker-compose.yml`
2. Change `"3000:3000"` to `"3001:3000"` (or another available port)
3. Access Grafana at `http://localhost:3001`

### Permission Issues

On Windows with Docker Desktop, this is usually not an issue. If you encounter permission problems:

```powershell
# Restart Docker Desktop
# Or rebuild the container
docker-compose down
docker-compose up -d --force-recreate
```

### Fresh Start

To completely reset Grafana (lose all dashboards/settings):

```powershell
docker-compose down -v
docker-compose up -d
```

## Adding More Plugins

To add additional plugins to the server, update the volume mounts in `docker-compose.yml`:

```yaml
volumes:
  - ../grafana-plugins/test-plugin:/var/lib/grafana/plugins/test-plugin
  - ../grafana-plugins/another-plugin:/var/lib/grafana/plugins/another-plugin
```

And update the unsigned plugins list:

```yaml
environment:
  - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=test-plugin,another-plugin
```

## Next Steps

After verifying Grafana is running:

1. Navigate to http://localhost:3000
2. Log in with admin/admin
3. Go to Configuration → Plugins to see available plugins
4. Proceed with plugin development (see `grafana-plugins/test-plugin/test-plans/`)

## Resources

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Plugin Development Guide](https://grafana.com/docs/grafana/latest/developers/plugins/)
- [Docker Hub - Grafana](https://hub.docker.com/r/grafana/grafana)

