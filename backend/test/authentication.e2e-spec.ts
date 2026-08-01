import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { HelperService } from '../src/auth/helper/helper.service';
import { configureApp } from '../src/config/bootstrap';
import { EmailService } from '../src/notification/email/email.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../src/testing/mocks';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let helper: HelperService;
  let sendEmail: jest.Mock;

  beforeAll(async () => {
    prisma = createPrismaMock();
    sendEmail = jest.fn().mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EmailService)
      .useValue({ sendEmail, verifyConnection: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, { corsOrigins: '*' });
    await app.init();

    helper = app.get(HelperService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const userRow = (overrides: Record<string, unknown> = {}) => ({
    id: USER_ID,
    email: 'user@example.com',
    manuelAuth: { id: 'auth-1', password: 'scrypt$stored' },
    googleAuth: null,
    ...overrides,
  });

  const sessionFor = (refreshToken: string) => ({
    id: 'session-1',
    userId: USER_ID,
    refreshTokenHash: helper.hashToken(refreshToken),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    user: { id: USER_ID, email: 'user@example.com' },
  });

  describe('C1 — password reset token disclosure', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.passwordReset.create.mockResolvedValue({ id: 'reset-1' });
      prisma.passwordReset.updateMany.mockResolvedValue({ count: 0 });
      sendEmail.mockClear();
    });

    it('does not return the reset token in the response body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(response.body).not.toHaveProperty('resetToken');
      expect(response.body).not.toHaveProperty('resetTokenUrl');
    });

    it('returns nothing beyond a generic acknowledgement', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(Object.keys(response.body).sort()).toEqual([
        'header',
        'message',
        'status',
      ]);
    });

    it('does not leak the token anywhere in the serialised response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toMatch(/[0-9a-f]{64}/);
    });

    it('stores a digest that is not the emailed value', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      const stored =
        prisma.passwordReset.create.mock.calls[0][0].data.tokenHash;
      const emailed = sendEmail.mock.calls[0][0].text.match(
        /reset-password\/([0-9a-f]{64})/,
      )![1];

      expect(stored).not.toBe(emailed);
      expect(stored).toBe(helper.hashToken(emailed));
    });

    it('answers identically for an address with no account', async () => {
      const known = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      prisma.user.findUnique.mockResolvedValue(null);

      const unknown = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      expect(unknown.body).toEqual(known.body);
    });
  });

  describe('C6 — the refresh route is reachable', () => {
    const refreshTokenFor = async (userId: string) =>
      helper.createRefreshToken({ userId, email: 'user@example.com' });

    it('does not require an access token', async () => {
      const refreshToken = await refreshTokenFor(USER_ID);
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.session.findUnique.mockResolvedValue(sessionFor(refreshToken));
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);
    });

    it('returns a new token pair', async () => {
      const refreshToken = await refreshTokenFor(USER_ID);
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.session.findUnique.mockResolvedValue(sessionFor(refreshToken));
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      expect(response.body.data.userId).toBe(USER_ID);
    });

    it('rotates the refresh token rather than returning the same one', async () => {
      const refreshToken = await refreshTokenFor(USER_ID);
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.session.findUnique.mockResolvedValue(sessionFor(refreshToken));
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('still works when the client also sends an Authorization header', async () => {
      const refreshToken = await refreshTokenFor(USER_ID);
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.session.findUnique.mockResolvedValue(sessionFor(refreshToken));
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .set('Authorization', 'Bearer some-access-token')
        .send({ refreshToken })
        .expect(200);
    });
  });

  describe('C4 — refresh tokens are checked against storage', () => {
    it('rejects a signature-valid token that does not match storage', async () => {
      const refreshToken = await helper.createRefreshToken({
        userId: USER_ID,
        email: 'user@example.com',
      });

      prisma.session.findUnique.mockResolvedValue(null);
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
    });

    it('rejects a refresh after sign-out cleared the stored digest', async () => {
      const refreshToken = await helper.createRefreshToken({
        userId: USER_ID,
        email: 'user@example.com',
      });

      prisma.session.findUnique.mockResolvedValue({
        ...sessionFor(refreshToken),
        revokedAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
    });

    it('rejects a token signed with the wrong secret', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEifQ.bad',
        })
        .expect(401);
    });

    it('rejects a body that is not JWT-shaped with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'not-a-jwt' })
        .expect(400);
    });
  });

  describe('sign-in', () => {
    it('uses one status and message for unknown address and wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const unknown = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'nobody@example.com', password: 'Str0ng-Password' });

      prisma.user.findUnique.mockResolvedValue(
        userRow({
          manuelAuth: {
            id: 'auth-1',
            password: await helper.toHashPassword('TheRealPassword1'),
          },
        }),
      );
      const wrongPassword = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'user@example.com', password: 'WrongPassword1' });

      expect(unknown.status).toBe(401);
      expect(wrongPassword.status).toBe(401);
      expect(unknown.body.message).toBe(wrongPassword.body.message);
    });

    it('signs in with the correct password and stores only a digest', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userRow({
          manuelAuth: {
            id: 'auth-1',
            password: await helper.toHashPassword('TheRealPassword1'),
          },
        }),
      );
      prisma.session.create.mockResolvedValue({ id: 'session-1' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'user@example.com', password: 'TheRealPassword1' })
        .expect(201);

      const issued = response.body.data.refreshToken;
      const { data } = prisma.session.create.mock.calls.at(-1)![0];

      expect(data.refreshTokenHash).toBe(helper.hashToken(issued));
      expect(data.refreshTokenHash).not.toBe(issued);
      expect(Object.keys(data)).toEqual(
        expect.not.arrayContaining(['accessToken']),
      );
    });

    it('does not embed permissions in the access token', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userRow({
          manuelAuth: {
            id: 'auth-1',
            password: await helper.toHashPassword('TheRealPassword1'),
          },
        }),
      );
      prisma.session.create.mockResolvedValue({ id: 'session-1' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-in')
        .send({ email: 'user@example.com', password: 'TheRealPassword1' })
        .expect(201);

      const claims = await helper.verifyAccessToken(
        response.body.data.accessToken,
      );

      expect(claims).not.toHaveProperty('permissions');
      expect(claims).toMatchObject({ userId: USER_ID });
    });
  });
});
