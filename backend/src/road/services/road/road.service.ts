import { Injectable } from '@nestjs/common';
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

    const road = await this.prisma.road.create({
      data: {
        title,
        description,
        userId,
        wayPoints: {
          create: waypoints.map((waypoint) => {
            const { latitude, longitude, order, address, addressInfoId } =
              waypoint;

            return {
              latitude,
              longitude,
              order,
              ...(addressInfoId
                ? {
                    address: {
                      connect: {
                        id: addressInfoId,
                      },
                    },
                  }
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
            };
          }),
        },
      },
      include: {
        wayPoints: {
          include: {
            address: true,
          },
        },
      },
      omit: {
        userId: true,
      },
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
      where: {
        id,
      },
      include: {
        wayPoints: {
          include: {
            address: true,
            favoriteWaypoint: {
              where: {
                userId,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return {
      status: ToastType.Success,
      header: 'Road Found',
      message: 'Road found successfully',
      data: road,
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
          where: {
            userId,
          },
        },
      },
    });

    return {
      status: ToastType.Success,
      header: 'Own Roads',
      message: 'Own roads retrieved successfully',
      data: roads,
    };
  }

  async updateRoadById(id: string, data: UpdateRoad) {
    const { title, description, waypoints } = data;

    await this.prisma.road.update({
      where: { id },
      data: { title, description },
    });

    for (const waypoint of waypoints) {
      const {
        id: waypointId,
        latitude,
        longitude,
        order,
        address,
        addressInfoId,
      } = waypoint;

      if (waypointId) {
        await this.prisma.wayPoints.update({
          where: { id: waypointId },
          data: {
            latitude,
            longitude,
            order,
            ...(addressInfoId
              ? {
                  address: {
                    connect: { id: addressInfoId },
                  },
                }
              : address && {
                  address: {
                    update: {
                      country: address.country,
                      province: address.province,
                      district: address.district,
                      address: address.address,
                    },
                  },
                }),
          },
        });
      } else {
        await this.prisma.wayPoints.create({
          data: {
            latitude,
            longitude,
            order,
            road: { connect: { id } },
            ...(addressInfoId
              ? {
                  address: {
                    connect: { id: addressInfoId },
                  },
                }
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
    }

    const road = await this.prisma.road.findUnique({
      where: { id },
      include: {
        wayPoints: { include: { address: true } },
      },
    });

    return {
      status: ToastType.Success,
      header: 'Road Updated',
      message: 'Road updated successfully',
      data: road,
    };
  }

  async deleteRoadById(id: string, userId: string) {
    await this.prisma.road.deleteMany({
      where: {
        id,
        userId,
      },
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

    await this.prisma.wayPoints.delete({
      where: {
        id: waypointId,
        roadId,
      },
    });

    const remainingWaypoints = await this.prisma.wayPoints.findMany({
      where: { roadId },
      orderBy: { order: 'asc' },
    });

    const reordered = remainingWaypoints.map((wp, index) => ({
      id: wp.id,
      order: index + 1,
    }));

    const updatePromises = reordered.map((wp) =>
      this.prisma.wayPoints.update({
        where: { id: wp.id },
        data: { order: wp.order },
      }),
    );

    await Promise.all(updatePromises);

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
