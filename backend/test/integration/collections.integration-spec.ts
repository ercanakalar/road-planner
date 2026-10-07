import { randomUUID } from 'crypto';

import { PaginationQueryDto } from '../../src/common/dto/pagination.dto';
import { FavoritesService } from '../../src/favorites/favorites.service';
import { PrismaClient } from '../../src/generated/prisma/client';
import { ElevationService } from '../../src/maps/services/elevation.service';
import { RoutePublishNotifier } from '../../src/notification/publish/route-publish.notifier';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RoadService } from '../../src/road/services/road/road.service';
import { RoadVisibility } from '../../src/road/services/visibility/road-visibility';
import { UsageRecorder } from '../../src/statistics/usage.recorder';
import { createElevationMock } from '../../src/testing/mocks';
import { describeIntegration, integrationClient } from './client';

// The one-statement reads behind the Routes, Favourites and Home screens, run
// against Postgres: the favourites lists, the route totals and the Discover
// draw.
describeIntegration('Collections (integration)', () => {
  let prisma: PrismaClient;
  let roads: RoadService;
  let favorites: FavoritesService;
  let me: string;
  let other: string;

  const page = (limit = 50, offset = 0) =>
    Object.assign(new PaginationQueryDto(), { limit, offset });

  let clock = Date.parse('2026-01-01T00:00:00Z');
  const nextInstant = () => new Date((clock += 1000));

  const road = (
    userId: string,
    stops: number,
    data: { isPublic?: boolean; archivedAt?: Date } = {},
  ) =>
    prisma.road.create({
      data: {
        userId,
        title: `Trip ${randomUUID()}`,
        description: 'A trip',
        ...data,
        stops: {
          create: Array.from({ length: stops }, (_, i) => ({
            latitude: i + 0.123456789,
            longitude: i + 1.987654321,
            order: i + 1,
            address: `Stop ${i + 1}`,
          })),
        },
      },
      include: { stops: { orderBy: { order: 'asc' } } },
    });

  const favoriteRoad = (userId: string, roadId: string, title?: string) =>
    prisma.favoriteRoad.create({
      data: { userId, roadId, title, createdAt: nextInstant() },
    });

  const favoriteStop = (userId: string, stopId: string) =>
    prisma.favoriteStop.create({
      data: { userId, stopId, createdAt: nextInstant() },
    });

  beforeAll(() => {
    prisma = integrationClient();

    const db = prisma as unknown as PrismaService;
    roads = new RoadService(
      db,
      new RoadVisibility(),
      createElevationMock() as unknown as ElevationService,
      {
        notifyInBackground: jest.fn(),
      } as unknown as RoutePublishNotifier,
      { record: jest.fn() } as unknown as UsageRecorder,
    );
    favorites = new FavoritesService(db);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const users = await Promise.all(
      ['me', 'other'].map((who) =>
        prisma.user.create({
          data: {
            email: `collections-${who}-${randomUUID()}@integration.test`,
          },
        }),
      ),
    );
    [me, other] = users.map((user) => user.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [me, other] } } });
  });

  describe('getAllFavorites', () => {
    it('splits favourites by who owns the route, newest first', async () => {
      const mine = await road(me, 2);
      const theirs = await road(other, 3, { isPublic: true });

      await favoriteRoad(me, mine.id, 'my note');
      await favoriteStop(me, theirs.stops[1].id);
      await favoriteRoad(me, theirs.id);
      await favoriteStop(me, mine.stops[0].id);

      const { data } = await favorites.getAllFavorites(me, page());

      expect(data).toEqual({
        ownRoads: [
          {
            id: expect.any(String),
            title: 'my note',
            description: null,
            road: {
              id: mine.id,
              title: mine.title,
              description: 'A trip',
              userId: me,
              archivedAt: null,
            },
          },
        ],
        othersRoads: [
          expect.objectContaining({
            road: expect.objectContaining({ id: theirs.id, userId: other }),
          }),
        ],
        ownStops: [
          {
            id: expect.any(String),
            title: null,
            description: null,
            stop: {
              id: mine.stops[0].id,
              latitude: 0.123456789,
              longitude: 1.987654321,
              address: 'Stop 1',
            },
          },
        ],
        othersStops: [
          expect.objectContaining({
            stop: expect.objectContaining({ id: theirs.stops[1].id }),
          }),
        ],
      });
    });

    it('sends a withdrawn route’s archive time as Prisma would', async () => {
      const archivedAt = new Date('2026-03-04T05:06:07.089Z');
      const withdrawn = await road(other, 1, { isPublic: true, archivedAt });
      await favoriteRoad(me, withdrawn.id);

      const { data } = await favorites.getAllFavorites(me, page());

      expect(JSON.parse(JSON.stringify(data!.othersRoads[0].road))).toEqual(
        expect.objectContaining({ archivedAt: '2026-03-04T05:06:07.089Z' }),
      );
    });

    it('pages each list on its own and counts each in full', async () => {
      const theirs = await road(other, 5, { isPublic: true });
      const routes = await Promise.all([1, 2, 3].map(() => road(other, 0)));

      for (const route of routes) await favoriteRoad(me, route.id);
      for (const stop of theirs.stops) await favoriteStop(me, stop.id);

      const result = await favorites.getAllFavorites(me, page(2, 1));

      // Newest first: the second and third most recent of each.
      expect(result.data!.othersRoads.map((f) => f.road.id)).toEqual([
        routes[1].id,
        routes[0].id,
      ]);
      expect(result.data!.othersStops.map((f) => f.stop.id)).toEqual([
        theirs.stops[3].id,
        theirs.stops[2].id,
      ]);
      expect(result.meta).toEqual({
        roads: { total: 3, limit: 2, offset: 1, hasMore: false },
        stops: { total: 5, limit: 2, offset: 1, hasMore: true },
      });
    });

    it('shows nobody else’s favourites', async () => {
      const theirs = await road(other, 1, { isPublic: true });
      await favoriteRoad(other, theirs.id);
      await favoriteStop(other, theirs.stops[0].id);

      const result = await favorites.getAllFavorites(me, page());

      expect(result.data).toEqual({
        ownRoads: [],
        ownStops: [],
        othersRoads: [],
        othersStops: [],
      });
      expect(result.meta).toEqual({
        roads: { total: 0, limit: 50, offset: 0, hasMore: false },
        stops: { total: 0, limit: 50, offset: 0, hasMore: false },
      });
    });
  });

  describe('getOwnRoadsSummary', () => {
    it('counts the live routes, their stops and the starred ones', async () => {
      const a = await road(me, 3, { isPublic: true });
      const b = await road(me, 0);
      await road(me, 4, { archivedAt: new Date() });
      const theirs = await road(other, 6, { isPublic: true });

      await favoriteRoad(me, a.id);
      await favoriteRoad(me, theirs.id);
      await favoriteRoad(other, b.id);

      const { data } = await roads.getOwnRoadsSummary(me);

      expect(data).toEqual({
        routes: 2,
        publicRoutes: 1,
        stops: 3,
        favorites: 1,
      });
    });

    it('answers zeros for someone with no routes', async () => {
      const { data } = await roads.getOwnRoadsSummary(me);

      expect(data).toEqual({
        routes: 0,
        publicRoutes: 0,
        stops: 0,
        favorites: 0,
      });
    });
  });

  describe('getDiscoverRoads', () => {
    it('draws only live published routes that are not the viewer’s', async () => {
      await road(me, 1, { isPublic: true });
      await road(other, 1);
      await road(other, 1, { isPublic: true, archivedAt: new Date() });
      const published = await Promise.all(
        [1, 2, 3].map(() => road(other, 2, { isPublic: true })),
      );
      const publishedIds = new Set(published.map((r) => r.id));

      // Other suites leave nothing behind, so these three are the only
      // routes eligible; every draw, wherever its pivot lands, must find
      // all of them by wrapping round.
      for (let i = 0; i < 20; i++) {
        const { data } = await roads.getDiscoverRoads(me, 10);
        const ids = data.map((r) => r.id);

        expect(new Set(ids)).toEqual(publishedIds);
        expect(ids).toHaveLength(3);
      }
    });

    it('stops at the limit', async () => {
      await Promise.all(
        [1, 2, 3, 4, 5].map(() => road(other, 1, { isPublic: true })),
      );

      for (let i = 0; i < 10; i++) {
        const { data } = await roads.getDiscoverRoads(me, 2);
        expect(data).toHaveLength(2);
        expect(new Set(data.map((r) => r.id)).size).toBe(2);
      }
    });

    it('shows a signed-out visitor every published route', async () => {
      const published = await road(other, 1, { isPublic: true });

      const { data } = await roads.getDiscoverRoads(null, 10);

      expect(data.map((r) => r.id)).toEqual([published.id]);
    });
  });
});
