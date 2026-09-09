import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

import { ok } from 'src/common/http/api-response';
import { ElevationService } from 'src/maps/services/elevation.service';
import { GeocodingService } from 'src/maps/services/geocoding.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddStopDto,
  ReorderStopsDto,
  UpdateStopDto,
} from 'src/road/dto/road.dto';
import { RoadVisibility } from '../visibility/road-visibility';
import { applyStopOrder, compactStopOrder } from '../road/stop-writes';
import { NO_METRICS, stopMetrics } from './stop-metrics';

@Injectable()
export class StopService {
  constructor(
    private prisma: PrismaService,
    private visibility: RoadVisibility,
    private geocoding: GeocodingService,
    private elevation: ElevationService,
  ) {}

  async getStopById(id: string, userId: string) {
    const stop = await this.prisma.stop.findFirst({
      where: this.visibility.stop(id, userId),
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    return ok({
      header: 'Stop Found',
      message: 'Stop found successfully',
      data: { ...stop, ...(await this.metricsFor(stop)) },
    });
  }

  /**
   * Slope and bend for a single stop, which are properties of the stops on
   * either side of it rather than of the stop itself — so its neighbours on the
   * road are read to work them out. Opened on its own, a stop shows the same
   * numbers it shows inside its route.
   */
  private async metricsFor(stop: { id: string; roadId: string }) {
    const siblings = await this.prisma.stop.findMany({
      where: { roadId: stop.roadId },
      select: { id: true, latitude: true, longitude: true, elevation: true },
      orderBy: { order: 'asc' },
    });

    const index = siblings.findIndex((candidate) => candidate.id === stop.id);
    if (index === -1) return NO_METRICS;

    return stopMetrics(siblings)[index];
  }

  async addStopToRoad(body: AddStopDto, roadId: string) {
    const insertAt = Math.max(body.order, 1);

    // Two independent lookups against the same coordinates, so they go out
    // together rather than one behind the other.
    const [address, elevation] = await Promise.all([
      this.geocoding.resolveAddress(body, body.address),
      this.elevation.elevation(body),
    ]);

    const stop = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Stop"
           SET "order" = "order" + 1,
               "updatedAt" = NOW()
         WHERE "roadId" = ${roadId}
           AND "order" >= ${insertAt}
      `);

      const created = await tx.stop.create({
        data: {
          latitude: body.latitude,
          longitude: body.longitude,
          order: insertAt,
          roadId,
          address,
          elevation,
        },
        select: { id: true },
      });

      await compactStopOrder(tx, roadId);

      return tx.stop.findUniqueOrThrow({ where: { id: created.id } });
    });

    return ok({
      header: 'Add Stop',
      message: 'Stop added successfully',
      data: { ...stop, ...(await this.metricsFor(stop)) },
    });
  }

  async deleteStopById(stopId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.stop.delete({
        where: { id: stopId },
        select: { roadId: true },
      });

      await compactStopOrder(tx, deleted.roadId);
    });

    return ok({
      header: 'Delete Stop',
      message: 'Stop deleted and order updated successfully',
    });
  }

  async updateStopWithRoadId(body: UpdateStopDto, stopId: string) {
    const { latitude, longitude } = body;

    if (!stopId) {
      throw new BadRequestException('stopId is required');
    }

    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { id: true, latitude: true, longitude: true, elevation: true },
    });

    if (!stop) {
      throw new NotFoundException('Stop not found');
    }

    const moved = stop.latitude !== latitude || stop.longitude !== longitude;

    const [address, elevation] = await Promise.all([
      this.geocoding.resolveAddress(body, body.address),
      // A stop that has not moved is still standing on the ground it was
      // measured against, so there is nothing to ask Google about.
      moved || stop.elevation === null
        ? this.elevation.elevation({ latitude, longitude })
        : Promise.resolve(stop.elevation),
    ]);

    const updatedStop = await this.prisma.stop.update({
      where: { id: stopId },
      data: { latitude, longitude, address, elevation },
    });

    return ok({
      header: 'Update Stop',
      message: 'Stop updated successfully',
      data: { ...updatedStop, ...(await this.metricsFor(updatedStop)) },
    });
  }
  async reorderStops(roadId: string, body: ReorderStopsDto) {
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

      const stops = await tx.stop.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });

      if (from >= stops.length || to >= stops.length) {
        throw new BadRequestException(
          `from and to must be between 0 and ${Math.max(stops.length - 1, 0)}`,
        );
      }

      if (from === to) return;

      const reordered = [...stops];
      const [moving] = reordered.splice(from, 1);
      reordered.splice(to, 0, moving);

      await applyStopOrder(
        tx,
        roadId,
        reordered.map((stop, index) => ({
          id: stop.id,
          order: index + 1,
        })),
      );
    });

    return ok({
      header: 'Reordered',
      message: 'Stop order updated successfully',
    });
  }
}
