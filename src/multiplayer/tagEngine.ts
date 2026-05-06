import { haversineMeters, neighbors } from '@/transit/graph';
import type { Player, Room, TagRoom } from './types';

export type Phase = 'lobby' | 'head-start' | 'running' | 'ended';

function asTag(room: Room | null): TagRoom | null {
  return room && room.mode === 'tag' ? room : null;
}

export function currentPhase(room: Room | null): Phase {
  const tag = asTag(room);
  if (!tag) return 'lobby';
  if (tag.state === 'ended') return 'ended';
  if (tag.state === 'lobby') return 'lobby';
  if (!tag.startedAt) return 'lobby';
  const elapsedSec = (Date.now() - tag.startedAt) / 1000;
  if (elapsedSec < tag.config.headStartSec) return 'head-start';
  return 'running';
}

export function headStartRemainingSec(room: Room | null): number {
  const tag = asTag(room);
  if (!tag?.startedAt) return 0;
  const elapsed = (Date.now() - tag.startedAt) / 1000;
  return Math.max(0, tag.config.headStartSec - elapsed);
}

export function timeRemainingSec(room: Room | null): number {
  const tag = asTag(room);
  if (!tag?.startedAt) return 0;
  const total = tag.config.durationMin * 60;
  const elapsed = (Date.now() - tag.startedAt) / 1000;
  return Math.max(0, total - elapsed);
}

/**
 * A capture happens when the runner and a chaser are simultaneously inside the
 * same station geofence AND within `captureRadiusM` of each other.
 */
export function detectCapture(
  runner: Player,
  chaser: Player,
  captureRadiusM: number,
): boolean {
  if (!runner.lastFix || !chaser.lastFix) return false;
  if (!runner.lastStationId || !chaser.lastStationId) return false;
  if (runner.lastStationId !== chaser.lastStationId) return false;
  const d = haversineMeters(runner.lastFix, chaser.lastFix);
  return d <= captureRadiusM;
}

/** Score awarded for the runner each minute they remain uncaught. */
export const RUNNER_TICK_POINTS = 10;
/** Score awarded to the capturer when they tag the runner. */
export const CAPTURE_POINTS = 100;

export function runnerScoreForInterval(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  const minutes = (toMs - fromMs) / 60_000;
  return Math.round(minutes * RUNNER_TICK_POINTS);
}

export function isAdjacentStation(prevStationId: string, nextStationId: string): boolean {
  return neighbors(prevStationId).some((n) => n.neighborId === nextStationId);
}
