import stationsData from '@/data/stations.json';
import linesData from '@/data/lines.json';
import type { Adjacency, Line, Station } from './types';

export const stations: Station[] = stationsData as Station[];
export const lines: Line[] = linesData as Line[];

const stationById = new Map<string, Station>(stations.map((s) => [s.id, s]));
const lineById = new Map<string, Line>(lines.map((l) => [l.id, l]));

export function getStation(id: string): Station | undefined {
  return stationById.get(id);
}

export function getLine(id: string): Line | undefined {
  return lineById.get(id);
}

export function getStationsOnLine(lineId: string): Station[] {
  const line = lineById.get(lineId);
  if (!line) return [];
  return line.stations.map((id) => stationById.get(id)).filter((s): s is Station => Boolean(s));
}

export function getLinesAtStation(stationId: string): Line[] {
  const s = stationById.get(stationId);
  if (!s) return [];
  return s.lines.map((id) => lineById.get(id)).filter((l): l is Line => Boolean(l));
}

/**
 * Build a quick adjacency table at module load. Each station is connected to
 * the previous and next station on every line it belongs to. Travel time is
 * estimated at 2.5 min/segment for suburban and 1.8 min for metro — good
 * enough for game logic until we wire up real timetables.
 */
export const adjacency: Adjacency = (() => {
  const adj: Adjacency = {};
  for (const line of lines) {
    const minutes = line.type === 'metro' ? 1.8 : 2.5;
    for (let i = 0; i < line.stations.length; i++) {
      const id = line.stations[i];
      if (!id) continue;
      const list = (adj[id] ??= []);
      const prev = i > 0 ? line.stations[i - 1] : undefined;
      const next = i < line.stations.length - 1 ? line.stations[i + 1] : undefined;
      if (prev) list.push({ neighborId: prev, lineId: line.id, travelMinutes: minutes });
      if (next) list.push({ neighborId: next, lineId: line.id, travelMinutes: minutes });
    }
  }
  return adj;
})();

export function neighbors(stationId: string): Array<{
  neighborId: string;
  lineId: string;
  travelMinutes: number;
}> {
  return adjacency[stationId] ?? [];
}

/** Dijkstra over the station graph. Returns ordered station ids or null. */
export function shortestPath(fromId: string, toId: string): string[] | null {
  if (!stationById.has(fromId) || !stationById.has(toId)) return null;
  if (fromId === toId) return [fromId];

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  dist.set(fromId, 0);
  const queue: string[] = [fromId];

  while (queue.length > 0) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    if (current === toId) break;
    for (const edge of neighbors(current)) {
      if (visited.has(edge.neighborId)) continue;
      const alt = (dist.get(current) ?? Infinity) + edge.travelMinutes;
      if (alt < (dist.get(edge.neighborId) ?? Infinity)) {
        dist.set(edge.neighborId, alt);
        prev.set(edge.neighborId, current);
        queue.push(edge.neighborId);
      }
    }
  }

  if (!prev.has(toId) && fromId !== toId) return null;
  const path = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    const p = prev.get(cursor);
    if (!p) return null;
    path.push(p);
    cursor = p;
  }
  return path.reverse();
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearestStation(
  point: { lat: number; lng: number },
  maxMeters = 5_000,
): { station: Station; distance: number } | null {
  let best: { station: Station; distance: number } | null = null;
  for (const s of stations) {
    const d = haversineMeters(point, s);
    if (d > maxMeters) continue;
    if (!best || d < best.distance) best = { station: s, distance: d };
  }
  return best;
}

export function stationsWithinMeters(
  point: { lat: number; lng: number },
  meters: number,
): Array<{ station: Station; distance: number }> {
  const out: Array<{ station: Station; distance: number }> = [];
  for (const s of stations) {
    const d = haversineMeters(point, s);
    if (d <= meters) out.push({ station: s, distance: d });
  }
  return out.sort((a, b) => a.distance - b.distance);
}
