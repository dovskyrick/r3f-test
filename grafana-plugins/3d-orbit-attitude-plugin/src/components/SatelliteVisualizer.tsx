import React, { useEffect, useState } from 'react';
import { PanelProps, DataHoverEvent, LegacyGraphHoverEvent } from '@grafana/data';
import { AssetMode, SimpleOptions, CoordinatesType } from 'types';
import { coalesceToArray } from 'utilities';
import { computeZAxisGroundIntersection, computeFOVFootprint, createDummyPolygonHierarchy } from 'utils/projections';
import { generateCelestialTestCircles } from 'utils/celestialTest';
import { generateRADecGrid, generateRADecGridLabels } from 'utils/celestialGrid';
import { css, cx } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';

import { Viewer, Clock, Entity, PointGraphics, ModelGraphics, PathGraphics, LabelGraphics, PolylineGraphics, PolygonGraphics } from 'resium';
import {
  Ion,
  JulianDate,
  TimeInterval,
  TimeIntervalCollection,
  Cartesian3,
  Quaternion,
  Transforms,
  SampledProperty,
  SampledPositionProperty,
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
  LabelStyle,
  HorizontalOrigin,
  VerticalOrigin,
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
  };
};

export const SatelliteVisualizer: React.FC<Props> = ({ options, data, timeRange, width, height, eventBus }) => {
  Ion.defaultAccessToken = options.accessToken;

  const styles = useStyles2(getStyles);

  const [isLoaded, setLoaded] = useState<boolean>(false);
  const [viewerKey, setViewerKey] = useState<number>(0);
  const [isTracked, setIsTracked] = useState<boolean>(true);

  const [timestamp, setTimestamp] = useState<JulianDate | null>(null);
  const [satelliteAvailability, setSatelliteAvailability] = useState<TimeIntervalCollection | null>(null);
  const [satellitePosition, setSatellitePosition] = useState<SampledPositionProperty | null>(null);
  const [satelliteOrientation, setSatelliteOrientation] = useState<SampledProperty | null>(null);

  const [satelliteResource, setSatelliteResource] = useState<IonResource | string | undefined>(undefined);
  const [celestialTestCircles, setCelestialTestCircles] = useState<Cartesian3[][]>([]);
  const [raLines, setRALines] = useState<Cartesian3[][]>([]);
  const [decLines, setDecLines] = useState<Cartesian3[][]>([]);
  const [gridLabels, setGridLabels] = useState<Array<{ position: Cartesian3; text: string }>>([]);
  
  // Store viewer reference for imagery setup in useEffect
  const viewerRef = React.useRef<any>(null);

  useEffect(() => {
    const timeInterval = new TimeInterval({
      start: JulianDate.fromDate(timeRange.from.toDate()),
      stop: JulianDate.addDays(JulianDate.fromDate(timeRange.to.toDate()), 1, new JulianDate()),
    });

    // https://community.cesium.com/t/correct-way-to-wait-for-transform-to-be-ready/24800
    Transforms.preloadIcrfFixed(timeInterval).then(() => setLoaded(true));
  }, [timeRange]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (data.series.length === 1) {
      const dataFrame = data.series[0];

      if (dataFrame.fields.length !== 8) {
        throw new Error(`Invalid number of fields [${dataFrame.fields.length}] in data frame.`);
      }

      let timeFieldValues = coalesceToArray(dataFrame.fields[0].values);

      const startTimestamp: number | null = timeFieldValues[0] ?? null;
      const endTimestamp: number | null = timeFieldValues.at(-1) ?? null;

      if (startTimestamp !== null) {
        setTimestamp(JulianDate.fromDate(new Date(startTimestamp)));
      } else {
        setTimestamp(null);
      }

      if (startTimestamp && endTimestamp) {
        setSatelliteAvailability(
          new TimeIntervalCollection([
            new TimeInterval({
              start: JulianDate.fromDate(new Date(startTimestamp)),
              stop: JulianDate.fromDate(new Date(endTimestamp)),
            }),
          ])
        );
      } else {
        setSatelliteAvailability(null);
      }

      const positionProperty = new SampledPositionProperty();
      const orientationProperty = new SampledProperty(Quaternion);

      for (let i = 0; i < dataFrame.fields[1].values.length; i++) {
        const time = JulianDate.fromDate(new Date(coalesceToArray(dataFrame.fields[0].values)[i]));

        const DCM_ECI_ECEF = Transforms.computeFixedToIcrfMatrix(time);

        let x_ECEF: Cartesian3;
        switch (options.coordinatesType) {
          case CoordinatesType.CartesianFixed:
            x_ECEF = new Cartesian3(
              coalesceToArray(dataFrame.fields[1].values)[i],
              coalesceToArray(dataFrame.fields[2].values)[i],
              coalesceToArray(dataFrame.fields[3].values)[i]
            );
            break;
          case CoordinatesType.CartesianInertial:
            x_ECEF = Matrix3.multiplyByVector(
              Matrix3.transpose(DCM_ECI_ECEF, new Matrix3()),
              new Cartesian3(
                coalesceToArray(dataFrame.fields[1].values)[i],
                coalesceToArray(dataFrame.fields[2].values)[i],
                coalesceToArray(dataFrame.fields[3].values)[i]
              ),
              new Cartesian3()
            );
            break;
          default:
            x_ECEF = Cartesian3.fromDegrees(
              coalesceToArray(dataFrame.fields[1].values)[i],
              coalesceToArray(dataFrame.fields[2].values)[i],
              coalesceToArray(dataFrame.fields[3].values)[i]
            );
            break;
        }

        const q_B_ECI = new Quaternion(
          coalesceToArray(dataFrame.fields[4].values)[i],
          coalesceToArray(dataFrame.fields[5].values)[i],
          coalesceToArray(dataFrame.fields[6].values)[i],
          coalesceToArray(dataFrame.fields[7].values)[i]
        );

        positionProperty.addSample(time, x_ECEF);

        const q_ECI_ECEF = Quaternion.fromRotationMatrix(DCM_ECI_ECEF);
        const q_ECEF_ECI = Quaternion.conjugate(q_ECI_ECEF, new Quaternion());
        const q_B_ECEF = Quaternion.multiply(q_ECEF_ECI, q_B_ECI, new Quaternion());

        orientationProperty.addSample(time, q_B_ECEF);
      }

      setSatellitePosition(positionProperty);
      setSatelliteOrientation(orientationProperty);
    }
  }, [data, options.coordinatesType, isLoaded]);

  useEffect(() => {
    Ion.defaultAccessToken = options.accessToken;
  }, [options.accessToken]);

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

  // Generate celestial distance test circles
  useEffect(() => {
    if (!options.showCelestialTest) {
      setCelestialTestCircles([]);
      return;
    }

    const { circles } = generateCelestialTestCircles();
    setCelestialTestCircles(circles);
  }, [options.showCelestialTest]);

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
      <button
        onClick={() => setIsTracked(!isTracked)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          padding: '8px 12px',
          cursor: 'pointer',
          backgroundColor: isTracked ? '#4CAF50' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        {isTracked ? '🎯 Tracking ON' : '🌍 Free Camera'}
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
            
            // Remove zoom-out limit
            controller.maximumZoomDistance = Number.POSITIVE_INFINITY;
            controller.enableCollisionDetection = false;
            
            // Extend camera far clipping plane for celestial grid visibility
            const earthRadius = 6378137; // WGS84 maximum radius in meters
            const celestialDistance = earthRadius * 100;
            viewer.scene.camera.frustum.far = celestialDistance * 3;
            
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
        {satelliteAvailability && satellitePosition && satelliteOrientation && (
          <Entity
            availability={satelliteAvailability}
            position={satellitePosition}
            orientation={satelliteOrientation}
            tracked={isTracked}
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
        )}
        {/* Attitude Z-axis vector (red arrow) */}
        {satelliteAvailability && satellitePosition && satelliteOrientation && (
          <Entity availability={satelliteAvailability}>
            <PolylineGraphics
              positions={new CallbackProperty((time) => {
                const pos = satellitePosition.getValue(time);
                const orient = satelliteOrientation.getValue(time);
                if (!pos || !orient) {
                  return [];
                }
                
                // Z-axis unit vector in body frame
                const zAxisBody = new Cartesian3(0, 0, 1);
                
                // Rotate Z-axis by satellite orientation to get direction in ECEF
                const rotationMatrix = Matrix3.fromQuaternion(orient);
                const zAxisECEF = Matrix3.multiplyByVector(rotationMatrix, zAxisBody, new Cartesian3());
                
                // Scale vector (100km for visibility)
                const vectorLength = 100000;
                const endPos = Cartesian3.add(
                  pos,
                  Cartesian3.multiplyByScalar(zAxisECEF, vectorLength, new Cartesian3()),
                  new Cartesian3()
                );
                
                return [pos, endPos];
              }, false)}
              width={10}
              material={new PolylineArrowMaterialProperty(Color.RED)}
              arcType={ArcType.NONE}
            />
          </Entity>
        )}
        {/* Ground projection of Z-axis vector */}
        {options.showZAxisProjection && satelliteAvailability && satellitePosition && satelliteOrientation && (
          <Entity
            availability={satelliteAvailability}
            position={new CallbackProperty((time) => {
              const pos = satellitePosition.getValue(time);
              const orient = satelliteOrientation.getValue(time);
              if (!pos || !orient) {
                return undefined;
              }
              
              return computeZAxisGroundIntersection(pos, orient);
            }, false) as any}
          >
            <PointGraphics pixelSize={15} color={Color.YELLOW} outlineColor={Color.BLACK} outlineWidth={2} />
          </Entity>
        )}
        {/* Line from satellite to ground point */}
        {options.showZAxisProjection && satelliteAvailability && satellitePosition && satelliteOrientation && (
          <Entity availability={satelliteAvailability}>
            <PolylineGraphics
              positions={new CallbackProperty((time) => {
                const pos = satellitePosition.getValue(time);
                const orient = satelliteOrientation.getValue(time);
                if (!pos || !orient) {
                  return [];
                }
                
                const groundPoint = computeZAxisGroundIntersection(pos, orient);
                if (groundPoint) {
                  return [pos, groundPoint];
                }
                
                return [];
              }, false)}
              width={2}
              material={Color.YELLOW.withAlpha(0.7)}
              arcType={ArcType.NONE}
            />
          </Entity>
        )}
        {/* FOV Cone Footprint */}
        {options.showFOVFootprint && satelliteAvailability && satellitePosition && satelliteOrientation && (
          <Entity availability={satelliteAvailability}>
            <PolygonGraphics
              hierarchy={new CallbackProperty((time) => {
                const pos = satellitePosition.getValue(time);
                const orient = satelliteOrientation.getValue(time);
                
                // Return dummy triangle if no data
                if (!pos || !orient) {
                  return createDummyPolygonHierarchy();
                }
                
                // Compute FOV footprint using utility function
                const footprintPoints = computeFOVFootprint(pos, orient, options.fovHalfAngle);
                
                // Return points, or dummy triangle if cone doesn't hit Earth
                return footprintPoints.length > 0 
                  ? new PolygonHierarchy(footprintPoints)
                  : createDummyPolygonHierarchy();
              }, false) as any}
              material={Color.RED.withAlpha(0.3)}
              height={0}
              outline={true}
              outlineColor={Color.RED}
              outlineWidth={2}
            />
          </Entity>
        )}
        {/* Celestial Distance Test Circles */}
        {options.showCelestialTest && celestialTestCircles.map((circle, index) => (
          <Entity name={`Celestial Test Circle ${index + 1}`} key={`celestial-test-${index}`}>
            <PolylineGraphics
              positions={circle}
              width={0.5}
              material={Color.CYAN}
              arcType={ArcType.NONE}
            />
          </Entity>
        ))}
        {/* RA/Dec Celestial Grid - Right Ascension Lines (Meridians) */}
        {options.showRADecGrid && raLines.map((line, index) => (
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
        {options.showRADecGrid && decLines.map((line, index) => (
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
        {options.showRADecGrid && options.showGridLabels && gridLabels.map((label, index) => {
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
      </Viewer>

      <div
        id="cesium-credits"
        className={options.showCredits ? styles.showCesiumCredits : styles.hideCesiumCredits}
      ></div>
    </div>
  );
};
