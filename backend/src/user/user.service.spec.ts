import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

const UPLOAD_DIR = 'test-uploads';

import { ConfigService } from '@nestjs/config';

import { PrismaService } from 'src/prisma/prisma.service';
import {
  createConfigMock,
  createPrismaMock,
  PrismaMock,
} from 'src/testing/mocks';
import { UserService } from './user.service';

const USER_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const ADMIN_PERMIT_ID = '909c9b35-eec3-4afe-a21d-986682659f5a';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createConfigMock({ UPLOAD_DIR: UPLOAD_DIR }),
        },
      ],
    }).compile();

    service = module.get(UserService);
    prisma.user.update.mockResolvedValue({ id: USER_ID });
    prisma.user.findFirst.mockResolvedValue(null);
  });

  describe('updateUser', () => {
    it('writes the supplied profile fields', async () => {
      await service.updateUser(
        { firstName: 'Ercan', lastName: 'Akalar' },
        USER_ID,
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: { firstName: 'Ercan', lastName: 'Akalar' },
        }),
      );
    });

    it('omits fields the caller did not supply', async () => {
      await service.updateUser({ firstName: 'Ercan' }, USER_ID);

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(data).toEqual({ firstName: 'Ercan' });
    });

    it('never writes a field outside the mapped set', async () => {
      await service.updateUser(
        {
          firstName: 'Ercan',
          permitId: ADMIN_PERMIT_ID,
          email: 'victim@example.com',
          deletedAt: null,
          id: 'another-user',
        } as never,
        USER_ID,
      );

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(Object.keys(data)).toEqual(['firstName']);
    });

    it('always scopes the update to the authenticated user', async () => {
      await service.updateUser({ firstName: 'Ercan' } as never, 'attacker-id');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'attacker-id' } }),
      );
    });

    it('rejects an update with no usable fields', async () => {
      await expect(service.updateUser({}, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('never returns permitId to the client', async () => {
      await service.updateUser({ firstName: 'Ercan' }, USER_ID);

      const { select } = prisma.user.update.mock.calls[0][0];
      expect(select).not.toHaveProperty('permitId');
      expect(select).not.toHaveProperty('deletedAt');
    });

    describe('nickname uniqueness', () => {
      it('rejects a nickname already held by another user', async () => {
        prisma.user.findFirst.mockResolvedValue({ id: 'someone-else' });

        await expect(
          service.updateUser({ nickName: 'taken' }, USER_ID),
        ).rejects.toThrow(ConflictException);
      });

      it('allows a user to keep its own nickname', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(
          service.updateUser({ nickName: 'mine' }, USER_ID),
        ).resolves.toMatchObject({ header: 'User Updated' });
      });

      it('excludes the caller from the uniqueness lookup', async () => {
        await service.updateUser({ nickName: 'mine' }, USER_ID);

        expect(prisma.user.findFirst).toHaveBeenCalledWith({
          where: { nickName: 'mine', NOT: { id: USER_ID } },
          select: { id: true },
        });
      });

      it('does not run the lookup when no nickname is supplied', async () => {
        await service.updateUser({ firstName: 'Ercan' }, USER_ID);

        expect(prisma.user.findFirst).not.toHaveBeenCalled();
      });
    });
  });

  describe('getUserById', () => {
    it('projects only publicly safe fields', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID });

      await service.getUserById(USER_ID, USER_ID);

      const { select } = prisma.user.findUnique.mock.calls[0][0];
      expect(select).not.toHaveProperty('permitId');
      expect(select).not.toHaveProperty('deletedAt');
      expect(select).toMatchObject({ id: true, email: true, nickName: true });
    });

    it('returns null data for an unknown id rather than throwing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getUserById(USER_ID, USER_ID),
      ).resolves.toMatchObject({ data: null });
    });

    it('refuses to read another user’s profile', async () => {
      await expect(
        service.getUserById('someone-elses-id', USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not query the database when the ids differ', async () => {
      await expect(
        service.getUserById('someone-elses-id', USER_ID),
      ).rejects.toThrow();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
  describe('searchAuthors — what search may reveal', () => {
    beforeEach(() => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        {
          id: USER_ID,
          nickName: 'ercan',
          firstName: 'Ercan',
          photo: 'a.jpg',
          _count: { roads: 3 },
        },
      ]);
    });

    const searchQuery = (q?: string) => ({ q, limit: 20, offset: 0 });

    const whereOf = () =>
      prisma.user.findMany.mock.calls[0][0].where as Record<string, unknown>;

    it('only finds people who have published something', async () => {
      await service.searchAuthors(searchQuery());

      // Someone who has published nothing is not discoverable at all, which is
      // what makes this endpoint safe to leave open.
      expect(whereOf()).toEqual({
        roads: { some: { isPublic: true, archivedAt: null } },
      });
    });

    it('keeps that restriction alongside the term', async () => {
      await service.searchAuthors(searchQuery('erc'));

      expect(whereOf().AND).toEqual([
        { roads: { some: { isPublic: true, archivedAt: null } } },
        {
          OR: [
            { nickName: { contains: 'erc', mode: 'insensitive' } },
            { firstName: { contains: 'erc', mode: 'insensitive' } },
          ],
        },
      ]);
    });

    it('matches only on names it is willing to show back', async () => {
      await service.searchAuthors(searchQuery('erc'));

      const clauses = JSON.stringify(whereOf());

      // Matching a field that is never returned would turn search into a probe
      // for it, so email and last name are not searchable.
      expect(clauses).not.toContain('email');
      expect(clauses).not.toContain('lastName');
    });

    it('never selects an email or a last name', async () => {
      await service.searchAuthors(searchQuery('erc'));

      const select = prisma.user.findMany.mock.calls[0][0].select as Record<
        string,
        unknown
      >;

      expect(select.email).toBeUndefined();
      expect(select.lastName).toBeUndefined();
      expect(Object.keys(select).sort()).toEqual([
        '_count',
        'firstName',
        'id',
        'nickName',
        'photo',
      ]);
    });

    it('returns a display name and a published count, nothing more', async () => {
      const result = await service.searchAuthors(searchQuery('erc'));

      expect(result.data).toEqual([
        {
          id: USER_ID,
          photo: 'a.jpg',
          displayName: 'ercan',
          publicRouteCount: 3,
        },
      ]);
    });

    it('counts only public routes towards that total', async () => {
      await service.searchAuthors(searchQuery());

      expect(prisma.user.findMany.mock.calls[0][0].select._count).toEqual({
        select: { roads: { where: { isPublic: true, archivedAt: null } } },
      });
    });

    it('reports the unpaged total so the list can page', async () => {
      prisma.user.count.mockResolvedValue(42);

      const result = await service.searchAuthors({ limit: 20, offset: 0 });

      expect(result.meta).toEqual({
        total: 42,
        limit: 20,
        offset: 0,
        hasMore: true,
      });
    });
  });

  describe('getAuthorById', () => {
    it('refuses someone who has published nothing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getAuthorById(USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('scopes the lookup to published authors', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        nickName: null,
        firstName: null,
        photo: null,
        _count: { roads: 1 },
      });

      await service.getAuthorById(USER_ID);

      expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({
        id: USER_ID,
        roads: { some: { isPublic: true, archivedAt: null } },
      });
    });

    it('falls back to a stand-in name when there is none to show', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        nickName: null,
        firstName: null,
        photo: null,
        _count: { roads: 1 },
      });

      const result = await service.getAuthorById(USER_ID);

      expect(result.data).toEqual({
        id: USER_ID,
        photo: null,
        displayName: 'A traveller',
        publicRouteCount: 1,
      });
    });
  });
});
