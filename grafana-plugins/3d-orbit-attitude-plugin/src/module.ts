import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, AssetMode, CoordinatesType } from './types';
import { SatelliteVisualizer } from './components/SatelliteVisualizer';

import { LocationEditor } from './LocationEditor';

export const plugin = new PanelPlugin<SimpleOptions>(SatelliteVisualizer).setPanelOptions((builder) => {
  return builder
    .addRadio({
      path: 'assetMode',
      name: 'Display mode',
      description: 'The display mode of the Asset.',
      settings: {
        options: [
          { value: AssetMode.Point, label: 'Point' },
          { value: AssetMode.Model, label: 'Model' },
        ],
      },
      defaultValue: AssetMode.Model,
    })
    .addRadio({
      path: 'coordinatesType',
      name: 'Coordinates type',
      description: 'The type of coordinates to use.',
      settings: {
        options: [
          { value: CoordinatesType.CartesianFixed, label: 'Cartesian Fixed' },
          { value: CoordinatesType.CartesianInertial, label: 'Cartesian Inertial' },
          { value: CoordinatesType.Geodetic, label: 'Geodetic' },
        ],
      },
      defaultValue: CoordinatesType.Geodetic,
    })

    .addNumberInput({
      path: 'pointSize',
      name: 'Point size',
      description: 'The size (in pixels) of the point.',
      defaultValue: 30,
      showIf: (config) => config.assetMode === AssetMode.Point,
    })
    .addColorPicker({
      path: 'pointColor',
      name: 'Point color',
      description: 'The color of the point.',
      defaultValue: 'red',
      showIf: (config) => config.assetMode === AssetMode.Point,
    })

    .addNumberInput({
      path: 'modelScale',
      name: 'Scale',
      description: 'The linear scale of the model.',
      defaultValue: 1.0,
      showIf: (config) => config.assetMode === AssetMode.Model,
    })
    .addNumberInput({
      path: 'modelMinimumPixelSize',
      name: 'Minimum pixel size',
      description:
        'The approximate minimum pixel size of the model regardless of zoom. When 0.0, no minimum size is enforced.',
      defaultValue: 128,
      showIf: (config) => config.assetMode === AssetMode.Model,
    })
    .addNumberInput({
      path: 'modelMaximumScale',
      name: 'Maximum scale',
      description: 'The maximum scale size of the model (minimum pizel size upper limit).',
      defaultValue: 20000,
      showIf: (config) => config.assetMode === AssetMode.Model,
    })
    .addNumberInput({
      path: 'modelAssetId',
      name: 'Asset ID',
      description: 'The model Cesium ion asset id.',
      defaultValue: 0,
      showIf: (config) => config.assetMode === AssetMode.Model,
    })
    .addTextInput({
      path: 'modelAssetUri',
      name: 'Asset URI',
      description: 'The URI of the glTF asset.',
      defaultValue: 'public/plugins/lucasbremond-satellitevisualizer-panel/static/models/ACRIMSAT-A.glb',
      showIf: (config) => config.assetMode === AssetMode.Model,
    })

    .addBooleanSwitch({
      path: 'trajectoryShow',
      name: 'Show trajectory',
      description: 'Show satellite trajectory.',
      defaultValue: true,
    })
    .addNumberInput({
      path: 'trajectoryWidth',
      name: 'Trajectory width',
      description: 'The width (in pixels) of the trajecotry.',
      defaultValue: 1,
      showIf: (config) => config.trajectoryShow,
    })
    .addColorPicker({
      path: 'trajectoryColor',
      name: 'Trajectory color',
      description: 'The color of the trajectory.',
      defaultValue: 'gray',
      showIf: (config) => config.trajectoryShow,
    })
    .addNumberInput({
      path: 'trajectoryDashLength',
      name: 'Trajectory dash length',
      description: 'The dash length (in pixels) of the trajectory.',
      defaultValue: 16.0,
      showIf: (config) => config.trajectoryShow,
    })

    // ============================================================
    // 🎯 MASTER ATTITUDE VISUALIZATION TOGGLE
    // ============================================================
    .addBooleanSwitch({
      path: 'showAttitudeVisualization',
      name: '🎯 Attitude Visualization',
      description: 'Enable all attitude-related visualizations (sensors, body axes, celestial grid, projections)',
      defaultValue: true,
    })

    // ============================================================
    // 🛰️ SENSOR CONES
    // ============================================================
    .addBooleanSwitch({
      path: 'showSensorCones',
      name: '🛰️ Show Sensor Cones',
      description: 'Display 3D FOV cones for all sensors attached to satellite',
      defaultValue: true,
      showIf: (config: any) => config.showAttitudeVisualization,
    })

    // ============================================================
    // 📍 SENSOR PROJECTIONS (custom features)
    // ============================================================
    .addBooleanSwitch({
      path: 'showZAxisProjection',
      name: '📍 Show Z-Axis Ground Projection',
      description: 'Display yellow line and point where the satellite Z-axis intersects Earth surface.',
      defaultValue: true,
      showIf: (config: any) => config.showAttitudeVisualization,
    })
    .addBooleanSwitch({
      path: 'showFOVFootprint',
      name: '📍 Show FOV Footprint',
      description: 'Display sensor field-of-view cone projection on Earth surface.',
      defaultValue: true,
      showIf: (config: any) => config.showAttitudeVisualization,
    })
    .addNumberInput({
      path: 'fovHalfAngle',
      name: '📍 FOV Half-Angle (degrees)',
      description: 'Sensor cone half-angle for footprint calculation (e.g., 5° for a 10° total cone).',
      defaultValue: 5,
      settings: {
        min: 1,
        max: 45,
        step: 1,
      },
      showIf: (config: any) => config.showAttitudeVisualization && config.showFOVFootprint,
    })

    // ============================================================
    // 🎯 BODY AXES (satellite reference frame)
    // ============================================================
    .addBooleanSwitch({
      path: 'showBodyAxes',
      name: '🎯 Show Body Axes',
      description: 'Display the satellite body-fixed coordinate frame (X, Y, Z axes showing orientation).',
      defaultValue: true,
      showIf: (config: any) => config.showAttitudeVisualization,
    })
    .addColorPicker({
      path: 'xAxisColor',
      name: '🎯 X-Axis Color',
      description: 'Color for the X-axis (typically red).',
      defaultValue: '#FF0000',
      showIf: (config: any) => config.showAttitudeVisualization && config.showBodyAxes,
    })
    .addColorPicker({
      path: 'yAxisColor',
      name: '🎯 Y-Axis Color',
      description: 'Color for the Y-axis (typically green).',
      defaultValue: '#00FF00',
      showIf: (config: any) => config.showAttitudeVisualization && config.showBodyAxes,
    })
    .addColorPicker({
      path: 'zAxisColor',
      name: '🎯 Z-Axis Color',
      description: 'Color for the Z-axis (typically blue).',
      defaultValue: '#0000FF',
      showIf: (config: any) => config.showAttitudeVisualization && config.showBodyAxes,
    })

    // ============================================================
    // 🌌 CELESTIAL REFERENCE GRID (custom features)
    // ============================================================
    .addBooleanSwitch({
      path: 'showRADecGrid',
      name: '🌌 Show RA/Dec Celestial Grid',
      description: 'Display Right Ascension and Declination reference lines (inertial frame, fixed relative to stars).',
      defaultValue: false,
      showIf: (config: any) => config.showAttitudeVisualization,
    })
    .addNumberInput({
      path: 'raSpacing',
      name: '🌌 RA Spacing (hours)',
      description: 'Spacing between Right Ascension meridians (1h = 15°). 1h gives 24 lines.',
      defaultValue: 1,
      settings: {
        min: 1,
        max: 6,
        step: 1,
      },
      showIf: (config: any) => config.showAttitudeVisualization && config.showRADecGrid,
    })
    .addNumberInput({
      path: 'decSpacing',
      name: '🌌 Dec Spacing (degrees)',
      description: 'Spacing between Declination parallels. 15° gives 12 lines.',
      defaultValue: 15,
      settings: {
        min: 10,
        max: 30,
        step: 5,
      },
      showIf: (config: any) => config.showAttitudeVisualization && config.showRADecGrid,
    })
    .addBooleanSwitch({
      path: 'showGridLabels',
      name: '🌌 Show Grid Labels',
      description: 'Display coordinate labels on RA/Dec grid lines',
      defaultValue: true,
      showIf: (config: any) => config.showAttitudeVisualization && config.showRADecGrid,
    })
    .addNumberInput({
      path: 'gridLabelSize',
      name: '🌌 Grid Label Size (px)',
      description: 'Font size for RA/Dec grid labels',
      defaultValue: 14,
      settings: {
        min: 8,
        max: 32,
        step: 2,
      },
      showIf: (config: any) => config.showAttitudeVisualization && config.showRADecGrid && config.showGridLabels,
    })

    .addCustomEditor({
      id: 'locations',
      path: 'locations',
      name: 'Locations',
      description: 'A list of locations to display.',
      editor: LocationEditor,
      defaultValue: [],
    })
    .addNumberInput({
      path: 'locationPointSize',
      name: 'Location point size',
      description: 'The size (in pixels) of the Location point.',
      defaultValue: 10,
      showIf: (config: any) => config.locations.length > 0,
    })
    .addColorPicker({
      path: 'locationPointColor',
      name: 'Location point color',
      description: 'The color of the Location point.',
      defaultValue: 'white',
      showIf: (config: any) => config.locations.length > 0,
    })

    .addTextInput({
      path: 'accessToken',
      name: 'Access token',
      description: 'A Cesium ion access token.',
      defaultValue: '',
    })

    .addBooleanSwitch({
      path: 'subscribeToDataHoverEvent',
      name: 'Subscribe to data hover event',
      description: 'Hover on another panel to set the current time (required shared crosshair).',
      defaultValue: true,
    })

    .addBooleanSwitch({
      path: 'showAnimation',
      name: 'Show animation',
      description: 'If enabled, the animation controller is displayed.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showTimeline',
      name: 'Show timeline',
      description: 'If enabled, the timeline is displayed.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showInfoBox',
      name: 'Show info box',
      description: 'If enabled, the info box is displayed.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showBaseLayerPicker',
      name: 'Show base layer picker',
      description: 'If enabled, a Base Layer Picker widget will be created.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showSceneModePicker',
      name: 'Show scene mode picker',
      description: 'If enabled, a Scene Mode Picker widget will be created.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showProjectionPicker',
      name: 'Show projection picker',
      description: 'If enabled, a Projection Picker widget will be created.',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showCredits',
      name: 'Show credits',
      description: 'Show Cesium credits.',
      defaultValue: true,
    });
});
