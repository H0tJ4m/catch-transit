import type { Player, PlayerFix } from './types';

/** Treat a player as offline if their last GPS publish is older than this. */
const STALE_FIX_MS = 30_000;

/**
 * Elect a single "leader" client among the online players in a room. The
 * leader is the player whose last published location is fresh (or who has no
 * fix yet but is otherwise marked online) with the lexicographically smallest
 * uid — a deterministic, server-free choice every client computes the same
 * way. The leader runs the host-authoritative loops (capture detection,
 * timer end, role rotation) so that if the room creator drops off, another
 * connected client picks the work up automatically.
 */
export function electLeader(players: Player[], now = Date.now()): string | null {
  const eligible = players
    .filter((p) => p.online && isFresh(p.lastFix, now))
    .map((p) => p.uid)
    .sort();
  return eligible[0] ?? null;
}

function isFresh(fix: PlayerFix | null, now: number): boolean {
  if (!fix) return true; // newly joined, no publish yet — still considered online
  return now - fix.t <= STALE_FIX_MS;
}
