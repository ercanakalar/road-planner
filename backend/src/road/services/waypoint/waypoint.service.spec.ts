import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { RoadVisibility } from '../visibility/road-visibility';
import { WaypointService } from './waypoint.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const ADDRESS_ID = 'd3a1e1c4-3b5f-4e0c-9f4d-2c3d4e5f6071';

describe('WaypointService', () => {
  let service: WaypointService;
  let prisma: PrismaMock;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaypointService,
        RoadVisibility,
        { provide: PrismaService, useValue: prisma },
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

    it('includes the address for a visible waypoint', async () => {
      prisma.wayPoint.findFirst.mockResolvedValue({
        id: 'wp-1',
        address: null,
      });

      await service.getWaypointById('wp-1', 'user-1');

      expect(prisma.wayPoint.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ include: { address: true } }),
      );
    });
  });

  describe('addWaypointToRoad', () => {
    const body = {
      latitude: 1,
      longitude: 2,
      order: 2,
      address: { address: 'Main St' },
    };

    beforeEach(() => {
      prisma.wayPoint.create.mockResolvedValue({ id: 'wp-new' });
      prisma.wayPoint.findUniqueOrThrow.mockResolvedValue({
        id: 'wp-new',
        order: 2,
        address: { address: 'Main St' },
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
  });

  describe('deleteWaypointById', () => {
    it('compacts the ordering in one statement rather than one per waypoint', async () => {
      prisma.wayPoint.delete.mockResolvedValue({
        roadId: ROAD_ID,
        addressInfoId: ADDRESS_ID,
      });

      await service.deleteWaypointById('wp-1');

      expect(prisma.wayPoint.update).not.toHaveBeenCalled();
      expect(prisma.wayPoint.findMany).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('deletes the address the waypoint owned', async () => {
      prisma.wayPoint.delete.mockResolvedValue({
        roadId: ROAD_ID,
        addressInfoId: ADDRESS_ID,
      });

      await service.deleteWaypointById('wp-1');

      expect(prisma.addressInfo.delete).toHaveBeenCalledWith({
        where: { id: ADDRESS_ID },
      });
    });

    it('tolerates a waypoint with no address', async () => {
      prisma.wayPoint.delete.mockResolvedValue({
        roadId: ROAD_ID,
        addressInfoId: null,
      });

      await expect(service.deleteWaypointById('wp-1')).resolves.toMatchObject({
        header: 'Delete Waypoint',
      });
      expect(prisma.addressInfo.delete).not.toHaveBeenCalled();
    });
  });
});
