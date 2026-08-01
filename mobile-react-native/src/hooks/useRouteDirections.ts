import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DirectionsRequest,
  DirectionsResult,
  fetchDirections,
  peekDirections,
} from 'services/googleMapsService';
import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';

export const TRANSPORT_MODES: TransportMode[] = [
  'driving',
  'walking',
  'transit',
];

const DEBOUNCE_MS = 350;

const EMPTY_COORDINATES: DirectionsResult['coordinates'] = [];
const EMPTY_DURATIONS: Partial<Record<TransportMode, number>> = {};

const toRequest = (
  waypoints: WaypointWithAddress[],
  mode: TransportMode,
): Omit<DirectionsRequest, 'mode'> & { mode: TransportMode } => ({
  origin: waypoints[0],
  destination: waypoints[waypoints.length - 1],

  waypoints: waypoints.slice(1, -1),
  mode,
});

export function useRouteLine(
  waypoints: WaypointWithAddress[],
  mode: TransportMode,
) {
  const routable = waypoints.length >= 2;

  const [result, setResult] = useState<DirectionsResult | null>(() =>
    routable ? (peekDirections(toRequest(waypoints, mode)) ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const signature = useMemo(
    () =>
      waypoints
        .map(
          (point) =>
            `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`,
        )
        .join('|'),
    [waypoints],
  );

  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  useEffect(() => {
    if (!routable) {
      setResult(null);
      return;
    }

    const request = toRequest(waypointsRef.current, mode);
    const cached = peekDirections(request);
    if (cached !== undefined) {
      setResult(cached);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      setIsLoading(true);
      fetchDirections(request)
        .then((next) => {
          if (!cancelled) setResult(next);
        })
        .catch(() => {
          if (!cancelled) setResult(null);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, mode, routable]);

  return {
    coordinates: result?.coordinates ?? EMPTY_COORDINATES,
    durationSeconds: result?.durationSeconds,
    distanceMeters: result?.distanceMeters,
    isLoading,
  };
}

export function useModeDurations(
  waypoints: WaypointWithAddress[],
  selectedPair: string[],
) {
  const [durations, setDurations] =
    useState<Partial<Record<TransportMode, number>>>(EMPTY_DURATIONS);

  const target = useMemo(() => {
    if (selectedPair.length === 2) {
      const origin = waypoints.find((point) => point.id === selectedPair[0]);
      const destination = waypoints.find(
        (point) => point.id === selectedPair[1],
      );
      return origin && destination ? [origin, destination] : null;
    }
    return waypoints.length >= 2 ? waypoints : null;
  }, [waypoints, selectedPair]);

  const signature = useMemo(
    () =>
      target
        ?.map(
          (point) =>
            `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`,
        )
        .join('|') ?? '',
    [target],
  );

  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!signature) {
      setDurations(EMPTY_DURATIONS);
      return;
    }

    const points = targetRef.current;
    if (!points) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      Promise.all(
        TRANSPORT_MODES.map((mode) =>
          fetchDirections(toRequest(points, mode)).catch(() => null),
        ),
      ).then((results) => {
        if (cancelled) return;
        const next: Partial<Record<TransportMode, number>> = {};
        TRANSPORT_MODES.forEach((mode, index) => {
          const seconds = results[index]?.durationSeconds;
          if (seconds !== undefined) next[mode] = seconds;
        });
        setDurations(next);
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  return durations;
}
