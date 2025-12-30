import React from 'react';
import { Color, Cartesian3, Cartesian2, JulianDate, IonResource, LabelStyle, HorizontalOrigin, VerticalOrigin, ArcType, Matrix3, CallbackProperty, PolylineArrowMaterialProperty, Quaternion, PolygonHierarchy, Ellipsoid } from 'cesium';
import { Entity, PointGraphics, LabelGraphics, PolylineGraphics, PolygonGraphics } from 'resium';
import { ParsedSatellite } from 'types/satelliteTypes';
import { SensorDefinition } from 'types/sensorTypes';
import { GroundStation } from 'types/groundStationTypes';
import { SimpleOptions } from 'types';
import { getScaledLength } from 'utils/cameraScaling';
import { generateConeMesh, SENSOR_COLORS } from 'utils/sensorCone';
import { computeFOVFootprint, computeFOVCelestialProjection, createDummyPolygonHierarchy } from 'utils/projections';

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
  sensorIndex: number; // For color selection
}

export const SensorVisualizationRenderer: React.FC<SensorVisualizationProps> = ({
  satellite,
  sensor,
  options,
  isTracked,
  viewerRef,
  sensorIndex,
}) => {
  const sensorColor = SENSOR_COLORS[sensorIndex % SENSOR_COLORS.length];
  
  return (
    <>
      {/* 1. Sensor Cone (3D FOV visualization) */}
      {options.showSensorCones && (
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
              const coneLength = getScaledLength(50000, isTracked, viewer, satPos);
              
              return generateConeMesh(satPos, sensorDir, sensor.fov, coneLength, 16);
            }, false)}
            width={1.5}
            material={Color.fromBytes(
              sensorColor.r,
              sensorColor.g,
              sensorColor.b,
              Math.floor(sensorColor.a * 255)
            )}
            arcType={ArcType.NONE}
          />
        </Entity>
      )}
      
      {/* 2. FOV Ground Footprint */}
      {options.showFOVFootprint && (
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
              
              // Compute FOV footprint
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
              sensorColor.r,
              sensorColor.g,
              sensorColor.b,
              Math.floor(0.3 * 255)  // 30% alpha for footprint
            )}
            outline={true}
            outlineColor={Color.fromBytes(
              sensorColor.r,
              sensorColor.g,
              sensorColor.b,
              255
            )}
            outlineWidth={2}
            height={0}
          />
        </Entity>
      )}
      
      {/* 3. Celestial FOV Projection */}
      {options.showCelestialFOV && (
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
              sensorColor.r,
              sensorColor.g,
              sensorColor.b,
              Math.floor(0.3 * 255)  // 30% alpha for transparency
            )}
            outline={true}
            outlineColor={Color.fromBytes(
              sensorColor.r,
              sensorColor.g,
              sensorColor.b,
              255
            )}
            outlineWidth={1}  // Match celestial grid line width
            perPositionHeight={true}
          />
        </Entity>
      )}
    </>
  );
};

// ============================================================================
// 3. BODY AXES RENDERER
// ============================================================================

export interface BodyAxesProps {
  satellite: ParsedSatellite;
  options: SimpleOptions;
  isTracked: boolean;
  viewerRef: React.RefObject<any>;
  attitudeVectors: Array<{ axis: Cartesian3; color: Color; name: string }>;
}

export const BodyAxesRenderer: React.FC<BodyAxesProps> = ({
  satellite,
  options,
  isTracked,
  viewerRef,
  attitudeVectors,
}) => {
  return (
    <>
      {attitudeVectors.map((vector, index) => (
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
              const vectorLength = getScaledLength(50000, isTracked, viewer, pos);
              
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
      ))}
    </>
  );
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

