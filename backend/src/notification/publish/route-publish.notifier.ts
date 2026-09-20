import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import { NotificationKind } from '../../generated/prisma/client';
import { EnvironmentVariables } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../inbox/notification.service';
import {
  AppLanguage,
  FALLBACK_LANGUAGE,
  isAppLanguage,
} from 'src/i18n/languages';

const MAX_RECIPIENTS = 200;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class RoutePublishNotifier {
  private readonly logger = new Logger(RoutePublishNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly inbox: NotificationService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly i18n: I18nService,
  ) {}

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

    if (!road) return 0;

    const follows = await this.prisma.authorFollow.findMany({
      where: { authorId: road.userId },
      select: {
        follower: {
          select: {
            id: true,
            email: true,
            notifyByEmail: true,
            language: true,
          },
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

    await this.inbox.notifyMany(
      followers.map((follower) => follower.id),
      {
        kind: NotificationKind.ROUTE_PUBLISHED,
        actorId: road.userId,
        roadId: road.id,
      },
    );

    const recipients = followers
      .filter(
        (follower): follower is typeof follower & { email: string } =>
          follower.notifyByEmail && !!follower.email,
      )
      .map((follower) => ({
        to: follower.email,
        language: isAppLanguage(follower.language)
          ? follower.language
          : FALLBACK_LANGUAGE,
      }));

    if (recipients.length === 0) return 0;

    const author = road.user.nickName ?? road.user.firstName ?? 'A traveller';
    const link = this.linkTo(road.id);

    const results = await Promise.allSettled(
      recipients.map(({ to, language }) =>
        this.send(to, author, road.title, link, language),
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    if (sent < recipients.length) {
      this.logger.warn(
        `Publish notification for ${road.id}: ${sent}/${recipients.length} sent`,
      );
    }

    return sent;
  }

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
    language: AppLanguage,
  ): Promise<void> {
    const say = (key: string, args: Record<string, unknown> = {}) =>
      this.i18n.translate(key, { lang: language, args }) as string;

    const bold = (value: string) => `<strong>${escapeHtml(value)}</strong>`;

    const opened = link
      ? say('email.publishOpenHere', { link })
      : say('email.publishOpenApp');

    const tail = link
      ? `<p><a href="${escapeHtml(link)}">${escapeHtml(say('email.publishAction'))}</a></p>`
      : '';

    await this.email.sendEmail({
      to,
      subject: say('email.publishSubject', { author }),
      text: `${say('email.publishBody', { author, title })} ${opened}`,
      html:
        `<p>${say('email.publishBody', {
          author: bold(author),
          title: bold(title),
        })}</p>${tail}` + `<p>${escapeHtml(say('email.publishFooter'))}</p>`,
    });
  }
}
