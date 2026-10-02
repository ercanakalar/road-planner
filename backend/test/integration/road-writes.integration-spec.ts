import { randomUUID } from 'crypto';

import { PaginationQueryDto } from '../../src/common/dto/pagination.dto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { ElevationService } from '../../src/maps/services/elevation.service';
import { GeocodingService } from '../../src/maps/services/geocoding.service';
import { RoutePublishNotifier } from '../../src/notification/publish/route-publish.notifier';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StopInputDto } from '../../src/road/dto/road.dto';
import { RoadService } from '../../src/road/services/road/road.service';
import { StopService } from '../../src/road/services/stop/stop.service';
import { RoadVisibility } from '../../src/road/services/visibility/road-visibility';
import { RetentionService } from '../../src/retention/retention.service';
import { UsageRecorder } from '../../src/statistics/usage.recorder';
import {
  createElevationMock,
  createGeocodingMock,
} from '../../src/testing/mocks';
import { describeIntegration, integrationClient } from './client';

// The raw SQL in the road and stop services, run against Postgres: the
// one-statement page of a person's routes, the bulk stop writes and the
// deferred (roadId, order) constraint they lean on.
describeIntegration('Road writes (integration)', () => {
  let prisma: PrismaClient;
  let roads: RoadService;
  let stops: StopService;
  let userId: string;

  const page = (limit = 50, offset = 0) =>
    Object.assign(new PaginationQueryDto(), { limit, offset });

  const stopsOf = async (roadId: string) =>
    (
      await prisma.stop.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      })
    ).map(({ order, latitude, address }) => ({ order, latitude, address }));

  const stopInput = (label: string, i: number): StopInputDto => ({
    latitude: i + 1,
    longitude: i + 1,
    order: i + 1,
    address: label,
  });

  const createRoad = async (labels: string[], owner = userId) => {
    const result = await roads.createRoad(
      {
        title: 'Trip',
        description: 'A trip',
        stops: labels.map(stopInput),
      },
      owner,
    );

    return result.data!.id;
  };

  // Routes are listed newest first; a pause keeps two created back to back
  // from sharing a millisecond.
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

  const storedStops = (roadId: string) =>
    prisma.stop.findMany({ where: { roadId }, orderBy: { order: 'asc' } });

  beforeAll(() => {
    prisma = integrationClient();

    const db = prisma as unknown as PrismaService;
    const visibility = new RoadVisibility();
    const elevation = createElevationMock() as unknown as ElevationService;

    roads = new RoadService(
      db,
      visibility,
      elevation,
      {
        notifyInBackground: jest.fn(),
      } as unknown as RoutePublishNotifier,
      { record: jest.fn() } as unknown as UsageRecorder,
    );
    stops = new StopService(
      db,
      visibility,
      createGeocodingMock() as unknown as GeocodingService,
      elevation,
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
    it('creates every stop with its own address', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 3, address: 'C' },
      ]);
    });

    it('normalises duplicated and gapped positions', async () => {
      const result = await roads.createRoad(
        {
          title: 'Trip',
          description: 'A trip',
          stops: [
            { latitude: 1, longitude: 1, order: 7, address: 'A' },
            { latitude: 2, longitude: 2, order: 7, address: 'B' },
            { latitude: 3, longitude: 3, order: 99, address: 'C' },
          ],
        },
        userId,
      );

      expect((await stopsOf(result.data!.id)).map((w) => w.order)).toEqual([
        1, 2, 3,
      ]);
    });

    it('creates a road with no stops', async () => {
      const roadId = await createRoad([]);

      expect(await stopsOf(roadId)).toEqual([]);
    });

    it('does not return the owner id', async () => {
      const result = await roads.createRoad(
        { title: 'Trip', description: 'A trip' },
        userId,
      );

      expect(result.data).not.toHaveProperty('userId');
    });
  });

  describe('updateRoadById', () => {
    it('updates the surviving stops and drops the rest', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);
      const existing = await storedStops(roadId);

      await roads.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        stops: [
          {
            id: existing[0].id,
            latitude: 10,
            longitude: 10,
            order: 1,
            address: 'A2',
          },
          {
            id: existing[2].id,
            latitude: 30,
            longitude: 30,
            order: 2,
            address: 'C2',
          },
        ],
      });

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 10, address: 'A2' },
        { order: 2, latitude: 30, address: 'C2' },
      ]);
    });

    it('swaps positions in place, which the deferred constraint allows', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);
      const existing = await storedStops(roadId);

      await roads.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        stops: [
          { id: existing[2].id, latitude: 3, longitude: 3, order: 1 },
          { id: existing[1].id, latitude: 2, longitude: 2, order: 2 },
          { id: existing[0].id, latitude: 1, longitude: 1, order: 3 },
        ],
      });

      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual([
        'C',
        'B',
        'A',
      ]);
    });

    it('keeps a favourite pointing at a stop it edited', async () => {
      const roadId = await createRoad(['A', 'B']);
      const [first] = await storedStops(roadId);

      await prisma.favoriteStop.create({
        data: { userId, stopId: first.id },
      });

      await roads.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        stops: [
          {
            id: first.id,
            latitude: 99,
            longitude: 99,
            order: 1,
            address: 'A2',
          },
        ],
      });

      await expect(
        prisma.favoriteStop.count({ where: { stopId: first.id } }),
      ).resolves.toBe(1);
    });

    it('adds new stops alongside existing ones', async () => {
      const roadId = await createRoad(['A']);
      const [first] = await storedStops(roadId);

      await roads.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        stops: [
          { id: first.id, latitude: 1, longitude: 1, order: 1 },
          { latitude: 2, longitude: 2, order: 2, address: 'B' },
          { latitude: 3, longitude: 3, order: 3, address: 'C' },
        ],
      });

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 3, address: 'C' },
      ]);
    });

    it('renames a route without touching a single stop', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await roads.updateRoadById(roadId, {
        title: 'Renamed',
        description: 'Only the name changed',
      });

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 3, address: 'C' },
      ]);
      await expect(
        prisma.road.findUniqueOrThrow({ where: { id: roadId } }),
      ).resolves.toMatchObject({ title: 'Renamed' });
    });

    it('clears every stop when sent an empty list of them', async () => {
      const roadId = await createRoad(['A', 'B']);

      await roads.updateRoadById(roadId, {
        title: 'Edited',
        description: 'Edited',
        stops: [],
      });

      expect(await stopsOf(roadId)).toEqual([]);
    });
  });

  describe('addStopToRoad', () => {
    const at = (order: number) => ({
      latitude: 9,
      longitude: 9,
      order,
      address: 'Z',
    });

    it('appends past the end and compacts', async () => {
      const roadId = await createRoad(['A', 'B']);

      const result = await stops.addStopToRoad(at(50), roadId);

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 2, address: 'B' },
        { order: 3, latitude: 9, address: 'Z' },
      ]);
      expect(result.data.order).toBe(3);
    });

    it('inserts in the middle, shifting the rest down', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await stops.addStopToRoad(at(2), roadId);

      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual([
        'A',
        'Z',
        'B',
        'C',
      ]);
    });

    it('treats a requested position of 0 as the front', async () => {
      const roadId = await createRoad(['A']);

      await stops.addStopToRoad(at(0), roadId);

      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual(['Z', 'A']);
    });

    it('adds the first stop to an empty road', async () => {
      const roadId = await createRoad([]);

      await stops.addStopToRoad(at(1), roadId);

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 9, address: 'Z' },
      ]);
    });
  });

  describe('deleteStopById', () => {
    it('closes the gap it leaves', async () => {
      const roadId = await createRoad(['A', 'B', 'C', 'D']);
      const existing = await storedStops(roadId);

      await stops.deleteStopById(existing[1].id);

      expect(await stopsOf(roadId)).toEqual([
        { order: 1, latitude: 1, address: 'A' },
        { order: 2, latitude: 3, address: 'C' },
        { order: 3, latitude: 4, address: 'D' },
      ]);
    });

    it('raises P2025 for an unknown stop', async () => {
      await expect(stops.deleteStopById(randomUUID())).rejects.toMatchObject({
        code: 'P2025',
      });
    });
  });

  describe('reorderStops', () => {
    it('moves a stop to the end', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await stops.reorderStops(roadId, { from: 0, to: 2 });

      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual([
        'B',
        'C',
        'A',
      ]);
    });

    it('moves a stop to the front', async () => {
      const roadId = await createRoad(['A', 'B', 'C']);

      await stops.reorderStops(roadId, { from: 2, to: 0 });

      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual([
        'C',
        'A',
        'B',
      ]);
    });

    it('rejects an out-of-range position without writing', async () => {
      const roadId = await createRoad(['A', 'B']);

      await expect(
        stops.reorderStops(roadId, { from: 9, to: 0 }),
      ).rejects.toThrow('error.stopPositionOutOfRange');
      expect((await stopsOf(roadId)).map((w) => w.address)).toEqual(['A', 'B']);
    });
  });

  describe('getOwnRoads', () => {
    it('pages through the routes, newest first, counting the whole set', async () => {
      const first = await createRoad(['A']);
      await tick();
      const second = await createRoad(['A', 'B']);
      await tick();
      const third = await createRoad(['A', 'B', 'C']);

      const one = await roads.getOwnRoads(userId, page(2, 0));
      const two = await roads.getOwnRoads(userId, page(2, 2));

      expect(one.data.map((r) => r.id)).toEqual([third, second]);
      expect(two.data.map((r) => r.id)).toEqual([first]);
      expect(one.meta).toEqual({
        total: 3,
        limit: 2,
        offset: 0,
        hasMore: true,
      });
      expect(two.meta).toMatchObject({ total: 3, hasMore: false });
    });

    it('counts each route’s stops and the caller’s favourites', async () => {
      const liked = await createRoad(['A', 'B', 'C']);
      await tick();
      await createRoad(['A']);
      await prisma.favoriteRoad.create({ data: { userId, roadId: liked } });

      const result = await roads.getOwnRoads(userId, page());

      expect(result.data.map((r) => [r._count.stops, r.isFavorite])).toEqual([
        [1, false],
        [3, true],
      ]);
    });

    it('leaves out deleted routes, and other people’s', async () => {
      const kept = await createRoad(['A']);
      const deleted = await createRoad(['A']);
      await roads.deleteRoadById(deleted, userId);

      const other = await prisma.user.create({
        data: { email: `other-${randomUUID()}@integration.test` },
      });
      await createRoad(['A'], other.id);

      const result = await roads.getOwnRoads(userId, page());

      expect(result.data.map((r) => r.id)).toEqual([kept]);
      expect(result.meta).toMatchObject({ total: 1 });
      await prisma.user.delete({ where: { id: other.id } });
    });

    it('still reports the total on a page past the end', async () => {
      await createRoad(['A']);

      const result = await roads.getOwnRoads(userId, page(10, 10));

      expect(result.data).toEqual([]);
      expect(result.meta).toMatchObject({ total: 1, hasMore: false });
    });
  });

  describe('retention', () => {
    it('erases a route deleted over 30 days ago, with what hangs off it', async () => {
      const old = await createRoad(['A', 'B']);
      const recent = await createRoad(['A']);
      const [stop] = await storedStops(old);
      await prisma.favoriteStop.create({ data: { userId, stopId: stop.id } });
      await prisma.favoriteRoad.create({ data: { userId, roadId: old } });

      const now = new Date();
      await prisma.road.update({
        where: { id: old },
        data: { archivedAt: new Date(now.getTime() - 31 * 86_400_000) },
      });
      await prisma.road.update({
        where: { id: recent },
        data: { archivedAt: new Date(now.getTime() - 86_400_000) },
      });

      const retention = new RetentionService(
        prisma as unknown as PrismaService,
        { prune: jest.fn().mockResolvedValue(0) } as unknown as UsageRecorder,
      );
      await retention.run(now);

      await expect(prisma.road.count({ where: { id: old } })).resolves.toBe(0);
      await expect(prisma.stop.count({ where: { roadId: old } })).resolves.toBe(
        0,
      );
      await expect(
        prisma.favoriteStop.count({ where: { userId } }),
      ).resolves.toBe(0);
      await expect(prisma.road.count({ where: { id: recent } })).resolves.toBe(
        1,
      );
    });
  });

  describe('getOwnRoadsSummary', () => {
    it('counts routes, public routes, stops and favourites', async () => {
      const shared = await createRoad(['A', 'B']);
      await createRoad(['A']);
      await prisma.road.update({
        where: { id: shared },
        data: { isPublic: true },
      });
      await prisma.favoriteRoad.create({ data: { userId, roadId: shared } });

      const result = await roads.getOwnRoadsSummary(userId);

      expect(result.data).toEqual({
        routes: 2,
        publicRoutes: 1,
        stops: 3,
        favorites: 1,
      });
    });
  });
});
