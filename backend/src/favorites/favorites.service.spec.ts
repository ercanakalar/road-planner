import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { ToastType } from 'src/common/type/status.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { FavoritesService } from './favorites.service';

const FIRST_PAGE = { limit: 50, offset: 0 };
const USER_ID = 'user-1';
const ROAD_ID = 'road-1';
const WAYPOINT_ID = 'wp-1';

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
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Favorite Added' });
    });

    it('removes an existing favourite', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Removed Favorite' });
      expect(prisma.favoriteRoad.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
    });

    it('rejects a favourite against a road that does not exist', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.favoriteRoad.create).not.toHaveBeenCalled();
    });

    it('still removes a favourite whose road has since been deleted', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.road.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Removed Favorite' });
    });

    it('scopes the existing-favourite lookup to the caller', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID);

      expect(prisma.favoriteRoad.findUnique).toHaveBeenCalledWith({
        where: { userId_roadId: { userId: USER_ID, roadId: ROAD_ID } },
        select: { id: true },
      });
    });

    it('reports a concurrent duplicate as already favourited', async () => {
      prisma.favoriteRoad.findUnique.mockResolvedValue(null);
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
      prisma.favoriteRoad.create.mockRejectedValue(duplicateError());

      await expect(
        service.toggleFavoriteRoad({ roadId: ROAD_ID }, USER_ID),
      ).resolves.toMatchObject({
        status: ToastType.Success,
        header: 'Already Favorited',
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
      prisma.road.findUnique.mockResolvedValue({ id: ROAD_ID });
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

  describe('toggleFavoriteWaypoint', () => {
    it('creates a favourite for an existing waypoint', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue(null);
      prisma.wayPoint.findUnique.mockResolvedValue({ id: WAYPOINT_ID });
      prisma.favoriteWaypoint.create.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Favorite Added' });
    });

    it('removes an existing favourite', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Removed Favorite' });
    });

    it('still removes a favourite whose waypoint has since been deleted', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.wayPoint.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).resolves.toMatchObject({ header: 'Removed Favorite' });
    });

    it('propagates a missing waypoint as a 404 rather than a 200', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue(null);
      prisma.wayPoint.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('reports a concurrent duplicate as already favourited', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue(null);
      prisma.wayPoint.findUnique.mockResolvedValue({ id: WAYPOINT_ID });
      prisma.favoriteWaypoint.create.mockRejectedValue(duplicateError());

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).resolves.toMatchObject({
        status: ToastType.Success,
        header: 'Already Favorited',
      });
    });

    it('propagates an unrecognised database failure instead of answering 200', async () => {
      prisma.favoriteWaypoint.findUnique.mockRejectedValue(
        new Error('connection terminated'),
      );

      await expect(
        service.toggleFavoriteWaypoint({ waypointId: WAYPOINT_ID }, USER_ID),
      ).rejects.toThrow('connection terminated');
    });
  });

  describe('getAllFavorites', () => {
    it('scopes every query to the caller', async () => {
      prisma.$transaction.mockResolvedValue([[], [], [], []]);

      await service.getAllFavorites(USER_ID, FIRST_PAGE);

      for (const call of [
        ...prisma.favoriteRoad.findMany.mock.calls,
        ...prisma.favoriteWaypoint.findMany.mock.calls,
      ]) {
        expect(call[0].where).toMatchObject({ userId: USER_ID });
      }
    });

    it('returns the four buckets the client expects', async () => {
      prisma.$transaction.mockResolvedValue([[], [], [], []]);

      const result = await service.getAllFavorites(USER_ID, FIRST_PAGE);

      expect(result.data).toEqual({
        ownRoads: [],
        ownWaypoints: [],
        othersRoads: [],
        othersWaypoints: [],
      });
    });
  });
});
