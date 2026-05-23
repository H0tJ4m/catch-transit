import { haversineMeters, neighbors } from '@/transit/graph';
import type { PlayerFix } from './types';

/** Top sustained speed of a Mumbai local / Metro train, m/s (~120 km/h). */
const MAX_TRAIN_MPS = 120 / 3.6;

export type CheatFlag = {
  reason: 'speed' | 'station-jump';
  detail: string;
};

/**
 * Compares two consecutive fixes and reports a flag if implied speed exceeds
 * the train top speed.
 */
export function checkSpeed(prev: PlayerFix, next: PlayerFix): CheatFlag | null {
  const dtSec = (next.t - prev.t) / 1000;
  if (dtSec <= 0) return null;
  const meters = haversineMeters(prev, next);
  const mps = meters / dtSec;
  if (mps > MAX_TRAIN_MPS * 1.2) {
    return {
      reason: 'speed',
      detail: `implied ${(mps * 3.6).toFixed(1)} km/h between fixes`,
    };
  }
  return null;
}

/**
 * Reports a flag if the player teleported to a non-adjacent station in less
 * than the minimum reasonable train transit time.
 */
export function checkStationJump(
  prevStationId: string,
  prevAt: number,
  nextStationId: string,
  nextAt: number,
): CheatFlag | null {
  if (prevStationId === nextStationId) return null;
  const adj = neighbors(prevStationId).find((n) => n.neighborId === nextStationId);
  if (adj) return null;
  const dtMin = (nextAt - prevAt) / 60_000;
  // Non-adjacent; allow it only if at least 90 seconds elapsed (minimum
  // realistic transit time over a couple of stops).
  if (dtMin < 1.5) {
    return {
      reason: 'station-jump',
      detail: `${prevStationId} -> ${nextStationId} in ${dtMin.toFixed(1)} min`,
    };
  }
  return null;
}
