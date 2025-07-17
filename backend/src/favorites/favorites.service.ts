import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { AddFavoriteWaypoint } from './type/favorites.type';
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
        message: 'Favorite added successfully',
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
}
