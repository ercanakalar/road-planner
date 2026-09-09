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
import { applyStopValues, positionByRank, StopValues } from './stop-writes';
import { withStopMetrics } from '../stop/stop-metrics';
import { RoadVisibility } from '../visibility/road-visibility';

type PositionedStop = StopInputDto & { order: number };

type StopWithElevation = PositionedStop & { elevation: number | null };

/**
 * Two pins are the same place if they agree to six decimals — about 10cm, and
 * the precision coordinates are stored and sent at. Anything finer is a float
 * rounding difference rather than a stop that moved, and re-reading the ground
 * height for it would spend an API call to learn what is already known.
 */
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

/**
 * A road on its way out, with slope and bend worked out for each of its stops.
 * Tolerates the null Prisma hands back from a findUnique so the write paths can
 * pipe their result straight through.
 */
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
  ) {}

  /**
   * The stops with the ground height under each attached.
   *
   * Called before the transaction opens, never inside one: this reaches out to
   * Google, and a database transaction held open across a network call is a
   * lock held for as long as someone else's server takes to answer.
   */
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
      header: 'Route Created',
      message: 'Route created successfully',
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
      throw new NotFoundException('Route not found');
    }

    return ok({
      header: 'Route Found',
      message: 'Route found successfully',
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

  async getOwnRoads(userId: string, pagination: PaginationQueryDto) {
    const where: Prisma.RoadWhereInput = this.visibility.ownedBy(userId);

    // The list draws a title, a star and a stop count — never the stops
    // themselves. Selecting the stop rows here made the payload grow with
    // every stop the user had ever saved, so the count is asked for instead.
    // The two reads are independent, so they run side by side rather than
    // queued behind one another inside a transaction.
    const [roads, total] = await Promise.all([
      this.prisma.road.findMany({
        where,
        select: {
          id: true,
          userId: true,
          title: true,
          description: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.prisma.road.count({ where }),
    ]);

    const { stopCounts, favorited } = await this.decorate(
      roads.map(({ id }) => id),
      userId,
    );

    const shaped = roads.map((road) => ({
      ...road,
      stopCount: stopCounts.get(road.id) ?? 0,
      isFavorite: favorited.has(road.id),
    }));

    return ok({
      header: 'Own Routes',
      message: 'Own routes retrieved successfully',
      data: shaped,
      meta: pageMeta(total, pagination),
    });
  }

  /**
   * The stop count and the star for one page of roads.
   *
   * Both are asked for by road id rather than left to a nested `select`.
   * Prisma answers a relation `_count` with a join onto an aggregate of the
   * *whole* child table — every stop of every road in the database, grouped,
   * to decorate the fifty on screen — so its cost grew with the table instead
   * of with the page. Keyed by id, both reads ride the indexes the page
   * already used, and they are independent of each other, so they go together.
   */
  private async decorate(roadIds: string[], userId: string) {
    if (roadIds.length === 0) {
      return {
        stopCounts: new Map<string, number>(),
        favorited: new Set<string>(),
      };
    }

    const [counts, favorites] = await Promise.all([
      this.prisma.stop.groupBy({
        by: ['roadId'],
        where: { roadId: { in: roadIds } },
        _count: { _all: true },
      }),
      this.prisma.favoriteRoad.findMany({
        where: { userId, roadId: { in: roadIds } },
        select: { roadId: true },
      }),
    ]);

    return {
      stopCounts: new Map(counts.map((row) => [row.roadId, row._count._all])),
      favorited: new Set(favorites.map(({ roadId }) => roadId)),
    };
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
        header: 'Discover Routes',
        message: 'No published routes yet',
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
        author: user.nickName ?? user.firstName ?? 'A traveller',
        stopCount: stops.length,
        isFavorite: !!favoriteRoads?.length,
        stops,
      }));

    return ok({
      header: 'Discover Routes',
      message: 'Published routes retrieved successfully',
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
      throw new NotFoundException('Route not found');
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

      // The copy stands on the same ground as the original, so its heights come
      // across with it rather than being looked up again.
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
      header: 'Route Copied',
      message: 'The route is now yours to edit',
      data: withRoadStopMetrics(clone),
    });
  }

  async updateRoadById(id: string, data: UpdateRoadDto) {
    const { title, description, isPublic } = data;
    const stops = positionByRank(data.stops ?? []);

    // Read what is stored before the transaction opens, so the Elevation
    // lookups below can be narrowed to the stops that actually moved. The
    // transaction re-reads the ids it needs; this copy is only used to decide
    // which heights are still good.
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

    // A stop keeps its height unless it was dragged somewhere else, or never
    // had one — a route with forty stops that had one renamed should not cost
    // forty Elevation lookups.
    const needsElevation = stops.filter((stop) => {
      const before = stop.id ? storedById.get(stop.id) : undefined;
      return !before || before.elevation === null || !samePlace(before, stop);
    });

    const heights = await this.elevationService.elevations(needsElevation);
    const resolved = new Map(
      needsElevation.map((stop, index) => [stop, heights[index] ?? null]),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
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

      return tx.road.findUnique({
        where: { id },
        include: {
          stops: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Route Updated',
      message: 'Route updated successfully',
      data: withRoadStopMetrics(updated),
    });
  }

  async deleteRoadById(id: string, userId: string) {
    const road = await this.prisma.road.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });

    if (!road) {
      throw new NotFoundException('Route not found');
    }

    await this.prisma.road.update({
      where: { id },
      data: { archivedAt: new Date(), isPublic: false },
    });

    return ok({
      header: 'Route Removed',
      message: 'Route removed from your list',
    });
  }
}
