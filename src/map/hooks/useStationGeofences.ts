import { useEffect, useRef } from 'react';
import { stationsWithinMeters } from '@/transit/graph';
import type { Station } from '@/transit/types';

const ARRIVE_RADIUS_M = 150;
const DEPART_RADIUS_M = 250;

type ArrivalHandler = (station: Station) => void;

/**
 * Tracks whether the player is currently inside any station geofence and
 * fires `onArrive` once per arrival. We use a small hysteresis (depart
 * radius > arrive radius) to avoid GPS jitter triggering multiple events
 * for the same station.
 */
export function useStationGeofences(
  fix: { lat: number; lng: number } | null,
  onArrive: ArrivalHandler,
) {
  const insideStationRef = useRef<string | null>(null);
  const handlerRef = useRef(onArrive);
  handlerRef.current = onArrive;

  useEffect(() => {
    if (!fix) return;
    const nearby = stationsWithinMeters(fix, DEPART_RADIUS_M);
    const insideArrival = nearby.find((n) => n.distance <= ARRIVE_RADIUS_M);
    const current = insideStationRef.current;

    if (insideArrival) {
      if (current !== insideArrival.station.id) {
        insideStationRef.current = insideArrival.station.id;
        handlerRef.current(insideArrival.station);
      }
      return;
    }

    if (current && !nearby.some((n) => n.station.id === current)) {
      insideStationRef.current = null;
    }
  }, [fix]);
}
