import { Injectable, Logger } from '@nestjs/common';

import { DirectionsService } from './directions.service';
import { PlacesService } from './places.service';
import {
  DEFAULT_TRANSPORT_MODE,
  LatLng,
  NearbyPlace,
  RoutePlace,
  RouteSearchRequest,
  RouteSearchResult,
  RouteSearchSort,
} from '../types/maps.types';
import { formatCoordinate, formatCoordinates } from '../utils/coordinates';
import { pathLengthMeters, projectOntoPath, samplePath } from '../utils/geo';
import { createTtlCache } from '../utils/ttl-cache';

const NEARBY_RADIUS_MAX_METERS = 50_000;

const MAX_RADIUS_STRETCH = 1.5;

const MAX_SEARCH_POINTS = 12;

const CACHE = { ttlMs: 5 * 60 * 1000, maxEntries: 200 };

const byDetour = (first: RoutePlace, second: RoutePlace): number =>
  first.distanceFromRouteMeters - second.distanceFromRouteMeters;

const byRoutePosition = (first: RoutePlace, second: RoutePlace): number =>
  first.distanceAlongRouteMeters - second.distanceAlongRouteMeters;

const byRating = (first: RoutePlace, second: RoutePlace): number =>
  (second.rating ?? 0) - (first.rating ?? 0) ||
  (second.ratingCount ?? 0) - (first.ratingCount ?? 0);

const SORTS: Record<
  RouteSearchSort,
  (first: RoutePlace, second: RoutePlace) => number
> = {
  detour: byDetour,
  route: byRoutePosition,
  rating: byRating,
};

@Injectable()
export class RouteSearchService {
  private readonly logger = new Logger(RouteSearchService.name);

  private readonly cache = createTtlCache<RouteSearchResult | null>(CACHE);

  constructor(
    private directions: DirectionsService,
    private places: PlacesService,
  ) {}

  async search(request: RouteSearchRequest): Promise<RouteSearchResult | null> {
    return this.cache.resolve(this.cacheKey(request), () =>
      this.runSearch(request),
    );
  }

  private async runSearch(
    request: RouteSearchRequest,
  ): Promise<RouteSearchResult | null> {
    const route = await this.directions.route(request);
    if (!route || route.coordinates.length === 0) return null;

    const { radiusMeters, limit, sortBy, minRating } = request;
    const routeMeters = pathLengthMeters(route.coordinates);
    const { spacingMeters, searchRadiusMeters } = this.plan(
      routeMeters,
      radiusMeters,
    );

    const points = samplePath(route.coordinates, spacingMeters);
    const found = await this.searchAround(points, searchRadiusMeters, request);
    const stops = this.stopPositions(request, route.coordinates);

    const places = found
      .flatMap((place) =>
        this.onRoute(place, route.coordinates, radiusMeters, stops),
      )
      .filter((place) => (place.rating ?? 0) >= (minRating ?? 0))
      .sort(SORTS[sortBy])
      .slice(0, limit);

    return {
      places,
      radiusMeters,
      routeDistanceMeters: route.distanceMeters,
      routeDurationSeconds: route.durationSeconds,
      mode: route.mode,
      searchedPoints: points.length,
      coversWholeRoute: searchRadiusMeters >= radiusMeters + spacingMeters / 2,
    };
  }

  private plan(
    routeMeters: number,
    radiusMeters: number,
  ): { spacingMeters: number; searchRadiusMeters: number } {
    const affordable = routeMeters / (MAX_SEARCH_POINTS - 1);
    const spacingMeters = Math.max(radiusMeters, affordable);

    return {
      spacingMeters,
      searchRadiusMeters: Math.min(
        NEARBY_RADIUS_MAX_METERS,
        radiusMeters * MAX_RADIUS_STRETCH,
        radiusMeters + spacingMeters / 2,
      ),
    };
  }

  private async searchAround(
    points: readonly LatLng[],
    searchRadiusMeters: number,
    { keyword, category, openNow }: RouteSearchRequest,
  ): Promise<NearbyPlace[]> {
    const settled = await Promise.allSettled(
      points.map((location) =>
        this.places.nearby({
          location,
          radiusMeters: searchRadiusMeters,
          ...(keyword ? { keyword } : {}),
          ...(category ? { category } : {}),
          ...(openNow ? { openNow } : {}),
        }),
      ),
    );

    const failures = settled.filter((result) => result.status === 'rejected');

    if (failures.length === settled.length && settled.length > 0) {
      throw (failures[0] as PromiseRejectedResult).reason;
    }

    if (failures.length > 0) {
      this.logger.warn(
        `Route search: ${failures.length} of ${settled.length} circles failed`,
      );
    }

    const byPlaceId = new Map<string, NearbyPlace>();

    settled.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      result.value.forEach((place) => byPlaceId.set(place.placeId, place));
    });

    return [...byPlaceId.values()];
  }

  private stopPositions(
    { origin, destination, waypoints = [] }: RouteSearchRequest,
    route: readonly LatLng[],
  ): number[] {
    return [origin, ...waypoints, destination].map(
      (stop) => projectOntoPath(stop, route)?.alongMeters ?? 0,
    );
  }

  private onRoute(
    place: NearbyPlace,
    route: readonly LatLng[],
    radiusMeters: number,
    stops: readonly number[],
  ): RoutePlace[] {
    const projection = projectOntoPath(place, route);

    if (!projection || projection.distanceMeters > radiusMeters) return [];

    return [
      {
        ...place,
        distanceFromRouteMeters: Math.round(projection.distanceMeters),
        distanceAlongRouteMeters: Math.round(projection.alongMeters),
        detourMeters: Math.round(projection.distanceMeters * 2),
        insertAfterIndex: this.stopBefore(projection.alongMeters, stops),
      },
    ];
  }

  private stopBefore(alongMeters: number, stops: readonly number[]): number {
    const passed = stops.filter((stop) => stop <= alongMeters).length - 1;

    return Math.min(Math.max(passed, 0), stops.length - 2);
  }

  private cacheKey({
    origin,
    destination,
    waypoints = [],
    mode = DEFAULT_TRANSPORT_MODE,
    keyword,
    category,
    radiusMeters,
    openNow,
    minRating,
    limit,
    sortBy,
  }: RouteSearchRequest): string {
    return [
      mode,
      formatCoordinate(origin),
      formatCoordinate(destination),
      formatCoordinates(waypoints),
      keyword?.toLowerCase() ?? '',
      category ?? '',
      Math.round(radiusMeters),
      openNow ? 'open' : 'any',
      minRating ?? 0,
      limit,
      sortBy,
    ].join('#');
  }
}
