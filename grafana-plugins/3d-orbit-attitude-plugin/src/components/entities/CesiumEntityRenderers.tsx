import React from 'react';
import { Color, Cartesian3, Cartesian2, JulianDate, IonResource, LabelStyle, HorizontalOrigin, VerticalOrigin, ArcType } from 'cesium';
import { Entity, PointGraphics, LabelGraphics, PolylineGraphics } from 'resium';
import { ParsedSatellite } from 'types/satelliteTypes';
import { SensorDefinition } from 'types/sensorTypes';
import { GroundStation } from 'types/groundStationTypes';
import { SimpleOptions } from 'types';

/**
 * CesiumEntityRenderers.tsx
 * 
 * Extracted rendering components for 3D entities in the Cesium viewer.
 * Each component is responsible for rendering a specific type of entity.
 * 
 * Components:
 * - SatelliteEntityRenderer: Main satellite model/point + path + label
 * - SensorVisualizationRenderer: Sensor cones + FOV projections
 * - BodyAxesRenderer: Satellite body axes (X, Y, Z)
 * - CelestialGridRenderer: RA/Dec celestial coordinate grid
 * - GroundStationRenderer: Ground station markers
 */

// ============================================================================
// 1. SATELLITE ENTITY RENDERER
// ============================================================================

export interface SatelliteEntityProps {
  satellite: ParsedSatellite;
  options: SimpleOptions;
  isTracked: boolean;
  isVisible: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  satelliteResource?: IonResource | string;
  attitudeVectors: Array<{ axis: Cartesian3; color: Color; name: string }>;
}

export const SatelliteEntityRenderer: React.FC<SatelliteEntityProps> = ({
  satellite,
  options,
  isTracked,
  isVisible,
  viewerRef,
  timestamp,
  satelliteResource,
  attitudeVectors,
}) => {
  // TODO: Extract satellite rendering logic from main component
  // Will render: Entity with ModelGraphics/PointGraphics, PathGraphics, LabelGraphics
  return null;
};

// ============================================================================
// 2. SENSOR VISUALIZATION RENDERER
// ============================================================================

export interface SensorVisualizationProps {
  satellite: ParsedSatellite;
  sensor: SensorDefinition;
  options: SimpleOptions;
  isTracked: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  sensorColor: Color;
}

export const SensorVisualizationRenderer: React.FC<SensorVisualizationProps> = ({
  satellite,
  sensor,
  options,
  isTracked,
  viewerRef,
  timestamp,
  sensorColor,
}) => {
  // TODO: Extract sensor visualization logic from main component
  // Will render: Sensor cone, FOV footprint, celestial projection
  return null;
};

// ============================================================================
// 3. BODY AXES RENDERER
// ============================================================================

export interface BodyAxesProps {
  satellite: ParsedSatellite;
  options: SimpleOptions;
  isTracked: boolean;
  viewerRef: React.RefObject<any>;
  timestamp: JulianDate | null;
  attitudeVectors: Array<{ axis: Cartesian3; color: Color; name: string }>;
}

export const BodyAxesRenderer: React.FC<BodyAxesProps> = ({
  satellite,
  options,
  isTracked,
  viewerRef,
  timestamp,
  attitudeVectors,
}) => {
  // TODO: Extract body axes rendering logic from main component
  // Will render: X/Y/Z axis polylines
  return null;
};

// ============================================================================
// 4. CELESTIAL GRID RENDERER
// ============================================================================

export interface CelestialGridProps {
  options: SimpleOptions;
  raLines: Cartesian3[][];
  decLines: Cartesian3[][];
  gridLabels: Array<{ position: Cartesian3; text: string }>;
}

export const CelestialGridRenderer: React.FC<CelestialGridProps> = ({
  options,
  raLines,
  decLines,
  gridLabels,
}) => {
  return (
    <>
      {/* RA/Dec Celestial Grid - Right Ascension Lines (Meridians) */}
      {raLines.map((line, index) => (
        <Entity name={`RA Line ${index}`} key={`ra-${index}`}>
          <PolylineGraphics
            positions={line}
            width={1}
            material={Color.WHITE.withAlpha(0.5)}
            arcType={ArcType.NONE}
          />
        </Entity>
      ))}

      {/* RA/Dec Celestial Grid - Declination Lines (Parallels) - Light Brown */}
      {decLines.map((line, index) => (
        <Entity name={`Dec Line ${index}`} key={`dec-${index}`}>
          <PolylineGraphics
            positions={line}
            width={1}
            material={Color.fromBytes(200, 180, 160, 128)}
            arcType={ArcType.NONE}
          />
        </Entity>
      ))}

      {/* RA/Dec Grid Labels - Color coded: White for RA (hours), Light Brown for Dec (degrees) */}
      {options.showGridLabels && gridLabels.map((label, index) => {
        // Determine if this is an RA label (ends with 'h') or Dec label (ends with '°')
        const isRALabel = label.text.endsWith('h');
        const labelColor = isRALabel ? Color.WHITE : Color.fromBytes(200, 180, 160, 255);
        
        return (
          <Entity position={label.position} key={`grid-label-${index}`}>
            <LabelGraphics
              text={label.text}
              font={`${options.gridLabelSize}px sans-serif`}
              fillColor={labelColor}
              outlineColor={Color.BLACK}
              outlineWidth={2}
              style={LabelStyle.FILL_AND_OUTLINE}
              pixelOffset={new Cartesian2(0, -10)}
              horizontalOrigin={HorizontalOrigin.CENTER}
              verticalOrigin={VerticalOrigin.BOTTOM}
            />
          </Entity>
        );
      })}
    </>
  );
};

// ============================================================================
// 5. GROUND STATION RENDERER
// ============================================================================

export interface GroundStationProps {
  groundStation: GroundStation;
}

export const GroundStationRenderer: React.FC<GroundStationProps> = ({
  groundStation,
}) => {
  const gsPosition = Cartesian3.fromDegrees(
    groundStation.longitude,
    groundStation.latitude,
    groundStation.altitude
  );

  return (
    <Entity
      name={groundStation.name}
      position={gsPosition}
      key={groundStation.id}
    >
      <PointGraphics
        pixelSize={6}
        color={Color.ORANGE}
        outlineColor={Color.DARKORANGE}
        outlineWidth={2}
      />
      <LabelGraphics
        text={groundStation.name}
        font="14px sans-serif"
        fillColor={Color.WHITE}
        outlineColor={Color.BLACK}
        outlineWidth={2}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={new Cartesian2(0, -25)}
        horizontalOrigin={HorizontalOrigin.CENTER}
        verticalOrigin={VerticalOrigin.BOTTOM}
      />
    </Entity>
  );
};

