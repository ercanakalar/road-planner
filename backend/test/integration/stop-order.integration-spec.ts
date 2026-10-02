import { randomUUID } from 'crypto';

import { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import {
  applyStopOrder,
  applyStopValues,
  compactStopOrder,
  StopValues,
} from '../../src/road/services/road/stop-writes';
import { describeIntegration, integrationClient } from './client';

describeIntegration('Stop ordering (integration)', () => {
  let prisma: PrismaClient;
  let userId: string;
  let roadId: string;

  const positionsOf = async (road = roadId) =>
    (
      await prisma.stop.findMany({
        where: { roadId: road },
        orderBy: { order: 'asc' },
        select: { id: true, order: true },
      })
    ).map((w) => [w.id, w.order] as const);

  const givenStops = async (count: number, road = roadId) => {
    await prisma.stop.createMany({
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
    prisma = integrationClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `stop-order-${randomUUID()}@integration.test` },
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
    it('rejects two stops sharing a position on one road', async () => {
      await givenStops(2);

      await expect(
        prisma.stop.create({
          data: { latitude: 9, longitude: 9, order: 1, roadId },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('allows the same position on a different road', async () => {
      await givenStops(2);

      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });

      await expect(
        prisma.stop.create({
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
         WHERE conname = 'Stop_roadId_order_key'
      `);

      expect(constraint).toMatchObject({
        condeferrable: true,
        condeferred: true,
      });
    });
  });

  describe('applyStopOrder', () => {
    it('permutes positions in one statement', async () => {
      await givenStops(3);

      const changed = await applyStopOrder(prisma, roadId, [
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
      await givenStops(5);

      await applyStopOrder(
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
      await givenStops(2);

      await applyStopOrder(prisma, roadId, [
        { id: wp(1), order: 2 },
        { id: wp(2), order: 1 },
      ]);

      expect(await positionsOf()).toEqual([
        [wp(2), 1],
        [wp(1), 2],
      ]);
    });

    it('writes nothing when every position is already correct', async () => {
      await givenStops(3);

      const changed = await applyStopOrder(prisma, roadId, [
        { id: wp(1), order: 1 },
        { id: wp(2), order: 2 },
        { id: wp(3), order: 3 },
      ]);

      expect(changed).toBe(0);
    });

    it('ignores an id belonging to a different road', async () => {
      await givenStops(2);

      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });
      await givenStops(1, other.id);

      const changed = await applyStopOrder(prisma, roadId, [
        { id: wp(1, other.id), order: 9 },
      ]);

      expect(changed).toBe(0);
      expect(await positionsOf(other.id)).toEqual([[wp(1, other.id), 1]]);
    });

    // The shapes below are what AllExceptionsFilter maps to a 409; its unit
    // tests mirror them.
    it('still rejects a permutation that duplicates a position, at commit', async () => {
      await givenStops(3);

      await expect(
        prisma.$transaction((tx) =>
          applyStopOrder(tx, roadId, [
            { id: wp(1), order: 2 },
            { id: wp(2), order: 2 },
          ]),
        ),
      ).rejects.toMatchObject({
        name: 'DriverAdapterError',
        cause: { originalCode: '23505' },
      });
    });

    it('reports the violation as P2010 carrying SQLSTATE 23505 outside a transaction', async () => {
      await givenStops(3);

      await expect(
        applyStopOrder(prisma, roadId, [
          { id: wp(1), order: 2 },
          { id: wp(2), order: 2 },
        ]),
      ).rejects.toMatchObject({
        code: 'P2010',
        meta: { driverAdapterError: { cause: { originalCode: '23505' } } },
      });
    });

    it('leaves the positions untouched when the permutation is rejected', async () => {
      await givenStops(3);

      await expect(
        prisma.$transaction((tx) =>
          applyStopOrder(tx, roadId, [
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

  describe('applyStopValues', () => {
    const values = (
      id: string,
      latitude: number,
      longitude: number,
      order: number,
      extra: Partial<StopValues> = {},
    ): StopValues => ({
      id,
      latitude,
      longitude,
      order,
      address: null,
      refreshElevation: false,
      elevation: null,
      ...extra,
    });

    it('rewrites coordinates and positions together', async () => {
      await givenStops(2);

      await applyStopValues(prisma, roadId, [
        values(wp(1), 51.5, -0.12, 2),
        values(wp(2), 48.85, 2.35, 1),
      ]);

      const rows = await prisma.stop.findMany({
        where: { roadId },
        orderBy: { order: 'asc' },
      });

      expect(rows.map((r) => [r.id, r.order, r.latitude])).toEqual([
        [wp(2), 1, 48.85],
        [wp(1), 2, 51.5],
      ]);
    });

    it('keeps the stored address and height unless told otherwise', async () => {
      await givenStops(1);
      await prisma.stop.update({
        where: { id: wp(1) },
        data: { address: 'Kadıköy', elevation: 12 },
      });

      await applyStopValues(prisma, roadId, [values(wp(1), 1, 1, 1)]);

      await expect(
        prisma.stop.findUniqueOrThrow({ where: { id: wp(1) } }),
      ).resolves.toMatchObject({ address: 'Kadıköy', elevation: 12 });
    });

    it('replaces the height of a stop that moved', async () => {
      await givenStops(1);
      await prisma.stop.update({
        where: { id: wp(1) },
        data: { elevation: 12 },
      });

      await applyStopValues(prisma, roadId, [
        values(wp(1), 2, 2, 1, { refreshElevation: true, elevation: 40 }),
      ]);

      await expect(
        prisma.stop.findUniqueOrThrow({ where: { id: wp(1) } }),
      ).resolves.toMatchObject({ elevation: 40 });
    });

    it('touches updatedAt', async () => {
      await givenStops(1);
      const before = await prisma.stop.findUniqueOrThrow({
        where: { id: wp(1) },
      });

      await applyStopValues(prisma, roadId, [values(wp(1), 5, 5, 1)]);

      const after = await prisma.stop.findUniqueOrThrow({
        where: { id: wp(1) },
      });
      expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.updatedAt.getTime(),
      );
    });
  });

  describe('compactStopOrder', () => {
    it('closes the gap a deletion leaves', async () => {
      await givenStops(4);
      await prisma.stop.delete({ where: { id: wp(2) } });

      await compactStopOrder(prisma, roadId);

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(3), 2],
        [wp(4), 3],
      ]);
    });

    it('closes the gap an insertion past the end leaves', async () => {
      await givenStops(3);
      await prisma.stop.create({
        data: { id: wp(99), latitude: 9, longitude: 9, order: 99, roadId },
      });

      await compactStopOrder(prisma, roadId);

      expect(await positionsOf()).toEqual([
        [wp(1), 1],
        [wp(2), 2],
        [wp(3), 3],
        [wp(99), 4],
      ]);
    });

    it('leaves a contiguous road untouched', async () => {
      await givenStops(3);

      expect(await compactStopOrder(prisma, roadId)).toBe(0);
    });

    it('tolerates a road with no stops', async () => {
      await expect(compactStopOrder(prisma, roadId)).resolves.toBe(0);
    });

    it('does not renumber another road', async () => {
      const other = await prisma.road.create({
        data: { title: 'Other', description: 'Other', userId },
      });
      await givenStops(3);
      await givenStops(3, other.id);
      await prisma.stop.delete({ where: { id: wp(2) } });

      await compactStopOrder(prisma, roadId);

      expect((await positionsOf(other.id)).map(([, order]) => order)).toEqual([
        1, 2, 3,
      ]);
    });
  });

  describe('insertion by shifting', () => {
    const insertAt = async (position: number) => {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "Stop"
             SET "order" = "order" + 1, "updatedAt" = NOW()
           WHERE "roadId" = ${roadId} AND "order" >= ${position}
        `);

        await tx.stop.create({
          data: {
            id: wp(99),
            latitude: 9,
            longitude: 9,
            order: position,
            roadId,
          },
        });

        await compactStopOrder(tx, roadId);
      });
    };

    it('inserts in the middle without disturbing relative order', async () => {
      await givenStops(3);

      await insertAt(2);

      expect((await positionsOf()).map(([id]) => id)).toEqual([
        wp(1),
        wp(99),
        wp(2),
        wp(3),
      ]);
    });

    it('inserts at the front', async () => {
      await givenStops(3);

      await insertAt(1);

      expect((await positionsOf()).map(([id]) => id)).toEqual([
        wp(99),
        wp(1),
        wp(2),
        wp(3),
      ]);
    });

    it('inserts past the end and compacts to contiguous', async () => {
      await givenStops(3);

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
