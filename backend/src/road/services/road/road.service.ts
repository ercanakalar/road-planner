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
  AddressValues,
  applyAddressValues,
  applyWaypointValues,
  linkWaypointAddresses,
  positionByRank,
  WaypointValues,
} from './waypoint-writes';
import { RoadVisibility } from '../visibility/road-visibility';
import { addressColumns } from './address-columns';

type PositionedWaypoint = WaypointInputDto & { order: number };

function buildNewWaypointRows(
  roadId: string,
  waypoints: readonly PositionedWaypoint[],
): {
  addresses: Prisma.AddressInfoCreateManyInput[];
  waypoints: Prisma.WayPointCreateManyInput[];
} {
  const addresses: Prisma.AddressInfoCreateManyInput[] = [];
  const rows: Prisma.WayPointCreateManyInput[] = [];

  for (const waypoint of waypoints) {
    let addressInfoId = waypoint.addressInfoId;

    if (!addressInfoId) {
      addressInfoId = randomUUID();
      addresses.push({
        id: addressInfoId,
        ...addressColumns(waypoint.address),
      });
    }

    rows.push({
      id: randomUUID(),
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      order: waypoint.order,
      roadId,
      addressInfoId,
    });
  }

  return { addresses, waypoints: rows };
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

      if (rows.addresses.length) {
        await tx.addressInfo.createMany({ data: rows.addresses });
      }
      if (rows.waypoints.length) {
        await tx.wayPoint.createMany({ data: rows.waypoints });
      }

      return tx.road.findUnique({
        where: { id: created.id },
        omit: { userId: true },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Road Created',
      message: 'Road created successfully',
      data: road,
    });
  }

  async getRoadById(id: string, userId: string | null) {
    const road = await this.prisma.road.findFirst({
      where: this.visibility.road(id, userId),
      include: {
        wayPoints: {
          include: {
            address: true,
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
      throw new NotFoundException('Road not found');
    }

    return ok({
      header: 'Road Found',
      message: 'Road found successfully',
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
              address: true,
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
      header: 'Own Roads',
      message: 'Own roads retrieved successfully',
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
        header: 'Discover Roads',
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
      header: 'Discover Roads',
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
            address: {
              select: {
                country: true,
                province: true,
                district: true,
                address: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Road not found');
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

      const addresses: Prisma.AddressInfoCreateManyInput[] = [];
      const waypoints: Prisma.WayPointCreateManyInput[] = [];

      source.wayPoints.forEach((waypoint, index) => {
        const addressInfoId = randomUUID();
        addresses.push({
          id: addressInfoId,
          country: waypoint.address?.country ?? null,
          province: waypoint.address?.province ?? null,
          district: waypoint.address?.district ?? null,
          address: waypoint.address?.address ?? '',
        });
        waypoints.push({
          id: randomUUID(),
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          order: index + 1,
          roadId: created.id,
          addressInfoId,
        });
      });

      if (addresses.length)
        await tx.addressInfo.createMany({ data: addresses });
      if (waypoints.length) await tx.wayPoint.createMany({ data: waypoints });

      return tx.road.findUnique({
        where: { id: created.id },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Road Copied',
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
        select: { id: true, addressInfoId: true },
      });
      const addressOf = new Map(
        existing.map((w) => [w.id, w.addressInfoId] as const),
      );

      const kept = waypoints.filter((w) => w.id && addressOf.has(w.id));
      const added = waypoints.filter((w) => !w.id || !addressOf.has(w.id));
      const keptIds = new Set(kept.map((w) => w.id as string));

      const removed = existing.filter((w) => !keptIds.has(w.id));

      if (removed.length) {
        await tx.wayPoint.deleteMany({
          where: { id: { in: removed.map((w) => w.id) } },
        });

        const orphanedAddresses = removed
          .map((w) => w.addressInfoId)
          .filter((addressId): addressId is string => addressId !== null);

        if (orphanedAddresses.length) {
          await tx.addressInfo.deleteMany({
            where: { id: { in: orphanedAddresses } },
          });
        }
      }

      await applyWaypointValues(
        tx,
        id,
        kept.map((w): WaypointValues => ({
          id: w.id as string,
          latitude: w.latitude,
          longitude: w.longitude,
          order: w.order,
        })),
      );

      const addressUpdates: AddressValues[] = [];
      const addressCreates: Prisma.AddressInfoCreateManyInput[] = [];
      const links: { waypointId: string; addressInfoId: string }[] = [];

      for (const waypoint of kept) {
        const waypointId = waypoint.id as string;
        const ownedAddressId = addressOf.get(waypointId) ?? null;

        if (
          waypoint.addressInfoId &&
          waypoint.addressInfoId !== ownedAddressId
        ) {
          links.push({ waypointId, addressInfoId: waypoint.addressInfoId });
          continue;
        }

        if (!waypoint.address) continue;

        if (ownedAddressId) {
          addressUpdates.push({
            id: ownedAddressId,
            ...addressColumns(waypoint.address),
          });
        } else {
          const addressInfoId = randomUUID();
          addressCreates.push({
            id: addressInfoId,
            ...addressColumns(waypoint.address),
          });
          links.push({ waypointId, addressInfoId });
        }
      }

      await applyAddressValues(tx, addressUpdates);

      if (addressCreates.length) {
        await tx.addressInfo.createMany({ data: addressCreates });
      }

      await linkWaypointAddresses(tx, id, links);

      const rows = buildNewWaypointRows(id, added);

      if (rows.addresses.length) {
        await tx.addressInfo.createMany({ data: rows.addresses });
      }
      if (rows.waypoints.length) {
        await tx.wayPoint.createMany({ data: rows.waypoints });
      }

      return tx.road.findUnique({
        where: { id },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });
    });

    return ok({
      header: 'Road Updated',
      message: 'Road updated successfully',
      data: updated,
    });
  }

  async deleteRoadById(id: string, userId: string) {
    const road = await this.prisma.road.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true },
    });

    if (!road) {
      throw new NotFoundException('Road not found');
    }

    await this.prisma.road.update({
      where: { id },
      data: { archivedAt: new Date(), isPublic: false },
    });

    return ok({
      header: 'Road Removed',
      message: 'Road removed from your list',
    });
  }
}
