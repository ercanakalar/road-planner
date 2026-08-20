import { LatLng } from '../types/maps.types';

const DECIMALS = 6;

export const formatCoordinate = ({ latitude, longitude }: LatLng): string =>
  `${latitude.toFixed(DECIMALS)},${longitude.toFixed(DECIMALS)}`;

export const formatCoordinates = (points: readonly LatLng[]): string =>
  points.map(formatCoordinate).join('|');
