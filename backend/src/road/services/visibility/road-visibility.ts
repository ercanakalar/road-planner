import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RoadVisibility {
  private readonly live: Prisma.RoadWhereInput = { archivedAt: null };

  roadWhere(userId: string | null): Prisma.RoadWhereInput {
    if (!userId) return { isPublic: true, ...this.live };

    // A favourite keeps a route someone shared by link readable after the
    // link is gone — but not once its owner has deleted it.
    return {
      OR: [
        { userId, ...this.live },
        { isPublic: true, ...this.live },
        { favoriteRoads: { some: { userId } }, ...this.live },
      ],
    };
  }

  road(id: string, userId: string | null): Prisma.RoadWhereInput {
    return { id, ...this.roadWhere(userId) };
  }

  stop(id: string, userId: string | null): Prisma.StopWhereInput {
    const road = this.roadWhere(userId);
    const viaRoad = road.OR
      ? road.OR.map((clause) => ({ road: clause }))
      : [{ road }];

    return {
      id,
      OR: userId
        ? [...viaRoad, { favoriteStops: { some: { userId } } }]
        : viaRoad,
    };
  }

  ownedBy(userId: string): Prisma.RoadWhereInput {
    return { userId, ...this.live };
  }
}
