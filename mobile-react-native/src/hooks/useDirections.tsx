import { useEffect, useRef, useState } from 'react';
import { TransportMode } from 'types/transport-type';
import { WaypointWithAddress } from 'types/map-screen-type';
import appConfig from 'constants/appConfig';
import { secondsToHour } from 'utils/secondsToHour';

const MODES: TransportMode[] = ['driving', 'walking', 'transit'];

interface DirectionsLeg {
  duration?: { value: number };
}

async function fetchDuration(
  origin: WaypointWithAddress,
  destination: WaypointWithAddress,
  mode: TransportMode,
  signal: AbortSignal,
  midWaypoints?: WaypointWithAddress[],
): Promise<string | null> {
  const waypointsQuery = midWaypoints?.length
    ? `&waypoints=${encodeURIComponent(
        midWaypoints.map((w) => `${w.latitude},${w.longitude}`).join('|'),
      )}`
    : '';

  const url = [
    'https://maps.googleapis.com/maps/api/directions/json',
    `?origin=${origin.latitude},${origin.longitude}`,
    `&destination=${destination.latitude},${destination.longitude}`,
    `&mode=${mode}`,
    waypointsQuery,
    `&key=${appConfig.mapApiKey}`,
  ].join('');

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const json = await res.json();
    if (json?.status !== 'OK' || !json.routes?.length) return null;

    const totalSeconds = (json.routes[0].legs as DirectionsLeg[]).reduce(
      (acc, leg) => acc + (leg.duration?.value ?? 0),
      0,
    );
    return secondsToHour(totalSeconds);
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') return null;
    console.error(`Directions fetch failed [${mode}]:`, err);
    return null;
  }
}

export function useDirections(
  waypoints: WaypointWithAddress[],
  selectedPair: string[],
) {
  const [durations, setDurations] = useState<Record<string, string>>({});
  const wholeRouteCache = useRef<Record<string, string>>({});

  useEffect(() => {
    if (waypoints.length < 2 || selectedPair.length === 2) return;

    const controller = new AbortController();
    let cancelled = false;

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const mid = waypoints.slice(1, -1);

    Promise.all(
      MODES.map((m) =>
        fetchDuration(origin, destination, m, controller.signal, mid),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      MODES.forEach((m, i) => {
        if (results[i]) next[m] = results[i]!;
      });
      wholeRouteCache.current = next;
      setDurations((prev) => ({ ...prev, ...next }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [waypoints, selectedPair.length]);

  useEffect(() => {
    if (selectedPair.length !== 2) {
      if (Object.keys(wholeRouteCache.current).length) {
        setDurations((prev) => ({ ...prev, ...wholeRouteCache.current }));
      }
      return;
    }

    if (waypoints.length < 2) return;

    const origin = waypoints.find((w) => w.id === selectedPair[0]);
    const destination = waypoints.find((w) => w.id === selectedPair[1]);
    if (!origin || !destination) return;

    const controller = new AbortController();
    let cancelled = false;

    Promise.all(
      MODES.map((m) =>
        fetchDuration(origin, destination, m, controller.signal),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      MODES.forEach((m, i) => {
        if (results[i]) next[m] = results[i]!;
      });
      setDurations((prev) => ({ ...prev, ...next }));
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedPair, waypoints]);

  return durations;
}
