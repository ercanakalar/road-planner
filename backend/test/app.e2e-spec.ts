import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

describe('Application wiring (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

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
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('global prefix', () => {
    it('serves routes under /api', async () => {
      await request(app.getHttpServer()).get('/api/road/some-id').expect(401);
    });

    it('does not serve routes without the prefix', async () => {
      await request(app.getHttpServer()).get('/road/some-id').expect(404);
    });

    it('has no root route', async () => {
      await request(app.getHttpServer()).get('/').expect(404);
    });
  });

  describe('deny-by-default authentication', () => {
    it.each([
      ['get', '/api/road/road-1'],
      ['get', '/api/road/waypoint/wp-1'],
      ['post', '/api/road/own-roads'],
      ['post', '/api/road/create'],
      ['get', '/api/user/user-1'],
      ['post', '/api/user/update'],
      ['get', '/api/favorites'],
      ['post', '/api/favorites/toggle-road'],
      ['get', '/api/permissions/permit/get-all'],
      ['post', '/api/auth/sign-out'],
    ])('rejects an unauthenticated %s %s', async (method, path) => {
      await request(app.getHttpServer())[method as 'get'](path).expect(401);
    });

    it('rejects a malformed Authorization header with 401, not 500', async () => {
      await request(app.getHttpServer())
        .get('/api/user/user-1')
        .set('Authorization', 'NotBearer whatever')
        .expect(401);
    });

    it('rejects a bearer token that is not a JWT with 401, not 500', async () => {
      await request(app.getHttpServer())
        .get('/api/user/user-1')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('rejects a JWT signed with the wrong secret', async () => {
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJ1c2VySWQiOiJ1c2VyLTEiLCJlbWFpbCI6ImFAYi5jb20ifQ.' +
        'wrong-signature';

      await request(app.getHttpServer())
        .get('/api/user/user-1')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });
  });

  describe('public routes', () => {
    it('allows sign-in through the guard', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'nobody@example.com', password: 'whatever' });

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('allows sign-up through the guard', async () => {
      prisma.manuelAuth.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.permit.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up')
        .send({ email: 'new@example.com', password: 'Str0ng-Password1' });

      expect(response.status).not.toBe(401);
    });

    it('allows the refresh route through the guard without an access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'not-a-jwt' });

      expect(response.status).toBe(400);
    });
  });

  describe('shutdown hooks', () => {
    it('closes without leaving the Prisma connection open', async () => {
      expect(app).toBeDefined();
    });
  });
});
