import { useEffect, useRef } from 'react';
import { publishLocation } from '@/firebase/rooms';
import { nearestStation } from '@/transit/graph';
import type { Fix } from '@/map/hooks/useUserLocation';

const PUBLISH_INTERVAL_MS = 5_000;
const NEAREST_STATION_RADIUS_M = 200;

/**
 * Throttled writer that publishes the player's latest fix and resolved station
 * to Firestore at most every PUBLISH_INTERVAL_MS. The hook is a no-op when
 * `code` or `uid` is missing so callers can mount it unconditionally.
 */
export function usePublishLocation(
  code: string | null,
  uid: string | null,
  fix: Fix | null,
): void {
  const lastSentAt = useRef(0);
  const latestFix = useRef<Fix | null>(null);
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
      publishLocation(
        code,
        uid,
        { lat: f.lat, lng: f.lng, speedMps: f.speedMps, t: f.timestamp },
        near?.station.id ?? null,
      ).catch(() => {});
    }, 1_000);
    return () => clearInterval(interval);
  }, [code, uid]);
}
