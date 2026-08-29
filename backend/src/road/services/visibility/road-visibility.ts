import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RoadVisibility {
  private readonly live: Prisma.RoadWhereInput = { archivedAt: null };

  roadWhere(userId: string | null): Prisma.RoadWhereInput {
    if (!userId) return { isPublic: true, ...this.live };

    return {
      OR: [
        { userId, ...this.live },
        { isPublic: true, ...this.live },
        { favoriteRoads: { some: { userId } } },
      ],
    };
  }

  road(id: string, userId: string | null): Prisma.RoadWhereInput {
    return { id, ...this.roadWhere(userId) };
  }

  waypoint(id: string, userId: string | null): Prisma.WayPointWhereInput {
    const road = this.roadWhere(userId);
    const viaRoad = road.OR
      ? road.OR.map((clause) => ({ road: clause }))
      : [{ road }];

    return {
      id,
      OR: userId
        ? [...viaRoad, { favoriteWaypoints: { some: { userId } } }]
        : viaRoad,
    };
  }

  ownedBy(userId: string): Prisma.RoadWhereInput {
    return { userId, ...this.live };
  }

  published(): Prisma.RoadWhereInput {
    return { isPublic: true, ...this.live };
  }
}
