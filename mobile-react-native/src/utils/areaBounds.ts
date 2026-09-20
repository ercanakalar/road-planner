import type { Region } from 'react-native-maps';

import { AreaBounds } from 'types/travel-map';

interface LatLng {
  latitude: number;
  longitude: number;
}

const FULL_TURN = 360;

const EDGE_STEP_DEGREES = 5;

const MAX_EDGE_STEPS = 24;

const MIN_DELTA = 0.01;

const unwrappedEast = ({ east, west }: AreaBounds): number =>
  east < west ? east + FULL_TURN : east;

export const wrapLongitude = (longitude: number): number => {
  if (longitude >= -180 && longitude <= 180) return longitude;

  const wrapped = (((longitude + 180) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return wrapped - 180;
};

const edge = (latitude: number, from: number, to: number): LatLng[] => {
  const span = Math.abs(to - from);
  const steps = Math.min(
    MAX_EDGE_STEPS,
    Math.max(1, Math.ceil(span / EDGE_STEP_DEGREES)),
  );

  return Array.from({ length: steps + 1 }, (_value, step) => ({
    latitude,
    longitude: from + ((to - from) * step) / steps,
  }));
};

export const boundsToPolygon = (bounds: AreaBounds): LatLng[] => {
  const east = unwrappedEast(bounds);

  return [
    ...edge(bounds.north, bounds.west, east),
    ...edge(bounds.south, east, bounds.west),
  ];
};

export const boundsCorners = (bounds: AreaBounds): LatLng[] => {
  const east = wrapLongitude(bounds.east);
  const west = wrapLongitude(bounds.west);

  return [
    { latitude: bounds.north, longitude: west },
    { latitude: bounds.north, longitude: east },
    { latitude: bounds.south, longitude: east },
    { latitude: bounds.south, longitude: west },
  ];
};

export const boundsToRegion = (bounds: AreaBounds, padding = 1.3): Region => {
  const east = unwrappedEast(bounds);

  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: wrapLongitude((bounds.west + east) / 2),
    latitudeDelta: Math.min(
      180,
      Math.max(MIN_DELTA, bounds.north - bounds.south) * padding,
    ),
    longitudeDelta: Math.min(
      FULL_TURN,
      Math.max(MIN_DELTA, east - bounds.west) * padding,
    ),
  };
};
