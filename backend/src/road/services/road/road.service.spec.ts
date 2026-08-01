import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { HelperService } from 'src/road/services/helper/helper.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { RoadService } from './road.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const ADDRESS_ID = 'd3a1e1c4-3b5f-4e0c-9f4d-2c3d4e5f6071';

describe('RoadService', () => {
  let service: RoadService;
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
        RoadService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createConfigMock({ FRONTEND_URL: 'http://localhost:8081' }),
        },
        {
          provide: HelperService,
          useValue: {
            generateTokenForShareRoad: jest
              .fn()
              .mockResolvedValue('share-token'),
            decodeTokenForShareRoad: jest
              .fn()
              .mockResolvedValue({ id: ROAD_ID }),
          },
        },
      ],
    }).compile();

    service = module.get(RoadService);
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

  describe('getRoadById — visibility (C5)', () => {
    it('scopes the query to roads the caller owns or has favourited', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [],
      });

      await service.getRoadById(ROAD_ID, 'user-1');

      expect(prisma.road.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: ROAD_ID,
            OR: [
              { userId: 'user-1' },
              { favoriteRoads: { some: { userId: 'user-1' } } },
            ],
          },
        }),
      );
    });

    it('returns the road when it is visible', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [],
      });

      await expect(
        service.getRoadById(ROAD_ID, 'user-1'),
      ).resolves.toMatchObject({ data: { id: ROAD_ID, isFavorite: false } });
    });

    it('marks a favourited road as such', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [{ id: 'fav-1' }],
      });

      await expect(
        service.getRoadById(ROAD_ID, 'user-1'),
      ).resolves.toMatchObject({ data: { isFavorite: true } });
    });

    it('reports an invisible road as not found rather than forbidden', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.getRoadById(ROAD_ID, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('no longer returns a null payload with a success status', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.getRoadById(ROAD_ID, 'user-1')).rejects.toThrow();
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
              { road: { userId: 'user-1' } },
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

  describe('deleteRoadById', () => {
    it('reports a road the caller does not own as not found', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.deleteRoadById(ROAD_ID, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not delete anything when the road is not the caller’s', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.deleteRoadById(ROAD_ID, 'user-1')).rejects.toThrow();
      expect(prisma.road.delete).not.toHaveBeenCalled();
      expect(prisma.wayPoint.deleteMany).not.toHaveBeenCalled();
    });

    it('scopes the ownership re-check to the caller', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.wayPoint.findMany.mockResolvedValue([]);

      await service.deleteRoadById(ROAD_ID, 'user-1');

      expect(prisma.road.findFirst).toHaveBeenCalledWith({
        where: { id: ROAD_ID, userId: 'user-1' },
        select: { id: true },
      });
    });
  });

  describe('createRoad', () => {
    it('stores the road against the authenticated user', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        { title: 'T', description: 'D', waypoints: [] },
        'user-1',
      );

      expect(prisma.road.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: 'T', description: 'D', userId: 'user-1' },
        }),
      );
    });

    it('tolerates a payload with no waypoints', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await expect(
        service.createRoad({ title: 'T', description: 'D' }, 'user-1'),
      ).resolves.toMatchObject({ header: 'Road Created' });
      expect(prisma.wayPoint.create).not.toHaveBeenCalled();
    });

    it('inserts every waypoint in one statement', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [
            { latitude: 1, longitude: 2, order: 1 },
            { latitude: 3, longitude: 4, order: 2 },
          ],
        },
        'user-1',
      );

      expect(prisma.wayPoint.create).not.toHaveBeenCalled();
      expect(prisma.wayPoint.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.wayPoint.createMany.mock.calls[0][0].data).toHaveLength(2);
      expect(prisma.addressInfo.createMany).toHaveBeenCalledTimes(1);
    });

    it('assigns contiguous 1-based positions from the payload ranking', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [
            { latitude: 1, longitude: 1, order: 30 },
            { latitude: 2, longitude: 2, order: 10 },
            { latitude: 3, longitude: 3, order: 20 },
          ],
        },
        'user-1',
      );

      const rows = prisma.wayPoint.createMany.mock.calls[0][0].data;
      expect(rows.map((r: { order: number }) => r.order)).toEqual([1, 2, 3]);
      expect(rows.map((r: { latitude: number }) => r.latitude)).toEqual([
        2, 3, 1,
      ]);
    });

    it('resolves duplicated positions rather than rejecting the payload', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [
            { latitude: 1, longitude: 1, order: 1 },
            { latitude: 2, longitude: 2, order: 1 },
          ],
        },
        'user-1',
      );

      const rows = prisma.wayPoint.createMany.mock.calls[0][0].data;
      expect(rows.map((r: { order: number }) => r.order)).toEqual([1, 2]);
    });

    it('links a supplied addressInfoId instead of creating an address', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [
            { latitude: 1, longitude: 2, order: 1, addressInfoId: ADDRESS_ID },
          ],
        },
        'user-1',
      );

      expect(prisma.addressInfo.createMany).not.toHaveBeenCalled();
      expect(prisma.wayPoint.createMany.mock.calls[0][0].data[0]).toMatchObject(
        {
          addressInfoId: ADDRESS_ID,
        },
      );
    });

    it('stores an absent address part as null, not an empty string', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [
            {
              latitude: 1,
              longitude: 2,
              order: 1,
              address: { address: 'Main St' },
            },
          ],
        },
        'user-1',
      );

      expect(
        prisma.addressInfo.createMany.mock.calls[0][0].data[0],
      ).toMatchObject({
        country: null,
        province: null,
        district: null,
        address: 'Main St',
      });
    });

    it('does not return the owner id', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad({ title: 'T', description: 'D' }, 'user-1');

      expect(prisma.road.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ omit: { userId: true } }),
      );
    });
  });

  describe('updateRoadById', () => {
    const existing = (ids: string[]) =>
      ids.map((id) => ({ id, addressInfoId: `addr-${id}` }));

    it('updates surviving waypoints in one statement rather than one each', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [
          { id: 'wp-1', latitude: 1, longitude: 1, order: 1 },
          { id: 'wp-2', latitude: 2, longitude: 2, order: 2 },
        ],
      });

      expect(prisma.wayPoint.update).not.toHaveBeenCalled();

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('preserves the ids of waypoints present in the payload', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(prisma.wayPoint.createMany).not.toHaveBeenCalled();
      expect(prisma.wayPoint.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['wp-2'] } },
      });
    });

    it('deletes the addresses of removed waypoints', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(prisma.addressInfo.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['addr-wp-2'] } },
      });
    });

    it('inserts waypoints the payload adds, in one statement', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [
          { id: 'wp-1', latitude: 1, longitude: 1, order: 1 },
          { latitude: 2, longitude: 2, order: 2 },
          { latitude: 3, longitude: 3, order: 3 },
        ],
      });

      expect(prisma.wayPoint.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.wayPoint.createMany.mock.calls[0][0].data).toHaveLength(2);
    });

    it('treats an unknown waypoint id as a new waypoint', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-999', latitude: 1, longitude: 1, order: 1 }],
      });

      const rows = prisma.wayPoint.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(1);
      expect(rows[0].id).not.toBe('wp-999');
    });

    it('rewrites the address a surviving waypoint already owns', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [
          {
            id: 'wp-1',
            latitude: 1,
            longitude: 1,
            order: 1,
            address: { address: 'New St' },
          },
        ],
      });

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(prisma.addressInfo.createMany).not.toHaveBeenCalled();
    });

    it('creates an address for a surviving waypoint that has none', async () => {
      prisma.wayPoint.findMany.mockResolvedValue([
        { id: 'wp-1', addressInfoId: null },
      ]);
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [
          {
            id: 'wp-1',
            latitude: 1,
            longitude: 1,
            order: 1,
            address: { address: 'New St' },
          },
        ],
      });

      expect(prisma.addressInfo.createMany).toHaveBeenCalledTimes(1);
    });

    it('does not touch addresses when the payload carries none', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(prisma.addressInfo.createMany).not.toHaveBeenCalled();
      expect(prisma.addressInfo.deleteMany).not.toHaveBeenCalled();
    });

    it('clears every waypoint when the payload has none', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, { title: 'T', description: 'D' });

      expect(prisma.wayPoint.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['wp-1', 'wp-2'] } },
      });
      expect(prisma.wayPoint.createMany).not.toHaveBeenCalled();
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
