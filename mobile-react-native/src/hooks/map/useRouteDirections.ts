import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DirectionsRequest,
  DirectionsResult,
  fetchDirections,
  fetchModeDurations,
  fetchTerrain,
  peekDirections,
  peekTerrain,
} from 'services/mapsService';
import { StopShape, StopWithAddress } from 'types/map-screen-type';
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

/**
 * The stops, carrying the road's shape at each of them.
 *
 * A saved route reads this from `/road/:id/terrain`; a route still being drawn
 * on the map has no id, so its points are measured by `/road/terrain` instead.
 * Either way the numbers come off the polyline Google routes along, not the
 * straight lines between the pins.
 *
 * The stops are returned unchanged until the reading arrives, so a card shows
 * the cheap shape it already had rather than flickering through an empty row.
 */
export function useRouteTerrain(
  stops: StopWithAddress[],
  mode: TransportMode,
): StopWithAddress[] {
  const routable = stops.length >= 2;

  const coordinates = useMemo(() => stops.map(toCoordinate), [stops]);

  const [shapes, setShapes] = useState<(StopShape | null)[] | null>(() =>
    routable ? peekTerrain(coordinates, mode) ?? null : null,
  );

  const signature = useMemo(
    () =>
      coordinates
        .map(({ latitude, longitude }) =>
          `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        )
        .join('|'),
    [coordinates],
  );

  const coordinatesRef = useRef(coordinates);
  coordinatesRef.current = coordinates;

  useEffect(() => {
    if (!routable) {
      setShapes(null);
      return;
    }

    const points = coordinatesRef.current;
    const cached = peekTerrain(points, mode);
    if (cached !== undefined) {
      setShapes(cached);
      return;
    }

    let cancelled = false;

    // Dragged pins settle before anything is asked for: the same debounce the
    // route line uses, and for the same reason — one directions call and one
    // elevation call per resting position, not per frame.
    const timer = setTimeout(() => {
      fetchTerrain(points, mode)
        .then((next) => {
          if (!cancelled) setShapes(next);
        })
        .catch(() => {
          if (!cancelled) setShapes(null);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, mode, routable]);

  return useMemo(() => {
    if (!shapes?.length) return stops;

    return stops.map((stop, index) => {
      const shape = shapes[index];
      return shape ? { ...stop, ...shape } : stop;
    });
  }, [shapes, stops]);
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
