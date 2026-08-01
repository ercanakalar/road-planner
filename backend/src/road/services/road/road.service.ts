import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddressInputDto,
  AddWaypointDto,
  CreateRoadDto,
  ReorderWaypointsDto,
  UpdateRoadDto,
  UpdateWaypointDto,
  WaypointInputDto,
} from 'src/road/dto/road.dto';
import { HelperService } from '../helper/helper.service';
import {
  AddressValues,
  applyAddressValues,
  applyWaypointOrder,
  applyWaypointValues,
  compactWaypointOrder,
  linkWaypointAddresses,
  positionByRank,
  WaypointValues,
} from './waypoint-writes';

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

function addressColumns(address: AddressInputDto | undefined): {
  country: string | null;
  province: string | null;
  district: string | null;
  address: string;
} {
  return {
    country: address?.country ?? null,
    province: address?.province ?? null,
    district: address?.district ?? null,
    address: address?.address ?? '',
  };
}

@Injectable()
export class RoadService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private helperService: HelperService,
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

  private visibleRoadWhere(id: string, userId: string): Prisma.RoadWhereInput {
    return {
      id,
      OR: [{ userId }, { favoriteRoads: { some: { userId } } }],
    };
  }

  async getRoadById(id: string, userId: string) {
    const road = await this.prisma.road.findFirst({
      where: this.visibleRoadWhere(id, userId),
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
    });

    if (!road) {
      throw new NotFoundException('Road not found');
    }

    return ok({
      header: 'Road Found',
      message: 'Road found successfully',
      data: {
        ...road,
        isFavorite: !!road.favoriteRoads?.length,
      },
    });
  }

  async getWaypointById(id: string, userId: string) {
    const waypoint = await this.prisma.wayPoint.findFirst({
      where: {
        id,
        OR: [
          { road: { userId } },
          { road: { favoriteRoads: { some: { userId } } } },
          { favoriteWaypoints: { some: { userId } } },
        ],
      },
      include: { address: true },
    });

    if (!waypoint) {
      throw new NotFoundException('Waypoint not found');
    }

    return ok({
      header: 'Waypoint Found',
      message: 'Waypoint found successfully',
      data: waypoint,
    });
  }

  async getOwnRoads(userId: string, pagination: PaginationQueryDto) {
    const where: Prisma.RoadWhereInput = { userId };

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

  async updateRoadById(id: string, data: UpdateRoadDto) {
    const { title, description } = data;
    const waypoints = positionByRank(data.waypoints ?? []);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.road.update({ where: { id }, data: { title, description } });

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
    await this.prisma.$transaction(async (tx) => {
      const road = await tx.road.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!road) {
        throw new NotFoundException('Road not found');
      }

      const addressIds = (
        await tx.wayPoint.findMany({
          where: { roadId: id },
          select: { addressInfoId: true },
        })
      )
        .map((waypoint) => waypoint.addressInfoId)
        .filter((addressId): addressId is string => addressId !== null);

      await tx.road.delete({ where: { id } });

      if (addressIds.length) {
        await tx.addressInfo.deleteMany({ where: { id: { in: addressIds } } });
      }
    });

    return ok({
      header: 'Road Deleted',
      message: 'Road deleted successfully',
    });
  }

  async shareRoadByIdWithToken(id: string) {
    const token = await this.helperService.generateTokenForShareRoad(id);

    return ok({
      data: {
        url: `${this.config.get<string>('FRONTEND_URL')}/share/${token}`,
      },
    });
  }

  async routeToSharedRoad(token: string) {
    const payload = await this.helperService.decodeTokenForShareRoad(token);

    const road = await this.prisma.road.findUnique({
      where: { id: payload.id },
      omit: { userId: true },
      include: {
        wayPoints: {
          include: { address: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!road) {
      throw new NotFoundException('The shared road no longer exists');
    }

    return ok({ data: road });
  }

  async addWaypointToRoad(body: AddWaypointDto, roadId: string) {
    const insertAt = Math.max(body.order, 1);

    const waypoint = await this.prisma.$transaction(async (tx) => {
      const addressInfoId = randomUUID();

      await tx.addressInfo.create({
        data: { id: addressInfoId, ...addressColumns(body.address) },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE "WayPoint"
           SET "order" = "order" + 1,
               "updatedAt" = NOW()
         WHERE "roadId" = ${roadId}
           AND "order" >= ${insertAt}
      `);

      const created = await tx.wayPoint.create({
        data: {
          latitude: body.latitude,
          longitude: body.longitude,
          order: insertAt,
          roadId,
          addressInfoId,
        },
        select: { id: true },
      });

      await compactWaypointOrder(tx, roadId);

      return tx.wayPoint.findUniqueOrThrow({
        where: { id: created.id },
        include: { address: true },
      });
    });

    return ok({
      header: 'Add Waypoint',
      message: 'Waypoint added successfully',
      data: waypoint,
    });
  }

  async deleteWaypointById(waypointId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.wayPoint.delete({
        where: { id: waypointId },
        select: { roadId: true, addressInfoId: true },
      });

      if (deleted.addressInfoId) {
        await tx.addressInfo.delete({ where: { id: deleted.addressInfoId } });
      }

      await compactWaypointOrder(tx, deleted.roadId);
    });

    return ok({
      header: 'Delete Waypoint',
      message: 'Waypoint deleted and order updated successfully',
    });
  }

  async updateWaypointWithRoadId(body: UpdateWaypointDto, waypointId: string) {
    const { latitude, longitude, address } = body;

    if (!waypointId) {
      throw new BadRequestException('waypointId is required');
    }

    const waypoint = await this.prisma.wayPoint.findUnique({
      where: { id: waypointId },
      select: { id: true, addressInfoId: true },
    });

    if (!waypoint) {
      throw new NotFoundException('Waypoint not found');
    }

    const updatedWaypoint = await this.prisma.$transaction(async (prisma) => {
      let addressInfoId = waypoint.addressInfoId;

      if (addressInfoId) {
        await prisma.addressInfo.update({
          where: { id: addressInfoId },
          data: {
            country: address.country,
            province: address.province,
            district: address.district,
            address: address.address,
          },
        });
      } else {
        const createdAddress = await prisma.addressInfo.create({
          data: {
            country: address.country,
            province: address.province,
            district: address.district,
            address: address.address,
          },
        });

        addressInfoId = createdAddress.id;
      }

      await prisma.wayPoint.update({
        where: { id: waypointId },
        data: {
          latitude,
          longitude,
          address: addressInfoId
            ? {
                connect: { id: addressInfoId },
              }
            : undefined,
        },
        include: { address: true },
      });

      return prisma.wayPoint.findUnique({
        where: { id: waypointId },
        include: { address: true },
      });
    });

    return ok({
      header: 'Update Waypoint',
      message: 'Waypoint updated successfully',
      data: updatedWaypoint,
    });
  }

  async reorderWaypoints(roadId: string, body: ReorderWaypointsDto) {
    const { from, to } = body;

    if (body.roadId !== undefined && body.roadId !== roadId) {
      throw new BadRequestException(
        'roadId in the body does not match the roadId in the path',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const road = await tx.road.findUnique({
        where: { id: roadId },
        select: { id: true },
      });

      if (!road) {
        throw new NotFoundException('Road not found');
      }

      const waypoints = await tx.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      if (from >= waypoints.length || to >= waypoints.length) {
        throw new BadRequestException(
          `from and to must be between 0 and ${Math.max(waypoints.length - 1, 0)}`,
        );
      }

      if (from === to) return;

      const reordered = [...waypoints];
      const [moving] = reordered.splice(from, 1);
      reordered.splice(to, 0, moving);

      await applyWaypointOrder(
        tx,
        roadId,
        reordered.map((waypoint, index) => ({
          id: waypoint.id,
          order: index + 1,
        })),
      );
    });

    return ok({
      header: 'Reordered',
      message: 'Waypoint order updated successfully',
    });
  }
}
