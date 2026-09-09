import { Injectable } from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import {
  DirectionsService,
  toRouteRequest,
} from 'src/maps/services/directions.service';
import { ElevationService } from 'src/maps/services/elevation.service';
import { LatLng, TransportMode } from 'src/maps/types/maps.types';
import { pathLengthMeters, samplePath } from 'src/maps/utils/geo';
import { bearingDegrees, turnDegrees } from 'src/maps/utils/geo';
import { legTerrain } from 'src/maps/utils/terrain';
import { bendShapeFor, slopeGradeFor, StopMetrics } from '../stop/stop-metrics';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoadVisibility } from '../visibility/road-visibility';

/**
 * Google answers at most 512 elevations at once, and the whole route is asked
 * for in one go, so the sampler is capped here rather than at a fixed spacing.
 * A short route gets a sample every 100m; a long one stretches its spacing to
 * fit. Either way the route costs exactly one directions call and one
 * elevation call.
 */
const MAX_SAMPLES = 512;
const FINEST_SPACING_METERS = 100;

/**
 * What one stop is told about the road that reaches it.
 *
 * `shape` is deliberately the same type `stop-metrics` produces from stored
 * elevations, so the card draws one row whichever measured it. The difference
 * is where the numbers come from: these are read off the polyline Google
 * actually routes along, so a climb is the climb of the road rather than of
 * the straight line between two pins.
 */
export interface StopTerrain {
  stopId: string;
  /** Null for the first stop: nothing leads to it. */
  shape: StopMetrics | null;
}

@Injectable()
export class RoadTerrainService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private directions: DirectionsService,
    private elevation: ElevationService,
  ) {}

  /**
   * The shape of the road at a road's own stops.
   *
   * Only the lookup belongs here — the measuring is `measure`, which knows
   * nothing about roads or who may read them, so the same reading is available
   * to a route that has not been saved yet.
   */
  async getTerrain(
    roadId: string,
    userId: string | null,
    mode?: TransportMode,
  ) {
    const stops = await this.stopsOf(roadId, userId);
    const shapes = await this.measure(stops, mode);

    return ok({
      header: 'Terrain',
      message: shapes.some(Boolean)
        ? 'Terrain calculated'
        : 'Nothing to measure along this route',
      data: stops.map<StopTerrain>(({ id }, index) => ({
        stopId: id,
        shape: shapes[index] ?? null,
      })),
    });
  }

  /** `measure`, wrapped for a caller that hands over bare coordinates. */
  async measureStops(coordinates: readonly LatLng[], mode?: TransportMode) {
    const shapes = await this.measure(coordinates, mode);

    return ok({
      header: 'Terrain',
      message: shapes.some(Boolean)
        ? 'Terrain calculated'
        : 'Nothing to measure along this route',
      data: shapes,
    });
  }

  /**
   * How the road runs into each of these points, in the order given.
   *
   * One entry per point, the first always null because nothing leads to it.
   * Everything is read off the polyline Google routes along rather than the
   * straight lines between the points, which is the whole reason this exists:
   * two pins either side of a valley are not a climb.
   */
  async measure(
    coordinates: readonly LatLng[],
    mode?: TransportMode,
  ): Promise<(StopMetrics | null)[]> {
    const empty = coordinates.map(() => null);
    const request = toRouteRequest(
      coordinates.map(({ latitude, longitude }) => ({ latitude, longitude })),
      mode,
    );
    if (!request) return empty;

    const route = await this.directions.route(request);
    if (!route || route.coordinates.length < 2) return empty;

    const path = route.coordinates;
    const totalMeters = pathLengthMeters(path);
    // samplePath returns one point per interval plus the final one, so the
    // spacing divides into one fewer interval than the sample budget.
    const spacing = Math.max(
      FINEST_SPACING_METERS,
      Math.ceil(totalMeters / (MAX_SAMPLES - 1)),
    );

    const samples = samplePath(path, spacing);
    const elevations = await this.elevation.elevations(samples);

    const legs = this.splitByLeg(samples, spacing, route.legs);

    return coordinates.map((_, index) => {
      const leg = index === 0 ? null : legs[index - 1];
      if (!leg) return null;

      const terrain = legTerrain(
        samples.slice(leg.from, leg.to + 1),
        elevations.slice(leg.from, leg.to + 1),
      );
      const net = terrain.climbMeters - terrain.descentMeters;
      const turn = this.turnAt(samples, legs, index);

      return {
        // The road's own length, not the straight line: this is the distance
        // actually driven to arrive here.
        distanceFromPreviousMeters:
          route.legs[index - 1]?.distanceMeters ?? null,
        climbMeters: net,
        slopePercent: terrain.averageGradientPercent,
        slopeGrade: slopeGradeFor(terrain.averageGradientPercent),
        bendDegrees: turn === null ? null : Math.round(Math.abs(turn)),
        bendDirection:
          turn === null || turn === 0 ? null : turn < 0 ? 'left' : 'right',
        bendShape: turn === null ? null : bendShapeFor(turn),
      };
    });
  }

  /**
   * Where each leg starts and ends among the samples.
   *
   * Google reports the length of every leg, and the samples are evenly spaced
   * along the same polyline, so a running total converts leg boundaries into
   * sample indexes without having to project each stop back onto the line.
   */
  private splitByLeg(
    samples: readonly LatLng[],
    spacingMeters: number,
    legs: readonly { distanceMeters: number }[],
  ): { from: number; to: number }[] {
    const last = samples.length - 1;
    let cursor = 0;
    let metersSoFar = 0;

    return legs.map((leg, index) => {
      metersSoFar += leg.distanceMeters;

      // The final leg always ends on the last sample, whatever rounding did to
      // the running total, so no tail of the road is left unmeasured.
      const to =
        index === legs.length - 1
          ? last
          : Math.min(last, Math.round(metersSoFar / spacingMeters));

      const from = cursor;
      cursor = Math.max(from, to);

      return { from, to: Math.max(to, from + 1 <= last ? from + 1 : from) };
    });
  }

  /**
   * The stops to measure, or none.
   *
   * Terrain decorates a screen that has already loaded the road, so a road
   * this caller cannot read is answered with no terrain rather than an error:
   * failing here would break the screen over an ornament. Answering the same
   * way for an unreadable road as for an unmeasurable one also keeps the
   * endpoint from confirming that a private road exists.
   */
  /**
   * How far the road turns at the stop that ends leg `index - 1`.
   *
   * Taken from the sampled polyline either side of the stop, so a junction the
   * road actually swings through is measured, not the angle between three pins
   * that may sit kilometres apart. Null at the last stop, which nothing leaves.
   */
  private turnAt(
    samples: readonly LatLng[],
    legs: readonly { from: number; to: number }[],
    index: number,
  ): number | null {
    const arriving = legs[index - 1];
    const leaving = legs[index];
    if (!arriving || !leaving) return null;

    const before = samples[arriving.to - 1];
    const at = samples[arriving.to];
    const after = samples[leaving.from + 1] ?? samples[leaving.to];
    if (!before || !at || !after) return null;

    return turnDegrees(bearingDegrees(before, at), bearingDegrees(at, after));
  }

  private async stopsOf(roadId: string, userId: string | null) {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(roadId, userId),
      select: {
        stops: {
          select: { id: true, latitude: true, longitude: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return road?.stops ?? [];
  }
}
