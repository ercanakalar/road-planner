import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

const OWNER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const ATTACKER_ID = 'd3a1e1c4-3b5f-4e0c-9f4d-2c3d4e5f6071';
const OWNER_ROAD = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const ATTACKER_ROAD = 'e4b2f2d5-4c60-4f1d-a05e-3d4e5f607182';
const OWNER_WAYPOINT = 'f5c303e6-5d71-4021-b16f-4e5f60718293';

describe('Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let jwt: JwtService;

  const tokenFor = (userId: string) =>
    jwt.sign(
      { userId, email: `${userId}@example.com` },
      { secret: process.env.ACCESS_KEY, expiresIn: '15m' },
    );

  beforeAll(async () => {
    prisma = createPrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { corsOrigins: '*' });
    await app.init();

    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const givenRoads = () => {
    prisma.road.findUnique.mockImplementation(({ where }: any) => {
      const owners: Record<string, string> = {
        [OWNER_ROAD]: OWNER_ID,
        [ATTACKER_ROAD]: ATTACKER_ID,
      };
      return Promise.resolve(
        where.id in owners ? { id: where.id, userId: owners[where.id] } : null,
      );
    });
  };

  const givenWaypoint = () => {
    prisma.wayPoint.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.id === OWNER_WAYPOINT
          ? { id: OWNER_WAYPOINT, roadId: OWNER_ROAD, addressInfoId: null }
          : null,
      ),
    );
  };

  const as = (userId: string, req: request.Test) =>
    req.set('Authorization', `Bearer ${tokenFor(userId)}`);

  describe('C7 — routes that used to return 403 unconditionally', () => {
    beforeEach(() => {
      givenRoads();
      givenWaypoint();
    });

    it('lets the owner delete a waypoint on their own road', async () => {
      prisma.wayPoint.delete.mockResolvedValue({ roadId: OWNER_ROAD });
      prisma.wayPoint.findMany.mockResolvedValue([]);

      await as(
        OWNER_ID,
        request(app.getHttpServer()).delete(
          `/api/road/delete-waypoint/${OWNER_WAYPOINT}`,
        ),
      ).expect(200);
    });

    it('lets the owner update a waypoint on their own road', async () => {
      prisma.wayPoint.findUnique.mockResolvedValue({
        id: OWNER_WAYPOINT,
        roadId: OWNER_ROAD,
        addressInfoId: 'addr-1',
      });
      prisma.addressInfo.update.mockResolvedValue({ id: 'addr-1' });
      prisma.wayPoint.update.mockResolvedValue({ id: OWNER_WAYPOINT });

      await as(
        OWNER_ID,
        request(app.getHttpServer()).put(
          `/api/road/update-waypoint/${OWNER_WAYPOINT}`,
        ),
      )
        .send({
          latitude: 41,
          longitude: 29,
          address: { address: 'Bağdat Cd. 1' },
        })
        .expect(200);
    });

    it('lets the owner reorder waypoints on their own road', async () => {
      prisma.road.findUnique.mockResolvedValue({
        id: OWNER_ROAD,
        userId: OWNER_ID,
      });

      prisma.wayPoint.findMany.mockResolvedValue([
        { id: 'wp-1' },
        { id: 'wp-2' },
      ]);

      await as(
        OWNER_ID,
        request(app.getHttpServer()).put(
          `/api/road/reorder-waypoint/${OWNER_ROAD}`,
        ),
      )
        .send({ roadId: OWNER_ROAD, from: 0, to: 1 })
        .expect(200);
    });
  });

  describe('C3 — IDOR on the waypoint routes', () => {
    beforeEach(() => {
      givenRoads();
      givenWaypoint();
    });

    it('refuses to delete another user’s waypoint even with ?id= set to an owned road', async () => {
      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).delete(
          `/api/road/delete-waypoint/${OWNER_WAYPOINT}?id=${ATTACKER_ROAD}`,
        ),
      ).expect(403);

      expect(prisma.wayPoint.delete).not.toHaveBeenCalled();
    });

    it('refuses to update another user’s waypoint even with ?id= set to an owned road', async () => {
      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).put(
          `/api/road/update-waypoint/${OWNER_WAYPOINT}?id=${ATTACKER_ROAD}`,
        ),
      )
        .send({
          latitude: 0,
          longitude: 0,
          address: { address: 'anywhere' },
        })
        .expect(403);

      expect(prisma.wayPoint.update).not.toHaveBeenCalled();
    });

    it('refuses to delete another user’s road even with ?id= set to an owned road', async () => {
      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).post(
          `/api/road/delete/${OWNER_ROAD}?id=${ATTACKER_ROAD}`,
        ),
      ).expect(403);

      expect(prisma.road.delete).not.toHaveBeenCalled();
    });

    it('refuses to reorder another user’s road', async () => {
      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).put(
          `/api/road/reorder-waypoint/${OWNER_ROAD}`,
        ),
      )
        .send({ from: 0, to: 1 })
        .expect(403);
    });
  });

  describe('C5 — unauthorized reads', () => {
    it('does not return another user’s road', async () => {
      prisma.road.findFirst.mockResolvedValue(null);

      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).get(`/api/road/${OWNER_ROAD}`),
      ).expect(404);
    });

    it('scopes the road read to the caller', async () => {
      prisma.road.findFirst.mockResolvedValue({
        id: OWNER_ROAD,
        favoriteRoads: [],
        wayPoints: [],
      });

      await as(
        OWNER_ID,
        request(app.getHttpServer()).get(`/api/road/${OWNER_ROAD}`),
      ).expect(200);

      expect(prisma.road.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ userId: OWNER_ID }]),
          }),
        }),
      );
    });

    it('does not return another user’s waypoint', async () => {
      prisma.wayPoint.findFirst.mockResolvedValue(null);

      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).get(
          `/api/road/waypoint/${OWNER_WAYPOINT}`,
        ),
      ).expect(404);
    });

    it('does not return another user’s profile', async () => {
      await as(
        ATTACKER_ID,
        request(app.getHttpServer()).get(`/api/user/${OWNER_ID}`),
      ).expect(403);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns the caller’s own profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: OWNER_ID,
        email: 'owner@example.com',
      });

      const response = await as(
        OWNER_ID,
        request(app.getHttpServer()).get(`/api/user/${OWNER_ID}`),
      ).expect(200);

      expect(response.body.data).not.toHaveProperty('permitId');
    });
  });

  describe('favourites', () => {
    it('rejects a favourite against a road that does not exist', async () => {
      prisma.favoriteRoad.findFirst.mockResolvedValue(null);
      prisma.road.findUnique.mockResolvedValue(null);

      await as(
        OWNER_ID,
        request(app.getHttpServer()).post('/api/favorites/toggle-road'),
      )
        .send({ roadId: ATTACKER_ROAD })
        .expect(404);

      expect(prisma.favoriteRoad.create).not.toHaveBeenCalled();
    });

    it('allows favouriting another user’s road', async () => {
      prisma.favoriteRoad.findFirst.mockResolvedValue(null);
      prisma.road.findUnique.mockResolvedValue({ id: ATTACKER_ROAD });
      prisma.favoriteRoad.create.mockResolvedValue({ id: 'fav-1' });

      await as(
        OWNER_ID,
        request(app.getHttpServer()).post('/api/favorites/toggle-road'),
      )
        .send({ roadId: ATTACKER_ROAD })
        .expect(200);
    });

    it('still requires authentication despite the removed @UseGuards', async () => {
      await request(app.getHttpServer())
        .post('/api/favorites/toggle-road')
        .send({ roadId: OWNER_ROAD })
        .expect(401);
    });
  });

  describe('admin routes', () => {
    it('denies a non-admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: OWNER_ID,
        permit: { name: 'USER' },
      });

      await as(
        OWNER_ID,
        request(app.getHttpServer()).get('/api/permissions/permit/get-all'),
      ).expect(403);
    });

    it('allows an admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: OWNER_ID,
        permit: { name: 'ADMIN' },
      });
      prisma.permit.findMany.mockResolvedValue([]);

      await as(
        OWNER_ID,
        request(app.getHttpServer()).get('/api/permissions/permit/get-all'),
      ).expect(200);
    });

    it('reads the permit from the database, not the token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: OWNER_ID,
        permit: { name: 'USER' },
      });

      const forged = jwt.sign(
        {
          userId: OWNER_ID,
          email: 'owner@example.com',
          permit: { name: 'ADMIN' },
        },
        { secret: process.env.ACCESS_KEY, expiresIn: '15m' },
      );

      await request(app.getHttpServer())
        .get('/api/permissions/permit/get-all')
        .set('Authorization', `Bearer ${forged}`)
        .expect(403);
    });
  });
});
