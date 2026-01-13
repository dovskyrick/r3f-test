/**
 * SatelliteVisualizer.tsx
 * 
 * Main panel component for 3D satellite visualization using CesiumJS.
 * 
 * ARCHITECTURE (Post-Refactoring, Dec 31 2025):
 * This component is now focused on orchestration and state management.
 * All Cesium entity rendering logic has been extracted to:
 * - ./entities/CesiumEntityRenderers.tsx
 * 
 * RESPONSIBILITIES:
 * ✓ State management (satellites, tracking, visibility, UI toggles)
 * ✓ Cesium viewer initialization and configuration
 * ✓ Camera controls (tracking mode, free camera, nadir view)
 * ✓ UI controls (sidebar, buttons, modals)
 * ✓ Data parsing and preprocessing
 * ✓ Coordinating child renderer components
 * 
 * RENDERING DELEGATION:
 * All 3D entity rendering is delegated to specialized components:
 * - SatelliteEntityRenderer: Main satellite model/point + trajectory
 * - SensorVisualizationRenderer: Sensor cones + FOV projections
 * - BodyAxesRenderer: Satellite body axes (X/Y/Z)
 * - CelestialGridRenderer: RA/Dec celestial coordinate grid
 * - GroundStationRenderer: Ground station markers
 * 
 * See: grafana-plugins/plans-broad-scope/25-12-december/31-refactoring-complete-summary.md
 */

import React, { useEffect, useState } from 'react';
import { PanelProps, DataHoverEvent, LegacyGraphHoverEvent } from '@grafana/data';
import { SimpleOptions } from 'types';
import { generateRADecGrid, generateRADecGridLabels } from 'utils/celestialGrid';
import { parseSatellites } from 'parsers/satelliteParser';
import { ParsedSatellite } from 'types/satelliteTypes';
import { parseGroundStations } from 'parsers/groundStationParser';
import { GroundStation } from 'types/groundStationTypes';
import {
  SatelliteEntityRenderer,
  SensorVisualizationRenderer,
  BodyAxesRenderer,
  CelestialGridRenderer,
  GroundStationRenderer,
  UncertaintyEllipsoidRenderer,
  CelestialBodiesRenderer,
} from './entities/CesiumEntityRenderers';
import { css, cx } from '@emotion/css';
import { useStyles2, ColorPicker } from '@grafana/ui';
import { Eye, EyeOff, Settings, X, ChevronRight, Menu, Video, ChevronDown } from 'lucide-react';

import { Viewer, Clock, Entity, PointGraphics, LabelGraphics } from 'resium';
import {
  Ion,
  JulianDate,
  TimeInterval,
  Cartesian3,
  Transforms,
  Color,
  IonResource,
  Cartesian2,
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
    topLeftControlsContainer: css`
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      display: flex;
      gap: 8px;
    `,
    dropdownButton: css`
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(50, 50, 50, 0.9);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(70, 70, 70, 0.9);
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:active {
        transform: scale(0.98);
      }
    `,
    dropdownMenu: css`
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: rgba(40, 40, 40, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      min-width: 200px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      z-index: 1001;
    `,
    dropdownItem: css`
      padding: 10px 16px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      &.active {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
    `,
    dropdownItemLabel: css`
      display: block;
      font-weight: 500;
      margin-bottom: 2px;
    `,
    dropdownItemDescription: css`
      display: block;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
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
      
      /* Remove focus outline (we handle ESC, don't need visual focus indicator) */
      &:focus {
        outline: none;
      }
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
      max-height: calc(80vh - 120px);
    `,
    settingRow: css`
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      
      &:last-child {
        border-bottom: none;
      }
    `,
    settingLabel: css`
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      cursor: pointer;
      user-select: none;
      
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #4CAF50;
      }
      
      span {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }
    `,
    settingDescription: css`
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-left: 30px;
      margin-top: 4px;
      line-height: 1.4;
    `,
    settingsGroup: css`
      margin-bottom: 24px;
      
      &:last-child {
        margin-bottom: 0;
      }
    `,
    settingsGroupTitle: css`
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `,
    sensorColorRow: css`
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    `,
    sensorColorRowVertical: css`
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    `,
    sensorNameRow: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    `,
    colorPickerWrapper: css`
      width: 100%;
    `,
    resetButton: css`
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }
    `,
    // DEPRECATED: Old color preview box (commented out for potential future use)
    // colorPreview: css`
    //   width: 32px;
    //   height: 32px;
    //   border-radius: 4px;
    //   border: 2px solid rgba(255, 255, 255, 0.2);
    //   flex-shrink: 0;
    //   cursor: pointer;
    //   transition: border-color 0.2s;
    //   
    //   &:hover {
    //     border-color: rgba(255, 255, 255, 0.5);
    //   }
    // `,
    sensorColorInfo: css`
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    `,
    sensorName: css`
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    // DEPRECATED: Old hex value display (commented out)
    // sensorColorValue: css`
    //   font-size: 12px;
    //   color: rgba(255, 255, 255, 0.5);
    //   font-family: 'Courier New', monospace;
    // `,
    // DEPRECATED: Old color picker container with Done/Reset buttons (commented out)
    // colorPickerContainer: css`
    //   margin-top: 12px;
    //   padding: 12px;
    //   background: rgba(0, 0, 0, 0.3);
    //   border-radius: 4px;
    //   border: 1px solid rgba(255, 255, 255, 0.1);
    // `,
    // colorPickerActions: css`
    //   display: flex;
    //   gap: 8px;
    //   margin-top: 12px;
    //   justify-content: flex-end;
    // `,
    // colorPickerButton: css`
    //   padding: 6px 12px;
    //   background: rgba(255, 255, 255, 0.1);
    //   border: 1px solid rgba(255, 255, 255, 0.2);
    //   border-radius: 4px;
    //   color: rgba(255, 255, 255, 0.9);
    //   font-size: 12px;
    //   cursor: pointer;
    //   transition: all 0.2s;
    //   
    //   &:hover {
    //     background: rgba(255, 255, 255, 0.2);
    //     border-color: rgba(255, 255, 255, 0.3);
    //   }
    //   
    //   &:active {
    //     transform: scale(0.98);
    //   }
    // `,
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
  const [hiddenGroundStations, setHiddenGroundStations] = useState<Set<string>>(new Set());
  const [settingsModalSatelliteId, setSettingsModalSatelliteId] = useState<string | null>(null);
  const [settingsModalGroundStationId, setSettingsModalGroundStationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'satellites' | 'groundstations'>('satellites');
  
  // New dropdown states for Mode and Camera controls
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState<boolean>(false);
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<'satellite' | 'earth' | 'celestial'>('satellite');
  const [selectedCameraView, setSelectedCameraView] = useState<'nadir' | 'lvlh' | 'fixed' | 'free'>('nadir');
  
  // Per-satellite render settings (for future features like transparent cones)
  const [satelliteRenderSettings, setSatelliteRenderSettings] = useState<Map<string, {
    transparentCones: boolean;
    showEllipsoid: boolean;
    // Future settings will go here
    setting2: boolean;
    setting3: boolean;
    setting4: boolean;
    setting5: boolean;
    setting6: boolean;
    setting7: boolean;
    setting8: boolean;
    setting9: boolean;
  }>>(new Map());

  // Sensor color overrides (localStorage persistence)
  const [sensorColors, setSensorColors] = useState<Map<string, Map<string, string>>>(new Map());
  
  // Color picker state - REMOVED: No longer needed, pickers always visible
  // const [colorPickerState, setColorPickerState] = useState<{
  //   satelliteId: string;
  //   sensorId: string;
  // } | null>(null);

  const [satelliteResource, setSatelliteResource] = useState<IonResource | string | undefined>(undefined);
  const [raLines, setRALines] = useState<Cartesian3[][]>([]);
  const [decLines, setDecLines] = useState<Cartesian3[][]>([]);
  const [gridLabels, setGridLabels] = useState<Array<{ position: Cartesian3; text: string }>>([]);
  
  // Store viewer reference for imagery setup in useEffect
  const viewerRef = React.useRef<any>(null);
  
  // Modal overlay refs for ESC key handling
  const satelliteModalRef = React.useRef<HTMLDivElement>(null);
  const groundStationModalRef = React.useRef<HTMLDivElement>(null);

  // Attitude vector configurations (can be moved to settings later)
  const attitudeVectors = React.useMemo(() => [
    { axis: new Cartesian3(1, 0, 0), color: safeColor(options.xAxisColor, Color.RED), name: 'X-axis' },
    { axis: new Cartesian3(0, 1, 0), color: safeColor(options.yAxisColor, Color.GREEN), name: 'Y-axis' },
    { axis: new Cartesian3(0, 0, 1), color: safeColor(options.zAxisColor, Color.BLUE), name: 'Z-axis' },
  ], [options.xAxisColor, options.yAxisColor, options.zAxisColor]);

  // Color management helper functions
  // Note: Will be used in Phase 3 (display colors in UI) and Phase 4 (color picker)
  const _getSensorColor = (satelliteId: string, sensorId: string, sensor: any, defaultIndex: number): string => {
    // Priority 1: User override from localStorage
    const override = sensorColors.get(satelliteId)?.get(sensorId);
    if (override) {
      return override;
    }
    
    // Priority 2: Color from sensor JSON
    if (sensor.color) {
      return sensor.color;
    }
    
    // Priority 3: Default color palette
    const defaultColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FFA500', '#00FF00'];
    return defaultColors[defaultIndex % defaultColors.length];
  };

  const _updateSensorColor = (satelliteId: string, sensorId: string, color: string) => {
    const newColors = new Map(sensorColors);
    if (!newColors.has(satelliteId)) {
      newColors.set(satelliteId, new Map());
    }
    newColors.get(satelliteId)!.set(sensorId, color);
    setSensorColors(newColors);
    
    // Persist to localStorage
    const serialized = JSON.stringify(Array.from(newColors.entries()).map(([satId, sensors]) => [
      satId,
      Array.from(sensors.entries())
    ]));
    localStorage.setItem('grafana_satelliteVisualizer_sensorColors', serialized);
  };

  const _resetSensorColor = (satelliteId: string, sensorId: string) => {
    const newColors = new Map(sensorColors);
    newColors.get(satelliteId)?.delete(sensorId);
    if (newColors.get(satelliteId)?.size === 0) {
      newColors.delete(satelliteId);
    }
    setSensorColors(newColors);
    
    // Update localStorage
    const serialized = JSON.stringify(Array.from(newColors.entries()).map(([satId, sensors]) => [
      satId,
      Array.from(sensors.entries())
    ]));
    localStorage.setItem('grafana_satelliteVisualizer_sensorColors', serialized);
  };

  // Load color overrides from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('grafana_satelliteVisualizer_sensorColors');
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored = new Map<string, Map<string, string>>(
          parsed.map(([satId, sensors]: [string, Array<[string, string]>]) => [
            satId,
            new Map<string, string>(sensors)
          ])
        );
        setSensorColors(restored);
        console.log('✅ Loaded sensor color overrides from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load sensor colors from localStorage:', error);
    }
  }, []);

  // Focus satellite settings modal when it opens (for ESC key handling)
  useEffect(() => {
    if (settingsModalSatelliteId && satelliteModalRef.current) {
      satelliteModalRef.current.focus();
    }
  }, [settingsModalSatelliteId]);

  // Focus ground station settings modal when it opens (for ESC key handling)
  useEffect(() => {
    if (settingsModalGroundStationId && groundStationModalRef.current) {
      groundStationModalRef.current.focus();
    }
  }, [settingsModalGroundStationId]);

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
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.topLeftControlsContainer}`)) {
        setIsModeDropdownOpen(false);
        setIsCameraDropdownOpen(false);
      }
    };
    
    if (isModeDropdownOpen || isCameraDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [isModeDropdownOpen, isCameraDropdownOpen, styles.topLeftControlsContainer]);

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
          
          {/* Top-Left Control Panel - Mode & Camera Dropdowns */}
          <div className={styles.topLeftControlsContainer}>
            {/* Mode Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className={styles.dropdownButton}
                onClick={() => {
                  setIsModeDropdownOpen(!isModeDropdownOpen);
                  setIsCameraDropdownOpen(false);
                }}
                title="View Mode"
              >
                Mode
                <ChevronDown size={16} />
              </button>
              
              {isModeDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div
                    className={`${styles.dropdownItem} ${selectedMode === 'satellite' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMode('satellite');
                      setIsModeDropdownOpen(false);
                      // TODO: Implement satellite-centered view logic
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>🛰️ Satellite Focus</span>
                    <span className={styles.dropdownItemDescription}>Center on tracked satellite</span>
                  </div>
                  <div
                    className={`${styles.dropdownItem} ${selectedMode === 'earth' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMode('earth');
                      setIsModeDropdownOpen(false);
                      // TODO: Implement earth-centered view logic
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>🌍 Earth Focus</span>
                    <span className={styles.dropdownItemDescription}>Center on Earth</span>
                  </div>
                  <div
                    className={`${styles.dropdownItem} ${selectedMode === 'celestial' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMode('celestial');
                      setIsModeDropdownOpen(false);
                      // TODO: Implement celestial map view logic
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>⭐ Celestial Map</span>
                    <span className={styles.dropdownItemDescription}>RA/Dec reference frame</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Camera Angle Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className={styles.dropdownButton}
                onClick={() => {
                  setIsCameraDropdownOpen(!isCameraDropdownOpen);
                  setIsModeDropdownOpen(false);
                }}
                title="Camera Angle"
              >
                <Video size={16} />
                <ChevronDown size={16} />
              </button>
              
              {isCameraDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div
                    className={`${styles.dropdownItem} ${selectedCameraView === 'nadir' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCameraView('nadir');
                      setIsCameraDropdownOpen(false);
                      // Use existing nadir view function
                      if (trackedSatelliteId) {
                        flyToSatelliteNadirView(trackedSatelliteId);
                      }
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>🔭 Nadir View</span>
                    <span className={styles.dropdownItemDescription}>View from directly above</span>
                  </div>
                  <div
                    className={`${styles.dropdownItem} ${selectedCameraView === 'lvlh' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCameraView('lvlh');
                      setIsCameraDropdownOpen(false);
                      // TODO: Implement LVLH (Local Vertical Local Horizontal) view
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>📐 LVLH View</span>
                    <span className={styles.dropdownItemDescription}>Local vertical/horizontal frame</span>
                  </div>
                  <div
                    className={`${styles.dropdownItem} ${selectedCameraView === 'fixed' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCameraView('fixed');
                      setIsCameraDropdownOpen(false);
                      // TODO: Implement fixed inertial view
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>🧭 Fixed Inertial</span>
                    <span className={styles.dropdownItemDescription}>Inertial reference frame</span>
                  </div>
                  <div
                    className={`${styles.dropdownItem} ${selectedCameraView === 'free' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCameraView('free');
                      setIsCameraDropdownOpen(false);
                      // TODO: Implement free camera mode
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>🎮 Free Camera</span>
                    <span className={styles.dropdownItemDescription}>Manual camera control</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
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
            // const hardMaxZoomDistance = earthRadius * 5; // ~31,890 km
            
            
            
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
        {/* Main Satellite Entities */}
        {satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) => {
            const isThisSatelliteTracked = isTracked && trackedSatelliteId === satellite.id;
            return (
              <SatelliteEntityRenderer
                key={satellite.id}
                satellite={satellite}
                options={options}
                satelliteResource={satelliteResource}
                isTracked={isThisSatelliteTracked}
              />
            );
          })
        }
        {/* Body Axes (X/Y/Z attitude vectors) - Per-satellite */}
        {options.showAttitudeVisualization && options.showBodyAxes && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) => {
            const isThisSatelliteTracked = isTracked && trackedSatelliteId === satellite.id;
            return (
              <BodyAxesRenderer
                key={`${satellite.id}-body-axes`}
                satellite={satellite}
                options={options}
                isTracked={isThisSatelliteTracked}
                viewerRef={viewerRef}
                attitudeVectors={attitudeVectors}
              />
            );
          })
        }
        
        {/* Sensor Visualization (Cones, Footprints, Celestial Projections) */}
        {options.showAttitudeVisualization && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .map((satellite) => {
            const isThisSatelliteTracked = isTracked && trackedSatelliteId === satellite.id;
            return satellite.sensors.map((sensor, idx) => {
              // Get the actual color for this sensor (respecting user overrides)
              const sensorColor = _getSensorColor(satellite.id, sensor.id, sensor, idx);
              
              return (
                <SensorVisualizationRenderer
                  key={`${satellite.id}-sensor-${sensor.id}`}
                  satellite={satellite}
                  sensor={sensor}
                  options={options}
                  isTracked={isThisSatelliteTracked}
                  viewerRef={viewerRef}
                  sensorIndex={idx}
                  transparentMode={satelliteRenderSettings.get(satellite.id)?.transparentCones || false}
                  customColor={sensorColor}
                />
              );
            });
          })
        }
        
        {/* Uncertainty Ellipsoids - Per-satellite */}
        {options.showAttitudeVisualization && options.showUncertaintyEllipsoids && satellites
          .filter(sat => !hiddenSatellites.has(sat.id))
          .filter(sat => satelliteRenderSettings.get(sat.id)?.showEllipsoid !== false)
          .map((satellite) => {
            // Only render if satellite has covariance data
            if (!satellite.covariance || satellite.covariance.length === 0) {
              return null;
            }
            
            return (
              <UncertaintyEllipsoidRenderer
                key={`${satellite.id}-uncertainty`}
                satellite={satellite}
                opacityMode={options.uncertaintyOpacityMode}
                ellipsoidColor={options.uncertaintyColor}
                sigmaScale={1.0}
              />
            );
          })
        }
        
        {/* RA/Dec Celestial Grid */}
        {options.showAttitudeVisualization && options.showRADecGrid && (
          <CelestialGridRenderer
            options={options}
            raLines={raLines}
            decLines={decLines}
            gridLabels={gridLabels}
          />
        )}
        
        {/* Celestial Bodies (Sun + Earth Center) */}
        <CelestialBodiesRenderer
          options={options}
          viewerRef={viewerRef}
        />
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
        {groundStations
          .filter(gs => !hiddenGroundStations.has(gs.id))
          .map((gs) => (
            <GroundStationRenderer key={gs.id} groundStation={gs} />
          ))
        }
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
                    {groundStations.map((gs) => {
                      const isHidden = hiddenGroundStations.has(gs.id);
                      
                      return (
                        <div 
                          key={gs.id} 
                          className={styles.satelliteItem}
                        >
                          <button
                            className={styles.visibilityToggle}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newHidden = new Set(hiddenGroundStations);
                              if (isHidden) {
                                newHidden.delete(gs.id);
                              } else {
                                newHidden.add(gs.id);
                              }
                              setHiddenGroundStations(newHidden);
                            }}
                            title={isHidden ? 'Show ground station' : 'Hide ground station'}
                          >
                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettingsModalGroundStationId(gs.id);
                            }}
                            title="Ground station settings"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        {settingsModalSatelliteId && (
          <div 
            ref={satelliteModalRef}
            className={styles.modalOverlay}
            onClick={() => setSettingsModalSatelliteId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();  // Prevent Grafana from handling ESC
                e.preventDefault();    // Cancel default browser behavior
                setSettingsModalSatelliteId(null);  // Close modal
              }
            }}
            tabIndex={-1}  // Make div focusable to receive keyboard events
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
                {/* Sensor Colors Section */}
                {(() => {
                  const currentSatellite = satellites.find(sat => sat.id === settingsModalSatelliteId);
                  const hasSensors = currentSatellite && currentSatellite.sensors.length > 0;
                  
                  return hasSensors ? (
                    <div className={styles.settingsGroup}>
                      <h4 className={styles.settingsGroupTitle}>Sensor Colors</h4>
                      {currentSatellite!.sensors.map((sensor, idx) => {
                        const color = _getSensorColor(currentSatellite!.id, sensor.id, sensor, idx);
                        
                        return (
                          <div key={sensor.id} className={styles.settingRow}>
                            <div className={styles.sensorColorRowVertical}>
                              <div className={styles.sensorNameRow}>
                                <div className={styles.sensorName}>{sensor.name}</div>
                                <button
                                  className={styles.resetButton}
                                  onClick={() => {
                                    _resetSensorColor(currentSatellite!.id, sensor.id);
                                  }}
                                  title="Reset to default color from JSON"
                                >
                                  Reset
                                </button>
                              </div>
                              <div className={styles.colorPickerWrapper}>
                                <ColorPicker
                                  color={color}
                                  onChange={(newColor) => {
                                    _updateSensorColor(currentSatellite!.id, sensor.id, newColor);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null;
                })()}

                {/* Render Settings Section */}
                <div className={styles.settingsGroup}>
                  <h4 className={styles.settingsGroupTitle}>Render Settings</h4>
                  
                {/* Setting 1: Transparent Sensor Cones (Functional) */}
                <div className={styles.settingRow}>
                  <div>
                    <label className={styles.settingLabel}>
                      <input
                        type="checkbox"
                        checked={satelliteRenderSettings.get(settingsModalSatelliteId!)?.transparentCones || false}
                        onChange={(e) => {
                          // Show warning when enabling transparent mode
                          if (e.target.checked) {
                            const confirmed = window.confirm(
                              '⚠️ Performance Warning\n\n' +
                              'Transparent sensor cones may significantly impact frame rate, ' +
                              'especially with multiple satellites and sensors.\n\n' +
                              'Lower frame rates are expected when this feature is enabled.\n\n' +
                              'Do you want to activate transparent cones?'
                            );
                            if (!confirmed) {
                              return; // User cancelled, don't change the setting
                            }
                          }
                          
                          const newSettings = new Map(satelliteRenderSettings);
                          const current = newSettings.get(settingsModalSatelliteId!) || {
                            transparentCones: false,
                            showEllipsoid: false,
                            setting2: false,
                            setting3: false,
                            setting4: false,
                            setting5: false,
                            setting6: false,
                            setting7: false,
                            setting8: false,
                            setting9: false,
                          };
                          newSettings.set(settingsModalSatelliteId!, {
                            ...current,
                            transparentCones: e.target.checked
                          });
                          setSatelliteRenderSettings(newSettings);
                        }}
                      />
                      <span>Transparent Sensor Cones</span>
                    </label>
                    <div className={styles.settingDescription}>
                      Show filled transparent cones instead of wireframe grid (⚠️ may impact performance)
                    </div>
                  </div>
                </div>

                {/* Setting 2: Show Uncertainty Ellipsoid */}
                <div className={styles.settingRow}>
                  <div>
                    <label className={styles.settingLabel}>
                      <input
                        type="checkbox"
                        checked={satelliteRenderSettings.get(settingsModalSatelliteId!)?.showEllipsoid || false}
                        onChange={(e) => {
                          const newSettings = new Map(satelliteRenderSettings);
                          const current = newSettings.get(settingsModalSatelliteId!) || {
                            transparentCones: false,
                            showEllipsoid: false,
                            setting2: false,
                            setting3: false,
                            setting4: false,
                            setting5: false,
                            setting6: false,
                            setting7: false,
                            setting8: false,
                            setting9: false,
                          };
                          newSettings.set(settingsModalSatelliteId!, {
                            ...current,
                            showEllipsoid: e.target.checked
                          });
                          setSatelliteRenderSettings(newSettings);
                        }}
                      />
                      <span>Show Uncertainty Ellipsoid</span>
                    </label>
                    <div className={styles.settingDescription}>
                      Display 3D confidence ellipsoid representing position uncertainty
                    </div>
                  </div>
                </div>
                </div> {/* End Render Settings Group */}
              </div>
            </div>
          </div>
        )}

        {/* Ground Station Settings Modal */}
        {settingsModalGroundStationId && (
          <div 
            ref={groundStationModalRef}
            className={styles.modalOverlay}
            onClick={() => setSettingsModalGroundStationId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                setSettingsModalGroundStationId(null);
              }
            }}
            tabIndex={-1}
          >
            <div 
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <Settings size={18} />
                  {groundStations.find(gs => gs.id === settingsModalGroundStationId)?.name || 'Ground Station Settings'}
                </h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setSettingsModalGroundStationId(null)}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.emptyState}>
                  Ground station settings coming soon...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
