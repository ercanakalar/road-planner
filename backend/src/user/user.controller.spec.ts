import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { I18nService } from 'nestjs-i18n';

import { ok } from 'src/common/http/api-response';
import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { FollowService } from './follow.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { testI18n } from 'src/testing/i18n';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const CALLER_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('UserController routing', () => {
  let app: INestApplication;
  let userService: {
    searchAuthors: jest.Mock;
    getAuthorById: jest.Mock;
    getUserById: jest.Mock;
  };
  let followService: { setFollowing: jest.Mock };

  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeEach(async () => {
    userService = {
      searchAuthors: jest.fn().mockResolvedValue(ok()),
      getAuthorById: jest.fn().mockResolvedValue(ok()),
      getUserById: jest.fn().mockResolvedValue(ok()),
    };
    followService = { setFollowing: jest.fn().mockResolvedValue(ok()) };

    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: FollowService, useValue: followService },
        { provide: I18nService, useValue: testI18n() },
      ],
    })
      .overrideGuard(OptionalAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.use((request: { user?: unknown }, _res: unknown, next: () => void) => {
      request.user = { userId: CALLER_ID };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reaches author search, not the profile lookup, at /user/search', async () => {
    await get('/user/search?q=erc').expect(200);

    expect(userService.getUserById).not.toHaveBeenCalled();
    expect(userService.searchAuthors).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'erc' }),
      CALLER_ID,
    );
  });

  it('reaches the public author at /user/author/:id', async () => {
    await get(`/user/author/${USER_ID}`).expect(200);

    expect(userService.getAuthorById).toHaveBeenCalledWith(USER_ID, CALLER_ID);
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  it('still reaches the private profile at /user/:id', async () => {
    await get(`/user/${USER_ID}`).expect(200);

    expect(userService.getUserById).toHaveBeenCalledWith(USER_ID, CALLER_ID);
  });

  it('rejects a user id that is not a uuid', async () => {
    await get('/user/not-a-uuid').expect(400);
  });

  it('reaches the follow toggle, not the profile lookup, at /user/author/:id/follow', async () => {
    await request(app.getHttpServer())
      .post(`/user/author/${USER_ID}/follow`)
      .send({ follow: true })
      .expect(200);

    expect(followService.setFollowing).toHaveBeenCalledWith(
      USER_ID,
      CALLER_ID,
      true,
    );
  });
});
