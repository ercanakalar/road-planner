import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

import {
  applyWaypointOrder,
  applyWaypointValues,
  compactWaypointOrder,
} from '../../src/road/services/road/waypoint-writes';

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;

const describeIntegration = DATABASE_URL ? describe : describe.skip;

describeIntegration('Waypoint ordering (integration)', () => {
  let prisma: PrismaClient;
  let userId: string;
  let roadId: string;

  const positionsOf = async (road = roadId) =>
    (
      await prisma.wayPoint.findMany({
        where: { roadId: road },
        orderBy: { order: 'asc' },
        select: { id: true, order: true },
      })
    ).map((w) => [w.id, w.order] as const);

  const givenWaypoints = async (count: number, road = roadId) => {
    await prisma.wayPoint.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        id: `${road}-wp-${i + 1}`,
        latitude: i,
        longitude: i,
        order: i + 1,
        roadId: road,
      })),
    });
  };

  const wp = (n: number, road = roadId) => `${road}-wp-${n}`;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `waypoint-order-${randomUUID()}@integration.test` },
    });
    userId = user.id;

    const road = await prisma.road.create({
      data: { title: 'Trip', description: 'A trip', userId },
    });
    roadId = road.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  describe('the constraint itself', () => {
    it('rejects two waypoints sharing a position on one road', async () => {
      await givenWaypoints(2);

      await expect(
        prisma.wayPoint.create({
          data: { latitude: 9, longitude: 9, order: 1, roadId },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('allows the same position on a different road', async () => {
      await givenWaypoints(2);

      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });

      await expect(
        prisma.wayPoint.create({
          data: { latitude: 9, longitude: 9, order: 1, roadId: other.id },
        }),
      ).resolves.toMatchObject({ order: 1 });
    });

    it('is deferred to the end of the transaction', async () => {
      const [constraint] = await prisma.$queryRaw<
        { condeferrable: boolean; condeferred: boolean }[]
      >(Prisma.sql`
        SELECT condeferrable, condeferred
          FROM pg_constraint
         WHERE conname = 'WayPoint_roadId_order_key'
      `);

      expect(constraint).toMatchObject({
        condeferrable: true,
        condeferred: true,
      });
    });
  });

  describe('applyWaypointOrder', () => {
    it('permutes positions in one statement', async () => {
      await givenWaypoints(3);

      const changed = await applyWaypointOrder(prisma, roadId, [
        { id: wp(1), order: 3 },
        { id: wp(2), order: 1 },
        { id: wp(3), order: 2 },
      ]);

      expect(changed).toBe(3);
      expect(await positionsOf()).toEqual([
        [wp(2), 1],
        [wp(3), 2],
        [wp(1), 3],
      ]);
    });

    it('reverses a whole road in one statement', async () => {
      await givenWaypoints(5);

      await applyWaypointOrder(
        prisma,
        roadId,
        [1, 2, 3, 4, 5].map((n) => ({ id: wp(n), order: 6 - n })),
      );

      expect((await positionsOf()).map(([id]) => id)).toEqual([
        wp(5),
        wp(4),
        wp(3),
        wp(2),
        wp(1),
      ]);
    });

    it('swaps two adjacent positions', async () => {
      await givenWaypoints(2);

      await applyWaypointOrder(prisma, roadId, [
        { id: wp(1), order: 2 },
        { id: wp(2), order: 1 },
      ]);

      expect(await positionsOf()).toEqual([
        [wp(2), 1],
        [wp(1), 2],
      ]);
    });

    it('writes nothing when every position is already correct', async () => {
      await givenWaypoints(3);

      const changed = await applyWaypointOrder(prisma, roadId, [
        { id: wp(1), order: 1 },
        { id: wp(2), order: 2 },
        { id: wp(3), order: 3 },
      ]);

      expect(changed).toBe(0);
    });

    it('ignores an id belonging to a different road', async () => {
      await givenWaypoints(2);

      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });
      await givenWaypoints(1, other.id);

      const changed = await applyWaypointOrder(prisma, roadId, [
        { id: wp(1, other.id), order: 9 },
      ]);

      expect(changed).toBe(0);
      expect(await positionsOf(other.id)).toEqual([[wp(1, other.id), 1]]);
    });

    it('still rejects a permutation that duplicates a position', async () => {
      await givenWaypoints(3);

      await expect(
        prisma.$transaction((tx) =>
          applyWaypointOrder(tx, roadId, [
            { id: wp(1), order: 2 },
            { id: wp(2), order: 2 },
          ]),
        ),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('reports the violation as P2010 with SQLSTATE 23505 outside a transaction', async () => {
      await givenWaypoints(3);

      await expect(
        applyWaypointOrder(prisma, roadId, [
          { id: wp(1), order: 2 },
          { id: wp(2), order: 2 },
        ]),
      ).rejects.toMatchObject({
        code: 'P2010',
        meta: { code: '23505' },
      });
    });

    it('leaves the positions untouched when the permutation is rejected', async () => {
      await givenWaypoints(3);

      await expect(
        prisma.$transaction((tx) =>
          applyWaypointOrder(tx, roadId, [
            { id: wp(1), order: 2 },
            { id: wp(2), order: 2 },
          ]),
        ),
      ).rejects.toThrow();

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(2), 2],
        [wp(3), 3],
      ]);
    });
  });

  describe('applyWaypointValues', () => {
    it('rewrites coordinates and positions together', async () => {
      await givenWaypoints(2);

      await applyWaypointValues(prisma, roadId, [
        { id: wp(1), latitude: 51.5, longitude: -0.12, order: 2 },
        { id: wp(2), latitude: 48.85, longitude: 2.35, order: 1 },
      ]);

      const rows = await prisma.wayPoint.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      expect(rows.map((r) => [r.id, r.order, r.latitude])).toEqual([
        [wp(2), 1, 48.85],
        [wp(1), 2, 51.5],
      ]);
    });

    it('touches updatedAt', async () => {
      await givenWaypoints(1);
      const before = await prisma.wayPoint.findUniqueOrThrow({
        where: { id: wp(1) },
      });

      await applyWaypointValues(prisma, roadId, [
        { id: wp(1), latitude: 5, longitude: 5, order: 1 },
      ]);

      const after = await prisma.wayPoint.findUniqueOrThrow({
        where: { id: wp(1) },
      });
      expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.updatedAt.getTime(),
      );
    });
  });

  describe('compactWaypointOrder', () => {
    it('closes the gap a deletion leaves', async () => {
      await givenWaypoints(4);
      await prisma.wayPoint.delete({ where: { id: wp(2) } });

      await compactWaypointOrder(prisma, roadId);

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(3), 2],
        [wp(4), 3],
      ]);
    });

    it('closes the gap an insertion past the end leaves', async () => {
      await givenWaypoints(3);
      await prisma.wayPoint.create({
        data: { id: wp(99), latitude: 9, longitude: 9, order: 99, roadId },
      });

      await compactWaypointOrder(prisma, roadId);

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(2), 2],
        [wp(3), 3],
        [wp(99), 4],
      ]);
    });

    it('leaves a contiguous road untouched', async () => {
      await givenWaypoints(3);

      expect(await compactWaypointOrder(prisma, roadId)).toBe(0);
    });

    it('tolerates a road with no waypoints', async () => {
      await expect(compactWaypointOrder(prisma, roadId)).resolves.toBe(0);
    });

    it('does not renumber another road', async () => {
      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });
      await givenWaypoints(3);
      await givenWaypoints(3, other.id);
      await prisma.wayPoint.delete({ where: { id: wp(2) } });

      await compactWaypointOrder(prisma, roadId);

      expect((await positionsOf(other.id)).map(([, order]) => order)).toEqual([
        1, 2, 3,
      ]);
    });
  });

  describe('insertion by shifting', () => {
    const insertAt = async (position: number) => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "WayPoint"
             SET "order" = "order" + 1, "updatedAt" = NOW()
           WHERE "roadId" = ${roadId} AND "order" >= ${position}
        `);

        await tx.wayPoint.create({
          data: {
            id: wp(99),
            latitude: 9,
            longitude: 9,
            order: position,
            roadId,
          },
        });

        await compactWaypointOrder(tx, roadId);
      });
    };

    it('inserts in the middle without disturbing relative order', async () => {
      await givenWaypoints(3);

      await insertAt(2);

      expect((await positionsOf()).map(([id]) => id)).toEqual([
        wp(1),
        wp(99),
        wp(2),
        wp(3),
      ]);
    });

    it('inserts at the front', async () => {
      await givenWaypoints(3);

      await insertAt(1);

      expect((await positionsOf()).map(([id]) => id)).toEqual([
        wp(99),
        wp(1),
        wp(2),
        wp(3),
      ]);
    });

    it('inserts past the end and compacts to contiguous', async () => {
      await givenWaypoints(3);

      await insertAt(50);

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(2), 2],
        [wp(3), 3],
        [wp(99), 4],
      ]);
    });
  });
});
