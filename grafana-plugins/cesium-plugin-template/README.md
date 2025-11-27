# Cesium Plugin Template

> ⚠️ **TEMPLATE REFERENCE - DO NOT MODIFY DIRECTLY**  
> This is a clean reference template for creating Cesium-based Grafana plugins.  
> Copy this folder to create new plugin variants.

## Attribution

**Based on**: [satellite-visualizer](https://github.com/lucas-bremond/satellite-visualizer) by Lucas Brémond  
**License**: Apache 2.0  
**Purpose**: Template for creating custom satellite visualization plugins

---

# Original: Satellite Visualizer

A satellite visualization panel plugin for Grafana based on [CesiumJS](https://cesium.com/platform/cesiumjs/).

![screenshot.png](./src/img/screenshot.png)

## Settings

1. Set `Access token` with a [Cesium ion access token](https://cesium.com/learn/ion/cesium-ion-access-tokens/) ([security best practices](https://cesium.com/learn/ion/cesium-ion-access-tokens/#security-best-practices-for-tokens)).
2. (optional) Set `Asset ID` with ID of the [glTF](https://www.khronos.org/gltf/) asset stored in Cesium ion.

## Data

This plugin needs a data series with 8 columns:

| Column # | Description                                             |
| -------- | ------------------------------------------------------- |
| 1        | Time                                                    |
| 2        | Longitude (`deg`) / x_ECI (`m`) / x_ECEF (`m`)          |
| 3        | Latitude (`deg`) / y_ECI (`m`) / y_ECEF (`m`)           |
| 4        | Altitude (`m`) / z_ECI (`m`) / z_ECEF (`m`)             |
| 5-8      | Orientation in inertial frame (`x, y, z, s` quaternion) |

![data.png](./src/img/data.png)

## Usage as Template

### Creating a New Plugin from This Template:

```bash
# 1. Copy this template folder
cp -r cesium-plugin-template/ my-new-plugin/

# 2. Customize your plugin
cd my-new-plugin/
# - Edit package.json: change name, version, description
# - Edit src/plugin.json: change id and name
# - Edit README.md: describe your plugin

# 3. Install dependencies
npm install

# 4. Build
npm run build

# 5. Start developing!
npm run dev
```

### ⚠️ Keep This Template Clean
- **DO NOT** run `npm install` in this template folder
- **DO NOT** run `npm run build` in this template folder
- Keep it clean for easy copying to create new variants

---

## Development (Original Instructions)

To start the development environment container:

```shell
make dev
```

Access the started Grafana instance at <http://localhost:3000>.

## Release

To create a new release, run the following to bump the version in `package.json`:

```shell
npm version minor
```

Then push the tagged commit, to let the CI handle it:

```shell
git push origin main --follow-tags
```

## References

- [CesiumJS](https://cesium.com/platform/cesiumjs/)
- [Resium](https://resium.reearth.io/)
