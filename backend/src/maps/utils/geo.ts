import { LatLng } from '../types/maps.types';

const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

const shortestLongitudeDelta = (degrees: number): number =>
  ((((degrees + 180) % 360) + 360) % 360) - 180;

const wrapLongitude = (degrees: number): number =>
  shortestLongitudeDelta(degrees);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const SAME_POINT_METERS = 1;

export function haversineMeters(from: LatLng, to: LatLng): number {
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

/**
 * Compass bearing from one point to the next, 0-360 degrees clockwise from
 * north. Two identical points have no direction between them, so they answer 0.
 */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLng = toRadians(
    shortestLongitudeDelta(to.longitude - from.longitude),
  );

  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

  if (x === 0 && y === 0) return 0;

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/**
 * How far a heading turns to become another, signed: negative to the left,
 * positive to the right, always the shorter way round. Going straight on is 0,
 * doubling back is 180.
 */
export function turnDegrees(from: number, to: number): number {
  return shortestLongitudeDelta(to - from);
}

interface Planar {
  x: number;
  y: number;
}

const toPlanar = (point: LatLng, origin: LatLng): Planar => ({
  x:
    toRadians(shortestLongitudeDelta(point.longitude - origin.longitude)) *
    Math.cos(toRadians(origin.latitude)) *
    EARTH_RADIUS_METERS,
  y: toRadians(point.latitude - origin.latitude) * EARTH_RADIUS_METERS,
});

const fromPlanar = ({ x, y }: Planar, origin: LatLng): LatLng => ({
  latitude: origin.latitude + toDegrees(y / EARTH_RADIUS_METERS),
  longitude: wrapLongitude(
    origin.longitude +
      toDegrees(
        x / (EARTH_RADIUS_METERS * Math.cos(toRadians(origin.latitude))),
      ),
  ),
});

export interface PathProjection {
  distanceMeters: number;
  alongMeters: number;
}

export function projectOntoPath(
  point: LatLng,
  path: readonly LatLng[],
): PathProjection | null {
  if (path.length === 0) return null;

  if (path.length === 1) {
    return { distanceMeters: haversineMeters(point, path[0]), alongMeters: 0 };
  }

  let best: PathProjection | null = null;
  let travelled = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const target = toPlanar(point, start);
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
    const segmentMeters = Math.sqrt(lengthSquared);

    if (!best || distanceMeters < best.distanceMeters) {
      best = {
        distanceMeters,
        alongMeters: travelled + segmentMeters * fraction,
      };
    }

    travelled += segmentMeters;
  }

  return best;
}

export function pathLengthMeters(path: readonly LatLng[]): number {
  let total = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    total += haversineMeters(path[index], path[index + 1]);
  }

  return total;
}

const interpolate = (start: LatLng, end: LatLng, fraction: number): LatLng => {
  const { x, y } = toPlanar(end, start);

  return fromPlanar({ x: x * fraction, y: y * fraction }, start);
};

export function samplePath(
  path: readonly LatLng[],
  spacingMeters: number,
): LatLng[] {
  if (path.length === 0) return [];
  if (path.length === 1 || spacingMeters <= 0) return [path[0]];

  const samples: LatLng[] = [path[0]];
  let sinceLastSample = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const segmentMeters = haversineMeters(start, end);

    if (segmentMeters === 0) continue;

    let offset = spacingMeters - sinceLastSample;

    while (offset <= segmentMeters) {
      samples.push(interpolate(start, end, offset / segmentMeters));
      offset += spacingMeters;
    }

    sinceLastSample = segmentMeters - (offset - spacingMeters);
  }

  const last = path[path.length - 1];
  if (haversineMeters(samples[samples.length - 1], last) > SAME_POINT_METERS) {
    samples.push(last);
  }

  return samples;
}
