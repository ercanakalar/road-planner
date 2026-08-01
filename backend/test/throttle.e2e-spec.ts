import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/config/bootstrap';
import { AUTH_THROTTLE } from '../src/config/throttle';
import { EmailService } from '../src/notification/email/email.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'false';

    prisma = createPrismaMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EmailService)
      .useValue({ sendEmail: jest.fn(), verifyConnection: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { corsOrigins: '*' });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    process.env.THROTTLE_DISABLED = 'true';
  });

  const flood = async (
    send: () => request.Test,
    count: number,
  ): Promise<number[]> => {
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
      statuses.push((await send()).status);
    }
    return statuses;
  };

  it('throttles forgot-password past its limit', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const limit = AUTH_THROTTLE.forgotPassword.default.limit;

    const statuses = await flood(
      () =>
        request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'flood@example.com' }),
      limit + 2,
    );

    expect(statuses.slice(0, limit)).not.toContain(429);
    expect(statuses.slice(limit)).toEqual([429, 429]);
  });

  it('throttles sign-in past its limit', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const limit = AUTH_THROTTLE.signIn.default.limit;

    const statuses = await flood(
      () =>
        request(app.getHttpServer())
          .post('/api/auth/sign-in')
          .send({ email: 'flood@example.com', password: 'Str0ng-Password' }),
      limit + 1,
    );

    expect(statuses.slice(0, limit).every((status) => status === 401)).toBe(
      true,
    );
    expect(statuses.at(-1)).toBe(429);
  });

  it('counts sign-in and forgot-password against separate budgets', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await flood(
      () =>
        request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'other@example.com' }),
      AUTH_THROTTLE.forgotPassword.default.limit + 1,
    );

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .send({ refreshToken: 'not-a-jwt' });

    expect(response.status).not.toBe(429);
  });

  it('does not throttle an authenticated read at the auth-route limits', async () => {
    const statuses = await flood(
      () => request(app.getHttpServer()).get('/api/favorites'),
      AUTH_THROTTLE.signIn.default.limit + 5,
    );

    expect(statuses).not.toContain(429);
  });
});
