import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationKind } from '../../generated/prisma/client';
import { EnvironmentVariables } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../inbox/notification.service';

/**
 * How many followers one publish will write to. A route going public is a
 * background courtesy, not a mailing campaign; past this the rest are left
 * to find it in search, and the cap is logged so it is visible if it is ever
 * reached in practice.
 */
const MAX_RECIPIENTS = 200;

/** Keeps a title safe to drop into the HTML body of an email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tells an author's followers that they have published something.
 *
 * Every method here is best-effort and swallows its own failures: a mail server
 * that is down must not turn "your route is now public" into an error on the
 * owner's screen, and the route is already saved by the time this runs. What
 * goes wrong is logged, not raised.
 */
@Injectable()
export class RoutePublishNotifier {
  private readonly logger = new Logger(RoutePublishNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly inbox: NotificationService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Fire-and-forget: returns immediately and lets the sending finish on its
   * own. The caller is a request handler, and nobody publishing a route should
   * wait on somebody else's SMTP server.
   */
  notifyInBackground(roadId: string): void {
    void this.notifyFollowers(roadId).catch((error) => {
      this.logger.error(`Publish notification failed for ${roadId}`, error);
    });
  }

  async notifyFollowers(roadId: string): Promise<number> {
    const road = await this.prisma.road.findFirst({
      where: { id: roadId, isPublic: true, archivedAt: null },
      select: {
        id: true,
        title: true,
        userId: true,
        user: { select: { nickName: true, firstName: true } },
      },
    });

    // Not an error: the road may have been unpublished again, or deleted,
    // between the write and this running.
    if (!road) return 0;

    const follows = await this.prisma.authorFollow.findMany({
      where: { authorId: road.userId },
      select: {
        follower: {
          select: { id: true, email: true, notifyByEmail: true },
        },
      },
      take: MAX_RECIPIENTS + 1,
      orderBy: { createdAt: 'asc' },
    });

    if (follows.length > MAX_RECIPIENTS) {
      this.logger.warn(
        `Author ${road.userId} has more followers than one publish notifies (${MAX_RECIPIENTS})`,
      );
    }

    const followers = follows.slice(0, MAX_RECIPIENTS).map((f) => f.follower);

    // The inbox first, and on its own transaction: it is the notification
    // people actually see, it costs one statement, and it must not be lost
    // because a mail server was slow. Its own preference is applied inside.
    await this.inbox.notifyMany(
      followers.map((follower) => follower.id),
      {
        kind: NotificationKind.ROUTE_PUBLISHED,
        actorId: road.userId,
        roadId: road.id,
      },
    );

    // Email is the second copy, and the one people switch off first.
    const recipients = followers
      .filter((follower) => follower.notifyByEmail)
      .map((follower) => follower.email)
      .filter((email): email is string => !!email);

    if (recipients.length === 0) return 0;

    const author = road.user.nickName ?? road.user.firstName ?? 'A traveller';
    const link = this.linkTo(road.id);

    const results = await Promise.allSettled(
      recipients.map((to) => this.send(to, author, road.title, link)),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    if (sent < recipients.length) {
      this.logger.warn(
        `Publish notification for ${road.id}: ${sent}/${recipients.length} sent`,
      );
    }

    return sent;
  }

  /**
   * Where to send someone to read the route.
   *
   * The path matches the app's own deep link for a published route — see
   * ROUTE_PATH in `mobile-react-native/src/constants/shareLinks.ts`, which is
   * what registers it. It carries the route's id rather than a share token,
   * because by the time this email goes out the route is public and there is
   * nothing left for a token to grant.
   */
  private linkTo(roadId: string): string | null {
    const base =
      this.config.get('SHARE_LINK_BASE_URL', { infer: true }) ??
      this.config.get('FRONTEND_URL', { infer: true });

    return base ? `${base.replace(/\/+$/, '')}/route/${roadId}` : null;
  }

  private async send(
    to: string,
    author: string,
    title: string,
    link: string | null,
  ): Promise<void> {
    const safeAuthor = escapeHtml(author);
    const safeTitle = escapeHtml(title);

    const tail = link
      ? `<p><a href="${escapeHtml(link)}">Open the route</a></p>`
      : '';

    await this.email.sendEmail({
      to,
      subject: `${author} published a new route`,
      text: link
        ? `${author} has just published "${title}". Open it here: ${link}`
        : `${author} has just published "${title}". Open Route Planner to see it.`,
      html:
        `<p><strong>${safeAuthor}</strong> has just published ` +
        `<strong>${safeTitle}</strong>.</p>${tail}` +
        '<p>You are getting this because you asked to hear about their routes. ' +
        'Turn it off from their profile in the app.</p>',
    });
  }
}
