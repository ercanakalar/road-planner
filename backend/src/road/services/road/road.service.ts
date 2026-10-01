import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { randomUUID } from 'crypto';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { ElevationService } from 'src/maps/services/elevation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateRoadDto,
  UpdateRoadDto,
  StopInputDto,
} from 'src/road/dto/road.dto';
import { RoutePublishNotifier } from 'src/notification/publish/route-publish.notifier';
import { UsageRecorder } from 'src/statistics/usage.recorder';
import { applyStopValues, positionByRank, StopValues } from './stop-writes';
import { withStopMetrics } from '../stop/stop-metrics';
import { RoadVisibility } from '../visibility/road-visibility';
import { displayNameOf } from 'src/i18n/display-name';

type PositionedStop = StopInputDto & { order: number };

type StopWithElevation = PositionedStop & { elevation: number | null };

const samePlace = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): boolean =>
  a.latitude.toFixed(6) === b.latitude.toFixed(6) &&
  a.longitude.toFixed(6) === b.longitude.toFixed(6);

function buildNewStopRows(
  roadId: string,
  stops: readonly StopWithElevation[],
): Prisma.StopCreateManyInput[] {
  return stops.map((stop) => ({
    id: randomUUID(),
    latitude: stop.latitude,
    longitude: stop.longitude,
    order: stop.order,
    roadId,
    address: stop.address ?? '',
    elevation: stop.elevation,
  }));
}

interface OwnRoadRow {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  stopCount: number;
  isFavorite: boolean;
  total: number;
}

function withRoadStopMetrics<
  T extends {
    stops: { latitude: number; longitude: number; elevation: number | null }[];
  },
>(road: T | null) {
  if (!road) return road;

  return { ...road, stops: withStopMetrics(road.stops) };
}

@Injectable()
export class RoadService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private elevationService: ElevationService,
    private publishNotifier: RoutePublishNotifier,
    private usage: UsageRecorder,
  ) {}

  private async withElevations(
    stops: readonly PositionedStop[],
  ): Promise<StopWithElevation[]> {
    const heights = await this.elevationService.elevations(stops);

    return stops.map((stop, index) => ({
      ...stop,
      elevation: heights[index] ?? null,
    }));
  }

  async createRoad(data: CreateRoadDto, userId: string) {
    const { title, description } = data;
    const stops = positionByRank(data.stops ?? []);

    const positioned = await this.withElevations(stops);

    const road = await this.prisma.$transaction(async (tx) => {
      const created = await tx.road.create({
        data: { title, description, userId },
        select: { id: true },
      });

      const rows = buildNewStopRows(created.id, positioned);

      if (rows.length) {
        await tx.stop.createMany({ data: rows });
      }

      return tx.road.findUnique({
        where: { id: created.id },
        omit: { userId: true },
        include: {
          stops: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'road.createdHeader',
      message: 'road.createdMessage',
      data: withRoadStopMetrics(road),
    });
  }

  async getRoadById(id: string, userId: string | null) {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(id, userId),
      include: {
        stops: {
          include: {
            favoriteStops: userId
              ? { where: { userId }, select: { id: true } }
              : false,
          },
          orderBy: { order: 'asc' },
        },
        favoriteRoads: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    });

    if (!road) {
      throw new NotFoundException('error.routeNotFound');
    }

    return ok({
      header: 'road.foundHeader',
      message: 'road.foundMessage',
      data: {
        ...road,
        favoriteRoads: road.favoriteRoads ?? [],
        stops: withStopMetrics(
          (road.stops ?? []).map((stop) => ({
            ...stop,
            favoriteStops: stop.favoriteStops ?? [],
          })),
        ),
        isFavorite: !!road.favoriteRoads?.length,
      },
    });
  }

  // One statement, one round trip. Prisma's version of this took three, and
  // its `_count` of stops grouped every stop in the database — every user's —
  // on each page, so it slowed down as the whole app grew. Here the page is
  // read through Road(userId, createdAt, id) and only its own rows are
  // counted, through the Stop and FavoriteRoad indexes.
  async getOwnRoads(userId: string, pagination: PaginationQueryDto) {
    const rows = await this.prisma.$queryRaw<OwnRoadRow[]>`
      WITH page AS (
        SELECT r."id", r."title", r."description", r."isPublic", r."createdAt"
          FROM "Road" r
         WHERE r."userId" = ${userId}
           AND r."archivedAt" IS NULL
         ORDER BY r."createdAt" DESC, r."id" DESC
         LIMIT ${pagination.limit} OFFSET ${pagination.offset}
      )
      SELECT p."id", p."title", p."description", p."isPublic",
             (SELECT COUNT(*) FROM "Stop" s WHERE s."roadId" = p."id")::int
               AS "stopCount",
             EXISTS (
               SELECT 1 FROM "FavoriteRoad" f
                WHERE f."userId" = ${userId} AND f."roadId" = p."id"
             ) AS "isFavorite",
             (SELECT COUNT(*) FROM "Road" t
               WHERE t."userId" = ${userId} AND t."archivedAt" IS NULL)::int
               AS "total"
        FROM page p
       ORDER BY p."createdAt" DESC, p."id" DESC`;

    // A page past the end has no row to carry the total, so it is counted on
    // its own — only then, which the app never asks for in normal scrolling.
    const total =
      rows[0]?.total ??
      (pagination.offset > 0
        ? await this.prisma.road.count({
            where: this.visibility.ownedBy(userId),
          })
        : 0);

    const shaped = rows.map(
      ({ id, title, description, isPublic, stopCount, isFavorite }) => ({
        id,
        title,
        description,
        isPublic,
        _count: { stops: stopCount },
        isFavorite,
      }),
    );

    return ok({
      header: 'road.ownHeader',
      message: 'road.ownMessage',
      data: shaped,
      meta: pageMeta(total, pagination),
    });
  }

  // The totals for the person's own routes, counted in the database: the
  // list is fetched a page at a time, so it cannot be summed on the phone.
  async getOwnRoadsSummary(userId: string) {
    const where = this.visibility.ownedBy(userId);

    const [routes, publicRoutes, stops, favorites] = await Promise.all([
      this.prisma.road.count({ where }),
      this.prisma.road.count({ where: { ...where, isPublic: true } }),
      this.prisma.stop.count({ where: { road: where } }),
      this.prisma.road.count({
        where: { ...where, favoriteRoads: { some: { userId } } },
      }),
    ]);

    return ok({ data: { routes, publicRoutes, stops, favorites } });
  }

  async getDiscoverRoads(userId: string | null, limit: number) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Road"
      WHERE "isPublic" = true
        AND "archivedAt" IS NULL
        AND ("userId" <> ${userId ?? ''} OR ${userId === null})
      ORDER BY random()
      LIMIT ${limit}
    `;

    if (!rows.length) {
      return ok({
        header: 'road.discoverHeader',
        message: 'road.discoverEmpty',
        data: [],
      });
    }

    const roads = await this.prisma.road.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        user: { select: { nickName: true, firstName: true } },
        favoriteRoads: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        stops: {
          select: {
            id: true,
            latitude: true,
            longitude: true,
            order: true,
            address: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    const order = new Map(rows.map((row, index) => [row.id, index]));
    const shaped = roads
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map(({ user, stops, favoriteRoads, ...road }) => ({
        ...road,
        author: displayNameOf(user),
        stopCount: stops.length,
        isFavorite: !!favoriteRoads?.length,
        stops,
      }));

    return ok({
      header: 'road.discoverHeader',
      message: 'road.discoverMessage',
      data: shaped,
    });
  }

  async cloneRoad(id: string, userId: string) {
    const source = await this.prisma.road.findFirst({
      where: this.visibility.road(id, userId),
      select: {
        title: true,
        description: true,
        stops: {
          select: {
            latitude: true,
            longitude: true,
            order: true,
            address: true,
            elevation: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('error.routeNotFound');
    }

    const clone = await this.prisma.$transaction(async (tx) => {
      const created = await tx.road.create({
        data: {
          title: source.title,
          description: source.description,
          userId,
          isPublic: false,
        },
        select: { id: true },
      });

      const stops = source.stops.map((stop, index) => ({
        id: randomUUID(),
        latitude: stop.latitude,
        longitude: stop.longitude,
        order: index + 1,
        roadId: created.id,
        address: stop.address,
        elevation: stop.elevation,
      }));

      if (stops.length) await tx.stop.createMany({ data: stops });

      return tx.road.findUnique({
        where: { id: created.id },
        include: {
          stops: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'road.copiedHeader',
      message: 'road.copiedMessage',
      data: withRoadStopMetrics(clone),
    });
  }

  async updateRoadById(id: string, data: UpdateRoadDto) {
    const { title, description, isPublic } = data;
    const stops = positionByRank(data.stops ?? []);

    const stored = await this.prisma.stop.findMany({
      where: { roadId: id },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        elevation: true,
      },
    });

    const storedById = new Map(stored.map((stop) => [stop.id, stop]));

    const needsElevation = stops.filter((stop) => {
      const before = stop.id ? storedById.get(stop.id) : undefined;
      return !before || before.elevation === null || !samePlace(before, stop);
    });

    const heights = await this.elevationService.elevations(needsElevation);
    const resolved = new Map(
      needsElevation.map((stop, index) => [stop, heights[index] ?? null]),
    );

    const { road: updated, wasPublic } = await this.prisma.$transaction(
      async (tx) => {
        const before = await tx.road.findUnique({
          where: { id },
          select: { isPublic: true },
        });

        await tx.road.update({
          where: { id },
          data: {
            title,
            description,
            ...(isPublic === undefined ? {} : { isPublic }),
          },
        });

        const existing = await tx.stop.findMany({
          where: { roadId: id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((w) => w.id));

        const kept = stops.filter((w) => w.id && existingIds.has(w.id));
        const added = stops.filter((w) => !w.id || !existingIds.has(w.id));
        const keptIds = new Set(kept.map((w) => w.id as string));

        const removed = existing.filter((w) => !keptIds.has(w.id));

        if (removed.length) {
          await tx.stop.deleteMany({
            where: { id: { in: removed.map((w) => w.id) } },
          });
        }

        await applyStopValues(
          tx,
          id,
          kept.map((w): StopValues => ({
            id: w.id as string,
            latitude: w.latitude,
            longitude: w.longitude,
            order: w.order,
            address: w.address ?? null,
            refreshElevation: resolved.has(w),
            elevation: resolved.get(w) ?? null,
          })),
        );

        const rows = buildNewStopRows(
          id,
          added.map((stop) => ({
            ...stop,
            elevation: resolved.get(stop) ?? null,
          })),
        );

        if (rows.length) {
          await tx.stop.createMany({ data: rows });
        }

        const road = await tx.road.findUnique({
          where: { id },
          include: {
            stops: { orderBy: { order: 'asc' } },
          },
        });

        return { road, wasPublic: before?.isPublic ?? false };
      },
    );

    if (isPublic === true && !wasPublic) {
      this.publishNotifier.notifyInBackground(id);
      this.usage.record('route_published', { userId: updated?.userId });
    }

    return ok({
      header: 'road.updatedHeader',
      message: 'road.updatedMessage',
      data: withRoadStopMetrics(updated),
    });
  }

  async deleteRoadById(id: string, userId: string) {
    const road = await this.prisma.road.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });

    if (!road) {
      throw new NotFoundException('error.routeNotFound');
    }

    await this.prisma.road.update({
      where: { id },
      data: { archivedAt: new Date(), isPublic: false },
    });

    return ok({
      header: 'road.removedHeader',
      message: 'road.removedMessage',
    });
  }
}
