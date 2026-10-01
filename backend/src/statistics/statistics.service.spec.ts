import { NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import {
  ACTIVITY_WINDOW_DAYS,
  everyDay,
  StatisticsService,
  windowStart,
} from './statistics.service';
import { USAGE_EVENTS } from './usage-events';

const NOW = new Date('2026-10-01T15:30:00.000Z');
const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

describe('StatisticsService', () => {
  let prisma: PrismaMock;
  let service: StatisticsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new StatisticsService(prisma as unknown as PrismaService);

    for (const model of [
      prisma.user,
      prisma.road,
      prisma.stop,
      prisma.favoriteRoad,
      prisma.favoriteStop,
      prisma.authorFollow,
      prisma.consentRecord,
      prisma.accountDeletion,
    ]) {
      model.count.mockResolvedValue(0);
    }
    prisma.usageEvent.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  describe('windowStart / everyDay', () => {
    it('makes "the last 7 days" today plus the six whole days before it', () => {
      expect(windowStart(NOW, 7).toISOString()).toBe(
        '2026-09-25T00:00:00.000Z',
      );
    });

    it('lists one bucket per day, ends included, so quiet days are not lost', () => {
      expect(everyDay(windowStart(NOW, 3), NOW)).toEqual([
        '2026-09-29',
        '2026-09-30',
        '2026-10-01',
      ]);
    });

    it('crosses a month end without skipping or repeating a day', () => {
      const days = everyDay(windowStart(NOW, 30), NOW);

      expect(days).toHaveLength(30);
      expect(new Set(days).size).toBe(30);
    });
  });

  describe('mine', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        permit: { permissions: [] },
      });
    });

    it('answers with the person’s own routes, favourites and reach', async () => {
      prisma.road.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
      prisma.stop.count.mockResolvedValue(87);
      prisma.favoriteRoad.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(7);
      prisma.favoriteStop.count.mockResolvedValue(9);
      prisma.authorFollow.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2);

      const { data } = await service.mine(USER_ID, NOW);

      expect(data).toMatchObject({
        memberSince: new Date('2026-05-01T00:00:00.000Z'),
        routes: { total: 12, public: 3, stops: 87 },
        favorites: { routes: 5, stops: 9 },
        reach: { followers: 4, following: 2, savesByOthers: 7 },
        canViewOverview: false,
      });
    });

    it('counts reach as other people saving this person’s routes', async () => {
      await service.mine(USER_ID, NOW);

      expect(prisma.favoriteRoad.count).toHaveBeenCalledWith({
        where: { road: { userId: USER_ID }, NOT: { userId: USER_ID } },
      });
    });

    it('leaves routes the person removed out of their own totals', async () => {
      await service.mine(USER_ID, NOW);

      expect(prisma.road.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, archivedAt: null },
      });
      expect(prisma.stop.count).toHaveBeenCalledWith({
        where: { road: { userId: USER_ID, archivedAt: null } },
      });
    });

    it('sums the person’s activity over the window, busiest feature first', async () => {
      prisma.usageEvent.groupBy.mockResolvedValue([
        { event: 'route_created', _count: { _all: 2 } },
        { event: 'maps_directions', _count: { _all: 40 } },
      ]);

      const { data } = await service.mine(USER_ID, NOW);

      expect(data.activity).toEqual({
        days: ACTIVITY_WINDOW_DAYS,
        total: 42,
        events: [
          { event: 'maps_directions', count: 40 },
          { event: 'route_created', count: 2 },
        ],
      });
      expect(prisma.usageEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            createdAt: { gte: windowStart(NOW, ACTIVITY_WINDOW_DAYS) },
          },
        }),
      );
    });

    it('tells an admin that the app-wide overview is open to them', async () => {
      prisma.user.findUnique.mockResolvedValue({
        createdAt: NOW,
        permit: { permissions: [{ name: 'ACCESS_DASHBOARD' }] },
      });

      const { data } = await service.mine(USER_ID, NOW);

      expect(data.canViewOverview).toBe(true);
    });

    it('does not tell a user without a permit anything of the sort', async () => {
      prisma.user.findUnique.mockResolvedValue({
        createdAt: NOW,
        permit: null,
      });

      const { data } = await service.mine(USER_ID, NOW);

      expect(data.canViewOverview).toBe(false);
    });

    it('refuses an account that no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.mine(USER_ID, NOW)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('overview', () => {
    const rawCalls = () =>
      prisma.$queryRaw.mock.calls.map(([strings]) =>
        (strings as string[]).join('?'),
      );

    const answerRaw = (
      feature: unknown[],
      daily: unknown[],
      active: unknown[],
    ) =>
      prisma.$queryRaw.mockImplementation((strings: string[]) => {
        const sql = strings.join('?');
        if (sql.includes('to_char')) return Promise.resolve(daily);
        if (sql.includes('GROUP BY "event"')) return Promise.resolve(feature);
        return Promise.resolve(active);
      });

    it('lists every feature the app can count, the unused ones as zeros', async () => {
      answerRaw([{ event: 'maps_directions', count: 50, users: 9 }], [], []);

      const { data } = await service.overview(30, NOW);

      expect(data.features.map(({ event }) => event).sort()).toEqual(
        [...USAGE_EVENTS].sort(),
      );
      expect(data.features[0]).toEqual({
        event: 'maps_directions',
        count: 50,
        users: 9,
        previousCount: 0,
      });
      expect(
        data.features.find(({ event }) => event === 'route_copied'),
      ).toEqual({
        event: 'route_copied',
        count: 0,
        users: 0,
        previousCount: 0,
      });
    });

    it('sets each feature against the period before, for a trend', async () => {
      answerRaw([{ event: 'route_created', count: 10, users: 4 }], [], []);
      prisma.usageEvent.groupBy.mockResolvedValue([
        { event: 'route_created', _count: { _all: 6 } },
      ]);

      const { data } = await service.overview(7, NOW);

      expect(
        data.features.find(({ event }) => event === 'route_created'),
      ).toMatchObject({ count: 10, previousCount: 6 });

      const from = windowStart(NOW, 7);
      expect(prisma.usageEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000),
              lt: from,
            },
          },
        }),
      );
    });

    it('keeps a feature it does not know yet rather than hiding it', async () => {
      answerRaw([{ event: 'retired_feature', count: 1, users: 1 }], [], []);

      const { data } = await service.overview(30, NOW);

      expect(data.features.map(({ event }) => event)).toContain(
        'retired_feature',
      );
    });

    it('draws one point a day, filling silent days with zeros', async () => {
      answerRaw(
        [],
        [{ date: '2026-09-30', events: 12, activeUsers: 3 }],
        [{ activeUsers: 3 }],
      );

      const { data } = await service.overview(3, NOW);

      expect(data.daily).toEqual([
        { date: '2026-09-29', events: 0, activeUsers: 0 },
        { date: '2026-09-30', events: 12, activeUsers: 3 },
        { date: '2026-10-01', events: 0, activeUsers: 0 },
      ]);
      expect(data.totals.activeUsers).toBe(3);
    });

    it('reports consent given, withdrawn and the accounts deleted for it', async () => {
      prisma.consentRecord.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(2);
      prisma.accountDeletion.count.mockResolvedValue(2);

      const { data } = await service.overview(30, NOW);

      expect(data.consent).toEqual({
        granted: 20,
        withdrawn: 2,
        accountsDeleted: 2,
      });
      expect(prisma.consentRecord.count).toHaveBeenCalledWith({
        where: {
          action: 'WITHDRAWN',
          createdAt: { gte: windowStart(NOW, 30) },
        },
      });
    });

    it('states the period it covers', async () => {
      const { data } = await service.overview(30, NOW);

      expect(data.period).toEqual({
        days: 30,
        from: windowStart(NOW, 30).toISOString(),
        to: NOW.toISOString(),
      });
    });

    it('passes the window to SQL as a parameter, never spliced into the text', async () => {
      await service.overview(30, NOW);

      for (const sql of rawCalls()) {
        expect(sql).not.toContain('2026');
      }
      for (const [, ...values] of prisma.$queryRaw.mock.calls) {
        expect(values).toEqual([windowStart(NOW, 30)]);
      }
    });
  });
});
