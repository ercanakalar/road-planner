import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Following an author, so their next public route is worth hearing about.
 *
 * A follow is a private subscription held by the follower: they create it, they
 * remove it, and nobody else can read who is on the list. An author is told how
 * many people follow them nowhere in the API, because a count nobody asked for
 * is the beginning of a public audience.
 */
@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Only someone who has published can be followed, which is the same door
   * search opens: following somebody who has shared nothing would be a way to
   * confirm an account exists from the outside.
   */
  private async requirePublishedAuthor(authorId: string): Promise<void> {
    const author = await this.prisma.user.findFirst({
      where: {
        id: authorId,
        roads: { some: { isPublic: true, archivedAt: null } },
      },
      select: { id: true },
    });

    if (!author) {
      throw new NotFoundException('That person has not published a route');
    }
  }

  /** Whether this caller already follows the author. Null callers follow nobody. */
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

  /**
   * Reads the follow state for a page of authors in one query rather than one
   * per row, so a list of thirty people costs the same as a list of one.
   */
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

  /**
   * Turns following this author on or off.
   *
   * The write is idempotent on purpose: `follow` on somebody already followed
   * and `unfollow` on somebody who is not both succeed and report the state the
   * caller asked for. A button that has to be pressed twice because the first
   * tap raced the list refresh is worse than a no-op.
   */
  async setFollowing(authorId: string, followerId: string, follow: boolean) {
    if (authorId === followerId) {
      throw new BadRequestException('You already hear about your own routes');
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
