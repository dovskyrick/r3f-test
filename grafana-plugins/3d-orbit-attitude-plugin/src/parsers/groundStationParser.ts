import { PanelData } from '@grafana/data';
import { GroundStation } from 'types/groundStationTypes';

export function parseGroundStations(data: PanelData): GroundStation[] {
  const groundStations: GroundStation[] = [];

  try {
    // Check if we have frames with data
    if (!data.series || data.series.length === 0) {
      return groundStations;
    }

    // Look for ground station data in the series
    for (const frame of data.series) {
      // Check if this frame has ground station metadata
      if (frame.meta?.custom?.groundStations) {
        const gsData = frame.meta.custom.groundStations as any[];
        gsData.forEach((gs: any) => {
          groundStations.push({
            id: gs.id || `gs-${groundStations.length}`,
            name: gs.name || 'Unknown Ground Station',
            latitude: gs.latitude || 0,
            longitude: gs.longitude || 0,
            altitude: gs.altitude || 0,
          });
        });
      }
    }
  } catch (error) {
    console.error('Error parsing ground stations:', error);
  }

  return groundStations;
}

