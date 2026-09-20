import { Injectable, Logger } from '@nestjs/common';

import { GoogleMapsClient } from './google-maps.client';
import { LatLng } from '../types/maps.types';
import { formatCoordinate, formatCoordinates } from '../utils/coordinates';
import { createTtlCache } from '../utils/ttl-cache';

const CACHE = { ttlMs: 30 * 24 * 60 * 60 * 1000, maxEntries: 5000 };

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
