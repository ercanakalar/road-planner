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

  async addFavoriteWaypoint(body: AddFavoriteWaypoint, userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const waypoint = await tx.wayPoint.findUnique({
          where: { id: body.waypointId },
        });
        if (!waypoint) {
          throw new NotFoundException('Waypoint not found');
        }

        const favoriteWaypoint = await tx.favoriteWaypoint.create({
          data: {
            userId,
            waypointId: waypoint.id,
          },
        });

        return await tx.wayPoint.update({
          where: { id: waypoint.id },
          data: {
            favoriteWaypoints: { connect: { id: favoriteWaypoint.id } },
          },
          include: {
            favoriteWaypoints: true,
          },
        });
      });

      return {
        status: ToastType.Success,
        header: 'Favorite Added',
        message: 'Favorite waypoint added successfully',
        data: result,
      };
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
    }
  }

  async removeFavoriteWaypoint(body: RemoveFavorite) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const deletedFavorite = await tx.favoriteWaypoint.delete({
          where: { id: body.favoriteId },
        });

        if (deletedFavorite?.waypointId) {
          await tx.wayPoint.update({
            where: { id: deletedFavorite.waypointId },
            data: {
              favoriteWaypoints: { disconnect: { id: deletedFavorite.id } },
            },
          });
        }

        return deletedFavorite;
      });

      return {
        status: ToastType.Success,
        header: 'Removed Favorite',
        message: 'Favorite waypoint removed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          status: ToastType.Error,
          header: 'Not Found',
          message: 'Favorite waypoint not found or already deleted',
        };
      }

      return {
        status: ToastType.Error,
        header: 'Delete Failed',
        message: 'An error occurred while deleting',
      };
    }
  }

  async addFavoriteRoad(body: AddFavoriteRoad, userId: string) {
    try {
      const favorite = await this.prisma.$transaction(async (tx) => {
        const road = await tx.road.findUnique({
          where: { id: body.roadId },
        });

        if (!road) throw new NotFoundException('Road not found');

        return tx.favoriteRoad.create({
          data: {
            userId,
            roadId: road.id,
            title: road.title,
            description: road.description,
          },
        });
      });

      return {
        status: ToastType.Success,
        header: 'Favorite Added',
        message: 'Favorite road added successfully',
        data: favorite,
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
        header: error instanceof NotFoundException ? 'Not Found' : 'Error',
        message:
          error instanceof NotFoundException
            ? 'The road you are trying to favorite does not exist'
            : 'Failed to add favorite road',
      };
    }
  }

  async removeFavoriteRoad(body: RemoveFavorite, userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const favorite = await tx.favoriteRoad.findUnique({
          where: { id: body.favoriteId, userId },
          select: { id: true, roadId: true },
        });

        if (favorite?.id) {
          const res = await tx.favoriteRoad.delete({
            where: { id: favorite?.id },
          });
        }
        if (favorite?.roadId) {
          await tx.road.update({
            where: { id: favorite!.roadId! },
            data: {
              favoriteRoads: { disconnect: { id: favorite.id } },
            },
          });
        }
        return favorite;
      });

      return {
        status: ToastType.Success,
        header: 'Removed Favorite',
        message: 'Favorite road removed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          status: ToastType.Error,
          header: 'Not Found',
          message: 'Favorite road not found or already deleted',
        };
      }
      return {
        status: ToastType.Error,
        header: 'Delete Failed',
        message: 'An error occurred while deleting',
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
