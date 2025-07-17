import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { AddFavoriteRoad, AddFavoriteWaypoint } from './type/favorites.type';
import { ToastType } from 'src/common/type/status.type';
import { Prisma } from '@prisma/client';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavoriteWaypoint(body: AddFavoriteWaypoint, userId: string) {
    try {
      const favorite = await this.prisma.favoriteWaypoint.create({
        data: {
          userId,
          wayPointsId: body.waypointId,
        },
        include: {
          waypoint: true,
        },
      });

      return {
        status: ToastType.Success,
        header: 'Favorite Added',
        message: 'Favorite waypoint added successfully',
        data: favorite,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          status: ToastType.Warning,
          header: 'Already Favorited',
          message: 'This waypoint is already in your favorites',
        };
      }

      throw error;
    }
  }

  async addFavoriteRoad(body: AddFavoriteRoad, userId: string) {
    try {
      const favorite = await this.prisma.favoriteRoad.create({
        data: {
          userId,
          roadId: body.roadId,
        },
        include: {
          road: {
            include: {
              wayPoints: true,
            },
          },
        },
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
          status: ToastType.Warning,
          header: 'Already Favorited',
          message: 'This road is already in your favorites',
        };
      }

      throw error;
    }
  }

  async getAllFavorites(userId: string) {
    try {
      const [waypoints, roads] = await Promise.all([
        this.prisma.favoriteWaypoint.findMany({
          where: { userId },
          include: { waypoint: true },
        }),
        this.prisma.favoriteRoad.findMany({
          where: { userId },
          include: {
            road: {
              include: {
                wayPoints: true,
              },
            },
          },
        }),
      ]);

      return {
        status: ToastType.Success,
        header: 'All Favorites',
        message: 'Get all favorites data successfully',
        data: { waypoints, roads },
      };
    } catch (error) {
      console.error('Error getting favorites:', error);
      return {
        status: ToastType.Error,
        header: 'Error',
        message: 'Failed to retrieve favorite data',
      };
    }
  }
}
