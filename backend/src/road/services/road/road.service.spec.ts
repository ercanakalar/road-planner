import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ElevationService } from 'src/maps/services/elevation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createElevationMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { RoutePublishNotifier } from 'src/notification/publish/route-publish.notifier';
import { UsageRecorder } from 'src/statistics/usage.recorder';
import { RoadVisibility } from '../visibility/road-visibility';
import { RoadService } from './road.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('RoadService', () => {
  let service: RoadService;
  let prisma: PrismaMock;
  let elevation: ReturnType<typeof createElevationMock>;
  let publishNotifier: { notifyInBackground: jest.Mock };
  let usage: { record: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    elevation = createElevationMock();
    publishNotifier = { notifyInBackground: jest.fn() };
    usage = { record: jest.fn() };

    prisma.stop.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadService,
        RoadVisibility,
        { provide: PrismaService, useValue: prisma },
        { provide: ElevationService, useValue: elevation },
        { provide: RoutePublishNotifier, useValue: publishNotifier },
        { provide: UsageRecorder, useValue: usage },
      ],
    }).compile();

    service = module.get(RoadService);
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
              { userId: 'user-1', archivedAt: null },
              { isPublic: true, archivedAt: null },
              {
                favoriteRoads: { some: { userId: 'user-1' } },
                archivedAt: null,
              },
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

    it('offers a signed-out reader only what its author published', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });

      await service.getRoadById(ROAD_ID, null);

      expect(prisma.road.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ROAD_ID, isPublic: true, archivedAt: null },
        }),
      );
    });

    it('does not ask for favourites on behalf of nobody', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });

      const result = await service.getRoadById(ROAD_ID, null);
      const { include } = prisma.road.findFirst.mock.calls[0][0];

      expect(include.favoriteRoads).toBe(false);
      expect(include.stops.include.favoriteStops).toBe(false);
      expect(result.data.isFavorite).toBe(false);
    });

    it('still sends the favourite arrays, empty, so the shape never varies', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        stops: [{ id: 'wp-1' }],
      });

      const result = await service.getRoadById(ROAD_ID, null);

      expect(result.data.favoriteRoads).toEqual([]);
      expect(result.data.stops[0].favoriteStops).toEqual([]);
    });

    it('hides an unpublished road from a signed-out reader', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.getRoadById(ROAD_ID, null)).rejects.toThrow(
        NotFoundException,
      );
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

  describe('deleteRoadById', () => {
    it('reports a road the caller does not own as not found', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.deleteRoadById(ROAD_ID, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not touch anything when the road is not the caller’s', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.deleteRoadById(ROAD_ID, 'user-1')).rejects.toThrow();
      expect(prisma.road.delete).not.toHaveBeenCalled();
      expect(prisma.road.update).not.toHaveBeenCalled();
      expect(prisma.stop.deleteMany).not.toHaveBeenCalled();
    });

    it('scopes the ownership re-check to the caller and to live roads', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });

      await service.deleteRoadById(ROAD_ID, 'user-1');

      expect(prisma.road.findFirst).toHaveBeenCalledWith({
        where: { id: ROAD_ID, userId: 'user-1', archivedAt: null },
        select: { id: true },
      });
    });

    it('archives the road instead of deleting it, so saved copies survive', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });

      await service.deleteRoadById(ROAD_ID, 'user-1');

      expect(prisma.road.delete).not.toHaveBeenCalled();
      expect(prisma.stop.deleteMany).not.toHaveBeenCalled();
      expect(prisma.road.update).toHaveBeenCalledWith({
        where: { id: ROAD_ID },
        data: { archivedAt: expect.any(Date), isPublic: false },
      });
    });

    it('unpublishes as it archives, so the road leaves the discover feed', async () => {
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });

      await service.deleteRoadById(ROAD_ID, 'user-1');

      expect(prisma.road.update.mock.calls[0][0].data.isPublic).toBe(false);
    });

    it('refuses to archive a road that is already archived', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.deleteRoadById(ROAD_ID, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRoad', () => {
    it('stores the road against the authenticated user', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        { title: 'T', description: 'D', stops: [] },
        'user-1',
      );

      expect(prisma.road.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { title: 'T', description: 'D', userId: 'user-1' },
        }),
      );
    });

    it('tolerates a payload with no stops', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await expect(
        service.createRoad({ title: 'T', description: 'D' }, 'user-1'),
      ).resolves.toMatchObject({ header: 'road.createdHeader' });
      expect(prisma.stop.create).not.toHaveBeenCalled();
    });

    it('inserts every stop in one statement', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          stops: [
            { latitude: 1, longitude: 2, order: 1 },
            { latitude: 3, longitude: 4, order: 2 },
          ],
        },
        'user-1',
      );

      expect(prisma.stop.create).not.toHaveBeenCalled();
      expect(prisma.stop.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.stop.createMany.mock.calls[0][0].data).toHaveLength(2);
    });

    it('assigns contiguous 1-based positions from the payload ranking', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          stops: [
            { latitude: 1, longitude: 1, order: 30 },
            { latitude: 2, longitude: 2, order: 10 },
            { latitude: 3, longitude: 3, order: 20 },
          ],
        },
        'user-1',
      );

      const rows = prisma.stop.createMany.mock.calls[0][0].data;
      expect(rows.map((r: { order: number }) => r.order)).toEqual([1, 2, 3]);
      expect(rows.map((r: { latitude: number }) => r.latitude)).toEqual([
        2, 3, 1,
      ]);
    });

    it('resolves duplicated positions rather than rejecting the payload', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          stops: [
            { latitude: 1, longitude: 1, order: 1 },
            { latitude: 2, longitude: 2, order: 1 },
          ],
        },
        'user-1',
      );

      const rows = prisma.stop.createMany.mock.calls[0][0].data;
      expect(rows.map((r: { order: number }) => r.order)).toEqual([1, 2]);
    });

    it('writes the address onto the stop itself', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          stops: [
            {
              latitude: 1,
              longitude: 2,
              order: 1,
              address: 'Main St',
            },
          ],
        },
        'user-1',
      );

      expect(prisma.stop.createMany.mock.calls[0][0].data[0]).toMatchObject({
        address: 'Main St',
      });
    });

    it('stores a stop with no address as an empty string, not null', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          stops: [{ latitude: 1, longitude: 2, order: 1 }],
        },
        'user-1',
      );

      expect(prisma.stop.createMany.mock.calls[0][0].data[0]).toMatchObject({
        address: '',
      });
    });

    it('does not return the owner id', async () => {
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.createRoad({ title: 'T', description: 'D' }, 'user-1');

      expect(prisma.road.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ omit: { userId: true } }),
      );
    });
  });

  describe('updateRoadById', () => {
    const existing = (ids: string[]) =>
      ids.map((id, index) => ({
        id,
        latitude: index + 1,
        longitude: index + 1,
        elevation: 100 + index,
      }));

    const updateValues = () => prisma.$executeRaw.mock.calls[0][0].values;

    it('updates surviving stops in one statement rather than one each', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [
          { id: 'wp-1', latitude: 1, longitude: 1, order: 1 },
          { id: 'wp-2', latitude: 2, longitude: 2, order: 2 },
        ],
      });

      expect(prisma.stop.update).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('preserves the ids of stops present in the payload', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(prisma.stop.createMany).not.toHaveBeenCalled();
      expect(prisma.stop.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['wp-2'] } },
      });
    });

    it('reads back only the ids it needs to diff against', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(prisma.stop.findMany).toHaveBeenCalledWith({
        where: { roadId: ROAD_ID },
        select: { id: true },
      });

      expect(prisma.stop.findMany).toHaveBeenCalledWith({
        where: { roadId: ROAD_ID },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          elevation: true,
        },
      });
    });

    it('inserts stops the payload adds, in one statement', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [
          { id: 'wp-1', latitude: 1, longitude: 1, order: 1 },
          { latitude: 2, longitude: 2, order: 2 },
          { latitude: 3, longitude: 3, order: 3 },
        ],
      });

      expect(prisma.stop.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.stop.createMany.mock.calls[0][0].data).toHaveLength(2);
    });

    it('treats an unknown stop id as a new stop', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [{ id: 'wp-999', latitude: 1, longitude: 1, order: 1 }],
      });

      const rows = prisma.stop.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(1);
      expect(rows[0].id).not.toBe('wp-999');
    });

    it('rewrites the address a surviving stop already owns', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [
          {
            id: 'wp-1',
            latitude: 1,
            longitude: 1,
            order: 1,
            address: 'New St',
          },
        ],
      });

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(updateValues()).toContain('New St');
    });

    it('leaves the stored address alone when the payload carries none', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      expect(updateValues()).toContain(null);
    });

    it('leaves every stop alone when no list of stops is sent', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, { title: 'T', description: 'D' });

      expect(prisma.stop.deleteMany).not.toHaveBeenCalled();
      expect(prisma.stop.createMany).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.road.update).toHaveBeenCalledWith({
        where: { id: ROAD_ID },
        data: { title: 'T', description: 'D' },
      });
    });

    it('measures no heights for a details-only update', async () => {
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, { title: 'T', description: 'D' });

      expect(elevation.elevations).not.toHaveBeenCalled();
    });

    it('clears every stop when sent an empty list of them', async () => {
      prisma.stop.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, stops: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [],
      });

      expect(prisma.stop.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['wp-1', 'wp-2'] } },
      });
      expect(prisma.stop.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getDiscoverRoads', () => {
    const publicRoad = (id: string, nickName: string | null = 'wanderer') => ({
      id,
      title: 'Coastal loop',
      description: 'A weekend drive',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      user: { nickName, firstName: 'Ada' },
      stops: [
        { id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: null },
        { id: 'wp-2', latitude: 3, longitude: 4, order: 2, address: null },
      ],
    });

    it('returns an empty list without a second query when nothing is published', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getDiscoverRoads('user-1', 5);

      expect(result.data).toEqual([]);
      expect(prisma.road.findMany).not.toHaveBeenCalled();
    });

    it('draws from a random point in the id index instead of sorting every route', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDiscoverRoads('user-1', 5);

      const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
      const sql = strings.join('?');
      expect(sql).not.toMatch(/random\(\)/i);
      expect(sql).toMatch(/"id" >= \?[\s\S]*ORDER BY "id"/);
      expect(sql).toMatch(/UNION ALL[\s\S]*"id" < \?/);
      expect(values).toContain(5);
    });

    it('wraps round with the same pivot on both sides', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDiscoverRoads('user-1', 5);

      const pivots = prisma.$queryRaw.mock.calls[0]
        .slice(1)
        .filter(
          (value: unknown) =>
            typeof value === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4/.test(value),
        );
      expect(pivots).toHaveLength(2);
      expect(pivots[0]).toBe(pivots[1]);
    });

    it('starts from a different point each time', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDiscoverRoads(null, 5);
      await service.getDiscoverRoads(null, 5);

      const pivotOf = (call: unknown[]) =>
        call
          .slice(1)
          .find(
            (value) =>
              typeof value === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-4/.test(value),
          );
      expect(pivotOf(prisma.$queryRaw.mock.calls[0])).not.toBe(
        pivotOf(prisma.$queryRaw.mock.calls[1]),
      );
    });

    it('hydrates the randomly drawn ids and keeps their order', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: OTHER_ROAD_ID },
        { id: ROAD_ID },
      ]);
      prisma.road.findMany.mockResolvedValue([
        publicRoad(ROAD_ID),
        publicRoad(OTHER_ROAD_ID),
      ]);

      const result = await service.getDiscoverRoads('user-1', 2);

      expect(prisma.road.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [OTHER_ROAD_ID, ROAD_ID] } },
        }),
      );
      expect(result.data.map((road) => road.id)).toEqual([
        OTHER_ROAD_ID,
        ROAD_ID,
      ]);
    });

    it('exposes a display name and stop count, never the owner record', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: ROAD_ID }]);
      prisma.road.findMany.mockResolvedValue([publicRoad(ROAD_ID)]);

      const [road] = (await service.getDiscoverRoads(null, 1)).data;

      expect(road.author).toBe('wanderer');
      expect(road.stopCount).toBe(2);
      expect(road).not.toHaveProperty('user');
      expect(road).not.toHaveProperty('userId');
    });

    it('falls back to a first name, then to a generic author', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: ROAD_ID }]);
      prisma.road.findMany.mockResolvedValue([publicRoad(ROAD_ID, null)]);
      expect((await service.getDiscoverRoads(null, 1)).data[0].author).toBe(
        'Ada',
      );

      prisma.road.findMany.mockResolvedValue([
        {
          ...publicRoad(ROAD_ID, null),
          user: { nickName: null, firstName: null },
        },
      ]);
      expect((await service.getDiscoverRoads(null, 1)).data[0].author).toBe(
        'A traveller',
      );
    });
  });

  describe('archived roads', () => {
    const ownRow = (overrides: Record<string, unknown> = {}) => ({
      id: ROAD_ID,
      title: 'T',
      description: 'D',
      isPublic: false,
      stopCount: 12,
      isFavorite: true,
      total: 1,
      ...overrides,
    });

    const ownSql = () => prisma.$queryRaw.mock.calls[0][0].join('?');

    it('hides archived roads from the owner’s own list', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getOwnRoads('user-1', { limit: 10, offset: 0 });

      expect(ownSql()).toContain('"archivedAt" IS NULL');
      expect(prisma.$queryRaw.mock.calls[0]).toContain('user-1');
    });

    it('sends a stop count instead of the stops themselves', async () => {
      prisma.$queryRaw.mockResolvedValue([ownRow()]);

      const result = await service.getOwnRoads('user-1', {
        limit: 10,
        offset: 0,
      });

      expect(result.data[0]).toEqual({
        id: ROAD_ID,
        title: 'T',
        description: 'D',
        isPublic: false,
        _count: { stops: 12 },
        isFavorite: true,
      });
    });

    it('counts only the stops of the routes on the page, never the whole table', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getOwnRoads('user-1', { limit: 10, offset: 0 });

      expect(ownSql()).toMatch(/FROM "Stop" s WHERE s."roadId" = p."id"/);
      expect(ownSql()).not.toMatch(/GROUP BY/i);
    });

    it('asks for the star as the caller’s own favourite row only', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getOwnRoads('user-1', { limit: 10, offset: 0 });

      expect(ownSql()).toMatch(/f."userId" = \? AND f."roadId" = p."id"/);
    });

    it('does not leak the row fields used to build the answer', async () => {
      prisma.$queryRaw.mockResolvedValue([
        ownRow({ stopCount: 0, isFavorite: false }),
      ]);

      const result = await service.getOwnRoads('user-1', {
        limit: 10,
        offset: 0,
      });

      expect(result.data[0]).toMatchObject({
        _count: { stops: 0 },
        isFavorite: false,
      });
      expect(result.data[0]).not.toHaveProperty('stopCount');
      expect(result.data[0]).not.toHaveProperty('total');
    });

    it('pages with the limit and offset it was given, in one round trip', async () => {
      prisma.$queryRaw.mockResolvedValue([ownRow({ total: 45 })]);

      const result = await service.getOwnRoads('user-1', {
        limit: 20,
        offset: 20,
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.road.count).not.toHaveBeenCalled();
      expect(prisma.$queryRaw.mock.calls[0]).toEqual(
        expect.arrayContaining([20]),
      );
      expect(result.meta).toEqual({
        total: 45,
        limit: 20,
        offset: 20,
        hasMore: true,
      });
    });

    it('still reports the total for a page past the end', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.road.count.mockResolvedValue(45);

      const result = await service.getOwnRoads('user-1', {
        limit: 20,
        offset: 60,
      });

      expect(result.meta).toMatchObject({ total: 45, hasMore: false });
      expect(prisma.road.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', archivedAt: null },
      });
    });

    it('needs no second query when someone has no routes at all', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getOwnRoads('user-1', {
        limit: 20,
        offset: 0,
      });

      expect(result.meta).toMatchObject({ total: 0, hasMore: false });
      expect(prisma.road.count).not.toHaveBeenCalled();
    });

    it('keeps archived roads out of the discover feed', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDiscoverRoads('user-1', 5);

      const sql = prisma.$queryRaw.mock.calls[0][0].join('');
      expect(sql).toContain('"archivedAt" IS NULL');
    });

    it('no longer lets someone who favourited an archived road read it', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [{ id: 'fav-1' }],
      });

      await service.getRoadById(ROAD_ID, 'user-2');

      const { where } = prisma.road.findFirst.mock.calls[0][0];
      expect(where.OR).toContainEqual({
        favoriteRoads: { some: { userId: 'user-2' } },
        archivedAt: null,
      });
      expect(where.OR).toContainEqual({ userId: 'user-2', archivedAt: null });
    });
  });

  describe('community route access', () => {
    it('lets any signed-in user open a published road they have not saved', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [],
      });

      await service.getRoadById(ROAD_ID, 'stranger');

      const { where } = prisma.road.findFirst.mock.calls[0][0];
      expect(where.OR).toContainEqual({ isPublic: true, archivedAt: null });
    });

    it('reports whether the caller has already saved each community road', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: ROAD_ID }]);
      prisma.road.findMany.mockResolvedValue([
        {
          id: ROAD_ID,
          title: 'T',
          description: 'D',
          createdAt: new Date(),
          user: { nickName: 'nick', firstName: null },
          favoriteRoads: [{ id: 'fav-1' }],
          stops: [],
        },
      ]);

      const [road] = (await service.getDiscoverRoads('user-1', 1)).data;

      expect(road.isFavorite).toBe(true);
      expect(road).not.toHaveProperty('favoriteRoads');
    });

    it('does not ask for favourites when nobody is signed in', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: ROAD_ID }]);
      prisma.road.findMany.mockResolvedValue([
        {
          id: ROAD_ID,
          title: 'T',
          description: 'D',
          createdAt: new Date(),
          user: { nickName: 'nick', firstName: null },
          favoriteRoads: undefined,
          stops: [],
        },
      ]);

      const [road] = (await service.getDiscoverRoads(null, 1)).data;

      expect(prisma.road.findMany.mock.calls[0][0].select.favoriteRoads).toBe(
        false,
      );
      expect(road.isFavorite).toBe(false);
    });
  });

  describe('cloneRoad', () => {
    const source = {
      title: 'Coastal loop',
      description: 'A weekend drive',
      stops: [
        { latitude: 1, longitude: 2, order: 1, address: 'A' },
        { latitude: 3, longitude: 4, order: 5, address: '' },
      ],
    };

    it('refuses to copy a road the caller cannot see', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(service.cloneRoad(ROAD_ID, 'user-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.road.create).not.toHaveBeenCalled();
    });

    it('scopes the source to what the caller may already read', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({
        id: OTHER_ROAD_ID,
        stops: [],
      });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const { where } = prisma.road.findFirst.mock.calls[0][0];
      expect(where.id).toBe(ROAD_ID);
      expect(where.OR).toContainEqual({ isPublic: true, archivedAt: null });
    });

    it('gives the copy to the caller and leaves it unpublished', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({
        id: OTHER_ROAD_ID,
        stops: [],
      });

      await service.cloneRoad(ROAD_ID, 'user-2');

      expect(prisma.road.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            title: 'Coastal loop',
            description: 'A weekend drive',
            userId: 'user-2',
            isPublic: false,
          },
        }),
      );
    });

    it('copies the addresses onto the new stops', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({
        id: OTHER_ROAD_ID,
        stops: [],
      });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const stops = prisma.stop.createMany.mock.calls[0][0].data;

      expect(stops.map((w: { address: string }) => w.address)).toEqual([
        'A',
        '',
      ]);
      expect(
        stops.every((w: { roadId: string }) => w.roadId === OTHER_ROAD_ID),
      ).toBe(true);
    });

    it('renumbers the copied stops from one', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({
        id: OTHER_ROAD_ID,
        stops: [],
      });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const stops = prisma.stop.createMany.mock.calls[0][0].data;
      expect(stops.map((w: { order: number }) => w.order)).toEqual([1, 2]);
    });
  });
  describe('updateRoadById — telling followers', () => {
    const storedVisibility = (isPublic: boolean) => {
      prisma.stop.findMany.mockResolvedValue([]);
      prisma.road.findUnique
        .mockResolvedValueOnce({ isPublic })
        .mockResolvedValue({ id: ROAD_ID, stops: [] });
    };

    const save = (isPublic?: boolean) =>
      service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [],
        ...(isPublic === undefined ? {} : { isPublic }),
      });

    it('tells them when a private route is published', async () => {
      storedVisibility(false);

      await save(true);

      expect(publishNotifier.notifyInBackground).toHaveBeenCalledWith(ROAD_ID);
    });

    it('says nothing when an already public route is saved again', async () => {
      storedVisibility(true);

      await save(true);

      expect(publishNotifier.notifyInBackground).not.toHaveBeenCalled();
    });

    it('says nothing when a route is unpublished', async () => {
      storedVisibility(true);

      await save(false);

      expect(publishNotifier.notifyInBackground).not.toHaveBeenCalled();
    });

    it('says nothing when the save does not touch visibility at all', async () => {
      storedVisibility(false);

      await save();

      expect(publishNotifier.notifyInBackground).not.toHaveBeenCalled();
    });
  });

  describe('updateRoadById — counting publications', () => {
    const storedVisibility = (isPublic: boolean) => {
      prisma.stop.findMany.mockResolvedValue([]);
      prisma.road.findUnique
        .mockResolvedValueOnce({ isPublic })
        .mockResolvedValue({ id: ROAD_ID, userId: 'owner-1', stops: [] });
    };

    const save = (isPublic?: boolean) =>
      service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        stops: [],
        ...(isPublic === undefined ? {} : { isPublic }),
      });

    it('counts a route going public, for its owner', async () => {
      storedVisibility(false);

      await save(true);

      expect(usage.record).toHaveBeenCalledWith('route_published', {
        userId: 'owner-1',
      });
    });

    it('does not count an edit to a route that was public already', async () => {
      storedVisibility(true);

      await save(true);

      expect(usage.record).not.toHaveBeenCalled();
    });

    it('does not count a route being unpublished', async () => {
      storedVisibility(true);

      await save(false);

      expect(usage.record).not.toHaveBeenCalled();
    });
  });

  describe('getOwnRoadsSummary', () => {
    const summarySql = () => prisma.$queryRaw.mock.calls[0][0].join('?');

    beforeEach(() => {
      prisma.$queryRaw.mockResolvedValue([
        { routes: 42, publicRoutes: 5, stops: 311, favorites: 3 },
      ]);
    });

    it('counts every route and stop, not just the page on screen', async () => {
      await expect(service.getOwnRoadsSummary('user-1')).resolves.toEqual(
        expect.objectContaining({
          data: { routes: 42, publicRoutes: 5, stops: 311, favorites: 3 },
        }),
      );
    });

    it('counts exactly the routes the list shows, removed ones left out', async () => {
      await service.getOwnRoadsSummary('user-1');

      expect(summarySql()).toMatch(
        /r."userId" = \?\s+AND r."archivedAt" IS NULL/,
      );
      expect(prisma.$queryRaw.mock.calls[0]).toContain('user-1');
    });

    it('counts a favourite only when it is the caller’s own', async () => {
      await service.getOwnRoadsSummary('user-1');

      expect(summarySql()).toMatch(/f."userId" = \? AND f."roadId" = r."id"/);
    });

    it('takes no page size: totals are never cut short', async () => {
      await service.getOwnRoadsSummary('user-1');

      expect(summarySql()).not.toMatch(/LIMIT|OFFSET/i);
    });

    it('answers in one round trip', async () => {
      await service.getOwnRoadsSummary('user-1');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.road.count).not.toHaveBeenCalled();
      expect(prisma.stop.count).not.toHaveBeenCalled();
    });

    it('reports zeros for someone with no routes', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.getOwnRoadsSummary('user-1')).resolves.toEqual(
        expect.objectContaining({
          data: { routes: 0, publicRoutes: 0, stops: 0, favorites: 0 },
        }),
      );
    });
  });
});
