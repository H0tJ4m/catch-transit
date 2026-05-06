import { getStation, haversineMeters } from '@/transit/graph';
import type { HideSeekRoom, Player, Room } from './types';

export type HideSeekPhase = 'lobby' | 'hider-picking' | 'seeking' | 'ended';

function asHideSeek(room: Room | null): HideSeekRoom | null {
  return room && room.mode === 'hide-seek' ? room : null;
}

export function currentPhase(room: Room | null): HideSeekPhase {
  const r = asHideSeek(room);
  if (!r) return 'lobby';
  if (r.state === 'ended') return 'ended';
  if (r.state === 'lobby') return 'lobby';
  if (!r.config.hiderLocked) return 'hider-picking';
  return 'seeking';
}

export function timeRemainingSec(room: Room | null): number {
  const r = asHideSeek(room);
  if (!r?.startedAt) return 0;
  const elapsed = (Date.now() - r.startedAt) / 1000;
  return Math.max(0, r.config.durationMin * 60 - elapsed);
}

/**
 * A seeker wins when their position is within the configured capture radius of
 * the hider's locked station. We do NOT require the seeker's nearest-station
 * to match — the hider's station is a fixed point, and walking up to it ends
 * the round.
 */
export function detectHiderFound(
  room: Room | null,
  seeker: Player,
): boolean {
  const r = asHideSeek(room);
  if (!r) return false;
  if (!r.config.hiderLocked || !r.config.hiderStationId) return false;
  if (!seeker.lastFix) return false;
  const station = getStation(r.config.hiderStationId);
  if (!station) return false;
  const d = haversineMeters(seeker.lastFix, station);
  return d <= r.config.captureRadiusM;
}
