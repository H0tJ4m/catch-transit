import { getLine, getStation, haversineMeters, stations } from '@/transit/graph';
import type { Station } from '@/transit/types';
import type { HintType } from './types';

export type HintCatalogEntry = {
  type: HintType;
  label: string;
  description: string;
  costCoins: number;
  needsReferenceStation: boolean;
};

export const HINT_CATALOG: HintCatalogEntry[] = [
  {
    type: 'zone',
    label: 'What zone?',
    description: 'Reveals the broad MMR zone the hider is in.',
    costCoins: 5,
    needsReferenceStation: false,
  },
  {
    type: 'line-type',
    label: 'Suburban or Metro?',
    description: 'Reveals whether the hiding station is on a Suburban or Metro line.',
    costCoins: 8,
    needsReferenceStation: false,
  },
  {
    type: 'station-letter',
    label: 'First letter',
    description: "Reveals the first letter of the hiding station's name.",
    costCoins: 12,
    needsReferenceStation: false,
  },
  {
    type: 'distance-from-station',
    label: 'Distance from station',
    description:
      'Reveals the great-circle distance (in km, rounded to the nearest km) between your chosen station and the hider.',
    costCoins: 15,
    needsReferenceStation: true,
  },
];

export function resolveHint(
  type: HintType,
  hider: Station,
  refStationId?: string,
): { result: string; ok: true } | { result: string; ok: false } {
  switch (type) {
    case 'zone':
      return { ok: true, result: `Zone: ${hider.zone}` };
    case 'line-type': {
      const isMetro = hider.lines.some((id) => getLine(id)?.type === 'metro');
      const isSuburban = hider.lines.some((id) => getLine(id)?.type === 'suburban');
      const parts: string[] = [];
      if (isSuburban) parts.push('Suburban');
      if (isMetro) parts.push('Metro');
      return { ok: true, result: parts.join(' & ') || 'Other' };
    }
    case 'station-letter':
      return { ok: true, result: `Starts with "${hider.name.charAt(0).toUpperCase()}"` };
    case 'distance-from-station': {
      if (!refStationId) return { ok: false, result: 'Select a reference station first.' };
      const ref = getStation(refStationId);
      if (!ref) return { ok: false, result: 'Unknown reference station.' };
      const km = haversineMeters(ref, hider) / 1000;
      return {
        ok: true,
        result: `~${Math.max(1, Math.round(km))} km from ${ref.name}`,
      };
    }
    default:
      return { ok: false, result: 'Unknown hint.' };
  }
}

/** Stations within the chosen zone (or all of MMR). */
export function eligibleHidingStations(zone: string): Station[] {
  if (zone === 'all-mmr') return stations;
  return stations.filter((s) => s.zone === zone);
}
