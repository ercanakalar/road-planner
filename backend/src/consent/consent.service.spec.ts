import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvironmentVariables } from 'src/config/env.validation';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import * as avatarStorage from 'src/user/avatar.storage';
import { ConsentService } from './consent.service';
import { hashEmail } from './subject-hash';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const ACCESS_KEY = 'access-key-that-is-long-enough-for-tests';
const AUDIT_HASH_KEY = 'audit-key-that-is-long-enough-for-tests-0';
const NOW = new Date('2026-10-01T12:00:00.000Z');

const STORED_USER = {
  email: 'ada@example.com',
  photo: '/api/user/photo/0b6f7c4e-2a9d-4c55-9a3e-1d2f3a4b5c6d.jpg',
  createdAt: new Date('2026-03-01T09:00:00.000Z'),
  _count: {
    roads: 4,
    favoriteRoads: 3,
    favoriteStops: 2,
    following: 1,
    followers: 5,
    sessions: 2,
    notifications: 6,
    usageEvents: 120,
  },
};

const config = (values: Record<string, unknown>) =>
  createConfigMock({
    UPLOAD_DIR: 'uploads',
    ...values,
  }) as unknown as ConfigService<EnvironmentVariables, true>;

describe('ConsentService', () => {
  let prisma: PrismaMock;
  let service: ConsentService;
  let removeAvatar: jest.SpyInstance;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ConsentService(
      prisma as unknown as PrismaService,
      config({ ACCESS_KEY, AUDIT_HASH_KEY }),
    );
    removeAvatar = jest
      .spyOn(avatarStorage, 'removeAvatar')
      .mockResolvedValue(undefined);
  });

  describe('grant', () => {
    const body = {
      noticeVersion: '2026-10-01',
      language: 'tr' as const,
      acceptedAt: '2026-09-30T08:00:00.000Z',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
      prisma.consentRecord.findFirst.mockResolvedValue(null);
    });

    it('records the consent with the moment it was given on the phone', async () => {
      await expect(service.grant(USER_ID, body, NOW)).resolves.toMatchObject({
        data: { recorded: true },
      });

      expect(prisma.consentRecord.create).toHaveBeenCalledWith({
        data: {
          subjectId: USER_ID,
          action: 'GRANTED',
          noticeVersion: '2026-10-01',
          language: 'tr',
          occurredAt: new Date('2026-09-30T08:00:00.000Z'),
        },
      });
    });

    it('does not write the same version twice when the app sends it again', async () => {
      prisma.consentRecord.findFirst.mockResolvedValue({
        action: 'GRANTED',
        noticeVersion: '2026-10-01',
      });

      await expect(service.grant(USER_ID, body, NOW)).resolves.toMatchObject({
        data: { recorded: false },
      });
      expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    });

    it('records a new version of the notice even though an older one is on file', async () => {
      prisma.consentRecord.findFirst.mockResolvedValue({
        action: 'GRANTED',
        noticeVersion: '2026-09-03',
      });

      await service.grant(USER_ID, body, NOW);

      expect(prisma.consentRecord.create).toHaveBeenCalled();
    });

    it('records consent given again after a withdrawal', async () => {
      prisma.consentRecord.findFirst.mockResolvedValue({
        action: 'WITHDRAWN',
        noticeVersion: '2026-10-01',
      });

      await service.grant(USER_ID, body, NOW);

      expect(prisma.consentRecord.create).toHaveBeenCalled();
    });

    it('never dates a consent later than the server heard of it', async () => {
      await service.grant(
        USER_ID,
        { ...body, acceptedAt: '2027-01-01T00:00:00.000Z' },
        NOW,
      );

      expect(
        prisma.consentRecord.create.mock.calls[0][0].data.occurredAt,
      ).toEqual(NOW);
    });

    it('refuses an account that no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.grant(USER_ID, body, NOW)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.consentRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    const body = { noticeVersion: '2026-10-01', language: 'en' as const };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(STORED_USER);
      prisma.stop.count.mockResolvedValue(31);
    });

    it('deletes the account', async () => {
      await service.withdraw(USER_ID, body);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: USER_ID },
      });
    });

    it('keeps a record of the withdrawal itself', async () => {
      await service.withdraw(USER_ID, body);

      expect(prisma.consentRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subjectId: USER_ID,
          action: 'WITHDRAWN',
          noticeVersion: '2026-10-01',
          language: 'en',
        }),
      });
    });

    it('logs what was deleted, without keeping the address in clear', async () => {
      await service.withdraw(USER_ID, body);

      const { data } = prisma.accountDeletion.create.mock.calls[0][0];

      expect(data).toEqual({
        subjectId: USER_ID,
        emailHash: hashEmail(STORED_USER.email, AUDIT_HASH_KEY),
        reason: 'CONSENT_WITHDRAWN',
        noticeVersion: '2026-10-01',
        accountCreatedAt: STORED_USER.createdAt,
        erased: {
          routes: 4,
          stops: 31,
          favoriteRoutes: 3,
          favoriteStops: 2,
          follows: 6,
          sessions: 2,
          notifications: 6,
          usageEventsAnonymised: 120,
        },
      });
      expect(JSON.stringify(data)).not.toContain(STORED_USER.email);
    });

    it('writes both records in the same transaction as the deletion', async () => {
      await service.withdraw(USER_ID, body);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      const order = [
        prisma.consentRecord.create,
        prisma.accountDeletion.create,
        prisma.user.delete,
      ].map((mock) => mock.mock.invocationCallOrder[0]);

      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it('falls back to the access key for the hash when no audit key is set', async () => {
      service = new ConsentService(
        prisma as unknown as PrismaService,
        config({ ACCESS_KEY }),
      );

      await service.withdraw(USER_ID, body);

      expect(
        prisma.accountDeletion.create.mock.calls[0][0].data.emailHash,
      ).toBe(hashEmail(STORED_USER.email, ACCESS_KEY));
    });

    it('removes the uploaded profile picture once the account is gone', async () => {
      await service.withdraw(USER_ID, body);

      expect(removeAvatar).toHaveBeenCalledWith('uploads', STORED_USER.photo);
    });

    it('confirms the deletion to the person', async () => {
      await expect(service.withdraw(USER_ID, body)).resolves.toMatchObject({
        header: 'consent.withdrawnHeader',
        message: 'consent.withdrawnMessage',
        data: { deleted: true },
      });
    });

    it('treats a retry after a completed deletion as the success it is', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.accountDeletion.findUnique.mockResolvedValue({ id: 'log-1' });

      await expect(service.withdraw(USER_ID, body)).resolves.toMatchObject({
        data: { deleted: true },
      });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('treats a concurrent duplicate request as already done', async () => {
      prisma.accountDeletion.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.accountDeletion.findUnique.mockResolvedValue({ id: 'log-1' });

      await expect(service.withdraw(USER_ID, body)).resolves.toMatchObject({
        data: { deleted: true },
      });
    });

    it('refuses an account that never existed', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.accountDeletion.findUnique.mockResolvedValue(null);

      await expect(service.withdraw(USER_ID, body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets a failed deletion fail, so nobody is told it happened', async () => {
      const failure = new Error('connection reset');
      prisma.user.delete.mockRejectedValue(failure);
      prisma.accountDeletion.findUnique.mockResolvedValue(null);

      await expect(service.withdraw(USER_ID, body)).rejects.toBe(failure);
      expect(removeAvatar).not.toHaveBeenCalled();
    });
  });
});
