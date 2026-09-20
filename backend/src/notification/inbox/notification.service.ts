import { Injectable } from '@nestjs/common';

import { NotificationKind } from '../../generated/prisma/client';
import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationSettingsDto } from './notification-settings.dto';

const NOTIFICATION_SELECT = {
  id: true,
  kind: true,
  readAt: true,
  createdAt: true,
  actor: { select: { id: true, nickName: true, firstName: true, photo: true } },
  road: { select: { id: true, title: true, isPublic: true, archivedAt: true } },
} as const;

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    nickName: string | null;
    firstName: string | null;
    photo: string | null;
  } | null;
  road: {
    id: string;
    title: string;
    isPublic: boolean;
    archivedAt: Date | null;
  } | null;
};

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async notifyMany(
    userIds: readonly string[],
    entry: { kind: NotificationKind; actorId: string; roadId: string },
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    const listening = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] }, notifyInApp: true },
      select: { id: true },
    });

    if (listening.length === 0) return 0;

    const { count } = await this.prisma.notification.createMany({
      data: listening.map((user) => ({ ...entry, userId: user.id })),
      skipDuplicates: true,
    });

    return count;
  }

  async list(userId: string, query: PaginationQueryDto) {
    const where = { userId };

    const [total, unread, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.offset,
        take: query.limit,
        select: NOTIFICATION_SELECT,
      }),
    ]);

    return ok({
      header: 'notification.header',
      message: rows.length ? 'notification.fetched' : 'notification.nothingNew',
      data: rows.map(shape),
      meta: { ...pageMeta(total, query), unread },
    });
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return ok({ header: 'notification.header', data: { unread } });
  }

  async markRead(userId: string, notificationId?: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(notificationId ? { id: notificationId } : {}),
      },
      data: { readAt: new Date() },
    });

    return ok({
      header: 'notification.header',
      message: count ? 'notification.markedRead' : 'notification.nothingUnread',
      data: { read: count },
    });
  }

  async clear(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return ok({
      header: 'notification.header',
      message: count ? 'notification.cleared' : 'notification.nothingToClear',
      data: { cleared: count },
    });
  }

  async settings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifyInApp: true, notifyByEmail: true },
    });

    return ok({
      header: 'notification.settingsHeader',
      data: {
        inApp: user?.notifyInApp ?? true,
        email: user?.notifyByEmail ?? true,
      },
    });
  }

  async updateSettings(userId: string, body: NotificationSettingsDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.inApp === undefined ? {} : { notifyInApp: body.inApp }),
        ...(body.email === undefined ? {} : { notifyByEmail: body.email }),
      },
      select: { notifyInApp: true, notifyByEmail: true },
    });

    return ok({
      header: 'notification.settingsHeader',
      message: 'notification.saved',
      data: { inApp: updated.notifyInApp, email: updated.notifyByEmail },
    });
  }
}

function shape(row: NotificationRow) {
  const isOpenable = !!row.road && row.road.isPublic && !row.road.archivedAt;

  return {
    id: row.id,
    kind: row.kind,
    isRead: row.readAt !== null,
    createdAt: row.createdAt,
    actor: row.actor
      ? {
          id: row.actor.id,
          displayName:
            row.actor.nickName ?? row.actor.firstName ?? 'A traveller',
          photo: row.actor.photo,
        }
      : null,
    road: row.road ? { id: row.road.id, title: row.road.title } : null,
    isOpenable,
  };
}
