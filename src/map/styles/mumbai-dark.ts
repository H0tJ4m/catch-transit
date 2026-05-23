/**
 * Minimal MapLibre style JSON tuned to match the dark/teal look of the Google
 * Maps screenshots. Uses OSM raster tiles as the base; the rail lines and
 * stations are layered on top from our local GeoJSON.
 *
 * For production, swap the raster source for a vector tile provider (MapTiler
 * "streets-v2-dark" works well) and self-host or pay for the tiles.
 */
export const mumbaiDarkStyle = {
  version: 8,
  name: 'Mumbai Dark',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution:
        '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0b1220' },
    },
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} as const;

export const MUMBAI_CENTER: [number, number] = [72.87, 19.08];
export const MUMBAI_DEFAULT_ZOOM = 10.5;
