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

const MAX_SAMPLES = 512;
const FINEST_SPACING_METERS = 100;

export interface StopTerrain {
  stopId: string;
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

  async getTerrain(
    roadId: string,
    userId: string | null,
    mode?: TransportMode,
  ) {
    const stops = await this.stopsOf(roadId, userId);
    const shapes = await this.measure(stops, mode);

    return ok({
      header: 'terrain.header',
      message: shapes.some(Boolean)
        ? 'terrain.calculated'
        : 'terrain.nothingToMeasure',
      data: stops.map<StopTerrain>(({ id }, index) => ({
        stopId: id,
        shape: shapes[index] ?? null,
      })),
    });
  }

  async measureStops(coordinates: readonly LatLng[], mode?: TransportMode) {
    const shapes = await this.measure(coordinates, mode);

    return ok({
      header: 'terrain.header',
      message: shapes.some(Boolean)
        ? 'terrain.calculated'
        : 'terrain.nothingToMeasure',
      data: shapes,
    });
  }

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

      const to =
        index === legs.length - 1
          ? last
          : Math.min(last, Math.round(metersSoFar / spacingMeters));

      const from = cursor;
      cursor = Math.max(from, to);

      return { from, to: Math.max(to, from + 1 <= last ? from + 1 : from) };
    });
  }

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
