import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const ROAD_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';
const ADMIN_PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';

describe('Request validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let accessToken: string;

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

    accessToken = app
      .get(JwtService)
      .sign(
        { userId: USER_ID, email: 'user@example.com' },
        { secret: process.env.ACCESS_KEY, expiresIn: '15m' },
      );
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${accessToken}`);

  describe('POST /api/user/update — privilege escalation (C2)', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({ id: USER_ID, firstName: 'Ercan' });
    });

    it('does not write permitId, so a user cannot promote itself to ADMIN', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update')).send({
        firstName: 'Ercan',
        permitId: ADMIN_PERMIT_ID,
      });

      expect(prisma.user.update).toHaveBeenCalled();
      const { data } = prisma.user.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('permitId');
      expect(data).toEqual({ firstName: 'Ercan' });
    });

    it('does not write email', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update')).send({
        firstName: 'Ercan',
        email: 'victim@example.com',
      });

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('email');
    });

    it('ignores a client-supplied id and updates the token subject', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update')).send({
        id: 'some-other-user',
        firstName: 'Ercan',
      });

      const { where } = prisma.user.update.mock.calls[0][0];
      expect(where).toEqual({ id: USER_ID });
    });

    it('rejects a request whose only fields were stripped', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update'))
        .send({ permitId: ADMIN_PERMIT_ID })
        .expect(400);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('accepts the payload the shipped client sends', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update'))
        .send({
          id: USER_ID,
          firstName: 'Ercan',
          lastName: 'Akalar',
          email: 'ercan@example.com',
          photo: 'https://cdn.example.com/a.png',
          nickName: 'ercan_a',
        })
        .expect(200);
    });

    it('rejects an invalid nickname with 400', async () => {
      await auth(request(app.getHttpServer()).post('/api/user/update'))
        .send({ nickName: 'has spaces' })
        .expect(400);
    });
  });

  describe('route parameter validation', () => {
    it.each([
      ['get', '/api/user/not-a-uuid'],
      ['get', '/api/road/not-a-uuid'],
      ['get', '/api/road/waypoint/not-a-uuid'],
    ])('rejects a non-UUID id on %s %s', async (method, path) => {
      await auth(request(app.getHttpServer())[method as 'get'](path)).expect(
        400,
      );
    });

    it('does not query the database for a malformed id', async () => {
      await auth(request(app.getHttpServer()).get('/api/user/not-a-uuid'));

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('body validation', () => {
    it('rejects a sign-up with a weak password', async () => {
      prisma.manuelAuth.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'new@example.com', password: 'short' })
        .expect(400);
    });

    it('rejects a sign-up with a malformed email', async () => {
      prisma.manuelAuth.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'not-an-email', password: 'Str0ng-Password' })
        .expect(400);
    });

    it('rejects a favourite toggle with a non-UUID id', async () => {
      await auth(
        request(app.getHttpServer()).post('/api/favorites/toggle-road'),
      )
        .send({ roadId: 'nope' })
        .expect(400);
    });

    it('rejects out-of-range coordinates on road creation', async () => {
      await auth(request(app.getHttpServer()).post('/api/road/create'))
        .send({
          title: 'T',
          description: 'D',
          waypoints: [{ latitude: 999, longitude: 0, order: 1 }],
        })
        .expect(400);

      expect(prisma.road.create).not.toHaveBeenCalled();
    });

    it('returns the failing field in the error body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'not-an-email', password: 'Str0ng-Password' });

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/email/)]),
      );
    });

    it('reaches the guard before the body is validated on a guarded route', async () => {
      const response = await auth(
        request(app.getHttpServer()).put(
          `/api/road/reorder-waypoint/${ROAD_ID}`,
        ),
      ).send({ from: -1, to: 0 });

      expect(response.status).not.toBe(200);
    });
  });
});
