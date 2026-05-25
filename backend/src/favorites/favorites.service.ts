import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddFavoriteRoad,
  AddFavoriteWaypoint,
  RemoveFavorite,
} from './type/favorites.type';
import { ToastType } from 'src/common/type/status.type';
import { Prisma } from '@prisma/client';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async toggleFavoriteWaypoint(body: AddFavoriteWaypoint, userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const waypoint = await tx.wayPoint.findUnique({
          where: { id: body.waypointId },
        });

        if (!waypoint) {
          throw new NotFoundException('Waypoint not found');
        }

        const existingFavorite = await tx.favoriteWaypoint.findFirst({
          where: {
            userId,
            waypointId: waypoint.id,
          },
        });

        if (existingFavorite) {
          await tx.favoriteWaypoint.delete({
            where: { id: existingFavorite.id },
          });

          return {
            status: ToastType.Success,
            header: 'Removed Favorite',
            message: 'Favorite waypoint removed successfully',
          };
        }

        const favoriteWaypoint = await tx.favoriteWaypoint.create({
          data: {
            userId,
            waypointId: waypoint.id,
          },
        });

        return {
          status: ToastType.Success,
          header: 'Favorite Added',
          message: 'Favorite waypoint added successfully',
          data: favoriteWaypoint,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return {
            status: ToastType.Success,
            header: 'Already Favorited',
            message: 'This waypoint is already in your favorites',
          };
        }

        if (error.code === 'P2003') {
          return {
            status: ToastType.Error,
            header: 'Invalid Waypoint',
            message: 'The waypoint relation is invalid or missing',
          };
        }
      } else if (error instanceof NotFoundException) {
        return {
          status: ToastType.Error,
          header: 'Not Found',
          message: 'The waypoint you are trying to favorite does not exist',
        };
      }

      return {
        status: ToastType.Error,
        header: 'Error',
        message: 'An error occurred while toggling favorite waypoint',
      };
    }
  }

  async toggleFavoriteRoad(body: AddFavoriteRoad, userId: string) {
    try {
      const existingFavorite = await this.prisma.favoriteRoad.findFirst({
        where: {
          userId,
          roadId: body.roadId,
        },
      });

      if (existingFavorite) {
        await this.prisma.favoriteRoad.delete({
          where: { id: existingFavorite.id },
        });

        return {
          status: ToastType.Success,
          header: 'Removed Favorite',
          message: 'Favorite road removed successfully',
        };
      }

      const favoriteRoad = await this.prisma.favoriteRoad.create({
        data: {
          userId,
          roadId: body.roadId,
        },
      });

      return {
        status: ToastType.Success,
        header: 'Favorite Added',
        message: 'Favorite road added successfully',
        data: favoriteRoad,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          status: ToastType.Success,
          header: 'Already Favorited',
          message: 'This road is already in your favorites',
        };
      }

      return {
        status: ToastType.Error,
        header: 'Error',
        message: 'An error occurred while toggling favorite road',
      };
    }
  }

  async getAllFavorites(userId: string) {
    const [ownRoads, ownWaypoints, othersRoads, othersWaypoints] =
      await this.prisma.$transaction([
        this.prisma.favoriteRoad.findMany({
          where: {
            userId,
            deletedAt: null,
            road: { userId },
          },
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
              },
            },
          },
        }),

        this.prisma.favoriteWaypoint.findMany({
          where: {
            userId,
            deletedAt: null,
            waypoint: {
              road: { userId },
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            waypoint: {
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
            },
          },
        }),

        this.prisma.favoriteRoad.findMany({
          where: {
            userId,
            deletedAt: null,
            road: {
              userId: { not: userId },
            },
          },
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
                },
              },
            },
          },
        }),

        this.prisma.favoriteWaypoint.findMany({
          where: {
            userId,
            deletedAt: null,
            waypoint: {
              road: {
                userId: { not: userId },
              },
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            waypoint: {
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
            },
          },
        }),
      ]);

    return {
      status: ToastType.Success,
      header: 'All Favorites',
      message: 'Favorites retrieved successfully',
      data: {
        ownRoads,
        ownWaypoints,
        othersRoads,
        othersWaypoints,
      },
    };
  }
}
