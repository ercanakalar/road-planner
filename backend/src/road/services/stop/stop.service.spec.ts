import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ElevationService } from 'src/maps/services/elevation.service';
import { GeocodingService } from 'src/maps/services/geocoding.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createElevationMock,
  createGeocodingMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { RoadVisibility } from '../visibility/road-visibility';
import { StopService } from './stop.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('StopService', () => {
  let service: StopService;
  let prisma: PrismaMock;
  let geocoding: ReturnType<typeof createGeocodingMock>;
  let elevation: ReturnType<typeof createElevationMock>;

  const orderedPositions = (callIndex = 0) => {
    const { values } = prisma.$executeRaw.mock.calls[callIndex][0];
    const pairs: { id: string; order: number }[] = [];

    for (let i = 0; i + 1 < values.length - 1; i += 2) {
      pairs.push({ id: values[i], order: values[i + 1] });
    }

    return pairs;
  };

  const givenStops = (count: number) => {
    prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
    prisma.stop.findMany.mockResolvedValue(
      Array.from({ length: count }, (_, i) => ({ id: `wp-${i + 1}` })),
    );
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    geocoding = createGeocodingMock();
    elevation = createElevationMock();

    // Prisma answers a findMany with an array or not at all, and every read of
    // a stop now also reads its neighbours to work out its slope and bend.
    prisma.stop.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StopService,
        RoadVisibility,
        { provide: PrismaService, useValue: prisma },
        { provide: GeocodingService, useValue: geocoding },
        { provide: ElevationService, useValue: elevation },
      ],
    }).compile();

    service = module.get(StopService);
  });

  describe('reorderStops', () => {
    it('renumbers every stop sequentially after the move', async () => {
      givenStops(3);

      await service.reorderStops(ROAD_ID, { from: 0, to: 2 });

      expect(orderedPositions()).toEqual([
        { id: 'wp-2', order: 1 },
        { id: 'wp-3', order: 2 },
        { id: 'wp-1', order: 3 },
      ]);
    });

    it('moves a stop backwards as well as forwards', async () => {
      givenStops(3);

      await service.reorderStops(ROAD_ID, { from: 2, to: 0 });

      expect(orderedPositions()).toEqual([
        { id: 'wp-3', order: 1 },
        { id: 'wp-1', order: 2 },
        { id: 'wp-2', order: 3 },
      ]);
    });

    it('renumbers in one statement rather than one per stop', async () => {
      givenStops(5);

      await service.reorderStops(ROAD_ID, { from: 0, to: 4 });

      expect(prisma.stop.update).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('scopes the statement to the road', async () => {
      givenStops(3);

      await service.reorderStops(ROAD_ID, { from: 0, to: 1 });

      const { values } = prisma.$executeRaw.mock.calls[0][0];
      expect(values[values.length - 1]).toBe(ROAD_ID);
    });

    it('reads only the ids it needs', async () => {
      givenStops(3);

      await service.reorderStops(ROAD_ID, { from: 0, to: 1 });

      expect(prisma.stop.findMany).toHaveBeenCalledWith({
        where: { roadId: ROAD_ID },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
    });

    describe('index bounds', () => {
      beforeEach(() => {
        givenStops(3);
      });

      it('rejects a from index past the end of the list', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('rejects a to index past the end of the list', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 0, to: 99 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not write anything when the indices are out of range', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow();
        expect(prisma.$executeRaw).not.toHaveBeenCalled();
      });

      it('reports the valid range in the error', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 99, to: 0 }),
        ).rejects.toThrow(/between 0 and 2/);
      });

      it('accepts the last valid index', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 2, to: 0 }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });

      it('is a no-op when from equals to', async () => {
        await service.reorderStops(ROAD_ID, { from: 1, to: 1 });

        expect(prisma.$executeRaw).not.toHaveBeenCalled();
      });
    });

    it('rejects a road with no stops rather than dividing by nothing', async () => {
      givenStops(0);

      await expect(
        service.reorderStops(ROAD_ID, { from: 0, to: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports a missing road as not found', async () => {
      prisma.road.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderStops(ROAD_ID, { from: 0, to: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    describe('roadId source', () => {
      beforeEach(() => {
        givenStops(3);
      });

      it('acts on the path roadId, not the body', async () => {
        await service.reorderStops(ROAD_ID, { from: 0, to: 1 });

        expect(prisma.road.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: ROAD_ID } }),
        );
      });

      it('rejects a body roadId that disagrees with the path', async () => {
        await expect(
          service.reorderStops(ROAD_ID, {
            roadId: OTHER_ROAD_ID,
            from: 0,
            to: 1,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('accepts a body roadId that matches the path', async () => {
        await expect(
          service.reorderStops(ROAD_ID, {
            roadId: ROAD_ID,
            from: 0,
            to: 1,
          }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });

      it('accepts a body with no roadId at all', async () => {
        await expect(
          service.reorderStops(ROAD_ID, { from: 0, to: 1 }),
        ).resolves.toMatchObject({ header: 'Reordered' });
      });
    });
  });

  describe('getStopById — visibility (C5)', () => {
    it('scopes the query to stops the caller may see', async () => {
      prisma.stop.findFirst.mockResolvedValue({ id: 'wp-1', roadId: ROAD_ID });

      await service.getStopById('wp-1', 'user-1');

      expect(prisma.stop.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'wp-1',
            OR: [
              { road: { userId: 'user-1', archivedAt: null } },
              { road: { isPublic: true, archivedAt: null } },
              { road: { favoriteRoads: { some: { userId: 'user-1' } } } },
              { favoriteStops: { some: { userId: 'user-1' } } },
            ],
          },
        }),
      );
    });

    it('reports an invisible stop as not found', async () => {
      prisma.stop.findFirst.mockResolvedValue(null);

      await expect(service.getStopById('wp-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the address with the stop, off its own column', async () => {
      prisma.stop.findFirst.mockResolvedValue({
        id: 'wp-1',
        roadId: ROAD_ID,
        address: 'Main St',
      });

      const result = await service.getStopById('wp-1', 'user-1');

      // No `include`: the address is a column on Stop, not a relation.
      expect(prisma.stop.findFirst.mock.calls[0][0].include).toBeUndefined();
      expect(result.data).toMatchObject({ address: 'Main St' });
    });
  });

  describe('addStopToRoad', () => {
    const body = {
      latitude: 1,
      longitude: 2,
      order: 2,
      address: 'Main St',
    };

    beforeEach(() => {
      prisma.stop.create.mockResolvedValue({ id: 'wp-new' });
      prisma.stop.findUniqueOrThrow.mockResolvedValue({
        id: 'wp-new',
        roadId: ROAD_ID,
        order: 2,
        address: 'Main St',
      });
    });

    it('does not read the road back to renumber it', async () => {
      await service.addStopToRoad(body, ROAD_ID);

      expect(prisma.road.findUnique).not.toHaveBeenCalled();
      expect(prisma.stop.update).not.toHaveBeenCalled();
    });

    it('shifts existing stops and compacts, in two statements', async () => {
      await service.addStopToRoad(body, ROAD_ID);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('inserts at the requested position', async () => {
      await service.addStopToRoad(body, ROAD_ID);

      expect(prisma.stop.create.mock.calls[0][0].data).toMatchObject({
        order: 2,
        roadId: ROAD_ID,
      });
    });

    it('treats a requested position of 0 as the first position', async () => {
      await service.addStopToRoad({ ...body, order: 0 }, ROAD_ID);

      expect(prisma.stop.create.mock.calls[0][0].data).toMatchObject({
        order: 1,
      });
    });

    it('reads the stop back after compacting', async () => {
      const result = await service.addStopToRoad(
        { ...body, order: 99 },
        ROAD_ID,
      );

      expect(prisma.stop.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'wp-new' } }),
      );
      expect(result.data).toMatchObject({ order: 2 });
    });

    describe('addressing', () => {
      const pinOnly = { latitude: 1, longitude: 2, order: 2 };

      const storedAddress = () =>
        prisma.stop.create.mock.calls[0][0].data.address;

      it('keeps an address the caller supplied', async () => {
        await service.addStopToRoad(body, ROAD_ID);

        expect(storedAddress()).toBe('Main St');
        expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
      });

      it('names a bare pin from its coordinates', async () => {
        geocoding.resolveAddress.mockResolvedValue('Bağdat Cd. 1');

        await service.addStopToRoad(pinOnly, ROAD_ID);

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

        await service.addStopToRoad(pinOnly, ROAD_ID);

        expect(order).toEqual(['geocode', 'transaction']);
      });
    });
  });

  describe('updateStopWithRoadId', () => {
    const moved = { latitude: 9, longitude: 9 };

    beforeEach(() => {
      prisma.stop.findUnique.mockResolvedValue({
        id: 'wp-1',
        latitude: 1,
        longitude: 2,
        elevation: 100,
      });
      prisma.stop.update.mockResolvedValue({ id: 'wp-1', roadId: ROAD_ID });
    });

    it('renames the stop for where it was dragged to', async () => {
      geocoding.resolveAddress.mockResolvedValue('Somewhere else');

      await service.updateStopWithRoadId(moved, 'wp-1');

      expect(geocoding.resolveAddress).toHaveBeenCalledWith(moved, undefined);
      expect(prisma.stop.update).toHaveBeenCalledWith({
        where: { id: 'wp-1' },
        data: {
          latitude: 9,
          longitude: 9,
          address: 'Somewhere else',
          elevation: null,
        },
      });
    });

    it('re-measures the ground under a stop that was dragged', async () => {
      await service.updateStopWithRoadId(moved, 'wp-1');

      expect(elevation.elevation).toHaveBeenCalledWith({
        latitude: 9,
        longitude: 9,
      });
    });

    it('keeps the height of a stop that only got a new name', async () => {
      await service.updateStopWithRoadId(
        { latitude: 1, longitude: 2, address: 'Home' },
        'wp-1',
      );

      // The pin has not moved, so the ground under it is the ground it was
      // already measured against and there is nothing to ask Google.
      expect(elevation.elevation).not.toHaveBeenCalled();
      expect(prisma.stop.update.mock.calls[0][0].data).toMatchObject({
        elevation: 100,
      });
    });

    it('keeps an address the caller supplied', async () => {
      await service.updateStopWithRoadId({ ...moved, address: 'Home' }, 'wp-1');

      expect(prisma.stop.update.mock.calls[0][0].data).toMatchObject({
        address: 'Home',
      });
      expect(geocoding.reverseGeocode).not.toHaveBeenCalled();
    });

    it('names a stop that had no address, in the same write', async () => {
      geocoding.resolveAddress.mockResolvedValue('Somewhere else');

      await service.updateStopWithRoadId(moved, 'wp-1');

      // One statement now: there is no address row to create or link first.
      expect(prisma.stop.update).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not geocode a stop that does not exist', async () => {
      prisma.stop.findUnique.mockResolvedValue(null);

      await expect(service.updateStopWithRoadId(moved, 'wp-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(geocoding.resolveAddress).not.toHaveBeenCalled();
    });
  });

  describe('deleteStopById', () => {
    it('compacts the ordering in one statement rather than one per stop', async () => {
      prisma.stop.delete.mockResolvedValue({ roadId: ROAD_ID });

      await service.deleteStopById('wp-1');

      expect(prisma.stop.update).not.toHaveBeenCalled();
      expect(prisma.stop.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('takes the address with the row, leaving nothing orphaned', async () => {
      prisma.stop.delete.mockResolvedValue({ roadId: ROAD_ID });

      await expect(service.deleteStopById('wp-1')).resolves.toMatchObject({
        header: 'Delete Stop',
      });

      // The address is a column, so deleting the stop is the whole job.
      expect(prisma.stop.delete.mock.calls[0][0].select).toEqual({
        roadId: true,
      });
    });
  });
});
