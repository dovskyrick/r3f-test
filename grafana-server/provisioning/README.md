# Grafana Provisioning

This directory contains Grafana provisioning configuration for automatic setup.

## What's Provisioned

- **Datasources**: TestData DB (pre-configured)
- **Dashboards**: Satellite Visualizer Demo (auto-created on startup)

## How It Works

When Grafana starts, it automatically:
1. Creates the TestData datasource
2. Loads the demo dashboard with the 3D satellite visualization panel
3. Makes everything ready for users to just add data and their Cesium token

## Files

- `datasources/testdata.yml` - TestData DB configuration
- `dashboards/dashboard.yml` - Dashboard provider configuration  
- `dashboards/satellite-demo.json` - Pre-configured demo dashboard

## Customization

You can edit these files to customize the default setup. Changes take effect on next `docker-compose up`.

