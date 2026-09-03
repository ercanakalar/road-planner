import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { randomUUID } from 'crypto';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateRoadDto,
  UpdateRoadDto,
  WaypointInputDto,
} from 'src/road/dto/road.dto';
import {
  applyWaypointValues,
  positionByRank,
  WaypointValues,
} from './waypoint-writes';
import { RoadVisibility } from '../visibility/road-visibility';

type PositionedWaypoint = WaypointInputDto & { order: number };

function buildNewWaypointRows(
  roadId: string,
  waypoints: readonly PositionedWaypoint[],
): Prisma.WayPointCreateManyInput[] {
  return waypoints.map((waypoint) => ({
    id: randomUUID(),
    latitude: waypoint.latitude,
    longitude: waypoint.longitude,
    order: waypoint.order,
    roadId,
    address: waypoint.address ?? '',
  }));
}

@Injectable()
export class RoadService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
  ) {}

  async createRoad(data: CreateRoadDto, userId: string) {
    const { title, description } = data;
    const waypoints = positionByRank(data.waypoints ?? []);

    const road = await this.prisma.$transaction(async (tx) => {
      const created = await tx.road.create({
        data: { title, description, userId },
        select: { id: true },
      });

      const rows = buildNewWaypointRows(created.id, waypoints);

      if (rows.length) {
        await tx.wayPoint.createMany({ data: rows });
      }

      return tx.road.findUnique({
        where: { id: created.id },
        omit: { userId: true },
        include: {
          wayPoints: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Route Created',
      message: 'Route created successfully',
      data: road,
    });
  }

  async getRoadById(id: string, userId: string | null) {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(id, userId),
      include: {
        wayPoints: {
          include: {
            favoriteWaypoints: userId
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
        wayPoints: (road.wayPoints ?? []).map((waypoint) => ({
          ...waypoint,
          favoriteWaypoints: waypoint.favoriteWaypoints ?? [],
        })),
        isFavorite: !!road.favoriteRoads?.length,
      },
    });
  }

  async getOwnRoads(userId: string, pagination: PaginationQueryDto) {
    const where: Prisma.RoadWhereInput = this.visibility.ownedBy(userId);

    const [roads, total] = await this.prisma.$transaction([
      this.prisma.road.findMany({
        where,
        include: {
          wayPoints: {
            include: {
              favoriteWaypoints: {
                where: { userId },
                select: { id: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          favoriteRoads: {
            where: { userId },
            select: { id: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.prisma.road.count({ where }),
    ]);

    const shaped = roads.map((road) => ({
      ...road,
      isFavorite: !!road.favoriteRoads?.length,
      wayPoints: road.wayPoints.map((wp) => ({
        ...wp,
        isFavorite: !!wp.favoriteWaypoints?.length,
      })),
    }));

    return ok({
      header: 'Own Routes',
      message: 'Own routes retrieved successfully',
      data: shaped,
      meta: pageMeta(total, pagination),
    });
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
        wayPoints: {
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
      .map(({ user, wayPoints, favoriteRoads, ...road }) => ({
        ...road,
        author: user.nickName ?? user.firstName ?? 'A traveller',
        stopCount: wayPoints.length,
        isFavorite: !!favoriteRoads?.length,
        wayPoints,
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
        wayPoints: {
          select: {
            latitude: true,
            longitude: true,
            order: true,
            address: true,
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

      const waypoints = source.wayPoints.map((waypoint, index) => ({
        id: randomUUID(),
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        order: index + 1,
        roadId: created.id,
        address: waypoint.address,
      }));

      if (waypoints.length) await tx.wayPoint.createMany({ data: waypoints });

      return tx.road.findUnique({
        where: { id: created.id },
        include: {
          wayPoints: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Route Copied',
      message: 'The route is now yours to edit',
      data: clone,
    });
  }

  async updateRoadById(id: string, data: UpdateRoadDto) {
    const { title, description, isPublic } = data;
    const waypoints = positionByRank(data.waypoints ?? []);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.road.update({
        where: { id },
        data: {
          title,
          description,
          ...(isPublic === undefined ? {} : { isPublic }),
        },
      });

      const existing = await tx.wayPoint.findMany({
        where: { roadId: id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((w) => w.id));

      const kept = waypoints.filter((w) => w.id && existingIds.has(w.id));
      const added = waypoints.filter((w) => !w.id || !existingIds.has(w.id));
      const keptIds = new Set(kept.map((w) => w.id as string));

      const removed = existing.filter((w) => !keptIds.has(w.id));

      if (removed.length) {
        await tx.wayPoint.deleteMany({
          where: { id: { in: removed.map((w) => w.id) } },
        });
      }

      await applyWaypointValues(
        tx,
        id,
        kept.map((w): WaypointValues => ({
          id: w.id as string,
          latitude: w.latitude,
          longitude: w.longitude,
          order: w.order,
          address: w.address ?? null,
        })),
      );

      const rows = buildNewWaypointRows(id, added);

      if (rows.length) {
        await tx.wayPoint.createMany({ data: rows });
      }

      return tx.road.findUnique({
        where: { id },
        include: {
          wayPoints: { orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Route Updated',
      message: 'Route updated successfully',
      data: updated,
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
