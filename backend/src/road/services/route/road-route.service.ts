import { Injectable, NotFoundException } from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import {
  DirectionsService,
  toRouteRequest,
} from 'src/maps/services/directions.service';
import { LatLng, TransportMode } from 'src/maps/types/maps.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoadVisibility } from '../visibility/road-visibility';

const TOO_SHORT = 'A route needs at least two waypoints';

@Injectable()
export class RoadRouteService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private directions: DirectionsService,
  ) {}

  async getRoute(roadId: string, userId: string | null, mode?: TransportMode) {
    const request = toRouteRequest(
      await this.waypointsOf(roadId, userId),
      mode,
    );

    if (!request) {
      return ok({ header: 'Route', message: TOO_SHORT, data: null });
    }

    const route = await this.directions.route(request);

    return ok({
      header: 'Route',
      message: route ? 'Route calculated' : 'No route between those points',
      data: route,
    });
  }

  async getDurations(
    roadId: string,
    userId: string | null,
    modes: readonly TransportMode[],
  ) {
    const request = toRouteRequest(await this.waypointsOf(roadId, userId));

    if (!request) {
      return ok({ header: 'Durations', message: TOO_SHORT, data: {} });
    }

    return ok({
      header: 'Durations',
      message: 'Travel times calculated',
      data: await this.directions.durations(request, modes),
    });
  }

  private async waypointsOf(
    roadId: string,
    userId: string | null,
  ): Promise<LatLng[]> {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(roadId, userId),
      select: {
        wayPoints: {
          select: { latitude: true, longitude: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!road) {
      throw new NotFoundException('Road not found');
    }

    return road.wayPoints;
  }
}
