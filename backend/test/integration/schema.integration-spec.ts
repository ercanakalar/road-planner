import { randomUUID } from 'crypto';

import { PrismaClient } from '../../src/generated/prisma/client';
import { describeIntegration, integrationClient } from './client';

describeIntegration('Schema (integration)', () => {
  let prisma: PrismaClient;
  let createdUserIds: string[];

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${randomUUID()}@integration.test`;

  const createUser = async (email: string) => {
    const user = await prisma.user.create({ data: { email } });
    createdUserIds.push(user.id);
    return user;
  };

  beforeAll(async () => {
    prisma = integrationClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    createdUserIds = [];
  });

  afterEach(async () => {
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  describe('multi-device sessions (D1)', () => {
    it('allows several concurrent sessions for one user', async () => {
      const user = await createUser(uniqueEmail('multi'));

      for (const hash of ['hash-phone', 'hash-tablet', 'hash-laptop']) {
        await prisma.session.create({
          data: {
            userId: user.id,
            refreshTokenHash: `${hash}-${user.id}`,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        });
      }

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(3);
    });

    it('rejects two sessions holding the same token digest', async () => {
      const [first, second] = await Promise.all([
        createUser(uniqueEmail('dup-a')),
        createUser(uniqueEmail('dup-b')),
      ]);
      const sharedHash = `shared-${randomUUID()}`;

      await prisma.session.create({
        data: {
          userId: first.id,
          refreshTokenHash: sharedHash,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      await expect(
        prisma.session.create({
          data: {
            userId: second.id,
            refreshTokenHash: sharedHash,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        }),
      ).rejects.toThrow(/Unique constraint/);
    });

    it('revokes one session without touching the others', async () => {
      const user = await createUser(uniqueEmail('revoke'));

      const [phone] = await Promise.all([
        prisma.session.create({
          data: {
            userId: user.id,
            refreshTokenHash: `phone-${user.id}`,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        }),
        prisma.session.create({
          data: {
            userId: user.id,
            refreshTokenHash: `tablet-${user.id}`,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        }),
      ]);

      await prisma.session.update({
        where: { id: phone.id },
        data: { revokedAt: new Date() },
      });

      const live = await prisma.session.findMany({
        where: { userId: user.id, revokedAt: null },
      });

      expect(live).toHaveLength(1);
      expect(live[0].refreshTokenHash).toBe(`tablet-${user.id}`);
    });
  });

  describe('case-insensitive email (D6)', () => {
    it('treats addresses differing only by case as the same key', async () => {
      const email = uniqueEmail('Case');
      await createUser(email);

      await expect(
        prisma.user.create({ data: { email: email.toUpperCase() } }),
      ).rejects.toThrow(/Unique constraint/);
    });

    it('finds a user by an address in a different case', async () => {
      const email = uniqueEmail('Lookup');
      const created = await createUser(email);

      const found = await prisma.user.findUnique({
        where: { email: email.toUpperCase() },
      });

      expect(found?.id).toBe(created.id);
    });
  });

  describe('cascade rules (D3)', () => {
    const seedRoad = async (userId: string) => {
      const road = await prisma.road.create({
        data: { userId, title: 'Commute', description: 'Home to office' },
      });

      const stop = await prisma.stop.create({
        data: {
          roadId: road.id,
          latitude: 40.99,
          longitude: 29.03,
          order: 1,
          address: 'Bağdat Cd. 1, Kadıköy',
        },
      });

      return { road, stop };
    };

    it('deletes a user’s roads, stops and sessions with the user', async () => {
      const user = await createUser(uniqueEmail('cascade'));
      const { road, stop } = await seedRoad(user.id);
      await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: `cascade-${user.id}`,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      await prisma.user.delete({ where: { id: user.id } });
      createdUserIds = [];

      expect(
        await prisma.road.findUnique({ where: { id: road.id } }),
      ).toBeNull();
      expect(
        await prisma.stop.findUnique({ where: { id: stop.id } }),
      ).toBeNull();
      expect(
        await prisma.session.findMany({ where: { userId: user.id } }),
      ).toHaveLength(0);
    });

    it('deletes stops with their road', async () => {
      const user = await createUser(uniqueEmail('road-cascade'));
      const { road, stop } = await seedRoad(user.id);

      await prisma.road.delete({ where: { id: road.id } });

      expect(
        await prisma.stop.findUnique({ where: { id: stop.id } }),
      ).toBeNull();
    });

    it('anonymises usage statistics instead of deleting them', async () => {
      const user = await createUser(uniqueEmail('usage'));
      const event = await prisma.usageEvent.create({
        data: { userId: user.id, event: 'app_opened' },
      });

      await prisma.user.delete({ where: { id: user.id } });
      createdUserIds = [];

      await expect(
        prisma.usageEvent.findUniqueOrThrow({ where: { id: event.id } }),
      ).resolves.toMatchObject({ userId: null, event: 'app_opened' });
      await prisma.usageEvent.delete({ where: { id: event.id } });
    });

    it('deletes favourites with the record they point at', async () => {
      const owner = await createUser(uniqueEmail('fav-owner'));
      const fan = await createUser(uniqueEmail('fav-fan'));
      const { road, stop } = await seedRoad(owner.id);

      const favouriteRoad = await prisma.favoriteRoad.create({
        data: { userId: fan.id, roadId: road.id },
      });
      const favouriteStop = await prisma.favoriteStop.create({
        data: { userId: fan.id, stopId: stop.id },
      });

      await prisma.road.delete({ where: { id: road.id } });

      expect(
        await prisma.favoriteRoad.findUnique({
          where: { id: favouriteRoad.id },
        }),
      ).toBeNull();
      expect(
        await prisma.favoriteStop.findUnique({
          where: { id: favouriteStop.id },
        }),
      ).toBeNull();
    });

    it('leaves a road with no owner impossible to create', async () => {
      await expect(
        prisma.road.create({
          data: {
            title: 'Orphan',
            description: 'no owner',
            userId: randomUUID(),
          },
        }),
      ).rejects.toThrow(/Foreign key constraint|violates foreign key/);
    });
  });

  describe('case-insensitive nicknames', () => {
    it('treats nicknames differing only by case as the same', async () => {
      const suffix = randomUUID().slice(0, 8);
      await prisma.user
        .create({
          data: { email: uniqueEmail('nick-a'), nickName: `Ada_${suffix}` },
        })
        .then((user) => createdUserIds.push(user.id));

      await expect(
        prisma.user.create({
          data: { email: uniqueEmail('nick-b'), nickName: `ada_${suffix}` },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  describe('the KVKK records outlive the account', () => {
    it('keeps the consent trail and the deletion log after the user is gone', async () => {
      const user = await createUser(uniqueEmail('kvkk'));
      const consent = await prisma.consentRecord.create({
        data: {
          subjectId: user.id,
          action: 'GRANTED',
          noticeVersion: '2026-10-01',
          language: 'tr',
          occurredAt: new Date(),
        },
      });
      const log = await prisma.accountDeletion.create({
        data: {
          subjectId: user.id,
          emailHash: 'f'.repeat(64),
          reason: 'CONSENT_WITHDRAWN',
          accountCreatedAt: user.createdAt,
          erased: {},
        },
      });

      await prisma.user.delete({ where: { id: user.id } });
      createdUserIds = [];

      await expect(
        prisma.consentRecord.count({ where: { id: consent.id } }),
      ).resolves.toBe(1);
      await expect(
        prisma.accountDeletion.count({ where: { id: log.id } }),
      ).resolves.toBe(1);

      await prisma.consentRecord.delete({ where: { id: consent.id } });
      await prisma.accountDeletion.delete({ where: { id: log.id } });
    });
  });

  describe('soft delete (D2)', () => {
    it('has no deletedAt column on any table', async () => {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count
          FROM information_schema.columns
         WHERE table_schema = 'public' AND column_name = 'deletedAt'
           -- When an account was erased, which is the record itself, not a
           -- soft-delete flag.
           AND table_name <> 'AccountDeletion'
      `;

      expect(Number(rows[0].count)).toBe(0);
    });
  });

  describe('password reset grants', () => {
    it('rejects two grants with the same digest', async () => {
      const user = await createUser(uniqueEmail('reset'));
      const tokenHash = `reset-${randomUUID()}`;

      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          codeHash: 'unused-in-this-test',
          tokenHash,
          expiresAt: new Date(Date.now() + 600_000),
        },
      });

      await expect(
        prisma.passwordReset.create({
          data: {
            userId: user.id,
            codeHash: 'unused-in-this-test',
            tokenHash,
            expiresAt: new Date(Date.now() + 600_000),
          },
        }),
      ).rejects.toThrow(/Unique constraint/);
    });

    it('survives session revocation, being a separate table', async () => {
      const user = await createUser(uniqueEmail('independent'));

      await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: `indep-${user.id}`,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      const grant = await prisma.passwordReset.create({
        data: {
          userId: user.id,
          codeHash: 'unused-in-this-test',
          tokenHash: `indep-reset-${user.id}`,
          expiresAt: new Date(Date.now() + 600_000),
        },
      });

      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });

      const stillThere = await prisma.passwordReset.findUnique({
        where: { id: grant.id },
      });

      expect(stillThere?.usedAt).toBeNull();
    });
  });
});
