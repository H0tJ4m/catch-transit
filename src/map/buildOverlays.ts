import { lines, stations } from '@/transit/graph';
import type { Line, Station } from '@/transit/types';

type FeatureCollection<P> = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: P;
    geometry: GeoJSON.Geometry;
  }>;
};

const stationById = new Map<string, Station>(stations.map((s) => [s.id, s]));

export function buildLinesGeoJSON(): FeatureCollection<{
  id: string;
  name: string;
  color: string;
  type: string;
}> {
  const features: FeatureCollection<{
    id: string;
    name: string;
    color: string;
    type: string;
  }>['features'] = [];

  for (const line of lines as Line[]) {
    const coords: number[][] = [];
    for (const stationId of line.stations) {
      const s = stationById.get(stationId);
      if (s) coords.push([s.lng, s.lat]);
    }
    if (coords.length < 2) continue;
    features.push({
      type: 'Feature',
      properties: {
        id: line.id,
        name: line.name,
        color: line.color,
        type: line.type,
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  return { type: 'FeatureCollection', features };
}

export function buildStationsGeoJSON(): FeatureCollection<{
  id: string;
  name: string;
  isInterchange: boolean;
}> {
  return {
    type: 'FeatureCollection',
    features: stations.map((s) => ({
      type: 'Feature',
      properties: {
        id: s.id,
        name: s.name,
        isInterchange: s.lines.length > 1,
      },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    })),
  };
}
