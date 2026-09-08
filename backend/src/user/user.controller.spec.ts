import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ok } from 'src/common/http/api-response';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const CALLER_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('UserController routing', () => {
  let app: INestApplication;
  let userService: {
    searchAuthors: jest.Mock;
    getAuthorById: jest.Mock;
    getUserById: jest.Mock;
  };

  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeEach(async () => {
    userService = {
      searchAuthors: jest.fn().mockResolvedValue(ok()),
      getAuthorById: jest.fn().mockResolvedValue(ok()),
      getUserById: jest.fn().mockResolvedValue(ok()),
    };

    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

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
    // '/:id' is declared after this one on purpose: it would otherwise match
    // '/search' and fail its UUID pipe with a 400 that says nothing useful.
    await get('/user/search?q=erc').expect(200);

    expect(userService.getUserById).not.toHaveBeenCalled();
    expect(userService.searchAuthors).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'erc' }),
    );
  });

  it('reaches the public author at /user/author/:id', async () => {
    await get(`/user/author/${USER_ID}`).expect(200);

    expect(userService.getAuthorById).toHaveBeenCalledWith(USER_ID);
    expect(userService.getUserById).not.toHaveBeenCalled();
  });

  it('still reaches the private profile at /user/:id', async () => {
    await get(`/user/${USER_ID}`).expect(200);

    expect(userService.getUserById).toHaveBeenCalledWith(USER_ID, CALLER_ID);
  });

  it('rejects a user id that is not a uuid', async () => {
    await get('/user/not-a-uuid').expect(400);
  });
});
