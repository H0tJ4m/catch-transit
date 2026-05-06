import { useEffect, useRef } from 'react';
import { logEvent, publishLocation } from '@/firebase/rooms';
import { nearestStation } from '@/transit/graph';
import type { Fix } from '@/map/hooks/useUserLocation';
import type { PlayerFix } from '../types';
import { checkSpeed, checkStationJump } from '../antiCheat';

const PUBLISH_INTERVAL_MS = 5_000;
const NEAREST_STATION_RADIUS_M = 200;

/**
 * Throttled writer that publishes the player's latest fix and resolved station
 * to Firestore at most every PUBLISH_INTERVAL_MS. Also runs anti-cheat checks
 * against the previous published fix and emits `cheat-flag` events on any
 * heuristic violation.
 */
export function usePublishLocation(
  code: string | null,
  uid: string | null,
  fix: Fix | null,
): void {
  const lastSentAt = useRef(0);
  const latestFix = useRef<Fix | null>(null);
  const lastPublished = useRef<{ fix: PlayerFix; stationId: string | null } | null>(null);
  latestFix.current = fix;

  useEffect(() => {
    if (!code || !uid) return;
    const interval = setInterval(() => {
      const f = latestFix.current;
      if (!f) return;
      const now = Date.now();
      if (now - lastSentAt.current < PUBLISH_INTERVAL_MS - 100) return;
      lastSentAt.current = now;
      const near = nearestStation(f, NEAREST_STATION_RADIUS_M);
      const playerFix: PlayerFix = {
        lat: f.lat,
        lng: f.lng,
        speedMps: f.speedMps,
        t: f.timestamp,
      };
      const stationId = near?.station.id ?? null;

      const prev = lastPublished.current;
      if (prev) {
        const speedFlag = checkSpeed(prev.fix, playerFix);
        if (speedFlag) {
          logEvent(code, {
            type: 'cheat-flag',
            uid,
            reason: `${speedFlag.reason}: ${speedFlag.detail}`,
            at: now,
          }).catch(() => {});
        }
        if (prev.stationId && stationId) {
          const jumpFlag = checkStationJump(prev.stationId, prev.fix.t, stationId, playerFix.t);
          if (jumpFlag) {
            logEvent(code, {
              type: 'cheat-flag',
              uid,
              reason: `${jumpFlag.reason}: ${jumpFlag.detail}`,
              at: now,
            }).catch(() => {});
          }
        }
      }
      lastPublished.current = { fix: playerFix, stationId };
      publishLocation(code, uid, playerFix, stationId).catch(() => {});
    }, 1_000);
    return () => clearInterval(interval);
  }, [code, uid]);
}
