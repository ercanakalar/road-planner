import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';

const CLIENT_VERSION = '6.9.0';

describe('Response contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let jwt: JwtService;

  const tokenFor = (userId: string) =>
    jwt.sign(
      { userId, email: `${userId}@example.com` },
      { secret: process.env.ACCESS_KEY, expiresIn: '15m' },
    );

  let token: string;

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

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
    token = tokenFor(USER_ID);
  });

  afterAll(async () => {
    await app?.close();
  });

  const asUser = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  const givenAdmin = () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      permit: { name: 'ADMIN', permissions: [] },
    });
  };

  describe('every successful response carries data', () => {
    it('share link', async () => {
      prisma.road.findUnique.mockResolvedValue({
        id: ROAD_ID,
        userId: USER_ID,
      });

      const response = await asUser(
        request(app.getHttpServer()).get(`/api/road/share/${ROAD_ID}`),
      ).expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.url).toMatch(
        /\/share\/[\w-]+\.[\w-]+\.[\w-]+$/,
      );
    });

    it('permit list', async () => {
      givenAdmin();
      prisma.permit.findMany.mockResolvedValue([
        { id: PERMIT_ID, name: 'ADMIN', permissions: [] },
      ]);

      const response = await asUser(
        request(app.getHttpServer()).get('/api/permissions/permit/get-all'),
      ).expect(200);

      expect(response.body.data).toEqual([
        { id: PERMIT_ID, name: 'ADMIN', permissions: [] },
      ]);
    });

    it('shared road', async () => {
      const shareToken = jwt.sign(
        { id: ROAD_ID },
        { secret: process.env.ROAD_SHARE_KEY, expiresIn: '7d' },
      );
      prisma.road.findUnique.mockResolvedValue({
        id: ROAD_ID,
        title: 'Trip',
        wayPoints: [],
      });

      const response = await request(app.getHttpServer())
        .post(`/api/road/share/${shareToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({ id: ROAD_ID, title: 'Trip' });
    });

    it('shared road does not disclose the owner', async () => {
      const shareToken = jwt.sign(
        { id: ROAD_ID },
        { secret: process.env.ROAD_SHARE_KEY, expiresIn: '7d' },
      );
      prisma.road.findUnique.mockResolvedValue({
        id: ROAD_ID,
        title: 'Trip',
        wayPoints: [],
      });

      await request(app.getHttpServer())
        .post(`/api/road/share/${shareToken}`)
        .expect(200);

      const { omit } = prisma.road.findUnique.mock.calls[0][0];
      expect(omit).toEqual({ userId: true });
    });

    it('a handler returning a bare object is wrapped rather than mistaken for an envelope', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        permit: { name: 'ADMIN', permissions: [{ name: 'ACCESS_DASHBOARD' }] },
      });

      const response = await asUser(
        request(app.getHttpServer()).get('/api/auth/dashboard'),
      ).expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: { message: 'Welcome to the admin dashboard' },
      });
      expect(response.body).not.toHaveProperty('message');
    });
  });

  describe('silent routes stay silent', () => {
    it('refresh-token carries no message', async () => {
      const refreshToken = jwt.sign(
        { userId: USER_ID, email: 'a@b.com', jti: 'j1' },
        { secret: process.env.REFRESH_KEY, expiresIn: '7d' },
      );

      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: USER_ID,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000),
        user: { id: USER_ID, email: 'a@b.com', permit: null },
      });
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).not.toHaveProperty('message');
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('the permit list carries no message', async () => {
      givenAdmin();
      prisma.permit.findMany.mockResolvedValue([]);

      const response = await asUser(
        request(app.getHttpServer()).get('/api/permissions/permit/get-all'),
      ).expect(200);

      expect(response.body).not.toHaveProperty('message');
    });
  });

  describe('errors get a status code that matches', () => {
    it('a missing waypoint is 404, not 200', async () => {
      prisma.favoriteWaypoint.findUnique.mockResolvedValue(null);
      prisma.wayPoint.findUnique.mockResolvedValue(null);

      const response = await asUser(
        request(app.getHttpServer())
          .post('/api/favorites/toggle-waypoint')
          .send({ waypointId: ROAD_ID }),
      ).expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        header: 'Not Found',
        statusCode: 404,
      });
    });

    it('an unexpected database failure is 500, not 200', async () => {
      prisma.favoriteRoad.findUnique.mockRejectedValue(
        new Error('connection terminated unexpectedly'),
      );

      const response = await asUser(
        request(app.getHttpServer())
          .post('/api/favorites/toggle-road')
          .send({ roadId: ROAD_ID }),
      ).expect(500);

      expect(response.body.message).toBe('An unexpected error occurred.');
    });

    it('does not leak the underlying failure text', async () => {
      prisma.favoriteRoad.findUnique.mockRejectedValue(
        new Error('ECONNREFUSED 10.0.0.5:5432'),
      );

      const response = await asUser(
        request(app.getHttpServer())
          .post('/api/favorites/toggle-road')
          .send({ roadId: ROAD_ID }),
      ).expect(500);

      expect(JSON.stringify(response.body)).not.toMatch(/10\.0\.0\.5/);
    });

    it('a Prisma unique violation is 409', async () => {
      givenAdmin();
      prisma.permit.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique failed', {
          code: 'P2002',
          clientVersion: CLIENT_VERSION,
          meta: { target: ['Permit_name_key'] },
        }),
      );

      const response = await asUser(
        request(app.getHttpServer())
          .put(`/api/permissions/permit/${PERMIT_ID}`)
          .send({ description: 'Everything' }),
      ).expect(409);

      expect(response.body.message).toBe('That value is already taken.');

      expect(JSON.stringify(response.body)).not.toMatch(/Permit_name_key/);
    });

    it('a Prisma missing-record error is 404', async () => {
      givenAdmin();
      prisma.permit.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: CLIENT_VERSION,
        }),
      );

      await asUser(
        request(app.getHttpServer())
          .put(`/api/permissions/permit/${PERMIT_ID}`)
          .send({ description: 'Everything' }),
      ).expect(404);
    });

    it('every error body reports its own status code and path', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/road/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        statusCode: 400,
        path: '/api/road/not-a-uuid',
      });
    });

    it('a validation failure keeps its array of messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message.length).toBeGreaterThan(1);
    });
  });

  describe('sign-up with unusable input is a 400, not a 500', () => {
    it.each([
      ['an empty body', {}],
      ['a null email', { email: null, password: 'Str0ng-Password' }],
      ['a numeric email', { email: 42, password: 'Str0ng-Password' }],
      ['an object email', { email: { contains: '@' }, password: 'Str0ng-Pw1' }],
      ['an array email', { email: ['a@b.com'], password: 'Str0ng-Password' }],
    ])('%s', async (_label, body) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send(body)
        .expect(400);

      expect(prisma.manuelAuth.findUnique).not.toHaveBeenCalled();
      expect(response.body.status).toBe('error');
    });

    it('reports a taken email in English', async () => {
      prisma.manuelAuth.findUnique.mockResolvedValue({ id: 'auth-1' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'taken@example.com', password: 'Str0ng-Password' })
        .expect(409);

      expect(response.body.message).toBe(
        'An account with this email already exists',
      );
    });
  });

  describe('pagination', () => {
    it('bounds an unpaged request to the default page size', async () => {
      prisma.road.findMany.mockResolvedValue([]);
      prisma.$transaction.mockResolvedValue([[], 0]);

      const response = await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads'),
      ).expect(200);

      expect(response.body.meta).toEqual({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('honours limit and offset from the query string', async () => {
      prisma.$transaction.mockResolvedValue([[], 500]);

      const response = await asUser(
        request(app.getHttpServer()).post(
          '/api/road/own-roads?limit=10&offset=20',
        ),
      ).expect(200);

      expect(response.body.meta).toEqual({
        total: 500,
        limit: 10,
        offset: 20,
        hasMore: true,
      });
      expect(prisma.road.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });

    it('rejects a page size above the ceiling', async () => {
      await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads?limit=5000'),
      ).expect(400);
    });

    it('rejects a non-numeric limit rather than falling back', async () => {
      await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads?limit=all'),
      ).expect(400);
    });

    it('falls back to the default for a blank limit', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads?limit='),
      ).expect(200);

      expect(prisma.road.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('orders the page deterministically', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads'),
      ).expect(200);

      expect(prisma.road.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('reports a page per collection for favourites', async () => {
      prisma.$transaction.mockResolvedValue([[], 3, [], 7]);

      const response = await asUser(
        request(app.getHttpServer()).get('/api/favorites?limit=2'),
      ).expect(200);

      expect(response.body.meta).toEqual({
        roads: { total: 3, limit: 2, offset: 0, hasMore: true },
        waypoints: { total: 7, limit: 2, offset: 0, hasMore: true },
      });
    });

    it('still returns the four buckets the client expects', async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      const response = await asUser(
        request(app.getHttpServer()).get('/api/favorites'),
      ).expect(200);

      expect(Object.keys(response.body.data).sort()).toEqual([
        'othersRoads',
        'othersWaypoints',
        'ownRoads',
        'ownWaypoints',
      ]);
    });

    it('keeps the page information out of data', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const response = await asUser(
        request(app.getHttpServer()).post('/api/road/own-roads'),
      ).expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).not.toHaveProperty('meta');
    });
  });

  describe('health', () => {
    it('reports up when the database answers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.data).toMatchObject({
        status: 'up',
        database: 'up',
      });
    });

    it('answers 503 when the database does not', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error(`Can't reach database`));

      await request(app.getHttpServer()).get('/api/health').expect(503);
    });

    it('needs no credentials', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/api/health').expect(200);
    });
  });
});
