import { Injectable } from '@nestjs/common';

import { GOOGLE_ZERO_RESULTS, GoogleMapsClient } from './google-maps.client';
import {
  DEFAULT_TRANSPORT_MODE,
  LatLng,
  ModeDurations,
  RouteRequest,
  RouteResult,
  TransportMode,
} from '../types/maps.types';
import { formatCoordinate, formatCoordinates } from '../utils/coordinates';
import { decodePolyline } from '../utils/polyline';
import { createTtlCache } from '../utils/ttl-cache';

const CACHE = { ttlMs: 10 * 60 * 1000, maxEntries: 500 };

interface DirectionsLeg {
  duration?: { value?: number };
  distance?: { value?: number };
}

interface DirectionsResponse {
  status: string;
  routes?: {
    legs?: DirectionsLeg[];
    overview_polyline?: { points?: string };
  }[];
}

const sumLegs = (
  legs: readonly DirectionsLeg[],
  field: 'duration' | 'distance',
): number => legs.reduce((total, leg) => total + (leg[field]?.value ?? 0), 0);

@Injectable()
export class DirectionsService {
  private readonly cache = createTtlCache<RouteResult | null>(CACHE);

  constructor(private client: GoogleMapsClient) {}

  async route(request: RouteRequest): Promise<RouteResult | null> {
    return this.cache.resolve(this.cacheKey(request), () =>
      this.fetchRoute(request),
    );
  }

  async durations(
    request: Omit<RouteRequest, 'mode'>,
    modes: readonly TransportMode[],
  ): Promise<ModeDurations> {
    const results = await Promise.all(
      modes.map((mode) => this.route({ ...request, mode }).catch(() => null)),
    );

    return modes.reduce<ModeDurations>((durations, mode, index) => {
      const seconds = results[index]?.durationSeconds;
      if (seconds !== undefined) durations[mode] = seconds;
      return durations;
    }, {});
  }

  private async fetchRoute(request: RouteRequest): Promise<RouteResult | null> {
    const {
      origin,
      destination,
      waypoints = [],
      mode = DEFAULT_TRANSPORT_MODE,
      optimize = false,
    } = request;

    const params: Record<string, string> = {
      origin: formatCoordinate(origin),
      destination: formatCoordinate(destination),
      mode,
    };

    if (waypoints.length) {
      params.waypoints =
        (optimize ? 'optimize:true|' : '') + formatCoordinates(waypoints);
    }

    const body = await this.client.get<DirectionsResponse>(
      '/directions/json',
      params,
    );

    if (body.status === GOOGLE_ZERO_RESULTS) return null;

    const route = body.routes?.[0];
    if (!route) return null;

    const legs = route.legs ?? [];

    return {
      mode,
      coordinates: route.overview_polyline?.points
        ? decodePolyline(route.overview_polyline.points)
        : [],
      durationSeconds: sumLegs(legs, 'duration'),
      distanceMeters: sumLegs(legs, 'distance'),
    };
  }

  private cacheKey({
    origin,
    destination,
    waypoints = [],
    mode = DEFAULT_TRANSPORT_MODE,
    optimize = false,
  }: RouteRequest): string {
    return [
      mode,
      optimize ? 'opt' : 'fixed',
      formatCoordinate(origin),
      formatCoordinate(destination),
      formatCoordinates(waypoints),
    ].join('#');
  }
}

export function toRouteRequest(
  points: readonly LatLng[],
  mode?: TransportMode,
): RouteRequest | null {
  if (points.length < 2) return null;

  return {
    origin: points[0],
    destination: points[points.length - 1],
    waypoints: points.slice(1, -1),
    ...(mode ? { mode } : {}),
  };
}
