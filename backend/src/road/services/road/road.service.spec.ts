import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { RoadVisibility } from '../visibility/road-visibility';
import { RoadService } from './road.service';

const ROAD_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const OTHER_ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('RoadService', () => {
  let service: RoadService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadService,
        RoadVisibility,
        { provide: PrismaService, useValue: prisma },
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
      expect(include.wayPoints.include.favoriteWaypoints).toBe(false);
      expect(result.data.isFavorite).toBe(false);
    });

    it('still sends the favourite arrays, empty, so the shape never varies', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        wayPoints: [{ id: 'wp-1' }],
      });

      const result = await service.getRoadById(ROAD_ID, null);

      expect(result.data.favoriteRoads).toEqual([]);
      expect(result.data.wayPoints[0].favoriteWaypoints).toEqual([]);
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
      expect(prisma.wayPoint.deleteMany).not.toHaveBeenCalled();
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
      expect(prisma.wayPoint.deleteMany).not.toHaveBeenCalled();
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
      ).resolves.toMatchObject({ header: 'Route Created' });
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

    it('writes the address onto the waypoint itself', async () => {
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
              address: 'Main St',
            },
          ],
        },
        'user-1',
      );

      expect(prisma.wayPoint.createMany.mock.calls[0][0].data[0]).toMatchObject(
        { address: 'Main St' },
      );
    });

    it('stores a stop with no address as an empty string, not null', async () => {
      // The column is NOT NULL, so an unnamed pin has to save as ''.
      prisma.road.create.mockResolvedValue({ id: ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.createRoad(
        {
          title: 'T',
          description: 'D',
          waypoints: [{ latitude: 1, longitude: 2, order: 1 }],
        },
        'user-1',
      );

      expect(prisma.wayPoint.createMany.mock.calls[0][0].data[0]).toMatchObject(
        { address: '' },
      );
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
    const existing = (ids: string[]) => ids.map((id) => ({ id }));

    /** The values bound into the surviving-waypoint UPDATE. */
    const updateValues = () => prisma.$executeRaw.mock.calls[0][0].values;

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

    it('reads back only the ids it needs to diff against', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1', 'wp-2']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      // Deleting the row takes its address with it, so there is nothing else
      // to look up and nothing left orphaned.
      expect(prisma.wayPoint.findMany).toHaveBeenCalledWith({
        where: { roadId: ROAD_ID },
        select: { id: true },
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
            address: 'New St',
          },
        ],
      });

      // Position and address travel together, so one statement does both
      // where it used to take an UPDATE each plus a link.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(updateValues()).toContain('New St');
    });

    it('leaves the stored address alone when the payload carries none', async () => {
      prisma.wayPoint.findMany.mockResolvedValue(existing(['wp-1']));
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID, wayPoints: [] });

      await service.updateRoadById(ROAD_ID, {
        title: 'T',
        description: 'D',
        waypoints: [{ id: 'wp-1', latitude: 1, longitude: 1, order: 1 }],
      });

      // A null in the address column is what COALESCE reads as "keep it", so
      // reordering a route cannot blank the names of its stops.
      expect(updateValues()).toContain(null);
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

  describe('getDiscoverRoads', () => {
    const publicRoad = (id: string, nickName: string | null = 'wanderer') => ({
      id,
      title: 'Coastal loop',
      description: 'A weekend drive',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      user: { nickName, firstName: 'Ada' },
      wayPoints: [
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
    it('hides archived roads from the owner’s own list', async () => {
      prisma.road.findMany.mockResolvedValue([]);
      prisma.road.count.mockResolvedValue(0);

      await service.getOwnRoads('user-1', { limit: 10, offset: 0 });

      expect(prisma.road.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', archivedAt: null },
        }),
      );
    });

    it('sends a stop count instead of the stops themselves', async () => {
      prisma.road.findMany.mockResolvedValue([
        {
          id: ROAD_ID,
          userId: 'user-1',
          title: 'T',
          description: 'D',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { wayPoints: 12 },
          favoriteRoads: [{ id: 'fav-1' }],
        },
      ]);
      prisma.road.count.mockResolvedValue(1);

      const result = await service.getOwnRoads('user-1', {
        limit: 10,
        offset: 0,
      });

      expect(result.data[0]).toMatchObject({
        id: ROAD_ID,
        stopCount: 12,
        isFavorite: true,
      });
      expect(result.data[0]).not.toHaveProperty('wayPoints');
      expect(prisma.road.findMany.mock.calls[0][0].select.wayPoints).toBeUndefined();
    });

    it('keeps archived roads out of the discover feed', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getDiscoverRoads('user-1', 5);

      const sql = prisma.$queryRaw.mock.calls[0][0].join('');
      expect(sql).toContain('"archivedAt" IS NULL');
    });

    it('still lets someone who favourited an archived road read it', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: ROAD_ID,
        favoriteRoads: [{ id: 'fav-1' }],
      });

      await service.getRoadById(ROAD_ID, 'user-2');

      const { where } = prisma.road.findFirst.mock.calls[0][0];
      expect(where.OR).toContainEqual({
        favoriteRoads: { some: { userId: 'user-2' } },
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
          wayPoints: [],
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
          wayPoints: [],
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
      wayPoints: [
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
      prisma.road.findUnique.mockResolvedValue({ id: OTHER_ROAD_ID });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const { where } = prisma.road.findFirst.mock.calls[0][0];
      expect(where.id).toBe(ROAD_ID);
      expect(where.OR).toContainEqual({ isPublic: true, archivedAt: null });
    });

    it('gives the copy to the caller and leaves it unpublished', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: OTHER_ROAD_ID });

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

    it('copies the addresses onto the new waypoints', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: OTHER_ROAD_ID });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const waypoints = prisma.wayPoint.createMany.mock.calls[0][0].data;

      // The copy carries its own addresses. Nothing is shared with the
      // original, so editing one route cannot rename a stop in the other.
      expect(waypoints.map((w: { address: string }) => w.address)).toEqual([
        'A',
        '',
      ]);
      expect(
        waypoints.every((w: { roadId: string }) => w.roadId === OTHER_ROAD_ID),
      ).toBe(true);
    });

    it('renumbers the copied stops from one', async () => {
      prisma.road.findFirst.mockResolvedValue(source);
      prisma.road.create.mockResolvedValue({ id: OTHER_ROAD_ID });
      prisma.road.findUnique.mockResolvedValue({ id: OTHER_ROAD_ID });

      await service.cloneRoad(ROAD_ID, 'user-2');

      const waypoints = prisma.wayPoint.createMany.mock.calls[0][0].data;
      expect(waypoints.map((w: { order: number }) => w.order)).toEqual([1, 2]);
    });
  });
});
