import { getStation, haversineMeters } from '@/transit/graph';
import type { Player, RaceRoom, Room, Team } from './types';

export type RacePhase = 'lobby' | 'configuring' | 'running' | 'ended';

function asRace(room: Room | null): RaceRoom | null {
  return room && room.mode === 'race' ? room : null;
}

export function currentPhase(room: Room | null): RacePhase {
  const r = asRace(room);
  if (!r) return 'lobby';
  if (r.state === 'ended') return 'ended';
  if (r.state === 'lobby') {
    return r.config.fromStationId && r.config.toStationId ? 'lobby' : 'configuring';
  }
  return 'running';
}

export function timeRemainingSec(room: Room | null): number {
  const r = asRace(room);
  if (!r?.startedAt) return 0;
  const elapsed = (Date.now() - r.startedAt) / 1000;
  return Math.max(0, r.config.durationMin * 60 - elapsed);
}

/**
 * A racer finishes when their fix is within `finishRadiusM` of the destination
 * station. The first finisher's team wins the round.
 */
export function detectFinish(room: Room | null, racer: Player): boolean {
  const r = asRace(room);
  if (!r?.config.toStationId) return false;
  if (!racer.lastFix) return false;
  if (!racer.team) return false;
  const dest = getStation(r.config.toStationId);
  if (!dest) return false;
  return haversineMeters(racer.lastFix, dest) <= r.config.finishRadiusM;
}

/** Tally team membership for the lobby UI. */
export function teamCounts(players: Player[]): Record<Team, number> {
  return {
    red: players.filter((p) => p.team === 'red').length,
    blue: players.filter((p) => p.team === 'blue').length,
  };
}

/**
 * Suggest a default team for a newly joined player to keep the sides balanced.
 * Existing team picks are preserved.
 */
export function suggestTeam(players: Player[]): Team {
  const counts = teamCounts(players);
  return counts.red <= counts.blue ? 'red' : 'blue';
}
