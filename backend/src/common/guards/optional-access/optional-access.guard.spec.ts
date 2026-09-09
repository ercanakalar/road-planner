import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AccessStrategy } from 'src/auth/strategy/access.strategy';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { OptionalAccessGuard } from './optional-access.guard';

const SECRET = 'test-access-key';
const USER_ID = 'd3a1e1c4-3b5f-4e0c-9f4d-2c3d4e5f6071';

@Controller('probe')
class ProbeController {
  @UseGuards(OptionalAccessGuard)
  @Get()
  who(@GetUser() user: { userId?: string } | undefined) {
    return { userId: user?.userId ?? null };
  }
}

describe('OptionalAccessGuard', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const get = (token?: string) => {
    const call = request(app.getHttpServer()).get('/probe');
    return token ? call.set('Authorization', `Bearer ${token}`) : call;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProbeController],
      providers: [
        AccessStrategy,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'ACCESS_KEY' ? SECRET : undefined),
          },
        },
      ],
    }).compile();

    jwt = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const sign = (payload: object, expiresInSeconds: number) =>
    jwt.sign(payload, { secret: SECRET, expiresIn: expiresInSeconds });

  it('lets a caller with no token through as a stranger', async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });

  it('names a caller whose token is good', async () => {
    const res = await get(sign({ userId: USER_ID }, 900));

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(USER_ID);
  });

  // The app refreshes its session on a 401 and on nothing else. Answering an
  // expired token as though the caller were a stranger would hide their own
  // private roads behind a 404 until they restarted the app.
  it('turns away an expired token instead of demoting it to anonymous', async () => {
    const res = await get(sign({ userId: USER_ID }, -1));

    expect(res.status).toBe(401);
  });

  it('turns away a token signed with the wrong key', async () => {
    const res = await get(
      jwt.sign({ userId: USER_ID }, { secret: 'not-the-key', expiresIn: 900 }),
    );

    expect(res.status).toBe(401);
  });

  it('turns away a token with no subject', async () => {
    const res = await get(sign({ nothing: true }, 900));

    expect(res.status).toBe(401);
  });
});
