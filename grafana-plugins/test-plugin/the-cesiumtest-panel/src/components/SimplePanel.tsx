import React from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { Viewer, Globe, Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ width, height }) => {
  return (
    <div style={{ width, height }}>
      <Viewer
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        selectionIndicator={false}
        infoBox={false}
      >
        <Globe enableLighting={false} />
        <Entity
          name="Test Marker"
          description="A test marker on the globe"
          position={Cartesian3.fromDegrees(-75.5977, 40.0388, 0)}
          point={{
            pixelSize: 10,
            color: Color.RED,
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          }}
        />
      </Viewer>
    </div>
  );
};
