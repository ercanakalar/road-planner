import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { NotificationService } from './notification.service';

const ME = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const SOMEBODY_ELSE = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const ROAD_ID = 'd3a1e2c4-5b6f-4a7c-8d9e-0f1a2b3c4d5e';
const ENTRY = {
  kind: 'ROUTE_PUBLISHED' as const,
  actorId: SOMEBODY_ELSE,
  roadId: ROAD_ID,
};

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationService);

    prisma.notification.count.mockResolvedValue(0);
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.createMany.mockResolvedValue({ count: 0 });
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.findMany.mockResolvedValue([]);
  });

  describe('notifyMany', () => {
    it('files a line for each person who wants one', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      await expect(service.notifyMany(['a', 'b'], ENTRY)).resolves.toBe(2);

      expect(prisma.notification.createMany.mock.calls[0][0].data).toEqual([
        { ...ENTRY, userId: 'a' },
        { ...ENTRY, userId: 'b' },
      ]);
    });

    it('skips anybody who has turned the inbox off', async () => {
      await service.notifyMany(['a', 'b'], ENTRY);

      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
        id: { in: ['a', 'b'] },
        notifyInApp: true,
      });
    });

    it('writes nothing when nobody is listening', async () => {
      await expect(service.notifyMany(['a'], ENTRY)).resolves.toBe(0);

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('asks nothing at all for an empty audience', async () => {
      await expect(service.notifyMany([], ENTRY)).resolves.toBe(0);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('drops a repeat rather than failing on it', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'a' }]);

      await service.notifyMany(['a'], ENTRY);

      expect(
        prisma.notification.createMany.mock.calls[0][0].skipDuplicates,
      ).toBe(true);
    });
  });

  describe('list', () => {
    it('reads only the caller’s own inbox', async () => {
      await service.list(ME, { limit: 20, offset: 0 });

      expect(prisma.notification.findMany.mock.calls[0][0].where).toEqual({
        userId: ME,
      });
    });

    it('puts the newest first', async () => {
      await service.list(ME, { limit: 20, offset: 0 });

      expect(prisma.notification.findMany.mock.calls[0][0].orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });

    it('reports the unread count alongside the page', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(7);

      const result = await service.list(ME, { limit: 20, offset: 0 });

      expect(result.meta).toEqual(
        expect.objectContaining({ total: 42, unread: 7, hasMore: true }),
      );
    });

    it('resolves the actor’s name the way every other screen does', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          kind: 'ROUTE_PUBLISHED',
          readAt: null,
          createdAt: new Date('2026-01-01'),
          actor: { id: 'a', nickName: null, firstName: null, photo: null },
          road: { id: ROAD_ID, title: 'T', isPublic: true, archivedAt: null },
        },
      ]);

      const result = await service.list(ME, { limit: 20, offset: 0 });

      expect(result.data[0].actor).toEqual({
        id: 'a',
        displayName: 'A traveller',
        photo: null,
      });
      expect(result.data[0].isRead).toBe(false);
    });

    it('marks a line whose route is no longer public as not openable', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          kind: 'ROUTE_PUBLISHED',
          readAt: new Date(),
          createdAt: new Date(),
          actor: null,
          road: { id: ROAD_ID, title: 'T', isPublic: false, archivedAt: null },
        },
      ]);

      const result = await service.list(ME, { limit: 20, offset: 0 });

      expect(result.data[0].isOpenable).toBe(false);
      expect(result.data[0].road).toEqual({ id: ROAD_ID, title: 'T' });
    });

    it('survives an actor whose account is gone', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          kind: 'ROUTE_PUBLISHED',
          readAt: null,
          createdAt: new Date(),
          actor: null,
          road: null,
        },
      ]);

      const result = await service.list(ME, { limit: 20, offset: 0 });

      expect(result.data[0].actor).toBeNull();
      expect(result.data[0].isOpenable).toBe(false);
    });
  });

  describe('markRead', () => {
    it('marks the whole inbox when no line is named', async () => {
      await service.markRead(ME);

      expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({
        userId: ME,
        readAt: null,
      });
    });

    it('marks one line when one is named', async () => {
      await service.markRead(ME, 'n1');

      expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({
        userId: ME,
        readAt: null,
        id: 'n1',
      });
    });

    it('scopes by owner as well as by id, so somebody else’s line matches nothing', async () => {
      await service.markRead(ME, 'someone-elses-notification');

      expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ userId: ME }),
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('deletes only the caller’s own', async () => {
      await service.clear(ME);

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: ME },
      });
    });
  });

  describe('settings', () => {
    it('reads both switches', async () => {
      prisma.user.findUnique.mockResolvedValue({
        notifyInApp: false,
        notifyByEmail: true,
      });

      const result = await service.settings(ME);

      expect(result.data).toEqual({ inApp: false, email: true });
    });

    it('writes only the switch that was sent', async () => {
      prisma.user.update.mockResolvedValue({
        notifyInApp: true,
        notifyByEmail: false,
      });

      await service.updateSettings(ME, { email: false });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({
        notifyByEmail: false,
      });
    });

    it('writes both when both are sent', async () => {
      prisma.user.update.mockResolvedValue({
        notifyInApp: false,
        notifyByEmail: false,
      });

      await service.updateSettings(ME, { inApp: false, email: false });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual({
        notifyInApp: false,
        notifyByEmail: false,
      });
    });
  });
});
