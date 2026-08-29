import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

import { ConfigService } from '@nestjs/config';

import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnvironmentVariables } from 'src/config/env.validation';
import { UpdateUserDto } from './dto/update-user.dto';
import { avatarPath, removeAvatar, writeAvatar } from './avatar.storage';

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
      header: 'Photo Updated',
      message: 'Profile photo updated successfully',
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

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No updatable fields were supplied');
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
          throw new ConflictException('This nickname is already in use');
        }
      }

      return tx.user.update({
        where: { id: userId },
        data,
        select: USER_PUBLIC_SELECT,
      });
    });

    return ok({
      header: 'User Updated',
      message: 'User updated successfully',
      data: updated,
    });
  }

  async getUserById(id: string, requesterId: string) {
    if (id !== requesterId) {
      throw new ForbiddenException('You may only read your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT,
    });

    return ok({
      header: 'User Fetched',
      message: 'User fetched successfully',
      data: user,
    });
  }
}
