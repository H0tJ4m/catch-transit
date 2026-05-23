import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export type Fix = {
  lat: number;
  lng: number;
  speedMps: number | null;
  headingDeg: number | null;
  accuracyMeters: number | null;
  timestamp: number;
};

type Options = {
  /** Polling cadence in ms when foreground tracking is active. Default 4000. */
  intervalMs?: number;
  /** Distance interval in meters that forces an update. Default 15. */
  distanceMeters?: number;
};

export function useUserLocation(opts: Options = {}) {
  const { intervalMs = 4_000, distanceMeters = 15 } = opts;
  const [fix, setFix] = useState<Fix | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermissionStatus(status);
      if (status !== 'granted') {
        setError('Location permission denied. Catch Transit needs your location to play.');
        return;
      }

      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: intervalMs,
            distanceInterval: distanceMeters,
          },
          (l) => {
            setFix({
              lat: l.coords.latitude,
              lng: l.coords.longitude,
              speedMps: l.coords.speed,
              headingDeg: l.coords.heading,
              accuracyMeters: l.coords.accuracy,
              timestamp: l.timestamp,
            });
          },
        );
        subRef.current = sub;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Location unavailable');
      }
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [intervalMs, distanceMeters]);

  return { fix, permissionStatus, error };
}
