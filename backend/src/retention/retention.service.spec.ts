import { PrismaService } from 'src/prisma/prisma.service';
import { UsageRecorder } from 'src/statistics/usage.recorder';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import {
  DELETED_ROUTE_RETENTION_DAYS,
  RetentionService,
} from './retention.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-02T12:00:00.000Z');

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('RetentionService', () => {
  let prisma: PrismaMock;
  let usage: { prune: jest.Mock };
  let retention: RetentionService;

  beforeEach(() => {
    prisma = createPrismaMock();
    usage = { prune: jest.fn().mockResolvedValue(0) };

    for (const model of [
      prisma.session,
      prisma.passwordReset,
      prisma.road,
      prisma.consentRecord,
      prisma.accountDeletion,
    ]) {
      model.deleteMany.mockResolvedValue({ count: 0 });
    }
    prisma.accountDeletion.findMany.mockResolvedValue([]);

    retention = new RetentionService(
      prisma as unknown as PrismaService,
      usage as unknown as UsageRecorder,
    );
  });

  afterEach(() => retention.onApplicationShutdown());

  it('prunes the usage statistics past their retention', async () => {
    usage.prune.mockResolvedValue(4);

    await expect(retention.run(NOW)).resolves.toMatchObject({ usageEvents: 4 });
    expect(usage.prune).toHaveBeenCalledWith(NOW);
  });

  it('removes expired sessions and ones signed out over a day ago', async () => {
    await retention.run(NOW);

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: NOW } },
          {
            rotatedAt: null,
            revokedAt: { lt: new Date(NOW.getTime() - DAY_MS) },
          },
        ],
      },
    });
  });

  it('keeps an exchanged session until it expires, to spot a replay of it', async () => {
    await retention.run(NOW);

    const { where } = prisma.session.deleteMany.mock.calls[0][0];
    expect(where.OR[1]).toMatchObject({ rotatedAt: null });
  });

  it('never lifts a password-reset lockout early', async () => {
    await retention.run(NOW);

    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: new Date(NOW.getTime() - DAY_MS) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: NOW } }],
      },
    });
  });

  it('erases routes deleted more than the grace period ago', async () => {
    prisma.road.deleteMany.mockResolvedValue({ count: 2 });

    await expect(retention.run(NOW)).resolves.toMatchObject({
      deletedRoutes: 2,
    });
    expect(prisma.road.deleteMany).toHaveBeenCalledWith({
      where: {
        archivedAt: {
          lt: new Date(NOW.getTime() - DELETED_ROUTE_RETENTION_DAYS * DAY_MS),
        },
      },
    });
  });

  describe('the deletion log', () => {
    it('keeps it for three years', async () => {
      await retention.run(NOW);

      expect(prisma.accountDeletion.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { lt: new Date('2023-10-02T12:00:00.000Z') } },
        select: { subjectId: true },
      });
      expect(prisma.consentRecord.deleteMany).not.toHaveBeenCalled();
      expect(prisma.accountDeletion.deleteMany).not.toHaveBeenCalled();
    });

    it('then removes the record and the consent trail behind it', async () => {
      prisma.accountDeletion.findMany.mockResolvedValue([
        { subjectId: 'gone-1' },
        { subjectId: 'gone-2' },
      ]);
      prisma.consentRecord.deleteMany.mockResolvedValue({ count: 5 });
      prisma.accountDeletion.deleteMany.mockResolvedValue({ count: 2 });

      await expect(retention.run(NOW)).resolves.toMatchObject({
        deletionLogs: 2,
        consentRecords: 5,
      });
      expect(prisma.consentRecord.deleteMany).toHaveBeenCalledWith({
        where: { subjectId: { in: ['gone-1', 'gone-2'] } },
      });
      expect(prisma.accountDeletion.deleteMany).toHaveBeenCalledWith({
        where: { subjectId: { in: ['gone-1', 'gone-2'] } },
      });
    });
  });

  it('runs once at start-up and survives the database refusing', async () => {
    usage.prune.mockRejectedValue(new Error('read only'));

    expect(() => retention.onApplicationBootstrap()).not.toThrow();
    await flush();

    expect(usage.prune).toHaveBeenCalledTimes(1);
  });
});
