import { Injectable } from '@nestjs/common';
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
            const { lat, lng, order, address, addressInfoId } = waypoint;

            return {
              lat,
              lon: lng,
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
    });

    return road;
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

    return road;
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

    return roads;
  }

  async updateRoadById(id: string, data: UpdateRoad) {
    const { title, description, waypoints } = data;

    // 1. Update road metadata
    await this.prisma.road.update({
      where: { id },
      data: { title, description },
    });

    // 2. Update or create waypoints
    for (const waypoint of waypoints) {
      const {
        id: waypointId,
        lat,
        lng,
        order,
        address,
        addressInfoId,
      } = waypoint;

      if (waypointId) {
        // UPDATE existing waypoint
        await this.prisma.wayPoints.update({
          where: { id: waypointId },
          data: {
            lat,
            lon: lng,
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
        // CREATE new waypoint
        await this.prisma.wayPoints.create({
          data: {
            lat,
            lon: lng,
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

    // 3. Return updated road
    return this.prisma.road.findUnique({
      where: { id },
      include: {
        wayPoints: { include: { address: true } },
      },
    });
  }
}
