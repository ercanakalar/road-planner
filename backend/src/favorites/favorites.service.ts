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
            header: 'favorite.removedHeader',
            message: 'favorite.stopRemoved',
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
          throw new NotFoundException('error.stopNotFound');
        }

        return ok({
          header: 'favorite.addedHeader',
          message: 'favorite.stopAdded',
          data: await tx.favoriteStop.create({
            data: { userId, stopId: stop.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'favorite.alreadyHeader',
          message: 'favorite.stopAlready',
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
            header: 'favorite.removedHeader',
            message: 'favorite.routeRemoved',
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
          throw new NotFoundException('error.routeNotFound');
        }

        return ok({
          header: 'favorite.addedHeader',
          message: 'favorite.routeAdded',
          data: await tx.favoriteRoad.create({
            data: { userId, roadId: road.id },
          }),
        });
      });
    } catch (error) {
      if (isDuplicate(error)) {
        return ok({
          header: 'favorite.alreadyHeader',
          message: 'favorite.routeAlready',
        });
      }

      throw error;
    }
  }

  // One statement, one round trip. Prisma's version took seven — each
  // favourite list, then its roads, stops and the stops' roads, then two
  // counts — and on a pool of three connections the screen's other requests
  // queued behind them. Each page is read through the (userId, createdAt, id)
  // index of its table and joined to its targets by primary key.
  async getAllFavorites(userId: string, pagination: PaginationQueryDto) {
    const [row] = await this.prisma.$queryRaw<FavoritesRow[]>`
      WITH roads AS (
        SELECT f."id", f."title", f."description", f."createdAt",
               json_build_object(
                 'id', r."id",
                 'title', r."title",
                 'description', r."description",
                 'userId', r."userId",
                 'archivedAt', to_char(r."archivedAt",
                                       'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
               ) AS "road"
          FROM "FavoriteRoad" f
          JOIN "Road" r ON r."id" = f."roadId"
         WHERE f."userId" = ${userId}
         ORDER BY f."createdAt" DESC, f."id" DESC
         LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      ),
      stops AS (
        SELECT f."id", f."title", f."description", f."createdAt",
               json_build_object(
                 'id', s."id",
                 'latitude', s."latitude",
                 'longitude', s."longitude",
                 'address', s."address"
               ) AS "stop",
               r."userId" = ${userId} AS "isOwn"
          FROM "FavoriteStop" f
          JOIN "Stop" s ON s."id" = f."stopId"
          JOIN "Road" r ON r."id" = s."roadId"
         WHERE f."userId" = ${userId}
         ORDER BY f."createdAt" DESC, f."id" DESC
         LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      )
      SELECT
        COALESCE((
          SELECT json_agg(json_build_object(
                   'id', "id", 'title', "title",
                   'description', "description", 'road', "road")
                 ORDER BY "createdAt" DESC, "id" DESC)
            FROM roads
        ), '[]'::json) AS "roads",
        COALESCE((
          SELECT json_agg(json_build_object(
                   'id', "id", 'title', "title",
                   'description', "description", 'stop', "stop",
                   'isOwn', "isOwn")
                 ORDER BY "createdAt" DESC, "id" DESC)
            FROM stops
        ), '[]'::json) AS "stops",
        (SELECT COUNT(*) FROM "FavoriteRoad" WHERE "userId" = ${userId})::int
          AS "roadTotal",
        (SELECT COUNT(*) FROM "FavoriteStop" WHERE "userId" = ${userId})::int
          AS "stopTotal"`;

    const roads = parseJson<FavoriteRoadRow[]>(row?.roads);
    const stops = parseJson<FavoriteStopRow[]>(row?.stops);
    const roadTotal = row?.roadTotal ?? 0;
    const stopTotal = row?.stopTotal ?? 0;

    const ownRoads = roads.filter((f) => f.road.userId === userId);
    const othersRoads = roads.filter((f) => f.road.userId !== userId);

    const withoutOwner = ({ isOwn: _isOwn, ...favorite }: FavoriteStopRow) =>
      favorite;

    const ownStops = stops.filter((f) => f.isOwn).map(withoutOwner);
    const othersStops = stops.filter((f) => !f.isOwn).map(withoutOwner);

    return ok({
      header: 'favorite.allHeader',
      message: 'favorite.retrieved',
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
      throw new NotFoundException('error.favoriteRouteNotFound');
    }

    const updated = await this.prisma.favoriteRoad.update({
      where: { id: favorite.id },
      data: pickAnnotation(body),
      select: { id: true, title: true, description: true },
    });

    return ok({
      header: 'favorite.updatedHeader',
      message: 'favorite.changesSaved',
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
      throw new NotFoundException('error.favoriteStopNotFound');
    }

    const updated = await this.prisma.favoriteStop.update({
      where: { id: favorite.id },
      data: pickAnnotation(body),
      select: { id: true, title: true, description: true },
    });

    return ok({
      header: 'favorite.updatedHeader',
      message: 'favorite.changesSaved',
      data: updated,
    });
  }
}

type FavoriteRoadRow = {
  id: string;
  title: string | null;
  description: string | null;
  road: {
    id: string;
    title: string;
    description: string;
    userId: string;
    archivedAt: string | null;
  };
};

type FavoriteStopRow = {
  id: string;
  title: string | null;
  description: string | null;
  stop: { id: string; latitude: number; longitude: number; address: string };
  isOwn: boolean;
};

type FavoritesRow = {
  roads: unknown;
  stops: unknown;
  roadTotal: number;
  stopTotal: number;
};

// json columns arrive parsed from some drivers and as text from others.
function parseJson<T>(value: unknown): T {
  if (value === null || value === undefined) return [] as T;
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

function pickAnnotation(body: UpdateFavoriteAnnotationDto) {
  const data: { title?: string; description?: string } = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  return data;
}
