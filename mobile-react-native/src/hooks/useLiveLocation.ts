import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { RouteCoordinate } from 'types/map-screen-type';

const WATCH_DISTANCE_METERS = 10;
const WATCH_INTERVAL_MS = 2000;

export type LiveLocationStatus =
  | 'idle'
  | 'starting'
  | 'watching'
  | 'denied'
  | 'unavailable';

export interface LiveLocationState {
  location?: RouteCoordinate;
  status: LiveLocationStatus;
}

export function useLiveLocation(enabled: boolean): LiveLocationState {
  const [location, setLocation] = useState<RouteCoordinate | undefined>();
  const [status, setStatus] = useState<LiveLocationStatus>('idle');

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setLocation(undefined);
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    setStatus('starting');

    (async () => {
      try {
        const { status: permission } =
          await Location.requestForegroundPermissionsAsync();

        if (cancelled) return;

        if (permission !== Location.PermissionStatus.GRANTED) {
          setStatus('denied');
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: WATCH_DISTANCE_METERS,
            timeInterval: WATCH_INTERVAL_MS,
          },
          ({ coords }) => {
            if (cancelled) return;
            setStatus('watching');
            setLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
            });
          },
        );

        if (cancelled) subscription.remove();
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { location, status };
}

export default useLiveLocation;
