import { haversineMeters, neighbors } from '@/transit/graph';
import type { Player, Room } from './types';

export type Phase = 'lobby' | 'head-start' | 'running' | 'ended';

export function currentPhase(room: Room | null): Phase {
  if (!room) return 'lobby';
  if (room.state === 'ended') return 'ended';
  if (room.state === 'lobby') return 'lobby';
  if (!room.startedAt) return 'lobby';
  const elapsedSec = (Date.now() - room.startedAt) / 1000;
  if (elapsedSec < room.config.headStartSec) return 'head-start';
  return 'running';
}

export function headStartRemainingSec(room: Room | null): number {
  if (!room?.startedAt) return 0;
  const elapsed = (Date.now() - room.startedAt) / 1000;
  return Math.max(0, room.config.headStartSec - elapsed);
}

export function timeRemainingSec(room: Room | null): number {
  if (!room?.startedAt) return 0;
  const total = room.config.durationMin * 60;
  const elapsed = (Date.now() - room.startedAt) / 1000;
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

/**
 * Pick the chaser (by uid sort for determinism) that should become the new
 * runner after a capture. Falls back to the capturer.
 */
export function nextRunnerAfterCapture(capturerUid: string): string {
  return capturerUid;
}

/** Score awarded for the runner each minute they remain uncaught. */
export const RUNNER_TICK_POINTS = 10;
/** Score awarded to the capturer when they tag the runner. */
export const CAPTURE_POINTS = 100;

/**
 * Returns the runner's tick-points earned for the time interval [from, to].
 * Useful when reconciling score on capture.
 */
export function runnerScoreForInterval(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return 0;
  const minutes = (toMs - fromMs) / 60_000;
  return Math.round(minutes * RUNNER_TICK_POINTS);
}

/**
 * Sanity-check whether `nextStationId` is graph-adjacent to `prevStationId`.
 * If a player jumps between non-adjacent stations within a short window, this
 * is suspicious and worth flagging.
 */
export function isAdjacentStation(prevStationId: string, nextStationId: string): boolean {
  return neighbors(prevStationId).some((n) => n.neighborId === nextStationId);
}
