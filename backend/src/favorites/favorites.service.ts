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
        const waypoint = await tx.wayPoints.findUnique({
          where: { id: body.waypointId },
          include: { address: true },
        });

        if (!waypoint) {
          throw new NotFoundException('Waypoint not found');
        }

        const favorite = await this.prisma.favoriteWaypoint.upsert({
          where: { userId_waypointId: { userId, waypointId: body.waypointId } },
          update: {},
          create: {
            userId,
            waypointId: body.waypointId,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            order: waypoint.order,
          },
        });

        return favorite;
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
            status: ToastType.Warning,
            header: 'Already Favorited',
            message: 'This waypoint is already in your favorites',
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
        message: 'Failed to add favorite waypoint',
      };
    }
  }

  async removeFavoriteWaypoint(body: RemoveFavorite) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const favorite = await tx.favoriteWaypoint.findUnique({
          where: { id: body.favoriteId },
        });

        if (!favorite) {
          throw new NotFoundException('Favorite waypoint not found');
        }

        const deleted = await tx.favoriteWaypoint.delete({
          where: {
            id: body.favoriteId,
          },
        });

        return deleted;
      });

      return {
        status: ToastType.Success,
        header: 'Removed Favorite',
        message: 'Favorite waypoint removed successfully',
        data: result,
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
        data: null,
      };
    }
  }

  async addFavoriteRoad(body: AddFavoriteRoad, userId: string) {
    try {
      const favorite = await this.prisma.$transaction(async (tx) => {
        const road = await tx.road.findUnique({
          where: { id: body.roadId },
          include: {
            wayPoints: {
              select: {
                id: true,
                latitude: true,
                longitude: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!road) throw new NotFoundException('Road not found');

        const favoriteRoad = await tx.favoriteRoad.create({
          data: {
            userId,
            roadId: road.id,
            title: road.title,
            description: road.description,
          },
        });

        const waypointFavorites = road.wayPoints.map((wp) => ({
          userId,
          waypointId: wp.id,
          latitude: wp.latitude,
          longitude: wp.longitude,
          order: wp.order,
          favoriteRoadId: favoriteRoad.id,
        }));

        if (waypointFavorites.length > 0) {
          await tx.favoriteWaypoint.createMany({
            data: waypointFavorites,
            skipDuplicates: true,
          });
        }

        return favoriteRoad;
      });

      return {
        status: ToastType.Success,
        header: 'Favorite Added',
        message: 'Favorite road added successfully',
        data: favorite,
      };
    } catch (error) {
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

        if (favorite?.roadId) {
          const wpIds = await tx.wayPoints.findMany({
            where: { roadId: favorite.roadId },
            select: { id: true },
          });

          if (wpIds.length > 0) {
            await tx.favoriteWaypoint.deleteMany({
              where: { userId, favoriteRoadId: favorite.id },
            });
          }

          await tx.road.update({
            where: { id: favorite.roadId },
            data: { favoriteRoad: { disconnect: { id: favorite.id } } },
          });
        }
        const res = await tx.favoriteRoad.delete({
          where: { id: favorite?.id },
        });

        return res;
      });

      return {
        status: ToastType.Success,
        header: 'Removed Favorite',
        message: 'Favorite road removed successfully',
        data: result,
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
        data: null,
      };
    }
  }

  async getAllFavorites(userId: string) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const waypoints = await tx.favoriteWaypoint.findMany({
          where: { userId },
        });

        const roads = await tx.favoriteRoad.findMany({
          where: { userId },
        });

        return { waypoints, roads };
      });

      return {
        status: ToastType.Success,
        header: 'All Favorites',
        message: 'Get all favorites data successfully',
        data: result,
      };
    } catch {
      return {
        status: ToastType.Error,
        header: 'Error',
        message: 'Failed to retrieve favorite data',
        data: null,
      };
    }
  }
}
