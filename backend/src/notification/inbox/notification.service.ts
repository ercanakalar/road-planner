import { Injectable } from '@nestjs/common';

import { NotificationKind } from '../../generated/prisma/client';
import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationSettingsDto } from './notification-settings.dto';

/**
 * What a line in the inbox says about the route it points at. Enough to draw
 * the row and open it; the route itself is fetched when it is opened.
 */
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

/**
 * Somebody's inbox.
 *
 * Every method is scoped to one person by their own id rather than by anything
 * the request carries: a notification is the only record here that is written
 * by one person's action and owned by another's, so "whose is this" is the only
 * question that matters and it is never taken from the caller.
 */
@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Files one line for each person, skipping anyone who has turned the inbox
   * off.
   *
   * Duplicates are dropped rather than rejected: publishing a route, taking it
   * private and publishing it again is one piece of news, and the unique
   * constraint is what lets the publish path write without first asking what is
   * already there.
   */
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

  /** Just the number, for the badge that does not want the whole list. */
  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return ok({ header: 'notification.header', data: { unread } });
  }

  /**
   * Marks one line read, or the whole inbox when no line is named.
   *
   * `updateMany` rather than `update` so that a row belonging to somebody else
   * matches nothing instead of being found and refused — the id alone never
   * decides whose it is.
   */
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

/**
 * A row as the app reads it. The author's name is resolved the same way it is
 * everywhere else, and a route that has since been unpublished or archived is
 * marked rather than hidden — the line is still a true record of what happened,
 * but tapping it would go nowhere.
 */
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
