import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.INTEGRATION_DATABASE_URL;

const describeIntegration = DATABASE_URL ? describe : describe.skip;

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
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
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

      const address = await prisma.addressInfo.create({
        data: { address: 'Bağdat Cd. 1', district: 'Kadıköy' },
      });

      const waypoint = await prisma.wayPoint.create({
        data: {
          roadId: road.id,
          latitude: 40.99,
          longitude: 29.03,
          order: 1,
          addressInfoId: address.id,
        },
      });

      return { road, waypoint, address };
    };

    it('deletes a user’s roads, waypoints and sessions with the user', async () => {
      const user = await createUser(uniqueEmail('cascade'));
      const { road, waypoint } = await seedRoad(user.id);
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
        await prisma.wayPoint.findUnique({ where: { id: waypoint.id } }),
      ).toBeNull();
      expect(
        await prisma.session.findMany({ where: { userId: user.id } }),
      ).toHaveLength(0);
    });

    it('deletes waypoints with their road', async () => {
      const user = await createUser(uniqueEmail('road-cascade'));
      const { road, waypoint } = await seedRoad(user.id);

      await prisma.road.delete({ where: { id: road.id } });

      expect(
        await prisma.wayPoint.findUnique({ where: { id: waypoint.id } }),
      ).toBeNull();
    });

    it('deletes favourites with the record they point at', async () => {
      const owner = await createUser(uniqueEmail('fav-owner'));
      const fan = await createUser(uniqueEmail('fav-fan'));
      const { road, waypoint } = await seedRoad(owner.id);

      const favouriteRoad = await prisma.favoriteRoad.create({
        data: { userId: fan.id, roadId: road.id },
      });
      const favouriteWaypoint = await prisma.favoriteWaypoint.create({
        data: { userId: fan.id, waypointId: waypoint.id },
      });

      await prisma.road.delete({ where: { id: road.id } });

      expect(
        await prisma.favoriteRoad.findUnique({
          where: { id: favouriteRoad.id },
        }),
      ).toBeNull();
      expect(
        await prisma.favoriteWaypoint.findUnique({
          where: { id: favouriteWaypoint.id },
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

  describe('one address per waypoint (D5)', () => {
    it('rejects two waypoints sharing an address', async () => {
      const user = await createUser(uniqueEmail('address'));
      const road = await prisma.road.create({
        data: { userId: user.id, title: 'T', description: 'D' },
      });
      const address = await prisma.addressInfo.create({
        data: { address: 'Shared street' },
      });

      await prisma.wayPoint.create({
        data: {
          roadId: road.id,
          latitude: 1,
          longitude: 2,
          order: 1,
          addressInfoId: address.id,
        },
      });

      await expect(
        prisma.wayPoint.create({
          data: {
            roadId: road.id,
            latitude: 3,
            longitude: 4,
            order: 2,
            addressInfoId: address.id,
          },
        }),
      ).rejects.toThrow(/Unique constraint/);
    });
  });

  describe('soft delete (D2)', () => {
    it('has no deletedAt column on any table', async () => {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count
          FROM information_schema.columns
         WHERE table_schema = 'public' AND column_name = 'deletedAt'
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
          tokenHash,
          expiresAt: new Date(Date.now() + 600_000),
        },
      });

      await expect(
        prisma.passwordReset.create({
          data: {
            userId: user.id,
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
