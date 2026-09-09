import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteStopDto,
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

  async toggleFavoriteStop(body: ToggleFavoriteStopDto, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.favoriteStop.findUnique({
          where: { userId_stopId: { userId, stopId: body.stopId } },
          select: { id: true },
        });

        if (existing) {
          await tx.favoriteStop.delete({ where: { id: existing.id } });

          return ok({
            header: 'Removed Favorite',
            message: 'Favorite stop removed successfully',
          });
        }

        const stop = await tx.stop.findFirst({
          where: {
            id: body.stopId,
            road: {
              archivedAt: null,
              OR: [{ userId }, { isPublic: true }],
            },
          },
          select: { id: true },
        });

        if (!stop) {
          throw new NotFoundException('Stop not found');
        }

        return ok({
          header: 'Favorite Added',
          message: 'Favorite stop added successfully',
          data: await tx.favoriteStop.create({
            data: { userId, stopId: stop.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'Already Favorited',
          message: 'This stop is already in your favorites',
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
    const [roads, roadTotal, stops, stopTotal] = await Promise.all([
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

      this.prisma.favoriteStop.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          stop: {
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
      this.prisma.favoriteStop.count({ where: { userId } }),
    ]);

    const ownRoads = roads.filter((f) => f.road.userId === userId);
    const othersRoads = roads.filter((f) => f.road.userId !== userId);

    const stripRoad = (favorite: (typeof stops)[number]) => ({
      ...favorite,
      stop: {
        id: favorite.stop.id,
        latitude: favorite.stop.latitude,
        longitude: favorite.stop.longitude,
        address: favorite.stop.address,
      },
    });

    const ownStops = stops
      .filter((f) => f.stop.road.userId === userId)
      .map(stripRoad);
    const othersStops = stops
      .filter((f) => f.stop.road.userId !== userId)
      .map(stripRoad);

    return ok({
      header: 'All Favorites',
      message: 'Favorites retrieved successfully',
      data: { ownRoads, ownStops, othersRoads, othersStops },
      meta: {
        roads: pageMeta(roadTotal, pagination),
        stops: pageMeta(stopTotal, pagination),
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

  async updateFavoriteStopAnnotation(
    favoriteId: string,
    userId: string,
    body: UpdateFavoriteAnnotationDto,
  ) {
    const favorite = await this.prisma.favoriteStop.findFirst({
      where: { id: favoriteId, userId },
      select: { id: true },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite stop not found');
    }

    const updated = await this.prisma.favoriteStop.update({
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
