import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { GeocodingService } from 'src/maps/services/geocoding.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createGeocodingMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { RoadVisibility } from '../visibility/road-visibility';
import { WaypointService } from './waypoint.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('WaypointService', () => {
  let service: WaypointService;
  let prisma: PrismaMock;
  let geocoding: ReturnType<typeof createGeocodingMock>;

  const orderedPositions = (callIndex = 0) => {
    const { values } = prisma.$executeRaw.mock.calls[callIndex][0];
    const pairs: { id: string; order: number }[] = [];

    for (let i = 0; i + 1 < values.length - 1; i += 2) {
      pairs.push({ id: values[i], order: values[i + 1] });
    }

    return pairs;
  };

  const givenWaypoints = (count: number) => {
    prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
    prisma.wayPoint.findMany.mockResolvedValue(
      Array.from({ length: count }, (_, i) => ({ id: `wp-${i + 1}` })),
    );
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    geocoding = createGeocodingMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaypointService,
        RoadVisibility,
        { provide: PrismaService, useValue: prisma },
        { provide: GeocodingService, useValue: geocoding },
      ],
    }).compile();

    service = module.get(WaypointService);
  });

  describe('reorderWaypoints', () => {
    it('renumbers every waypoint sequentially after the move', async () => {
      givenWaypoints(3);

      await service.reorderWaypoints(ROAD_ID, { from: 0, to: 2 });

      expect(orderedPositions()).toEqual([
        { id: 'wp-2', order: 1 },
        { id: 'wp-3', order: 2 },
        { id: 'wp-1', order: 3 },
      ]);
    });

    it('moves a waypoint backwards as well as forwards', async () => {
      givenWaypoints(3);

      await service.reorderWaypoints(ROAD_ID, { from: 2, to: 0 });

      expect(orderedPositions()).toEqual([
        { id: 'wp-3', order: 1 },
        { id: 'wp-1', order: 2 },
        { id: 'wp-2', order: 3 },
      ]);
    });

    it('renumbers in one statement rather than one per waypoint', async () => {
      givenWaypoints(5);

      await service.reorderWaypoints(ROAD_ID, { from: 0, to: 4 });

      expect(prisma.wayPoint.update).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('scopes the statement to the road', async () => {
      givenWaypoints(3);

      await service.reorderWaypoints(ROAD_ID, { from: 0, to: 1 });

      const { values } = prisma.$executeRaw.mock.calls[0][0];
      expect(values[values.length - 1]).toBe(ROAD_ID);
    });

    it('reads only the ids it needs', async () => {
      givenWaypoints(3);

      await service.reorderWaypoints(ROAD_ID, { from: 0, to: 1 });

      expect(prisma.wayPoint.findMany).toHaveBeenCalledWith({
        where: { roadId: ROAD_ID },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
    });

    describe('index bounds', () => {
      beforeEach(() => {
        givenWaypoints(3);
      });

      it('rejects a from index past the end of the list', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects a to index past the end of the list', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 0, to: 99 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not write anything when the indices are out of range', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow();
        expect(prisma.$executeRaw).not.toHaveBeenCalled();
      });

      it('reports the valid range in the error', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow(/between 0 and 2/);
      });

      it('accepts the last valid index', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 2, to: 0 }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });

      it('is a no-op when from equals to', async () => {
        await service.reorderWaypoints(ROAD_ID, { from: 1, to: 1 });

        expect(prisma.$executeRaw).not.toHaveBeenCalled();
      });
    });

    it('rejects a road with no waypoints rather than dividing by nothing', async () => {
      givenWaypoints(0);

      await expect(
        service.reorderWaypoints(ROAD_ID, { from: 0, to: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports a missing road as not found', async () => {
      prisma.road.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderWaypoints(ROAD_ID, { from: 0, to: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    describe('roadId source', () => {
      beforeEach(() => {
        givenWaypoints(3);
      });

      it('acts on the path roadId, not the body', async () => {
        await service.reorderWaypoints(ROAD_ID, { from: 0, to: 1 });

        expect(prisma.road.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: ROAD_ID } }),
        );
      });

      it('rejects a body roadId that disagrees with the path', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, {
            roadId: OTHER_ROAD_ID,
            from: 0,
            to: 1,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('accepts a body roadId that matches the path', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, {
            roadId: ROAD_ID,
            from: 0,
            to: 1,
          }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });

      it('accepts a body with no roadId at all', async () => {
        await expect(
          service.reorderWaypoints(ROAD_ID, { from: 0, to: 1 }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });
    });
  });

  describe('getWaypointById — visibility (C5)', () => {
    it('scopes the query to waypoints the caller may see', async () => {
      prisma.wayPoint.findFirst.mockResolvedValue({ id: 'wp-1' });

      await service.getWaypointById('wp-1', 'user-1');

      expect(prisma.wayPoint.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'wp-1',
            OR: [
              { road: { userId: 'user-1', archivedAt: null } },
              { road: { isPublic: true, archivedAt: null } },
              { road: { favoriteRoads: { some: { userId: 'user-1' } } } },
              { favoriteWaypoints: { some: { userId: 'user-1' } } },
            ],
          },
        }),
      );
    });

    it('reports an invisible waypoint as not found', async () => {
      prisma.wayPoint.findFirst.mockResolvedValue(null);

      await expect(service.getWaypointById('wp-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the address with the waypoint, off its own column', async () => {
      prisma.wayPoint.findFirst.mockResolvedValue({
        id: 'wp-1',
        address: 'Main St',
      });

      const result = await service.getWaypointById('wp-1', 'user-1');

      // No `include`: the address is a column on WayPoint, not a relation.
      expect(
        prisma.wayPoint.findFirst.mock.calls[0][0].include,
      ).toBeUndefined();
      expect(result.data).toMatchObject({ address: 'Main St' });
    });
  });

  describe('addWaypointToRoad', () => {
    const body = {
      latitude: 1,
      longitude: 2,
      order: 2,
      address: 'Main St',
    };

    beforeEach(() => {
      prisma.wayPoint.create.mockResolvedValue({ id: 'wp-new' });
      prisma.wayPoint.findUniqueOrThrow.mockResolvedValue({
        id: 'wp-new',
        order: 2,
        address: 'Main St',
      });
    });

    it('does not read the road back to renumber it', async () => {
      await service.addWaypointToRoad(body, ROAD_ID);

      expect(prisma.road.findUnique).not.toHaveBeenCalled();
      expect(prisma.wayPoint.update).not.toHaveBeenCalled();
    });

    it('shifts existing waypoints and compacts, in two statements', async () => {
      await service.addWaypointToRoad(body, ROAD_ID);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('inserts at the requested position', async () => {
      await service.addWaypointToRoad(body, ROAD_ID);

      expect(prisma.wayPoint.create.mock.calls[0][0].data).toMatchObject({
        order: 2,
        roadId: ROAD_ID,
      });
    });

    it('treats a requested position of 0 as the first position', async () => {
      await service.addWaypointToRoad({ ...body, order: 0 }, ROAD_ID);

      expect(prisma.wayPoint.create.mock.calls[0][0].data).toMatchObject({
        order: 1,
      });
    });

    it('reads the waypoint back after compacting', async () => {
      const result = await service.addWaypointToRoad(
        { ...body, order: 99 },
        ROAD_ID,
      );

      expect(prisma.wayPoint.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'wp-new' } }),
      );
      expect(result.data).toMatchObject({ order: 2 });
    });

    describe('addressing', () => {
      const pinOnly = { latitude: 1, longitude: 2, order: 2 };

      const storedAddress = () =>
        prisma.wayPoint.create.mock.calls[0][0].data.address;

      it('keeps an address the caller supplied', async () => {
        await service.addWaypointToRoad(body, ROAD_ID);

        expect(storedAddress()).toBe('Main St');
        expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
      });

      it('names a bare pin from its coordinates', async () => {
        geocoding.resolveAddress.mockResolvedValue('Bağdat Cd. 1');

        await service.addWaypointToRoad(pinOnly, ROAD_ID);

        expect(geocoding.resolveAddress).toHaveBeenCalledWith(
          pinOnly,
          undefined,
        );
        expect(storedAddress()).toBe('Bağdat Cd. 1');
      });

      it('looks the address up before opening a transaction', async () => {
        const order: string[] = [];

        geocoding.resolveAddress.mockImplementation(() => {
          order.push('geocode');
          return Promise.resolve('Somewhere');
        });
        prisma.$transaction.mockImplementation(async (run: any) => {
          order.push('transaction');
          return run(prisma);
        });

        await service.addWaypointToRoad(pinOnly, ROAD_ID);

        expect(order).toEqual(['geocode', 'transaction']);
      });
    });
  });

  describe('updateWaypointWithRoadId', () => {
    const moved = { latitude: 9, longitude: 9 };

    beforeEach(() => {
      prisma.wayPoint.findUnique.mockResolvedValue({ id: 'wp-1' });
    });

    it('renames the waypoint for where it was dragged to', async () => {
      geocoding.resolveAddress.mockResolvedValue('Somewhere else');

      await service.updateWaypointWithRoadId(moved, 'wp-1');

      expect(geocoding.resolveAddress).toHaveBeenCalledWith(moved, undefined);
      expect(prisma.wayPoint.update).toHaveBeenCalledWith({
        where: { id: 'wp-1' },
        data: { latitude: 9, longitude: 9, address: 'Somewhere else' },
      });
    });

    it('keeps an address the caller supplied', async () => {
      await service.updateWaypointWithRoadId(
        { ...moved, address: 'Home' },
        'wp-1',
      );

      expect(prisma.wayPoint.update.mock.calls[0][0].data).toMatchObject({
        address: 'Home',
      });
      expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
    });

    it('names a waypoint that had no address, in the same write', async () => {
      geocoding.resolveAddress.mockResolvedValue('Somewhere else');

      await service.updateWaypointWithRoadId(moved, 'wp-1');

      // One statement now: there is no address row to create or link first.
      expect(prisma.wayPoint.update).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not geocode a waypoint that does not exist', async () => {
      prisma.wayPoint.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWaypointWithRoadId(moved, 'wp-1'),
      ).rejects.toThrow(NotFoundException);
      expect(geocoding.resolveAddress).not.toHaveBeenCalled();
    });
  });

  describe('deleteWaypointById', () => {
    it('compacts the ordering in one statement rather than one per waypoint', async () => {
      prisma.wayPoint.delete.mockResolvedValue({ roadId: ROAD_ID });

      await service.deleteWaypointById('wp-1');

      expect(prisma.wayPoint.update).not.toHaveBeenCalled();
      expect(prisma.wayPoint.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('takes the address with the row, leaving nothing orphaned', async () => {
      prisma.wayPoint.delete.mockResolvedValue({ roadId: ROAD_ID });

      await expect(service.deleteWaypointById('wp-1')).resolves.toMatchObject({
        header: 'Delete Waypoint',
      });

      // The address is a column, so deleting the waypoint is the whole job.
      expect(prisma.wayPoint.delete.mock.calls[0][0].select).toEqual({
        roadId: true,
      });
    });
  });
});
