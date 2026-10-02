import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { USAGE_RETENTION_DAYS } from './usage-events';
import { UsageRecorder } from './usage.recorder';

const DAY_MS = 24 * 60 * 60 * 1000;

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('UsageRecorder', () => {
  let prisma: PrismaMock;
  let recorder: UsageRecorder;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.usageEvent.create.mockResolvedValue({});
    recorder = new UsageRecorder(prisma as unknown as PrismaService);
  });

  describe('record', () => {
    it('writes the event, the person and the detail', async () => {
      recorder.record('maps_directions', {
        userId: 'user-1',
        detail: 'walking',
      });
      await flush();

      expect(prisma.usageEvent.create).toHaveBeenCalledWith({
        data: { event: 'maps_directions', userId: 'user-1', detail: 'walking' },
      });
    });

    it('writes an anonymous use without a person', async () => {
      recorder.record('travel_map_lookup');
      await flush();

      expect(prisma.usageEvent.create).toHaveBeenCalledWith({
        data: { event: 'travel_map_lookup', userId: null, detail: null },
      });
    });

    it.each([
      ['an address', 'Moda Cd. No:1, Kadıköy'],
      ['a search term', 'cheap sushi near me'],
      ['something too long to be a category', 'a'.repeat(33)],
      ['upper case', 'Driving'],
    ])('drops a detail that looks like %s', async (_label, detail) => {
      recorder.record('maps_along_route_search', { detail });
      await flush();

      expect(prisma.usageEvent.create.mock.calls[0][0].data.detail).toBeNull();
    });

    it('never lets a failed write reach the caller', async () => {
      prisma.usageEvent.create.mockRejectedValue(new Error('database down'));

      expect(() => recorder.record('route_created')).not.toThrow();
      await flush();
    });
  });

  describe('recordMany', () => {
    it('writes a reported batch in one statement, for one person', async () => {
      prisma.usageEvent.createMany.mockResolvedValue({ count: 2 });

      await expect(
        recorder.recordMany(
          [
            { name: 'app_opened', detail: 'android' },
            { name: 'travel_map_area_marked', detail: 'city' },
          ],
          'user-1',
        ),
      ).resolves.toBe(2);

      expect(prisma.usageEvent.createMany).toHaveBeenCalledWith({
        data: [
          { event: 'app_opened', userId: 'user-1', detail: 'android' },
          { event: 'travel_map_area_marked', userId: 'user-1', detail: 'city' },
        ],
      });
    });

    it('does not touch the database for an empty batch', async () => {
      await expect(recorder.recordMany([], null)).resolves.toBe(0);

      expect(prisma.usageEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('prune', () => {
    it('removes exactly what is older than the retention period', async () => {
      prisma.usageEvent.deleteMany.mockResolvedValue({ count: 7 });
      const now = new Date('2026-10-01T12:00:00.000Z');

      await expect(recorder.prune(now)).resolves.toBe(7);

      expect(prisma.usageEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - USAGE_RETENTION_DAYS * DAY_MS),
          },
        },
      });
    });
  });
});
