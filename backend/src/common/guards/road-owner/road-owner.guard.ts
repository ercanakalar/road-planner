import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma.service';

const WAYPOINT_PARAM = 'waypointId';

const ROAD_PARAMS = ['roadId', 'id'] as const;

@Injectable()
export class RoadOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req.user as { userId?: string } | undefined)?.userId;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const params = (req.params ?? {}) as Record<string, string | undefined>;
    const roadId = await this.resolveRoadId(params);

    const road = await this.prisma.road.findUnique({
      where: { id: roadId },
      select: { userId: true },
    });

    if (!road) {
      throw new NotFoundException('Road not found');
    }

    if (!road.userId || road.userId !== userId) {
      throw new ForbiddenException('You do not own this road');
    }

    return true;
  }

  private async resolveRoadId(
    params: Record<string, string | undefined>,
  ): Promise<string> {
    const waypointId = params[WAYPOINT_PARAM];

    if (waypointId) {
      const waypoint = await this.prisma.wayPoint.findUnique({
        where: { id: waypointId },
        select: { roadId: true },
      });

      if (!waypoint?.roadId) {
        throw new NotFoundException('Waypoint not found');
      }

      return waypoint.roadId;
    }

    for (const param of ROAD_PARAMS) {
      const value = params[param];
      if (value) return value;
    }

    throw new ForbiddenException(
      'Route is missing a road or waypoint identifier',
    );
  }
}
