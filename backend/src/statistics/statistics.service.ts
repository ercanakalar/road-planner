import { Injectable, NotFoundException } from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { USAGE_EVENTS } from './usage-events';

// Who may read the whole app's numbers: the permission the admin dashboard
// already uses, so granting one grants the other.
export const OVERVIEW_PERMISSION = 'ACCESS_DASHBOARD';

// "Your activity" looks back this far.
export const ACTIVITY_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

interface FeatureRow {
  event: string;
  count: number;
  users: number;
}

interface DailyRow {
  date: string;
  events: number;
  activeUsers: number;
}

const startOfUtcDay = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

// The window for "the last N days": today so far plus the N - 1 whole UTC days
// before it, so a daily series has exactly N buckets.
export const windowStart = (now: Date, days: number): Date =>
  new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS);

// Every UTC day from `from` up to and including the day of `to`, so a quiet
// day shows up as a zero instead of vanishing from the series.
export const everyDay = (from: Date, to: Date): string[] => {
  const days: string[] = [];
  const last = startOfUtcDay(to).getTime();

  for (let day = startOfUtcDay(from).getTime(); day <= last; day += DAY_MS) {
    days.push(isoDay(new Date(day)));
  }

  return days;
};

const byCountDescending = <T extends { count: number; event: string }>(
  one: T,
  other: T,
): number => other.count - one.count || one.event.localeCompare(other.event);

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(userId: string, now: Date = new Date()) {
    const since = windowStart(now, ACTIVITY_WINDOW_DAYS);

    const [
      user,
      routes,
      publicRoutes,
      stops,
      favoriteRoutes,
      favoriteStops,
      followers,
      following,
      savesByOthers,
      activity,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          permit: { select: { permissions: { select: { name: true } } } },
        },
      }),
      this.prisma.road.count({ where: { userId, archivedAt: null } }),
      this.prisma.road.count({
        where: { userId, archivedAt: null, isPublic: true },
      }),
      this.prisma.stop.count({ where: { road: { userId, archivedAt: null } } }),
      this.prisma.favoriteRoad.count({ where: { userId } }),
      this.prisma.favoriteStop.count({ where: { userId } }),
      this.prisma.authorFollow.count({ where: { authorId: userId } }),
      this.prisma.authorFollow.count({ where: { followerId: userId } }),
      // Reach: how often other people saved one of this person's routes. A
      // route its owner later removed still counts — the saves still exist.
      this.prisma.favoriteRoad.count({
        where: { road: { userId }, NOT: { userId } },
      }),
      this.prisma.usageEvent.groupBy({
        by: ['event'],
        where: { userId, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('error.userNotFound');
    }

    const events = activity
      .map(({ event, _count }) => ({ event, count: _count._all }))
      .sort(byCountDescending);

    return ok({
      data: {
        memberSince: user.createdAt,
        routes: { total: routes, public: publicRoutes, stops },
        favorites: { routes: favoriteRoutes, stops: favoriteStops },
        reach: { followers, following, savesByOthers },
        activity: {
          days: ACTIVITY_WINDOW_DAYS,
          total: events.reduce((sum, { count }) => sum + count, 0),
          events,
        },
        canViewOverview:
          user.permit?.permissions.some(
            ({ name }) => name === OVERVIEW_PERMISSION,
          ) ?? false,
      },
    });
  }

  async overview(days: number, now: Date = new Date()) {
    const from = windowStart(now, days);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);

    const [
      users,
      newUsers,
      routes,
      publicRoutes,
      stops,
      favoriteRoutes,
      favoriteStops,
      follows,
      consentsGranted,
      consentsWithdrawn,
      accountsDeleted,
      current,
      previous,
      daily,
      active,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: from } } }),
      this.prisma.road.count({ where: { archivedAt: null } }),
      this.prisma.road.count({ where: { archivedAt: null, isPublic: true } }),
      this.prisma.stop.count({ where: { road: { archivedAt: null } } }),
      this.prisma.favoriteRoad.count(),
      this.prisma.favoriteStop.count(),
      this.prisma.authorFollow.count(),
      this.prisma.consentRecord.count({
        where: { action: 'GRANTED', createdAt: { gte: from } },
      }),
      this.prisma.consentRecord.count({
        where: { action: 'WITHDRAWN', createdAt: { gte: from } },
      }),
      this.prisma.accountDeletion.count({
        where: { deletedAt: { gte: from } },
      }),
      this.prisma.$queryRaw<FeatureRow[]>`
        SELECT "event",
               COUNT(*)::int                 AS "count",
               COUNT(DISTINCT "userId")::int AS "users"
          FROM "UsageEvent"
         WHERE "createdAt" >= ${from}
         GROUP BY "event"`,
      this.prisma.usageEvent.groupBy({
        by: ['event'],
        where: { createdAt: { gte: previousFrom, lt: from } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "date",
               COUNT(*)::int                                         AS "events",
               COUNT(DISTINCT "userId")::int                         AS "activeUsers"
          FROM "UsageEvent"
         WHERE "createdAt" >= ${from}
         GROUP BY 1
         ORDER BY 1`,
      this.prisma.$queryRaw<{ activeUsers: number }[]>`
        SELECT COUNT(DISTINCT "userId")::int AS "activeUsers"
          FROM "UsageEvent"
         WHERE "createdAt" >= ${from}`,
    ]);

    const currentByEvent = new Map(current.map((row) => [row.event, row]));
    const previousByEvent = new Map(
      previous.map(({ event, _count }) => [event, _count._all]),
    );

    // Every feature the app can count, including the ones nobody used: a row
    // of zeros is the most useful thing this table can show.
    const names = new Set<string>([
      ...USAGE_EVENTS,
      ...currentByEvent.keys(),
      ...previousByEvent.keys(),
    ]);

    const features = [...names]
      .map((event) => ({
        event,
        count: currentByEvent.get(event)?.count ?? 0,
        users: currentByEvent.get(event)?.users ?? 0,
        previousCount: previousByEvent.get(event) ?? 0,
      }))
      .sort(byCountDescending);

    const dailyByDate = new Map(daily.map((row) => [row.date, row]));

    return ok({
      data: {
        period: { days, from: from.toISOString(), to: now.toISOString() },
        totals: {
          users,
          newUsers,
          activeUsers: active[0]?.activeUsers ?? 0,
          routes,
          publicRoutes,
          stops,
          favoriteRoutes,
          favoriteStops,
          follows,
        },
        consent: {
          granted: consentsGranted,
          withdrawn: consentsWithdrawn,
          accountsDeleted,
        },
        features,
        daily: everyDay(from, now).map((date) => ({
          date,
          events: dailyByDate.get(date)?.events ?? 0,
          activeUsers: dailyByDate.get(date)?.activeUsers ?? 0,
        })),
      },
    });
  }
}
