import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

import { ok } from 'src/common/http/api-response';
import { GeocodingService } from 'src/maps/services/geocoding.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddWaypointDto,
  ReorderWaypointsDto,
  UpdateWaypointDto,
} from 'src/road/dto/road.dto';
import { RoadVisibility } from '../visibility/road-visibility';
import {
  applyWaypointOrder,
  compactWaypointOrder,
} from '../road/waypoint-writes';

@Injectable()
export class WaypointService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private geocoding: GeocodingService,
  ) {}

  async getWaypointById(id: string, userId: string) {
    const waypoint = await this.prisma.wayPoint.findFirst({
      where: this.visibility.waypoint(id, userId),
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

  async addWaypointToRoad(body: AddWaypointDto, roadId: string) {
    const insertAt = Math.max(body.order, 1);

    const address = await this.geocoding.resolveAddress(body, body.address);

    const waypoint = await this.prisma.$transaction(async (tx) => {
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
          address,
        },
        select: { id: true },
      });

      await compactWaypointOrder(tx, roadId);

      return tx.wayPoint.findUniqueOrThrow({ where: { id: created.id } });
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
        select: { roadId: true },
      });

      await compactWaypointOrder(tx, deleted.roadId);
    });

    return ok({
      header: 'Delete Waypoint',
      message: 'Waypoint deleted and order updated successfully',
    });
  }

  async updateWaypointWithRoadId(body: UpdateWaypointDto, waypointId: string) {
    const { latitude, longitude } = body;

    if (!waypointId) {
      throw new BadRequestException('waypointId is required');
    }

    const waypoint = await this.prisma.wayPoint.findUnique({
      where: { id: waypointId },
      select: { id: true },
    });

    if (!waypoint) {
      throw new NotFoundException('Waypoint not found');
    }

    const address = await this.geocoding.resolveAddress(body, body.address);

    const updatedWaypoint = await this.prisma.wayPoint.update({
      where: { id: waypointId },
      data: { latitude, longitude, address },
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
        throw new NotFoundException('Route not found');
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
