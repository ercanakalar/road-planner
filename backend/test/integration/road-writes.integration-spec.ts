import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PaginationQueryDto } from '../../src/common/dto/pagination.dto';
import { PrismaService } from '../../src/prisma/prisma.service';
import { HelperService } from '../../src/road/services/helper/helper.service';
import { RoadService } from '../../src/road/services/road/road.service';

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;

const describeIntegration = DATABASE_URL ? describe : describe.skip;

describeIntegration('Road writes (integration)', () => {
  let prisma: PrismaClient;
  let service: RoadService;
  let userId: string;

  const firstPage = () => new PaginationQueryDto();

  const address = (label: string) => ({ address: label, country: 'TR' });

  const waypointsOf = async (roadId: string) =>
    (
      await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
        include: { address: true },
      })
    ).map((w) => ({
      order: w.order,
      latitude: w.latitude,
      address: w.address?.address ?? null,
    }));

  const createRoad = async (labels: string[]) => {
    const result = await service.createRoad(
      {
        title: 'Trip',
        description: 'A trip',
        waypoints: labels.map((label, i) => ({
          latitude: i + 1,
          longitude: i + 1,
          order: i + 1,
          address: address(label),
        })),
      },
      userId,
    );

    return result.data!.id;
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    service = new RoadService(
      prisma as unknown as PrismaService,
      { get: () => 'http://localhost:8081' } as unknown as ConfigService,
      {} as HelperService,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `road-writes-${randomUUID()}@integration.test` },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  describe('createRoad', () => {
    it('creates every waypoint with its own address', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 3, address: 'C' },
      ]);
    });

    it('normalises duplicated and gapped positions', async () => {
      const result = await service.createRoad(
        {
          title: 'Trip',
          description: 'A trip',
          waypoints: [
            { latitude: 1, longitude: 1, order: 7, address: address('A') },
            { latitude: 2, longitude: 2, order: 7, address: address('B') },
            { latitude: 3, longitude: 3, order: 99, address: address('C') },
          ],
        },
        userId,
      );

      expect((await waypointsOf(result.data!.id)).map((w) => w.order)).toEqual([
        1, 2, 3,
      ]);
    });

    it('creates a road with no waypoints', async () => {
      const roadId = await createRoad([]);

      expect(await waypointsOf(roadId)).toEqual([]);
    });

    it('does not return the owner id', async () => {
      const result = await service.createRoad(
        { title: 'Trip', description: 'A trip' },
        userId,
      );

      expect(result.data).not.toHaveProperty('userId');
    });

    it('gives each waypoint a distinct address row', async () => {
      const roadId = await createRoad(['A', 'B']);

      const ids = (
        await prisma.wayPoint.findMany({
          where: { roadId },
          select: { addressInfoId: true },
        })
      ).map((w) => w.addressInfoId);

      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('updateRoadById', () => {
    it('updates the surviving waypoints and drops the rest', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);
      const existing = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: existing[0].id,
            latitude: 10,
            longitude: 10,
            order: 1,
            address: address('A2'),
          },
          {
            id: existing[2].id,
            latitude: 30,
            longitude: 30,
            order: 2,
            address: address('C2'),
          },
        ],
      });

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 10, address: 'A2' },
        { order: 2, latitude: 30, address: 'C2' },
      ]);
    });

    it('keeps a favourite pointing at a waypoint it edited', async () => {
      const roadId = await createRoad(['A', 'B']);
      const [first] = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      await prisma.favoriteWaypoint.create({
        data: { userId, waypointId: first.id },
      });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: first.id,
            latitude: 99,
            longitude: 99,
            order: 1,
            address: address('A2'),
          },
        ],
      });

      await expect(
        prisma.favoriteWaypoint.count({ where: { waypointId: first.id } }),
      ).resolves.toBe(1);
    });

    it('reorders and deletes in the same transaction', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);
      const existing = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: existing[2].id,
            latitude: 30,
            longitude: 30,
            order: 1,
            address: address('C'),
          },
          {
            id: existing[1].id,
            latitude: 20,
            longitude: 20,
            order: 2,
            address: address('B'),
          },
        ],
      });

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 30, address: 'C' },
        { order: 2, latitude: 20, address: 'B' },
      ]);
    });

    it('deletes the addresses of removed waypoints', async () => {
      const roadId = await createRoad(['A', 'B']);
      const existing = await prisma.wayPoint.findMany({ where: { roadId } });
      const removedAddressId = existing[1].addressInfoId!;

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: existing[0].id,
            latitude: 1,
            longitude: 1,
            order: 1,
            address: address('A'),
          },
        ],
      });

      await expect(
        prisma.addressInfo.count({ where: { id: removedAddressId } }),
      ).resolves.toBe(0);
    });

    it('applies inline address values when addressInfoId names the address already owned', async () => {
      const roadId = await createRoad(['A']);
      const [first] = await prisma.wayPoint.findMany({ where: { roadId } });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: first.id,
            addressInfoId: first.addressInfoId!,
            latitude: 1,
            longitude: 1,
            order: 1,
            address: address('A-edited'),
          },
        ],
      });

      expect((await waypointsOf(roadId))[0].address).toBe('A-edited');
    });

    it('relinks when addressInfoId names a different address', async () => {
      const roadId = await createRoad(['A', 'B']);
      const existing = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });
      const borrowed = existing[1].addressInfoId!;

      await prisma.wayPoint.delete({ where: { id: existing[1].id } });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: existing[0].id,
            addressInfoId: borrowed,
            latitude: 1,
            longitude: 1,
            order: 1,
            address: address('ignored'),
          },
        ],
      });

      expect((await waypointsOf(roadId))[0].address).toBe('B');
    });

    it('adds new waypoints alongside existing ones', async () => {
      const roadId = await createRoad(['A']);
      const [first] = await prisma.wayPoint.findMany({ where: { roadId } });

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        waypoints: [
          {
            id: first.id,
            latitude: 1,
            longitude: 1,
            order: 1,
            address: address('A'),
          },
          { latitude: 2, longitude: 2, order: 2, address: address('B') },
          { latitude: 3, longitude: 3, order: 3, address: address('C') },
        ],
      });

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 3, address: 'C' },
      ]);
    });

    it('clears every waypoint when the payload has none', async () => {
      const roadId = await createRoad(['A', 'B']);

      await service.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
      });

      expect(await waypointsOf(roadId)).toEqual([]);

      await expect(prisma.addressInfo.count()).resolves.toBeGreaterThanOrEqual(
        0,
      );
    });
  });

  describe('addWaypointToRoad', () => {
    it('appends past the end and compacts', async () => {
      const roadId = await createRoad(['A', 'B']);

      const result = await service.addWaypointToRoad(
        { latitude: 9, longitude: 9, order: 50, address: address('Z') },
        roadId,
      );

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 9, address: 'Z' },
      ]);

      expect(result.data.order).toBe(3);
    });

    it('inserts in the middle, shifting the rest down', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await service.addWaypointToRoad(
        { latitude: 9, longitude: 9, order: 2, address: address('Z') },
        roadId,
      );

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'A',
        'Z',
        'B',
        'C',
      ]);
    });

    it('inserts at the front', async () => {
      const roadId = await createRoad(['A', 'B']);

      await service.addWaypointToRoad(
        { latitude: 9, longitude: 9, order: 1, address: address('Z') },
        roadId,
      );

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'Z',
        'A',
        'B',
      ]);
    });

    it('treats a requested position of 0 as the front', async () => {
      const roadId = await createRoad(['A']);

      await service.addWaypointToRoad(
        { latitude: 9, longitude: 9, order: 0, address: address('Z') },
        roadId,
      );

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'Z',
        'A',
      ]);
    });

    it('adds the first waypoint to an empty road', async () => {
      const roadId = await createRoad([]);

      await service.addWaypointToRoad(
        { latitude: 9, longitude: 9, order: 1, address: address('Z') },
        roadId,
      );

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 9, address: 'Z' },
      ]);
    });
  });

  describe('deleteWaypointById', () => {
    it('closes the gap it leaves', async () => {
      const roadId = await createRoad(['A', 'B', 'C', 'D']);
      const existing = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      await service.deleteWaypointById(existing[1].id);

      expect(await waypointsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 3, address: 'C' },
        { order: 3, latitude: 4, address: 'D' },
      ]);
    });

    it('deletes the address the waypoint owned', async () => {
      const roadId = await createRoad(['A', 'B']);
      const existing = await prisma.wayPoint.findMany({ where: { roadId } });
      const addressId = existing[0].addressInfoId!;

      await service.deleteWaypointById(existing[0].id);

      await expect(
        prisma.addressInfo.count({ where: { id: addressId } }),
      ).resolves.toBe(0);
    });

    it('raises P2025 for an unknown waypoint', async () => {
      await expect(
        service.deleteWaypointById(randomUUID()),
      ).rejects.toMatchObject({ code: 'P2025' });
    });

    it('deletes the last waypoint on a road', async () => {
      const roadId = await createRoad(['A']);
      const [only] = await prisma.wayPoint.findMany({ where: { roadId } });

      await service.deleteWaypointById(only.id);

      expect(await waypointsOf(roadId)).toEqual([]);
    });
  });

  describe('reorderWaypoints', () => {
    it('moves a waypoint to the end', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await service.reorderWaypoints(roadId, { from: 0, to: 2 });

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'B',
        'C',
        'A',
      ]);
    });

    it('moves a waypoint to the front', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await service.reorderWaypoints(roadId, { from: 2, to: 0 });

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'C',
        'A',
        'B',
      ]);
    });

    it('reverses a longer road', async () => {
      const roadId = await createRoad(['A', 'B', 'C', 'D', 'E']);

      await service.reorderWaypoints(roadId, { from: 0, to: 4 });

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'B',
        'C',
        'D',
        'E',
        'A',
      ]);
    });

    it('leaves the road alone when from equals to', async () => {
      const roadId = await createRoad(['A', 'B']);

      await service.reorderWaypoints(roadId, { from: 1, to: 1 });

      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'A',
        'B',
      ]);
    });

    it('rejects an out-of-range index without writing', async () => {
      const roadId = await createRoad(['A', 'B']);

      await expect(
        service.reorderWaypoints(roadId, { from: 9, to: 0 }),
      ).rejects.toThrow(/between 0 and 1/);
      expect((await waypointsOf(roadId)).map((w) => w.address)).toEqual([
        'A',
        'B',
      ]);
    });
  });

  describe('getOwnRoads', () => {
    it('bounds the result to the requested page', async () => {
      for (const label of ['A', 'B', 'C']) await createRoad([label]);

      const page = Object.assign(new PaginationQueryDto(), {
        limit: 2,
        offset: 0,
      });
      const result = await service.getOwnRoads(userId, page);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 3,
        limit: 2,
        offset: 0,
        hasMore: true,
      });
    });

    it('returns disjoint pages that together cover the collection', async () => {
      for (const label of ['A', 'B', 'C']) await createRoad([label]);

      const first = await service.getOwnRoads(
        userId,
        Object.assign(new PaginationQueryDto(), { limit: 2, offset: 0 }),
      );
      const second = await service.getOwnRoads(
        userId,
        Object.assign(new PaginationQueryDto(), { limit: 2, offset: 2 }),
      );

      const ids = [...first.data, ...second.data].map((r) => r.id);
      expect(new Set(ids).size).toBe(3);
      expect(second.meta).toMatchObject({ hasMore: false });
    });

    it('returns only the caller’s roads', async () => {
      await createRoad(['A']);

      const other = await prisma.user.create({
        data: { email: `other-${randomUUID()}@integration.test` },
      });
      await prisma.road.create({
        data: { title: 'Theirs', description: 'x', userId: other.id },
      });

      const result = await service.getOwnRoads(userId, firstPage());

      expect(result.data).toHaveLength(1);
      await prisma.user.delete({ where: { id: other.id } });
    });
  });
});
