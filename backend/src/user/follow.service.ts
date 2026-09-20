import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

  private async requirePublishedAuthor(authorId: string): Promise<void> {
    const author = await this.prisma.user.findFirst({
      where: {
        id: authorId,
        roads: { some: { isPublic: true, archivedAt: null } },
      },
      select: { id: true },
    });

    if (!author) {
      throw new NotFoundException('error.personNotFound');
    }
  }

  async isFollowing(
    authorId: string,
    followerId: string | null,
  ): Promise<boolean> {
    if (!followerId || followerId === authorId) return false;

    const row = await this.prisma.authorFollow.findUnique({
      where: { followerId_authorId: { followerId, authorId } },
      select: { id: true },
    });

    return !!row;
  }

  async followedAmong(
    authorIds: readonly string[],
    followerId: string | null,
  ): Promise<Set<string>> {
    if (!followerId || authorIds.length === 0) return new Set();

    const rows = await this.prisma.authorFollow.findMany({
      where: { followerId, authorId: { in: [...authorIds] } },
      select: { authorId: true },
    });

    return new Set(rows.map((row) => row.authorId));
  }

  async setFollowing(authorId: string, followerId: string, follow: boolean) {
    if (authorId === followerId) {
      throw new BadRequestException('error.cannotFollowSelf');
    }

    await this.requirePublishedAuthor(authorId);

    if (follow) {
      await this.prisma.authorFollow.upsert({
        where: { followerId_authorId: { followerId, authorId } },
        create: { followerId, authorId },
        update: {},
      });
    } else {
      await this.prisma.authorFollow.deleteMany({
        where: { followerId, authorId },
      });
    }

    return ok({
      header: follow ? 'Following' : 'Not following',
      message: follow
        ? 'You will hear about their next route'
        : 'You will not hear about their new routes',
      data: { authorId, isFollowed: follow },
    });
  }
}
