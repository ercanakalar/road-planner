import { Injectable } from '@nestjs/common';
import { ToastType } from 'src/common/type/status.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoad, UpdateRoad } from 'src/road/type/road.type';

@Injectable()
export class RoadService {
  constructor(private prisma: PrismaService) {}

  async createRoad(data: CreateRoad, userId: string) {
    const { title, description, waypoints } = data;

    const road = await this.prisma.road.create({
      data: {
        title,
        description,
        userId,
        wayPoints: {
          create: waypoints.map((waypoint) => {
            const { lat, lon, order, address, addressInfoId } = waypoint;

            return {
              lat,
              lon,
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

  async getRoadById(id: string) {
    const road = await this.prisma.road.findUnique({
      where: {
        id,
      },
      include: {
        wayPoints: {
          include: {
            address: true,
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
        lat,
        lon,
        order,
        address,
        addressInfoId,
      } = waypoint;

      if (waypointId) {
        await this.prisma.wayPoints.update({
          where: { id: waypointId },
          data: {
            lat,
            lon,
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
            lat,
            lon,
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

    const roads = this.prisma.road.findUnique({
      where: { id },
      include: {
        wayPoints: { include: { address: true } },
      },
    });

    return {
      status: ToastType.Success,
      header: 'Road Updated',
      message: 'Road updated successfully',
      data: roads,
    };
  }
}
