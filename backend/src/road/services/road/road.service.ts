import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToastType } from 'src/common/type/status.type';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddWaypointToRoad,
  CreateRoad,
  DeleteWaypointWithRoadId,
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

        await tx.wayPoints.create({
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
    const road = await this.prisma.road.findUnique({
      where: { id },
      include: {
        wayPoints: {
          include: {
            address: true,
            favoriteWaypoint: {
              where: { userId },
              select: { id: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        favoriteRoad: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const shaped = road && {
      ...road,
      isFavorite: road.favoriteRoad.length > 0,
      wayPoints: road.wayPoints.map((wp) => ({
        ...wp,
        isFavorite: wp.favoriteWaypoint.length > 0,
      })),
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
          },
        },
        favoriteRoad: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const shaped = roads.map((road) => ({
      ...road,
      isFavorite: road.favoriteRoad.length > 0,
      wayPoints: road.wayPoints.map((wp) => ({
        ...wp,
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

      const existing = await tx.wayPoints.findMany({
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
          await tx.wayPoints.update({
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
          const created = await tx.wayPoints.create({
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
        await tx.wayPoints.deleteMany({
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

      const wps = await tx.wayPoints.findMany({
        where: { roadId: id },
        select: { id: true, addressInfoId: true },
      });

      await tx.favoriteWaypoint.deleteMany({
        where: { waypointId: { in: wps.map((w) => w.id) } },
      });

      await tx.wayPoints.deleteMany({ where: { roadId: id } });

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

      const waypoint = await prisma.wayPoints.create({
        data: {
          latitude: body.latitude,
          longitude: body.longitude,
          order: body.order,
          road: { connect: { id: roadId } },
          address: { connect: { id: address.id } },
        },
      });

      return waypoint;
    });

    return {
      status: ToastType.Success,
      header: 'Add Waypoint',
      message: 'Waypoint added successfully',
      data,
    };
  }

  async deleteWaypointWithRoadId(
    body: DeleteWaypointWithRoadId,
    roadId: string,
  ) {
    const { waypointId } = body;

    await this.prisma.$transaction(async (tx) => {
      const wp = await tx.wayPoints.findUnique({
        where: { id: waypointId },
        select: { roadId: true },
      });
      console.log(wp);

      if (!wp || wp.roadId !== roadId)
        throw new NotFoundException('Waypoint not found for this road');
      await tx.wayPoints.delete({ where: { id: waypointId } });

      const remaining = await tx.wayPoints.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      await Promise.all(
        remaining.map((wp, index) =>
          tx.wayPoints.update({
            where: { id: wp.id },
            data: { order: index + 1 },
          }),
        ),
      );
    });

    return {
      status: ToastType.Success,
      header: 'Delete Waypoint',
      message: 'Waypoint deleted and order updated successfully',
    };
  }

  async updateWaypointWithRoadId(body: UpdateWaypointWithRoadId) {
    const { waypointId, latitude, longitude, order, address } = body;

    const updatedWaypoint = await this.prisma.$transaction(async (prisma) => {
      return await prisma.wayPoints.update({
        where: { id: waypointId },
        data: {
          latitude,
          longitude,
          order,
          address: {
            update: {
              country: address.country,
              province: address.province,
              district: address.district,
              address: address.address,
            },
          },
        },
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
}
