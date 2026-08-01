import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteWaypointDto,
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

        const waypoint = await tx.wayPoint.findUnique({
          where: { id: body.waypointId },
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
            message: 'Favorite road removed successfully',
          });
        }

        const road = await tx.road.findUnique({
          where: { id: body.roadId },
          select: { id: true },
        });

        if (!road) {
          throw new NotFoundException('Road not found');
        }

        return ok({
          header: 'Favorite Added',
          message: 'Favorite road added successfully',
          data: await tx.favoriteRoad.create({
            data: { userId, roadId: road.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'Already Favorited',
          message: 'This road is already in your favorites',
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

    const [roads, roadTotal, waypoints, waypointTotal] =
      await this.prisma.$transaction([
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
                wayPoints: {
                  select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    address: {
                      select: {
                        country: true,
                        province: true,
                        district: true,
                        address: true,
                      },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
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
                address: {
                  select: {
                    country: true,
                    province: true,
                    district: true,
                    address: true,
                  },
                },
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
}
