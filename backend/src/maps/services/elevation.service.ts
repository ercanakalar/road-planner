import { Injectable, Logger } from '@nestjs/common';

import { GoogleMapsClient } from './google-maps.client';
import { LatLng } from '../types/maps.types';
import { formatCoordinate, formatCoordinates } from '../utils/coordinates';
import { createTtlCache } from '../utils/ttl-cache';

/**
 * Ground height does not change, so a coordinate's elevation is cached for as
 * long as the process lives rather than for a day like an address, which can be
 * renamed underneath us.
 */
const CACHE = { ttlMs: 30 * 24 * 60 * 60 * 1000, maxEntries: 5000 };

/**
 * The Elevation API takes many locations in one call. Google's documented
 * ceiling is 512 per request; a route is far shorter than that, but a batch is
 * still chunked so one absurd import cannot produce a URL the API rejects.
 */
const MAX_PER_REQUEST = 250;

interface ElevationResponse {
  status: string;
  results?: { elevation?: number }[];
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
};

@Injectable()
export class ElevationService {
  private readonly logger = new Logger(ElevationService.name);

  private readonly cache = createTtlCache<number | null>(CACHE);

  constructor(private client: GoogleMapsClient) {}

  /**
   * Ground height in metres above sea level for each point, in the order given.
   *
   * Never throws and never rejects: a stop whose height could not be looked up
   * gets null and is saved anyway. Elevation decorates a route; it is not a
   * reason to refuse to store one, and a Maps outage should not take saving a
   * stop down with it.
   */
  async elevations(points: readonly LatLng[]): Promise<(number | null)[]> {
    if (points.length === 0) return [];

    if (!this.client.isConfigured()) return points.map(() => null);

    const cached = points.map((point) =>
      this.cache.peek(formatCoordinate(point)),
    );

    const missing = points.filter((_, index) => !cached[index]);
    const resolved = new Map<string, number | null>();

    for (const batch of chunk(missing, MAX_PER_REQUEST)) {
      const heights = await this.fetchBatch(batch);

      batch.forEach((point, index) => {
        const key = formatCoordinate(point);
        const height = heights[index] ?? null;

        resolved.set(key, height);
        this.cache.resolve(key, () => Promise.resolve(height)).catch(() => {});
      });
    }

    return points.map((point, index) => {
      const hit = cached[index];
      if (hit) return hit.value;

      return resolved.get(formatCoordinate(point)) ?? null;
    });
  }

  /** The height of one point, or null if it could not be looked up. */
  async elevation(point: LatLng): Promise<number | null> {
    const [height] = await this.elevations([point]);
    return height ?? null;
  }

  private async fetchBatch(
    points: readonly LatLng[],
  ): Promise<(number | null)[]> {
    try {
      const body = await this.client.get<ElevationResponse>('/elevation/json', {
        locations: formatCoordinates(points),
      });

      const results = body.results ?? [];

      // A short results array would silently shift every height onto the wrong
      // stop, which is worse than having none, so the whole batch is dropped.
      if (results.length !== points.length) {
        this.logger.warn(
          `Elevation returned ${results.length} heights for ${points.length} points`,
        );
        return points.map(() => null);
      }

      return results.map((result) =>
        typeof result.elevation === 'number' &&
        Number.isFinite(result.elevation)
          ? result.elevation
          : null,
      );
    } catch (error) {
      this.logger.warn(
        `Elevation lookup failed for ${points.length} points: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return points.map(() => null);
    }
  }
}
