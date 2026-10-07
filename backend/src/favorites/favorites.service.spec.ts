import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';

import { ToastType } from 'src/common/type/status.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { FavoritesService } from './favorites.service';

const FIRST_PAGE = { limit: 50, offset: 0 };
const USER_ID = 'user-1';
const ROAD_ID = 'road-1';
const STOP_ID = 'wp-1';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FavoritesService);
  });

  const duplicateError = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.9.0',
    });

  describe('toggleFavoriteRoad', () => {
    it('creates a favourite for an existing road', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.addedHeader' });
    });

    it('removes an existing favourite', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.removedHeader' });
      expect(prisma.favoriteRoad.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
    });

    it('rejects a favourite against a road that does not exist', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.favoriteRoad.create).not.toHaveBeenCalled();
    });

    it('still removes a favourite whose road has since been deleted', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.removedHeader' });
    });

    it('scopes the existing-favourite lookup to the caller', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID);

      expect(prisma.favoriteRoad.findUnique).toHaveBeenCalledWith({
        where: { userId_roadId: { userId: USER_ID, roadId: ROAD_ID } },
        select: { id: true },
      });
    });

    it('reports a concurrent duplicate as already favourited', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockRejectedValue(duplicateError());

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({
        status: ToastType.Success,
        header: 'favorite.alreadyHeader',
      });
    });

    it('propagates an unrecognised database failure instead of answering 200', async () => {
      prisma.favoriteRoad.findUnique.mockRejectedValue(
        new Error('connection terminated'),
      );

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).rejects.toThrow('connection terminated');
    });

    it('propagates a foreign-key violation instead of answering 200', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK failed', {
          code: 'P2003',
          clientVersion: '6.9.0',
        }),
      );

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe('toggleFavoriteStop', () => {
    it('creates a favourite for an existing stop', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue(null);
      prisma.stop.findFirst.mockResolvedValue({ id: STOP_ID });
      prisma.favoriteStop.create.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.addedHeader' });
    });

    it('removes an existing favourite', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.removedHeader' });
    });

    it('still removes a favourite whose stop has since been deleted', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.stop.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.removedHeader' });
    });

    it('propagates a missing stop as a 404 rather than a 200', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue(null);
      prisma.stop.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('reports a concurrent duplicate as already favourited', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue(null);
      prisma.stop.findFirst.mockResolvedValue({ id: STOP_ID });
      prisma.favoriteStop.create.mockRejectedValue(duplicateError());

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).resolves.toMatchObject({
        status: ToastType.Success,
        header: 'favorite.alreadyHeader',
      });
    });

    it('propagates an unrecognised database failure instead of answering 200', async () => {
      prisma.favoriteStop.findUnique.mockRejectedValue(
        new Error('connection terminated'),
      );

      await expect(
        service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID),
      ).rejects.toThrow('connection terminated');
    });
  });

  describe('getAllFavorites', () => {
    const favoritesSql = () => prisma.$queryRaw.mock.calls[0][0].join('?');

    const roadRow = (id: string, ownerId: string) => ({
      id,
      title: null,
      description: null,
      road: {
        id: `road-of-${id}`,
        title: 'T',
        description: 'D',
        userId: ownerId,
        archivedAt: null,
      },
    });

    const stopRow = (id: string, isOwn: boolean) => ({
      id,
      title: null,
      description: 'note',
      stop: { id: `stop-of-${id}`, latitude: 1, longitude: 2, address: 'A' },
      isOwn,
    });

    const answer = (overrides: Record<string, unknown> = {}) => [
      { roads: [], stops: [], roadTotal: 0, stopTotal: 0, ...overrides },
    ];

    it('scopes every part of the query to the caller', async () => {
      prisma.$queryRaw.mockResolvedValue(answer());

      await service.getAllFavorites(USER_ID, FIRST_PAGE);

      const sql = favoritesSql();
      expect(sql.match(/f."userId" = \?/g)).toHaveLength(2);
      expect(sql.match(/WHERE "userId" = \?/g)).toHaveLength(2);
      expect(sql).toMatch(/r."userId" = \? AS "isOwn"/);
      expect(
        prisma.$queryRaw.mock.calls[0]
          .slice(1)
          .filter((value: unknown) => value === USER_ID).length,
      ).toBe(5);
    });

    it('returns the four buckets the client expects', async () => {
      prisma.$queryRaw.mockResolvedValue(answer());

      const result = await service.getAllFavorites(USER_ID, FIRST_PAGE);

      expect(result.data).toEqual({
        ownRoads: [],
        ownStops: [],
        othersRoads: [],
        othersStops: [],
      });
    });

    it('sorts favourites into the caller’s own and other people’s', async () => {
      prisma.$queryRaw.mockResolvedValue(
        answer({
          roads: [roadRow('fr-1', USER_ID), roadRow('fr-2', 'someone-else')],
          stops: [stopRow('fs-1', false), stopRow('fs-2', true)],
        }),
      );

      const { data } = await service.getAllFavorites(USER_ID, FIRST_PAGE);

      expect(data!.ownRoads.map((f) => f.id)).toEqual(['fr-1']);
      expect(data!.othersRoads.map((f) => f.id)).toEqual(['fr-2']);
      expect(data!.ownStops.map((f) => f.id)).toEqual(['fs-2']);
      expect(data!.othersStops.map((f) => f.id)).toEqual(['fs-1']);
    });

    it('keeps the shape the client reads, without the ownership flag', async () => {
      prisma.$queryRaw.mockResolvedValue(
        answer({ stops: [stopRow('fs-1', true)] }),
      );

      const { data } = await service.getAllFavorites(USER_ID, FIRST_PAGE);

      expect(data!.ownStops[0]).toEqual({
        id: 'fs-1',
        title: null,
        description: 'note',
        stop: { id: 'stop-of-fs-1', latitude: 1, longitude: 2, address: 'A' },
      });
    });

    it('reads json columns whether the driver parsed them or not', async () => {
      prisma.$queryRaw.mockResolvedValue(
        answer({ roads: JSON.stringify([roadRow('fr-1', USER_ID)]) }),
      );

      const { data } = await service.getAllFavorites(USER_ID, FIRST_PAGE);

      expect(data!.ownRoads.map((f) => f.id)).toEqual(['fr-1']);
    });

    it('does not load the stops of a favourited route', async () => {
      prisma.$queryRaw.mockResolvedValue(answer());

      await service.getAllFavorites(USER_ID, FIRST_PAGE);

      const roadsPart = favoritesSql().split('stops AS')[0];
      expect(roadsPart).not.toMatch(/"Stop"/);
    });

    it('pages both lists and counts their totals in one round trip', async () => {
      prisma.$queryRaw.mockResolvedValue(
        answer({ roadTotal: 120, stopTotal: 7 }),
      );

      const result = await service.getAllFavorites(USER_ID, {
        limit: 50,
        offset: 50,
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.favoriteRoad.findMany).not.toHaveBeenCalled();
      expect(prisma.favoriteStop.findMany).not.toHaveBeenCalled();
      expect(favoritesSql().match(/LIMIT \? OFFSET \?/g)).toHaveLength(2);
      expect(result.meta).toEqual({
        roads: { total: 120, limit: 50, offset: 50, hasMore: true },
        stops: { total: 7, limit: 50, offset: 50, hasMore: false },
      });
    });
  });

  describe('what may be favourited', () => {
    it('accepts only the caller’s own roads and published ones', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID);

      expect(prisma.road.findFirst).toHaveBeenCalledWith({
        where: {
          id: ROAD_ID,
          archivedAt: null,
          OR: [{ userId: USER_ID }, { isPublic: true }],
        },
        select: { id: true },
      });
    });

    it('refuses a road that is neither owned nor published', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.favoriteRoad.create).not.toHaveBeenCalled();
    });

    it('scopes a stop to a road the caller may already see', async () => {
      prisma.favoriteStop.findUnique.mockResolvedValue(null);
      prisma.stop.findFirst.mockResolvedValue({ id: STOP_ID });
      prisma.favoriteStop.create.mockResolvedValue({ id: 'fav-1' });

      await service.toggleFavoriteStop({ stopId: STOP_ID }, USER_ID);

      expect(prisma.stop.findFirst).toHaveBeenCalledWith({
        where: {
          id: STOP_ID,
          road: {
            archivedAt: null,
            OR: [{ userId: USER_ID }, { isPublic: true }],
          },
        },
        select: { id: true },
      });
    });

    it('still removes an existing favourite without re-checking visibility', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.favoriteRoad.delete.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'favorite.removedHeader' });
      expect(prisma.road.findFirst).not.toHaveBeenCalled();
    });
  });
});
