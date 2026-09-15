import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { FollowService } from './follow.service';

const AUTHOR_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';
const FOLLOWER_ID = 'c2f0d0b3-2a4e-4d9b-8e3c-1b2c3d4e5f60';

describe('FollowService', () => {
  let service: FollowService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FollowService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(FollowService);

    prisma.user.findFirst.mockResolvedValue({ id: AUTHOR_ID });
    prisma.authorFollow.findUnique.mockResolvedValue(null);
    prisma.authorFollow.findMany.mockResolvedValue([]);
  });

  describe('setFollowing', () => {
    it('records the follow against the pair', async () => {
      await service.setFollowing(AUTHOR_ID, FOLLOWER_ID, true);

      expect(prisma.authorFollow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            followerId_authorId: {
              followerId: FOLLOWER_ID,
              authorId: AUTHOR_ID,
            },
          },
          create: { followerId: FOLLOWER_ID, authorId: AUTHOR_ID },
        }),
      );
    });

    it('leaves an existing follow alone rather than failing on it', async () => {
      // A second tap that raced the list refresh must not 409; the upsert's
      // empty update is what makes following idempotent.
      await service.setFollowing(AUTHOR_ID, FOLLOWER_ID, true);

      expect(prisma.authorFollow.upsert.mock.calls[0][0].update).toEqual({});
    });

    it('removes the follow, and does not mind if there was none', async () => {
      prisma.authorFollow.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.setFollowing(AUTHOR_ID, FOLLOWER_ID, false);

      expect(prisma.authorFollow.deleteMany).toHaveBeenCalledWith({
        where: { followerId: FOLLOWER_ID, authorId: AUTHOR_ID },
      });
      expect(result.data).toEqual({ authorId: AUTHOR_ID, isFollowed: false });
    });

    it('reports back the state the caller asked for', async () => {
      const result = await service.setFollowing(AUTHOR_ID, FOLLOWER_ID, true);

      expect(result.data).toEqual({ authorId: AUTHOR_ID, isFollowed: true });
    });

    it('refuses somebody who has published nothing', async () => {
      // The same door search opens: an account that has shared nothing cannot
      // be confirmed to exist from the outside, and following would do that.
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.setFollowing(AUTHOR_ID, FOLLOWER_ID, true),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.authorFollow.upsert).not.toHaveBeenCalled();
    });

    it('scopes that check to live public routes', async () => {
      await service.setFollowing(AUTHOR_ID, FOLLOWER_ID, true);

      expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({
        id: AUTHOR_ID,
        roads: { some: { isPublic: true, archivedAt: null } },
      });
    });

    it('refuses to let anyone follow themselves', async () => {
      await expect(
        service.setFollowing(AUTHOR_ID, AUTHOR_ID, true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isFollowing', () => {
    it('is false for a signed-out reader without asking the database', async () => {
      await expect(service.isFollowing(AUTHOR_ID, null)).resolves.toBe(false);

      expect(prisma.authorFollow.findUnique).not.toHaveBeenCalled();
    });

    it('is false for the author themselves', async () => {
      await expect(service.isFollowing(AUTHOR_ID, AUTHOR_ID)).resolves.toBe(
        false,
      );
    });

    it('is true once a row exists', async () => {
      prisma.authorFollow.findUnique.mockResolvedValue({ id: 'follow-1' });

      await expect(service.isFollowing(AUTHOR_ID, FOLLOWER_ID)).resolves.toBe(
        true,
      );
    });
  });

  describe('followedAmong', () => {
    it('answers a whole page in one query', async () => {
      prisma.authorFollow.findMany.mockResolvedValue([{ authorId: AUTHOR_ID }]);

      const followed = await service.followedAmong(
        [AUTHOR_ID, 'someone-else'],
        FOLLOWER_ID,
      );

      expect(prisma.authorFollow.findMany).toHaveBeenCalledTimes(1);
      expect([...followed]).toEqual([AUTHOR_ID]);
    });

    it('asks nothing on behalf of a signed-out reader', async () => {
      await expect(service.followedAmong([AUTHOR_ID], null)).resolves.toEqual(
        new Set(),
      );

      expect(prisma.authorFollow.findMany).not.toHaveBeenCalled();
    });

    it('asks nothing for an empty page', async () => {
      await expect(service.followedAmong([], FOLLOWER_ID)).resolves.toEqual(
        new Set(),
      );

      expect(prisma.authorFollow.findMany).not.toHaveBeenCalled();
    });
  });
});
