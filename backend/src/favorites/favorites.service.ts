import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteWaypointDto,
  UpdateFavoriteAnnotationDto,
} from './dto/favorites.dto';

function isDuplicate(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async toggleFavoriteWaypoint(
    body: ToggleFavoriteWaypointDto,
    userId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.favoriteWaypoint.findUnique({
          where: { userId_waypointId: { userId, waypointId: body.waypointId } },
          select: { id: true },
        });

        if (existing) {
          await tx.favoriteWaypoint.delete({ where: { id: existing.id } });

          return ok({
            header: 'Removed Favorite',
            message: 'Favorite waypoint removed successfully',
          });
        }

        const waypoint = await tx.wayPoint.findFirst({
          where: {
            id: body.waypointId,
            road: {
              archivedAt: null,
              OR: [{ userId }, { isPublic: true }],
            },
          },
          select: { id: true },
        });

        if (!waypoint) {
          throw new NotFoundException('Waypoint not found');
        }

        return ok({
          header: 'Favorite Added',
          message: 'Favorite waypoint added successfully',
          data: await tx.favoriteWaypoint.create({
            data: { userId, waypointId: waypoint.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'Already Favorited',
          message: 'This waypoint is already in your favorites',
        });
      }

      throw error;
    }
  }

  async toggleFavoriteRoad(body: ToggleFavoriteRoadDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.favoriteRoad.findUnique({
          where: { userId_roadId: { userId, roadId: body.roadId } },
          select: { id: true },
        });

        if (existing) {
          await tx.favoriteRoad.delete({ where: { id: existing.id } });

          return ok({
            header: 'Removed Favorite',
            message: 'Favorite route removed successfully',
          });
        }

        const road = await tx.road.findFirst({
          where: {
            id: body.roadId,
            archivedAt: null,
            OR: [{ userId }, { isPublic: true }],
          },
          select: { id: true },
        });

        if (!road) {
          throw new NotFoundException('Route not found');
        }

        return ok({
          header: 'Favorite Added',
          message: 'Favorite route added successfully',
          data: await tx.favoriteRoad.create({
            data: { userId, roadId: road.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'Already Favorited',
          message: 'This route is already in your favorites',
        });
      }

      throw error;
    }
  }

  async getAllFavorites(userId: string, pagination: PaginationQueryDto) {
    const page = {
      take: pagination.limit,
      skip: pagination.offset,
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    };

    // A favourited route is drawn as one row: its name, its note and whether
    // it has been withdrawn. Its stops were being loaded here and thrown away
    // by the caller, so they are no longer asked for. The four reads do not
    // depend on each other, so they go to the database together instead of
    // one after another inside a transaction.
    const [roads, roadTotal, waypoints, waypointTotal] = await Promise.all([
      this.prisma.favoriteRoad.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          road: {
            select: {
              id: true,
              title: true,
              description: true,
              userId: true,
              archivedAt: true,
            },
          },
        },
        ...page,
      }),
      this.prisma.favoriteRoad.count({ where: { userId } }),

      this.prisma.favoriteWaypoint.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          waypoint: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
              road: { select: { userId: true } },
              address: true,
            },
          },
        },
        ...page,
      }),
      this.prisma.favoriteWaypoint.count({ where: { userId } }),
    ]);

    const ownRoads = roads.filter((f) => f.road.userId === userId);
    const othersRoads = roads.filter((f) => f.road.userId !== userId);

    const stripRoad = (favorite: (typeof waypoints)[number]) => ({
      ...favorite,
      waypoint: {
        id: favorite.waypoint.id,
        latitude: favorite.waypoint.latitude,
        longitude: favorite.waypoint.longitude,
        address: favorite.waypoint.address,
      },
    });

    const ownWaypoints = waypoints
      .filter((f) => f.waypoint.road.userId === userId)
      .map(stripRoad);
    const othersWaypoints = waypoints
      .filter((f) => f.waypoint.road.userId !== userId)
      .map(stripRoad);

    return ok({
      header: 'All Favorites',
      message: 'Favorites retrieved successfully',
      data: { ownRoads, ownWaypoints, othersRoads, othersWaypoints },
      meta: {
        roads: pageMeta(roadTotal, pagination),
        waypoints: pageMeta(waypointTotal, pagination),
      },
    });
  }

  async updateFavoriteRoadAnnotation(
    favoriteId: string,
    userId: string,
    body: UpdateFavoriteAnnotationDto,
  ) {
    const favorite = await this.prisma.favoriteRoad.findFirst({
      where: { id: favoriteId, userId },
      select: { id: true },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite route not found');
    }

    const updated = await this.prisma.favoriteRoad.update({
      where: { id: favorite.id },
      data: pickAnnotation(body),
      select: { id: true, title: true, description: true },
    });

    return ok({
      header: 'Favorite updated',
      message: 'Your changes were saved',
      data: updated,
    });
  }

  async updateFavoriteWaypointAnnotation(
    favoriteId: string,
    userId: string,
    body: UpdateFavoriteAnnotationDto,
  ) {
    const favorite = await this.prisma.favoriteWaypoint.findFirst({
      where: { id: favoriteId, userId },
      select: { id: true },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite waypoint not found');
    }

    const updated = await this.prisma.favoriteWaypoint.update({
      where: { id: favorite.id },
      data: pickAnnotation(body),
      select: { id: true, title: true, description: true },
    });

    return ok({
      header: 'Favorite updated',
      message: 'Your changes were saved',
      data: updated,
    });
  }
}

function pickAnnotation(body: UpdateFavoriteAnnotationDto) {
  const data: { title?: string; description?: string } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  return data;
}
