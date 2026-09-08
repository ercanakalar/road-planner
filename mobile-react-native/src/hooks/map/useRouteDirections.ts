import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DirectionsRequest,
  DirectionsResult,
  fetchDirections,
  fetchModeDurations,
  peekDirections,
} from 'services/mapsService';
import { StopWithAddress } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';

const TRANSPORT_MODES: TransportMode[] = [
  'driving',
  'walking',
  'transit',
];

const DEBOUNCE_MS = 350;

const EMPTY_COORDINATES: DirectionsResult['coordinates'] = [];
const EMPTY_DURATIONS: Partial<Record<TransportMode, number>> = {};

const toCoordinate = ({ latitude, longitude }: StopWithAddress) => ({
  latitude,
  longitude,
});

const toRequest = (
  stops: StopWithAddress[],
  mode: TransportMode,
): Omit<DirectionsRequest, 'mode'> & { mode: TransportMode } => ({
  origin: toCoordinate(stops[0]),
  destination: toCoordinate(stops[stops.length - 1]),
  // Google's own vocabulary: everything between the two ends is a
  // "waypoint" to the Directions API, whatever this app calls it.
  waypoints: stops.slice(1, -1).map(toCoordinate),
  mode,
});

export function useRouteLine(
  stops: StopWithAddress[],
  mode: TransportMode,
) {
  const routable = stops.length >= 2;

  const [result, setResult] = useState<DirectionsResult | null>(() =>
    routable ? peekDirections(toRequest(stops, mode)) ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const signature = useMemo(
    () =>
      stops
        .map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
        .join('|'),
    [stops],
  );

  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  useEffect(() => {
    if (!routable) {
      setResult(null);
      return;
    }

    const request = toRequest(stopsRef.current, mode);
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
  stops: StopWithAddress[],
  selectedPair: string[],
) {
  const [durations, setDurations] =
    useState<Partial<Record<TransportMode, number>>>(EMPTY_DURATIONS);

  const target = useMemo(() => {
    if (selectedPair.length === 2) {
      const origin = stops.find((point) => point.id === selectedPair[0]);
      const destination = stops.find(
        (point) => point.id === selectedPair[1],
      );
      return origin && destination ? [origin, destination] : null;
    }
    return stops.length >= 2 ? stops : null;
  }, [stops, selectedPair]);

  const signature = useMemo(
    () =>
      target
        ?.map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
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
      const { mode: _mode, ...request } = toRequest(points, 'driving');

      fetchModeDurations(request, TRANSPORT_MODES)
        .then((next) => {
          if (!cancelled) setDurations(next);
        })
        .catch(() => {
          if (!cancelled) setDurations(EMPTY_DURATIONS);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  return durations;
}
