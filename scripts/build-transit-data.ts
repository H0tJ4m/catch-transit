/**
 * One-shot script: pulls Mumbai Metropolitan Region rail data from OpenStreetMap
 * via the Overpass API and writes normalized GeoJSON / adjacency files into
 * src/data/. Run with: pnpm run build:transit
 *
 * Output:
 *   src/data/stations.json   - { id, name, lat, lng, lines[], zone }
 *   src/data/lines.json      - { id, name, color, type, geometry }
 *   src/data/adjacency.json  - { stationId: [{ neighborId, lineId, travelMinutes }] }
 *
 * Note: OSM coverage of Mumbai Metro Line 3 (underground) is partial. After
 * generation, manually reconcile against the official MMR Rail Map image
 * (assets/reference/mmr-rail-map.jpg) and patch stations.json by hand.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// MMR bounding box (south, west, north, east)
const MMR_BBOX = [18.85, 72.75, 19.55, 73.20] as const;

const QUERY = `
[out:json][timeout:60];
(
  relation["route"~"^(train|subway|monorail|light_rail)$"](${MMR_BBOX.join(',')});
);
out body;
>;
out skel qt;
`;

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
  nodes?: number[];
};

async function fetchOverpass(): Promise<OsmElement[]> {
  const errors: string[] = [];
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'catch-transit/0.1 (https://github.com/H0tJ4m/catch-transit)',
        },
        body: `data=${encodeURIComponent(QUERY)}`,
      });
      if (!res.ok) {
        errors.push(`${url}: ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { elements: OsmElement[] };
      return json.elements;
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All Overpass mirrors failed: ${errors.join(' | ')}`);
}

function writeJson(relPath: string, data: unknown): void {
  const abs = resolve(__dirname, '..', relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(data, null, 2));
  console.log(`wrote ${relPath}`);
}

async function main(): Promise<void> {
  console.log('querying Overpass...');
  const elements = await fetchOverpass();
  const nodes = new Map<number, OsmElement>();
  for (const el of elements) if (el.type === 'node') nodes.set(el.id, el);

  const stations = new Map<string, { id: string; name: string; lat: number; lng: number; lines: string[] }>();
  const lines: Array<{ id: string; name: string; color: string; type: string; geometry: GeoJSON.LineString }> = [];

  for (const el of elements) {
    if (el.type !== 'relation' || !el.tags) continue;
    if (el.tags.route !== 'train' && el.tags.route !== 'subway' && el.tags.route !== 'monorail') continue;

    const lineId = `osm-${el.id}`;
    const lineName = el.tags.name ?? el.tags.ref ?? `route-${el.id}`;
    const color = el.tags.colour ?? '#888';
    const coords: number[][] = [];

    for (const m of el.members ?? []) {
      if (m.type === 'node' && m.role === 'stop') {
        const n = nodes.get(m.ref);
        if (!n || n.lat == null || n.lon == null) continue;
        const id = `s-${m.ref}`;
        const existing = stations.get(id);
        if (existing) {
          if (!existing.lines.includes(lineId)) existing.lines.push(lineId);
        } else {
          stations.set(id, {
            id,
            name: n.tags?.name ?? `Station ${m.ref}`,
            lat: n.lat,
            lng: n.lon,
            lines: [lineId],
          });
        }
      }
    }

    for (const m of el.members ?? []) {
      if (m.type === 'way') {
        const way = elements.find((e) => e.type === 'way' && e.id === m.ref);
        if (!way?.nodes) continue;
        for (const nodeId of way.nodes) {
          const n = nodes.get(nodeId);
          if (n?.lat != null && n?.lon != null) coords.push([n.lon, n.lat]);
        }
      }
    }

    if (coords.length >= 2) {
      lines.push({
        id: lineId,
        name: lineName,
        color,
        type: el.tags.route,
        geometry: { type: 'LineString', coordinates: coords },
      });
    }
  }

  writeJson('src/data/stations.json', Array.from(stations.values()));
  writeJson('src/data/lines.json', lines);
  console.log(`stations: ${stations.size}, lines: ${lines.length}`);
  console.log('Now manually reconcile names + line colors against the official MMR rail map.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
