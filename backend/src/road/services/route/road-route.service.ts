import { Injectable, NotFoundException } from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import {
  DirectionsService,
  toRouteRequest,
} from 'src/maps/services/directions.service';
import { LatLng, TransportMode } from 'src/maps/types/maps.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoadVisibility } from '../visibility/road-visibility';

const TOO_SHORT = 'route.tooShort';

@Injectable()
export class RoadRouteService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private directions: DirectionsService,
  ) {}

  async getRoute(roadId: string, userId: string | null, mode?: TransportMode) {
    const request = toRouteRequest(await this.stopsOf(roadId, userId), mode);

    if (!request) {
      return ok({ header: 'route.header', message: TOO_SHORT, data: null });
    }

    const route = await this.directions.route(request);

    return ok({
      header: 'route.header',
      message: route ? 'route.calculated' : 'route.none',
      data: route,
    });
  }

  async getDurations(
    roadId: string,
    userId: string | null,
    modes: readonly TransportMode[],
  ) {
    const request = toRouteRequest(await this.stopsOf(roadId, userId));

    if (!request) {
      return ok({
        header: 'route.durationsHeader',
        message: TOO_SHORT,
        data: {},
      });
    }

    return ok({
      header: 'route.durationsHeader',
      message: 'route.durationsCalculated',
      data: await this.directions.durations(request, modes),
    });
  }

  private async stopsOf(
    roadId: string,
    userId: string | null,
  ): Promise<LatLng[]> {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(roadId, userId),
      select: {
        stops: {
          select: { latitude: true, longitude: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!road) {
      throw new NotFoundException('error.routeNotFound');
    }

    return road.stops;
  }
}
