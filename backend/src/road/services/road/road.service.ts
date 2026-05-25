import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToastType } from 'src/common/type/status.type';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddWaypointToRoad,
  CreateRoad,
  DeleteWaypointWithRoadId,
  ReorderWaypointsWithRoadId,
  UpdateRoad,
  UpdateWaypointWithRoadId,
} from 'src/road/type/road.type';
import { HelperService } from '../helper/helper.service';

@Injectable()
export class RoadService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private helperService: HelperService,
  ) {}

  async createRoad(data: CreateRoad, userId: string) {
    const { title, description, waypoints } = data;

    const road = await this.prisma.$transaction(async (tx) => {
      const created = await tx.road.create({
        data: { title, description, userId },
        omit: { userId: true },
      });

      for (const wp of waypoints ?? []) {
        const { latitude, longitude, order, address, addressInfoId } = wp;

        await tx.wayPoint.create({
          data: {
            latitude,
            longitude,
            order,
            road: { connect: { id: created.id } },
            ...(addressInfoId
              ? { address: { connect: { id: addressInfoId } } }
              : {
                  address: {
                    create: {
                      country: address?.country || '',
                      province: address?.province || '',
                      district: address?.district || '',
                      address: address?.address || '',
                    },
                  },
                }),
          },
        });
      }

      return tx.road.findUnique({
        where: { id: created.id },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });
    });

    return {
      status: ToastType.Success,
      header: 'Road Created',
      message: 'Road created successfully',
      data: road,
    };
  }

  async getRoadById(id: string, userId: string) {
    const road = await this.prisma.$transaction(async (tx) => {
      const road = await tx.road.findUnique({
        where: { id },
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

      return road;
    });

    const shaped = road && {
      ...road,
      isFavorite: !!road.favoriteRoads?.length,
    };

    return {
      status: ToastType.Success,
      header: 'Road Found',
      message: 'Road found successfully',
      data: shaped,
    };
  }

  async getOwnRoads(userId: string) {
    const roads = await this.prisma.road.findMany({
      where: {
        userId,
      },
      include: {
        wayPoints: {
          include: {
            address: true,
            favoriteWaypoints: {
              where: { userId },
              select: { id: true },
            },
          },
        },
        favoriteRoads: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const shaped = roads.map((road) => ({
      ...road,
      isFavorite: !!road.favoriteRoads?.length,
      wayPoints: road.wayPoints.map((wp) => ({
        ...wp,
        isFavorite: !!wp.favoriteWaypoints?.length,
      })),
    }));

    return {
      status: ToastType.Success,
      header: 'Own Roads',
      message: 'Own roads retrieved successfully',
      data: shaped,
    };
  }

  async updateRoadById(id: string, data: UpdateRoad) {
    const { title, description, waypoints = [] } = data;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.road.update({
        where: { id },
        data: { title, description },
      });

      const existing = await tx.wayPoint.findMany({
        where: { roadId: id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((w) => w.id));

      const keepIds: string[] = [];

      for (const wp of waypoints) {
        const {
          id: waypointId,
          latitude,
          longitude,
          order,
          address,
          addressInfoId,
        } = wp;

        if (waypointId && existingIds.has(waypointId)) {
          await tx.wayPoint.update({
            where: { id: waypointId },
            data: {
              latitude,
              longitude,
              order,
              ...(addressInfoId
                ? { address: { connect: { id: addressInfoId } } }
                : address && {
                    address: {
                      update: {
                        country: address.country ?? '',
                        province: address.province ?? '',
                        district: address.district ?? '',
                        address: address.address ?? '',
                      },
                    },
                  }),
            },
          });
          keepIds.push(waypointId);
        } else {
          const created = await tx.wayPoint.create({
            data: {
              latitude,
              longitude,
              order,
              road: { connect: { id } },
              ...(addressInfoId
                ? { address: { connect: { id: addressInfoId } } }
                : {
                    address: {
                      create: {
                        country: address?.country || '',
                        province: address?.province || '',
                        district: address?.district || '',
                        address: address?.address || '',
                      },
                    },
                  }),
            },
            select: { id: true },
          });
          keepIds.push(created.id);
        }
      }

      if (existingIds.size > 0) {
        await tx.wayPoint.deleteMany({
          where: {
            roadId: id,
            id: { notIn: keepIds },
          },
        });
      }

      return tx.road.findUnique({
        where: { id },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });
    });

    return {
      status: ToastType.Success,
      header: 'Road Updated',
      message: 'Road updated successfully',
      data: updated,
    };
  }

  async deleteRoadById(id: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const road = await tx.road.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!road) return;

      const wps = await tx.wayPoint.findMany({
        where: { roadId: id },
        select: { id: true, addressInfoId: true },
      });

      await tx.wayPoint.deleteMany({ where: { roadId: id } });

      const addressIds = wps
        .map((w) => w.addressInfoId)
        .filter(Boolean) as string[];
      if (addressIds.length) {
        await tx.addressInfo.deleteMany({
          where: { id: { in: addressIds } },
        });
      }

      await tx.road.delete({ where: { id } });
    });

    return {
      status: ToastType.Success,
      header: 'Road Deleted',
      message: 'Road deleted successfully',
    };
  }

  async shareRoadByIdWithToken(id: string) {
    const token = await this.helperService.generateTokenForShareRoad(id);
    const url = `${this.config.get<string>('FRONTEND_URL')}/share/${token}`;
    return url;
  }

  async routeToSharedRoad(token: string) {
    const payload = await this.helperService.decodeTokenForShareRoad(token);
    return await this.prisma.road.findUnique({
      where: {
        id: payload.id,
      },
      include: {
        wayPoints: {
          include: {
            address: true,
          },
        },
      },
    });
  }

  async addWaypointToRoad(body: AddWaypointToRoad, roadId: string) {
    const data = await this.prisma.$transaction(async (prisma) => {
      const address = await prisma.addressInfo.create({
        data: {
          country: body.address.country,
          province: body.address.province,
          district: body.address.district,
          address: body.address.address,
        },
      });

      const waypoint = await prisma.wayPoint.create({
        data: {
          latitude: body.latitude,
          longitude: body.longitude,
          order: body.order,
          road: { connect: { id: roadId } },
          address: { connect: { id: address.id } },
        },
      });

      const road = await prisma.road.findUnique({
        where: { id: roadId },
        include: {
          wayPoints: { include: { address: true }, orderBy: { order: 'asc' } },
        },
      });

      await Promise.all(
        (road?.wayPoints ?? []).map((wp, index) =>
          prisma.wayPoint.update({
            where: { id: wp.id },
            data: { order: index + 1 },
          }),
        ),
      );

      return waypoint;
    });

    return {
      status: ToastType.Success,
      header: 'Add Waypoint',
      message: 'Waypoint added successfully',
      data,
    };
  }

  async deleteWaypointById(waypointId: string) {
    await this.prisma.$transaction(async (tx) => {
      const wp = await tx.wayPoint.delete({
        where: { id: waypointId },
        select: { roadId: true },
      });
      if (!wp) {
        throw new NotFoundException('Waypoint not found');
      }

      const wps = await tx.wayPoint.findMany({
        where: { roadId: wp.roadId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      await Promise.all(
        wps.map((w, index) =>
          tx.wayPoint.update({
            where: { id: w.id },
            data: { order: index + 1 },
          }),
        ),
      );

      return wp;
    });

    return {
      status: ToastType.Success,
      header: 'Delete Waypoint',
      message: 'Waypoint deleted and order updated successfully',
    };
  }

  async updateWaypointWithRoadId(
    body: UpdateWaypointWithRoadId,
    waypointId: string,
  ) {
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

    return {
      status: ToastType.Success,
      header: 'Update Waypoint',
      message: 'Waypoint updated successfully',
      data: updatedWaypoint,
    };
  }
  async reorderWaypoints(body: ReorderWaypointsWithRoadId) {
    const { roadId, from, to } = body;
    await this.prisma.$transaction(async (tx) => {
      const road = await tx.road.findUnique({
        where: { id: roadId },
        include: {
          wayPoints: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
          },
        },
      });
      
      const waypoints = road?.wayPoints ?? [];
      
      const moving = waypoints[from];
      const reordered = [...waypoints];
      reordered.splice(from, 1);
      reordered.splice(to, 0, moving);

      await Promise.all(
        reordered.map((wp, index) =>
          tx.wayPoint.update({
            where: { id: wp.id, deletedAt: null },
            data: { order: index + 1 },
          }),
        ),
      );
    });

    return {
      status: ToastType.Success,
      header: 'Reordered',
      message: 'Waypoint order updated successfully',
    };
  }
}
