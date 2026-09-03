import { RouteCoordinate } from 'types/map-screen-type';

const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const shortestLongitudeDelta = (degrees: number): number =>
  ((((degrees + 180) % 360) + 360) % 360) - 180;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function haversineMeters(
  from: RouteCoordinate,
  to: RouteCoordinate,
): number {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toLat - fromLat;
  const deltaLng = toRadians(
    shortestLongitudeDelta(to.longitude - from.longitude),
  );

  const chord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(chord)));
}

interface Planar {
  x: number;
  y: number;
}

const toPlanar = (point: RouteCoordinate, origin: RouteCoordinate): Planar => ({
  x:
    toRadians(shortestLongitudeDelta(point.longitude - origin.longitude)) *
    Math.cos(toRadians(origin.latitude)) *
    EARTH_RADIUS_METERS,
  y: toRadians(point.latitude - origin.latitude) * EARTH_RADIUS_METERS,
});

const interpolate = (
  start: RouteCoordinate,
  end: RouteCoordinate,
  fraction: number,
): RouteCoordinate => ({
  latitude: start.latitude + (end.latitude - start.latitude) * fraction,
  longitude:
    start.longitude +
    shortestLongitudeDelta(end.longitude - start.longitude) * fraction,
});

interface RouteSplit {
  travelled: RouteCoordinate[];
  remaining: RouteCoordinate[];
  distanceFromRouteMeters: number;
}

export function splitRouteAtLocation(
  path: readonly RouteCoordinate[],
  location: RouteCoordinate,
): RouteSplit | null {
  if (path.length < 2) return null;

  let nearest = { index: 0, fraction: 0, distanceMeters: Infinity };

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const target = toPlanar(location, start);
    const end = toPlanar(path[index + 1], start);

    const lengthSquared = end.x ** 2 + end.y ** 2;
    const fraction =
      lengthSquared === 0
        ? 0
        : clamp((target.x * end.x + target.y * end.y) / lengthSquared, 0, 1);

    const distanceMeters = Math.hypot(
      target.x - end.x * fraction,
      target.y - end.y * fraction,
    );

    if (distanceMeters < nearest.distanceMeters) {
      nearest = { index, fraction, distanceMeters };
    }
  }

  const { index, fraction, distanceMeters } = nearest;

  if (fraction <= 0) {
    return {
      travelled: path.slice(0, index + 1),
      remaining: path.slice(index),
      distanceFromRouteMeters: distanceMeters,
    };
  }

  if (fraction >= 1) {
    return {
      travelled: path.slice(0, index + 2),
      remaining: path.slice(index + 1),
      distanceFromRouteMeters: distanceMeters,
    };
  }

  const cut = interpolate(path[index], path[index + 1], fraction);

  return {
    travelled: [...path.slice(0, index + 1), cut],
    remaining: [cut, ...path.slice(index + 1)],
    distanceFromRouteMeters: distanceMeters,
  };
}
