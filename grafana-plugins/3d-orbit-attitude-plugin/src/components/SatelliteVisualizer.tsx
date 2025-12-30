import React, { useEffect, useState } from 'react';
import { PanelProps, DataHoverEvent, LegacyGraphHoverEvent } from '@grafana/data';
import { AssetMode, SimpleOptions } from 'types';
import { computeFOVFootprint, computeFOVCelestialProjection, createDummyPolygonHierarchy } from 'utils/projections';
import { generateRADecGrid, generateRADecGridLabels } from 'utils/celestialGrid';
import { parseSatellites } from 'parsers/satelliteParser';
import { ParsedSatellite } from 'types/satelliteTypes';
import { parseGroundStations } from 'parsers/groundStationParser';
import { GroundStation } from 'types/groundStationTypes';
import { generateConeMesh, SENSOR_COLORS } from 'utils/sensorCone';
// TODO: Uncomment as we extract each renderer component
import {
  // SatelliteEntityRenderer,
  // SensorVisualizationRenderer,
  // BodyAxesRenderer,
  CelestialGridRenderer,
  GroundStationRenderer,
} from './entities/CesiumEntityRenderers';
import { getScaledLength } from 'utils/cameraScaling';
import { css, cx } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { Eye, EyeOff, Settings, X, ChevronRight, Menu } from 'lucide-react';

import { Viewer, Clock, Entity, PointGraphics, ModelGraphics, PathGraphics, LabelGraphics, PolylineGraphics, PolygonGraphics } from 'resium';
import {
  Ion,
  JulianDate,
  TimeInterval,
  Cartesian3,
  Quaternion,
  Transforms,
  Color,
  PolylineDashMaterialProperty,
  PolylineArrowMaterialProperty,
  IonResource,
  Cartesian2,
  Matrix3,
  CallbackProperty,
  ArcType,
  PolygonHierarchy,
  Ellipsoid,
  UrlTemplateImageryProvider,
  ProviderViewModel,
  buildModuleUrl,
} from 'cesium';

import 'cesium/Build/Cesium/Widgets/widgets.css';

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
    showCesiumCredits: css`
      display: block;
    `,
    hideCesiumCredits: css`
      display: none;
    `,
    panelContainer: css`
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    `,
    mainContent: css`
      flex: 1;
      position: relative;
      min-width: 0;
      transition: flex 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    `,
    sidebar: css`
      width: 0;
      height: 100%;
      background: rgba(30, 30, 30, 0.95);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      z-index: 999;
      
      &.open {
        width: 320px;
      }
    `,
    sidebarToggle: css`
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1001;
      padding: 8px 12px;
      background: rgba(50, 50, 50, 0.9);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      
      &:hover {
        background: rgba(70, 70, 70, 0.9);
      }
    `,
    trackingButton: css`
      position: absolute;
      top: 10px;
      right: 60px;
      z-index: 1000;
      padding: 8px 10px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      line-height: 1;
    `,
    nadirViewButton: css`
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      padding: 8px 10px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      line-height: 1;
      background: rgba(50, 50, 50, 0.9);
      color: white;
      
      &:hover {
        background: rgba(70, 70, 70, 0.9);
      }
      
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `,
    sidebarContent: css`
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `,
    tabContainer: css`
      flex-shrink: 0;
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `,
    tab: css`
      flex: 1;
      padding: 14px 16px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border-bottom: 2px solid transparent;
      
      &:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.03);
      }
      
      &.active {
        color: rgba(255, 255, 255, 0.95);
        border-bottom-color: #FF9800;
        background: rgba(255, 152, 0, 0.08);
      }
    `,
    sidebarTitle: css`
      flex-shrink: 0;
      padding: 16px;
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    `,
    satelliteList: css`
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px;
      
      &::-webkit-scrollbar {
        width: 8px;
      }
      
      &::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }
      
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        
        &:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      }
    `,
    satelliteItem: css`
      display: flex;
      align-items: flex-start;
      padding: 10px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      background: rgba(255, 255, 255, 0.02);
      transition: background 0.2s ease, border-left 0.2s ease, padding-left 0.2s ease;
      cursor: pointer;
      border-left: 3px solid transparent;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      
      &.tracked {
        background: rgba(255, 152, 0, 0.1);
        border-left: 3px solid #FF9800;
        padding-left: 5px;
      }
    `,
    visibilityToggle: css`
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      margin-right: 10px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      color: rgba(255, 255, 255, 0.7);
      padding: 0;
      transition: color 0.2s ease, transform 0.1s ease;
      
      &:hover {
        color: rgba(255, 255, 255, 1);
        transform: scale(1.1);
      }
      
      &:active {
        transform: scale(0.95);
      }
    `,
    satelliteInfo: css`
      flex: 1;
      min-width: 0;
    `,
    satelliteName: css`
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    satelliteId: css`
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    settingsButton: css`
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      margin-left: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      color: rgba(255, 255, 255, 0.6);
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:active {
        transform: scale(0.95);
      }
    `,
    modalOverlay: css`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    `,
    modal: css`
      background: rgba(30, 30, 30, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `,
    modalHeader: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    `,
    modalTitle: css`
      font-size: 16px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    `,
    modalClose: css`
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 20px;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      border-radius: 4px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 1);
      }
    `,
    modalContent: css`
      padding: 24px 20px;
      overflow-y: auto;
      flex: 1;
      color: rgba(255, 255, 255, 0.7);
    `,
    emptyState: css`
      padding: 32px 16px;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    `,
    cesiumControls: css`
      /* Move Cesium's built-in controls to the left of our custom buttons */
      .cesium-viewer-toolbar {
        right: 120px !important; /* Push to left of our buttons */
        top: 10px !important;
      }
      
      .cesium-baseLayerPickerContainer {
        right: 120px !important; /* Push to left of our buttons */
        top: 10px !important;
      }
      
      .cesium-projectionPickerContainer {
        right: 120px !important; /* Stack to the left */
        top: 10px !important;
      }
    `,
  };
};

// Grafana color label to hex mapping (for preset swatches that return labels instead of hex)
const grafanaColorMap: Record<string, string> = {
  // Reds
  'dark-red': '#8B0000', 'semi-dark-red': '#B22222', 'red': '#FF0000', 'light-red': '#FF6B6B', 'super-light-red': '#FFB3B3',
  // Oranges
  'dark-orange': '#CC5500', 'semi-dark-orange': '#E56717', 'orange': '#FFA500', 'light-orange': '#FFB84D', 'super-light-orange': '#FFD699',
  // Yellows
  'dark-yellow': '#B8860B', 'semi-dark-yellow': '#DAA520', 'yellow': '#FFFF00', 'light-yellow': '#FFFF66', 'super-light-yellow': '#FFFFB3',
  // Greens
  'dark-green': '#006400', 'semi-dark-green': '#228B22', 'green': '#00FF00', 'light-green': '#90EE90', 'super-light-green': '#C1FFC1',
  // Blues
  'dark-blue': '#00008B', 'semi-dark-blue': '#0000CD', 'blue': '#0000FF', 'light-blue': '#6B6BFF', 'super-light-blue': '#B3B3FF',
  // Purples
  'dark-purple': '#4B0082', 'semi-dark-purple': '#6A0DAD', 'purple': '#800080', 'light-purple': '#DA70D6', 'super-light-purple': '#E6B3E6',
};

// Safe color parser - handles hex, CSS names, AND Grafana's custom labels
const safeColor = (colorString: string | undefined, fallback: Color): Color => {
  if (!colorString) {
    return fallback;
  }
  
  // Check if it's a Grafana preset label (e.g., "dark-red", "light-yellow")
  const lowerColor = colorString.toLowerCase().trim();
  if (grafanaColorMap[lowerColor]) {
    return Color.fromCssColorString(grafanaColorMap[lowerColor]);
  }
  
  // Try standard CSS parsing (hex, rgb, named colors)
  try {
    const parsed = Color.fromCssColorString(colorString);
    return parsed || fallback;
  } catch {
    return fallback;
  }
};

export const SatelliteVisualizer: React.FC<Props> = ({ options, data, timeRange, width, height, eventBus }) => {
  Ion.defaultAccessToken = options.accessToken;

  const styles = useStyles2(getStyles);

  const [isLoaded, setLoaded] = useState<boolean>(false);
  const [viewerKey, setViewerKey] = useState<number>(0);
  const [isTracked, setIsTracked] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [timestamp, setTimestamp] = useState<JulianDate | null>(null);
  const [satellites, setSatellites] = useState<ParsedSatellite[]>([]);
  const [groundStations, setGroundStations] = useState<GroundStation[]>([]);
  const [trackedSatelliteId, setTrackedSatelliteId] = useState<string | null>(null);
  const [hiddenSatellites, setHiddenSatellites] = useState<Set<string>>(new Set());
  const [settingsModalSatelliteId, setSettingsModalSatelliteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'satellites' | 'groundstations'>('satellites');

  const [satelliteResource, setSatelliteResource] = useState<IonResource | string | undefined>(undefined);
  const [raLines, setRALines] = useState<Cartesian3[][]>([]);
  const [decLines, setDecLines] = useState<Cartesian3[][]>([]);
  const [gridLabels, setGridLabels] = useState<Array<{ position: Cartesian3; text: string }>>([]);
  
  // Store viewer reference for imagery setup in useEffect
  const viewerRef = React.useRef<any>(null);

  // Attitude vector configurations (can be moved to settings later)
  const attitudeVectors = React.useMemo(() => [
    { axis: new Cartesian3(1, 0, 0), color: safeColor(options.xAxisColor, Color.RED), name: 'X-axis' },
    { axis: new Cartesian3(0, 1, 0), color: safeColor(options.yAxisColor, Color.GREEN), name: 'Y-axis' },
    { axis: new Cartesian3(0, 0, 1), color: safeColor(options.zAxisColor, Color.BLUE), name: 'Z-axis' },
  ], [options.xAxisColor, options.yAxisColor, options.zAxisColor]);

  useEffect(() => {
    const timeInterval = new TimeInterval({
      start: JulianDate.fromDate(timeRange.from.toDate()),
      stop: JulianDate.addDays(JulianDate.fromDate(timeRange.to.toDate()), 1, new JulianDate()),
    });

    // https://community.cesium.com/t/correct-way-to-wait-for-transform-to-be-ready/24800
    Transforms.preloadIcrfFixed(timeInterval).then(() => setLoaded(true));
  }, [timeRange]);

  // Parse satellite data from DataFrames
  // Main data parsing: extract satellite position, orientation, availability, and sensors
  // Note: parseSatellites() only uses options.coordinatesType internally, but we pass full options object for type compatibility
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (data.series.length > 0) {
      console.log(`🛰️ Parsing ${data.series.length} satellite(s)...`);
      
      try {
        const parsedSatellites = parseSatellites(data.series, options);
        setSatellites(parsedSatellites);
        
        // Parse ground stations
        const parsedGroundStations = parseGroundStations(data);
        setGroundStations(parsedGroundStations);
        console.log(`📡 Parsed ${parsedGroundStations.length} ground station(s)`);
        
        // Set timestamp from first satellite's first data point
        if (parsedSatellites.length > 0) {
          const firstSatellite = parsedSatellites[0];
          const firstInterval = firstSatellite.availability.get(0);
          if (firstInterval) {
            setTimestamp(firstInterval.start);
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse satellites:', error);
        setSatellites([]);
        setGroundStations([]);
      }
    } else {
      setSatellites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, options.coordinatesType, isLoaded]); // Only coordinatesType affects parsing; other options are for rendering only
  
  // Default to tracking first satellite
  useEffect(() => {
    if (satellites.length > 0 && !trackedSatelliteId) {
      setTrackedSatelliteId(satellites[0].id);
      console.log(`🎯 Defaulting to track: ${satellites[0].name}`);
    }
  }, [satellites, trackedSatelliteId]);

  useEffect(() => {
    Ion.defaultAccessToken = options.accessToken;
  }, [options.accessToken]);

  // Fly camera to satellite with "from above" nadir view
  const flyToSatelliteNadirView = (satelliteId: string, duration = 0.5, distance = 4) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) {
      return;
    }

    const satellite = satellites.find(s => s.id === satelliteId);
    if (!satellite) {
      return;
    }

    // Use current viewer clock time (not the timestamp state which may be stale)
    const currentTime = viewer.clock.currentTime;
    const satPos = satellite.position.getValue(currentTime);
    if (!satPos) {
      return;
    }

    // Calculate radial direction (Earth center → Satellite)
    const radialDirection = Cartesian3.subtract(satPos, Cartesian3.ZERO, new Cartesian3());
    Cartesian3.normalize(radialDirection, radialDirection);

    // Position camera at specified distance above satellite along radial line
    const cameraPosition = Cartesian3.add(
      satPos,
      Cartesian3.multiplyByScalar(radialDirection, distance, new Cartesian3()),
      new Cartesian3()
    );

    // Camera looks at satellite (down toward Earth)
    viewer.camera.flyTo({
      destination: cameraPosition,
      orientation: {
        direction: Cartesian3.negate(radialDirection, new Cartesian3()), // Point toward Earth
        up: Cartesian3.UNIT_Z, // Keep "up" aligned with Earth's axis
      },
      duration: duration,
    });

    console.log(`🚀 Flying to ${satellite.name} - Nadir View (${distance}m above, ${duration}s)`);
  };

  // Handle tracking mode toggle with nadir transition
  const handleTrackingToggle = () => {
    if (isTracked && trackedSatelliteId) {
      // Going from tracked → free: fly to nadir first with zoom limit respected (2x Earth radius)
      const earthRadius = 6378137; // meters
      const safeDistance = earthRadius * 2; // ~12,756 km (within 3x limit)
      flyToSatelliteNadirView(trackedSatelliteId, 0.2, safeDistance);
      
      // Wait for animation + buffer time before activating free camera
      setTimeout(() => {
        setIsTracked(false);
        console.log('🌍 Free camera mode activated');
      }, 500); // 0.5 second wait
    } else {
      // Going from free → tracked: immediate toggle
      setIsTracked(true);
    }
  };

  // Satellite visibility toggle functions
  const toggleSatelliteVisibility = (satelliteId: string) => {
    setHiddenSatellites(prev => {
      const next = new Set(prev);
      if (next.has(satelliteId)) {
        next.delete(satelliteId);
        console.log(`👁️ Showing satellite: ${satelliteId}`);
      } else {
        next.add(satelliteId);
        console.log(`🙈 Hiding satellite: ${satelliteId}`);
      }
      return next;
    });
  };

  const isSatelliteVisible = (satelliteId: string) => {
    return !hiddenSatellites.has(satelliteId);
  };

  // Handle satellite selection for tracking
  const handleSatelliteClick = (satelliteId: string) => {
    if (isTracked) {
      // Tracked mode: just change the tracked satellite
      setTrackedSatelliteId(satelliteId);
      console.log(`🎯 Tracking switched to: ${satelliteId}`);
    } else {
      // Free mode: update tracked satellite, fly to nadir with zoom limit respected (2x Earth radius)
      setTrackedSatelliteId(satelliteId);
      const earthRadius = 6378137; // meters
      const safeDistance = earthRadius * 2; // ~12,756 km (within 3x limit)
      flyToSatelliteNadirView(satelliteId, 0.5, safeDistance);
      console.log(`🌍 Free camera flying to: ${satelliteId}`);
    }
  };

  useEffect(() => {
    if (options.modelAssetId) {
      IonResource.fromAssetId(options.modelAssetId, { accessToken: options.accessToken })
        .then((resource) => {
          setSatelliteResource(resource);
        })
        .catch((error) => {
          throw new Error(`Error loading Ion Resource of Model: [${error}].`);
        });
    } else if (options.modelAssetUri) {
      setSatelliteResource(options.modelAssetUri);
    } else {
      setSatelliteResource(undefined);
    }
  }, [options.modelAssetId, options.modelAssetUri, options.accessToken]);

  // Only remount Viewer when options that affect the Viewer component itself change
  // Entity-level options (projections, trajectory, etc.) don't need a full remount
  useEffect(() => setViewerKey((prevKey) => prevKey + 1), [
    options.showAnimation,
    options.showTimeline,
    options.showInfoBox,
    options.showBaseLayerPicker,
    options.showSceneModePicker,
    options.showProjectionPicker,
    options.accessToken,
  ]);

  // Generate RA/Dec celestial grid
  useEffect(() => {
    if (!options.showRADecGrid || !timestamp) {
      setRALines([]);
      setDecLines([]);
      setGridLabels([]);
      return;
    }

    const celestialRadius = Ellipsoid.WGS84.maximumRadius * 100; // 100x Earth radius

    const { raLines, decLines } = generateRADecGrid({
      raSpacing: options.raSpacing,
      decSpacing: options.decSpacing,
      celestialRadius,
      referenceTime: timestamp,
    });

    setRALines(raLines);
    setDecLines(decLines);

    // Generate labels if enabled
    if (options.showGridLabels) {
      const labels = generateRADecGridLabels({
        raSpacing: options.raSpacing,
        decSpacing: options.decSpacing,
        celestialRadius,
        referenceTime: timestamp,
      });
      setGridLabels(labels);
    } else {
      setGridLabels([]);
    }
  }, [options.showRADecGrid, options.raSpacing, options.decSpacing, options.showGridLabels, timestamp]);

  // Setup default imagery once when Viewer is created (for persistence)
  useEffect(() => {
    // Only run if viewer exists (guard against race conditions)
    if (!viewerRef.current?.cesiumElement) {
      return;
    }
    
    const viewer = viewerRef.current.cesiumElement;
    const imageryLayers = viewer.imageryLayers;
    
    // Remove default imagery
    if (imageryLayers.length > 0) {
      imageryLayers.removeAll();
    }
    
    // Set default to Carto Dark Matter (no labels)
    const cartoNoLabelsProvider = new UrlTemplateImageryProvider({
      url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png',
      credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
    });
    imageryLayers.addImageryProvider(cartoNoLabelsProvider);
  }, [viewerKey]); // Run when Viewer is created/remounted

  useEffect(() => {
    if (!options.subscribeToDataHoverEvent) {
      return;
    }

    const dataHoverSubscriber = eventBus.getStream(DataHoverEvent).subscribe((event) => {
      if (event?.payload?.point?.time) {
        setTimestamp(JulianDate.fromDate(new Date(event.payload.point.time)));
      }
    });

    const graphHoverSubscriber = eventBus.getStream(LegacyGraphHoverEvent).subscribe((event) => {
      if (event?.payload?.point?.time) {
        setTimestamp(JulianDate.fromDate(new Date(event.payload.point.time)));
      }
    });

    return () => {
      dataHoverSubscriber.unsubscribe();
      graphHoverSubscriber.unsubscribe();
    };
  }, [eventBus, options.subscribeToDataHoverEvent]);

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <div className={styles.panelContainer}>
        {/* Main content area - shrinks when sidebar opens */}
        <div className={cx(styles.mainContent, styles.cesiumControls)}>
          {/* Tracking Mode Toggle Button */}
          <button
            className={styles.trackingButton}
            onClick={handleTrackingToggle}
            title={isTracked ? 'Tracking ON' : 'Free Camera'}
            style={{
              backgroundColor: isTracked ? '#4CAF50' : '#2196F3',
              color: 'white',
            }}
          >
            {isTracked ? '🎯' : '🌍'}
          </button>
          
          {/* Nadir View Button - Fly to satellite from above */}
          {options.showNadirViewButton && (
            <button
              className={styles.nadirViewButton}
              onClick={() => {
                if (trackedSatelliteId) {
                  flyToSatelliteNadirView(trackedSatelliteId);
                }
              }}
              disabled={!trackedSatelliteId}
              title={trackedSatelliteId ? 'Fly to satellite (nadir view)' : 'No satellite selected'}
            >
              🛰️
            </button>
          )}
          
          {/* Sidebar Toggle Button */}
          <button
            className={styles.sidebarToggle}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <Menu size={20} />}
          </button>
      
          <Viewer
        full
        animation={options.showAnimation}
        timeline={options.showTimeline}
        infoBox={options.showInfoBox}
        baseLayerPicker={options.showBaseLayerPicker}
        sceneModePicker={options.showSceneModePicker}
        projectionPicker={options.showProjectionPicker}
        navigationHelpButton={false}
        fullscreenButton={false}
        geocoder={false}
        homeButton={false}
        key={viewerKey}
        creditContainer="cesium-credits"
        ref={(ref) => {
          // Store ref for use in useEffect (imagery setup)
          viewerRef.current = ref;
          
          if (ref?.cesiumElement) {
            const viewer = ref.cesiumElement;
            const controller = viewer.scene.screenSpaceCameraController;
            const camera = viewer.scene.camera;
            
            // WGS84 Earth radius
            const earthRadius = 6378137; // meters
            
            // Controller limit: 3x Earth radius (works smoothly for tracked mode)
            controller.maximumZoomDistance = earthRadius * 3; // ~19,134 km
            controller.enableCollisionDetection = false;
            
            // Hard camera height limit: 5x Earth radius (catches free camera mode)
            const hardMaxZoomDistance = earthRadius * 5; // ~31,890 km
            
            // Add a post-render listener to enforce the hard camera height limit
            // This primarily affects free camera mode, as tracked mode stops at 3R via controller
            viewer.scene.postRender.addEventListener(() => {
              const cameraHeight = camera.positionCartographic.height;
              if (cameraHeight > hardMaxZoomDistance) {
                // Force camera back within hard limit
                const direction = camera.direction.clone();
                const up = camera.up.clone();
                const position = Cartesian3.fromDegrees(
                  camera.positionCartographic.longitude * (180 / Math.PI),
                  camera.positionCartographic.latitude * (180 / Math.PI),
                  hardMaxZoomDistance
                );
                camera.setView({
                  destination: position,
                  orientation: {
                    direction: direction,
                    up: up
                  }
                });
              }
            });
            
            // Extend camera far clipping plane for celestial grid visibility
            const celestialDistance = earthRadius * 100;
            camera.frustum.far = celestialDistance * 3;
            
            // Add Carto options to BaseLayerPicker (runs in ref callback for guaranteed timing)
            // Note: Default imagery setup is in useEffect to prevent reset on re-renders
            if (viewer.baseLayerPicker) {
              const vm = viewer.baseLayerPicker.viewModel;
              
              // Check if already added (avoid duplicates)
              const hasCartoNoLabels = vm.imageryProviderViewModels.some((p: any) => p.name === 'Carto Dark Matter (No Labels)');
              
              if (!hasCartoNoLabels) {
                // Find Stadia Dark icon to reuse
                const stadiaViewModel = vm.imageryProviderViewModels.find(
                  (p: any) => p.name === 'Stadia Alidade Smooth Dark'
                );
                const darkIconUrl = stadiaViewModel?.iconUrl || buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png');
                
                // Create Carto Dark Matter (No Labels) option
                const cartoNoLabelsViewModel = new ProviderViewModel({
                  name: 'Carto Dark Matter (No Labels)',
                  iconUrl: darkIconUrl,
                  tooltip: 'Dark theme map without city/country labels - clean view with borders only',
                  creationFunction: () => new UrlTemplateImageryProvider({
                    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png',
                    credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
                  }),
                });
                
                // Create Carto Dark Matter (With Labels) option
                const cartoWithLabelsViewModel = new ProviderViewModel({
                  name: 'Carto Dark Matter (With Labels)',
                  iconUrl: darkIconUrl,
                  tooltip: 'Dark theme map with city/country labels',
                  creationFunction: () => new UrlTemplateImageryProvider({
                    url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
                    credit: 'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
                  }),
                });
                
                // Add both options to the picker
                vm.imageryProviderViewModels.push(cartoNoLabelsViewModel, cartoWithLabelsViewModel);
                
                // Set the selected imagery to Carto Dark Matter (No Labels) - only on first add
                const cartoNoLabelsVM = vm.imageryProviderViewModels.find(
                  (p: any) => p.name === 'Carto Dark Matter (No Labels)'
                );
                
                if (cartoNoLabelsVM) {
                  vm.selectedImagery = cartoNoLabelsVM;
                }
              }
            }
          }
        }}
      >
        {timestamp && <Clock currentTime={timestamp} />}
        
        {/* Main Satellite Entities - Multiple satellites support */}
        {satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) => (
          <Entity
            key={satellite.id}
            id={satellite.id}
            name={satellite.name}
            availability={satellite.availability}
            position={satellite.position}
            orientation={satellite.orientation}
            tracked={isTracked && trackedSatelliteId === satellite.id}
          >
            {options.assetMode === AssetMode.Point && (
              <PointGraphics pixelSize={options.pointSize} color={Color.fromCssColorString(options.pointColor)} />
            )}
            {options.assetMode === AssetMode.Model && satelliteResource && (
              <ModelGraphics
                uri={satelliteResource}
                scale={options.modelScale}
                minimumPixelSize={options.modelMinimumPixelSize}
                maximumScale={options.modelMaximumScale}
              />
            )}
            {options.trajectoryShow && (
              <PathGraphics
                width={options.trajectoryWidth}
                material={
                  new PolylineDashMaterialProperty({
                    color: Color.fromCssColorString(options.trajectoryColor),
                    dashLength: options.trajectoryDashLength,
                  })
                }
              />
            )}
          </Entity>
        ))}
        {/* Body Axes (X/Y/Z attitude vectors) - Per-satellite */}
        {options.showAttitudeVisualization && options.showBodyAxes && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) =>
          attitudeVectors.map((vector, index) => (
            <Entity 
              availability={satellite.availability} 
              key={`${satellite.id}-attitude-vector-${index}`}
            >
              <PolylineGraphics
                positions={new CallbackProperty((time) => {
                  const pos = satellite.position.getValue(time);
                  const orient = satellite.orientation.getValue(time);
                  if (!pos || !orient) {
                    return [];
                  }
                  
                  // Calculate dynamic vector length based on tracking mode and camera distance
                  const viewer = viewerRef.current?.cesiumElement;
                  const isThisSatelliteTracked = isTracked && trackedSatelliteId === satellite.id;
                  const vectorLength = getScaledLength(50000, isThisSatelliteTracked, viewer, pos);
                  
                  // Rotate axis by satellite orientation to get direction in ECEF
                  const rotationMatrix = Matrix3.fromQuaternion(orient);
                  const axisECEF = Matrix3.multiplyByVector(rotationMatrix, vector.axis, new Cartesian3());
                  
                  // Calculate endpoint with dynamic length
                  const endPos = Cartesian3.add(
                    pos,
                    Cartesian3.multiplyByScalar(axisECEF, vectorLength, new Cartesian3()),
                    new Cartesian3()
                  );
                  
                  return [pos, endPos];
                }, false)}
                width={10}
                material={new PolylineArrowMaterialProperty(vector.color)}
                arcType={ArcType.NONE}
              />
            </Entity>
          ))
        )}
        
        {/* Sensor FOV Cones - Per-satellite sensors */}
        {options.showAttitudeVisualization && options.showSensorCones && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) =>
          satellite.sensors.map((sensor, idx) => (
            <Entity 
              key={`${satellite.id}-sensor-cone-${sensor.id}`}
              name={`${satellite.name} - ${sensor.name} (FOV: ${sensor.fov}°)`}
              availability={satellite.availability}
            >
              <PolylineGraphics
                positions={new CallbackProperty((time) => {
                  const satPos = satellite.position.getValue(time);
                  const satOrient = satellite.orientation.getValue(time);
                  if (!satPos || !satOrient) {
                    return [];
                  }
                  
                  // Sensor body frame orientation (constant, relative to satellite)
                  const sensorBodyQuat = new Quaternion(
                    sensor.orientation.qx,
                    sensor.orientation.qy,
                    sensor.orientation.qz,
                    sensor.orientation.qw
                  );
                  
                  // Compute sensor world orientation: q_world = q_satellite × q_sensor_body
                  const sensorWorldQuat = Quaternion.multiply(
                    satOrient,
                    sensorBodyQuat,
                    new Quaternion()
                  );
                  
                  // Get sensor pointing direction (Z-axis in sensor frame)
                  const rotMatrix = Matrix3.fromQuaternion(sensorWorldQuat);
                  const sensorDir = Matrix3.multiplyByVector(
                    rotMatrix,
                    new Cartesian3(0, 0, 1),  // Z-axis
                    new Cartesian3()
                  );
                  Cartesian3.normalize(sensorDir, sensorDir);
                  
                  // Generate cone mesh with camera-scaled length
                  const viewer = viewerRef.current?.cesiumElement;
                  const isThisSatelliteTracked = isTracked && trackedSatelliteId === satellite.id;
                  const coneLength = getScaledLength(50000, isThisSatelliteTracked, viewer, satPos);
                  return generateConeMesh(satPos, sensorDir, sensor.fov, coneLength, 16);
                  
                }, false)}
                width={1.5}
                material={Color.fromBytes(
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].r,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].g,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].b,
                  Math.floor(SENSOR_COLORS[idx % SENSOR_COLORS.length].a * 255)
                )}
                arcType={ArcType.NONE}
              />
            </Entity>
          ))
        )}
        
        {/* Sensor FOV Footprints - Per-satellite, per-sensor ground projections */}
        {options.showAttitudeVisualization && options.showFOVFootprint && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) =>
          satellite.sensors.map((sensor, idx) => (
            <Entity 
              key={`${satellite.id}-sensor-footprint-${sensor.id}`}
              name={`${satellite.name} - ${sensor.name} Footprint`}
              availability={satellite.availability}
            >
              <PolygonGraphics
                hierarchy={new CallbackProperty((time) => {
                  const satPos = satellite.position.getValue(time);
                  const satOrient = satellite.orientation.getValue(time);
                  if (!satPos || !satOrient) {
                    return createDummyPolygonHierarchy();
                  }

                  // Sensor body frame orientation (constant, relative to satellite)
                  const sensorBodyQuat = new Quaternion(
                    sensor.orientation.qx,
                    sensor.orientation.qy,
                    sensor.orientation.qz,
                    sensor.orientation.qw
                  );
                  
                  // Compute sensor world orientation: q_world = q_satellite × q_sensor_body
                  const sensorWorldQuat = Quaternion.multiply(
                    satOrient,
                    sensorBodyQuat,
                    new Quaternion()
                  );
                  
                  // Compute FOV footprint using sensor's FOV angle and orientation
                  const footprintPoints = computeFOVFootprint(
                    satPos,
                    sensorWorldQuat,
                    sensor.fov / 2  // computeFOVFootprint expects half-angle
                  );

                  // Return points, or dummy triangle if cone doesn't hit Earth
                  return footprintPoints.length > 0 
                    ? new PolygonHierarchy(footprintPoints)
                    : createDummyPolygonHierarchy();
                }, false) as any}
                material={Color.fromBytes(
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].r,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].g,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].b,
                  Math.floor(0.3 * 255)  // 30% alpha for footprint
                )}
                outline={true}
                outlineColor={Color.fromBytes(
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].r,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].g,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].b,
                  255
                )}
                outlineWidth={2}
                height={0}
              />
            </Entity>
          ))
        )}
        
        {/* Sensor FOV Celestial Projections - Per-satellite sky region visualization */}
        {options.showAttitudeVisualization && options.showCelestialFOV && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) =>
          satellite.sensors.map((sensor, idx) => (
            <Entity 
              key={`${satellite.id}-sensor-celestial-${sensor.id}`}
              name={`${satellite.name} - ${sensor.name} Celestial FOV`}
              availability={satellite.availability}
            >
              <PolygonGraphics
                hierarchy={new CallbackProperty((time) => {
                  const satPos = satellite.position.getValue(time);
                  const satOrient = satellite.orientation.getValue(time);
                  if (!satPos || !satOrient) {
                    return createDummyPolygonHierarchy();
                  }

                  // Sensor body frame orientation
                  const sensorBodyQuat = new Quaternion(
                    sensor.orientation.qx,
                    sensor.orientation.qy,
                    sensor.orientation.qz,
                    sensor.orientation.qw
                  );
                  
                  // Compute sensor world orientation
                  const sensorWorldQuat = Quaternion.multiply(
                    satOrient,
                    sensorBodyQuat,
                    new Quaternion()
                  );
                  
                  // Celestial sphere radius (same as RA/Dec grid)
                  const celestialRadius = Ellipsoid.WGS84.maximumRadius * 100;
                  
                  // Compute celestial projection
                  const celestialPoints = computeFOVCelestialProjection(
                    satPos,
                    sensorWorldQuat,
                    sensor.fov / 2,  // Half-angle
                    celestialRadius
                  );

                  return celestialPoints.length > 0 
                    ? new PolygonHierarchy(celestialPoints)
                    : createDummyPolygonHierarchy();
                }, false) as any}
                material={Color.fromBytes(
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].r,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].g,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].b,
                  Math.floor(0.3 * 255)  // 30% alpha for transparency
                )}
                outline={true}
                outlineColor={Color.fromBytes(
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].r,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].g,
                  SENSOR_COLORS[idx % SENSOR_COLORS.length].b,
                  255
                )}
                outlineWidth={1}  // Match celestial grid line width
                perPositionHeight={true}
              />
            </Entity>
          ))
        )}
        
        {/* RA/Dec Celestial Grid */}
        {options.showAttitudeVisualization && options.showRADecGrid && (
          <CelestialGridRenderer
            options={options}
            raLines={raLines}
            decLines={decLines}
            gridLabels={gridLabels}
          />
        )}
        {options.locations.map((location, index) => (
          <Entity
            name={location.name}
            position={Cartesian3.fromDegrees(location.longitude, location.latitude, location.altitude)}
            key={index}
          >
            <PointGraphics
              pixelSize={options.locationPointSize}
              color={Color.fromCssColorString(options.locationPointColor)}
            />
            <LabelGraphics text={location.name} pixelOffset={new Cartesian2(30.0, 30.0)} />
          </Entity>
        ))}

        {/* Ground Stations */}
        {groundStations.map((gs) => (
          <GroundStationRenderer key={gs.id} groundStation={gs} />
        ))}
      </Viewer>

          <div
            id="cesium-credits"
            className={options.showCredits ? styles.showCesiumCredits : styles.hideCesiumCredits}
          ></div>
        </div>

        {/* Sidebar - Satellite & Ground Station Lists */}
        <div className={cx(styles.sidebar, isSidebarOpen && 'open')}>
          <div className={styles.sidebarContent}>
            {/* Tab Navigation */}
            <div className={styles.tabContainer}>
              <button
                className={cx(styles.tab, activeTab === 'satellites' && 'active')}
                onClick={() => setActiveTab('satellites')}
              >
                Satellites
              </button>
              <button
                className={cx(styles.tab, activeTab === 'groundstations' && 'active')}
                onClick={() => setActiveTab('groundstations')}
              >
                Ground Stations
              </button>
            </div>

            {/* Satellites Tab Content */}
            {activeTab === 'satellites' && (
              <>
                {satellites.length === 0 ? (
                  <div className={styles.emptyState}>No satellites available</div>
                ) : (
                  <div className={styles.satelliteList}>
                    {satellites.map((satellite) => (
                      <div 
                        key={satellite.id} 
                        className={cx(
                          styles.satelliteItem,
                          trackedSatelliteId === satellite.id && 'tracked'
                        )}
                        onClick={() => handleSatelliteClick(satellite.id)}
                      >
                        <button
                          className={styles.visibilityToggle}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSatelliteVisibility(satellite.id);
                          }}
                          title={isSatelliteVisible(satellite.id) ? 'Hide satellite' : 'Show satellite'}
                        >
                          {isSatelliteVisible(satellite.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        
                        <div className={styles.satelliteInfo}>
                          <div className={styles.satelliteName} title={satellite.name}>
                            {satellite.name}
                          </div>
                          <div className={styles.satelliteId} title={satellite.id}>
                            {satellite.id}
                          </div>
                        </div>
                        
                        <button
                          className={styles.settingsButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettingsModalSatelliteId(satellite.id);
                          }}
                          title="Satellite settings"
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Ground Stations Tab Content */}
            {activeTab === 'groundstations' && (
              <>
                {groundStations.length === 0 ? (
                  <div className={styles.emptyState}>No ground stations available</div>
                ) : (
                  <div className={styles.satelliteList}>
                    {groundStations.map((gs) => (
                      <div 
                        key={gs.id} 
                        className={styles.satelliteItem}
                      >
                        <button
                          className={styles.visibilityToggle}
                          onClick={(e) => e.stopPropagation()}
                          title="Ground station visibility (coming soon)"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <div className={styles.satelliteInfo}>
                          <div className={styles.satelliteName} title={gs.name}>
                            {gs.name}
                          </div>
                          <div className={styles.satelliteId} title={gs.id}>
                            {gs.id}
                          </div>
                        </div>
                        
                        <button
                          className={styles.settingsButton}
                          onClick={(e) => e.stopPropagation()}
                          title="Ground station settings (coming soon)"
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {settingsModalSatelliteId && (
          <div 
            className={styles.modalOverlay}
            onClick={() => setSettingsModalSatelliteId(null)}
          >
            <div 
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <Settings size={18} />
                  {satellites.find(sat => sat.id === settingsModalSatelliteId)?.name || 'Satellite Settings'}
                </h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setSettingsModalSatelliteId(null)}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <p style={{ textAlign: 'center', padding: '40px 20px' }}>
                  Settings panel coming soon...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
