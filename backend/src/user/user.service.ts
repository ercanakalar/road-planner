import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

import { ConfigService } from '@nestjs/config';

import { pageMeta } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { searchTerm } from 'src/road/services/search/road-search.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnvironmentVariables } from 'src/config/env.validation';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchQueryDto } from './dto/user-search.dto';
import { avatarPath, removeAvatar, writeAvatar } from './avatar.storage';
import { FollowService } from './follow.service';

const AUTHOR_SELECT = {
  id: true,
  nickName: true,
  firstName: true,
  photo: true,
} as const;

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  photo: true,
  nickName: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService<EnvironmentVariables, true>,
    private follows: FollowService,
  ) {}

  private get uploadDir(): string {
    return this.config.get('UPLOAD_DIR', { infer: true });
  }

  async updatePhoto(userId: string, buffer: Buffer) {
    const filename = await writeAvatar(this.uploadDir, buffer);

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { photo: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { photo: `/api/user/photo/${filename}` },
      select: USER_PUBLIC_SELECT,
    });

    await removeAvatar(this.uploadDir, existing?.photo ?? null);

    return ok({
      header: 'user.photoHeader',
      message: 'user.photoMessage',
      data: updated,
    });
  }

  resolveAvatarPath(filename: string): string | null {
    return avatarPath(this.uploadDir, filename);
  }

  async updateUser(body: UpdateUserDto, userId: string) {
    const data: Prisma.UserUpdateInput = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.photo !== undefined) data.photo = body.photo;
    if (body.nickName !== undefined) data.nickName = body.nickName;
    if (body.language !== undefined) data.language = body.language;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('error.nothingToUpdate');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.nickName !== undefined) {
        const taken = await tx.user.findFirst({
          where: {
            nickName: body.nickName,
            NOT: { id: userId },
          },
          select: { id: true },
        });

        if (taken) {
          throw new ConflictException('error.nicknameTaken');
        }
      }

      return tx.user.update({
        where: { id: userId },
        data,
        select: USER_PUBLIC_SELECT,
      });
    });

    return ok({
      header: 'user.updatedHeader',
      message: 'user.updatedMessage',
      data: updated,
    });
  }

  async searchAuthors(query: UserSearchQueryDto, viewerId: string | null) {
    const term = searchTerm(query.q);

    const published: Prisma.UserWhereInput = {
      roads: { some: { isPublic: true, archivedAt: null } },
    };

    const where: Prisma.UserWhereInput = term
      ? {
          AND: [
            published,
            {
              OR: [
                { nickName: { contains: term, mode: 'insensitive' } },
                { firstName: { contains: term, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : published;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [
          { roads: { _count: 'desc' } },
          { nickName: 'asc' },
          { id: 'asc' },
        ],
        skip: query.offset,
        take: query.limit,
        select: {
          ...AUTHOR_SELECT,
          _count: {
            select: { roads: { where: { isPublic: true, archivedAt: null } } },
          },
        },
      }),
    ]);

    const followed = await this.follows.followedAmong(
      users.map((user) => user.id),
      viewerId,
    );

    const shaped = users.map(({ _count, nickName, firstName, ...user }) => ({
      ...user,
      displayName: nickName ?? firstName ?? 'A traveller',
      publicRouteCount: _count.roads,
      isFollowed: followed.has(user.id),
    }));

    return ok({
      header: 'user.peopleHeader',
      message: shaped.length ? 'user.peopleFound' : 'user.peopleNone',
      data: shaped,
      meta: pageMeta(total, query),
    });
  }

  async getAuthorById(id: string, viewerId: string | null) {
    const user = await this.prisma.user.findFirst({
      where: { id, roads: { some: { isPublic: true, archivedAt: null } } },
      select: {
        ...AUTHOR_SELECT,
        _count: {
          select: { roads: { where: { isPublic: true, archivedAt: null } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('error.personNotFound');
    }

    const { _count, nickName, firstName, ...rest } = user;

    return ok({
      header: 'user.authorHeader',
      message: 'user.authorMessage',
      data: {
        ...rest,
        displayName: nickName ?? firstName ?? 'A traveller',
        publicRouteCount: _count.roads,
        isFollowed: await this.follows.isFollowing(id, viewerId),
      },
    });
  }

  async getUserById(id: string, requesterId: string) {
    if (id !== requesterId) {
      throw new ForbiddenException('error.ownProfileOnly');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });

    return ok({
      header: 'user.fetchedHeader',
      message: 'user.fetchedMessage',
      data: user,
    });
  }
}
