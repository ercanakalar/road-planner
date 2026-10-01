import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ok } from 'src/common/http/api-response';
import { EnvironmentVariables } from 'src/config/env.validation';
import {
  ConsentAction,
  DeletionReason,
  Prisma,
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { removeAvatar } from 'src/user/avatar.storage';
import { GrantConsentDto, WithdrawConsentDto } from './dto/consent.dto';
import { hashEmail } from './subject-hash';

const WITHDRAWN_RESPONSE = ok({
  header: 'consent.withdrawnHeader',
  message: 'consent.withdrawnMessage',
  data: { deleted: true },
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  private get uploadDir(): string {
    return this.config.get('UPLOAD_DIR', { infer: true });
  }

  private get hashKey(): string {
    return (
      this.config.get('AUDIT_HASH_KEY', { infer: true }) ??
      this.config.get('ACCESS_KEY', { infer: true })
    );
  }

  // Links the consent given on the phone to the account it is now signed in
  // to. The app sends it after every sign-in, so it is idempotent: a grant of
  // the notice version already on record is not written twice.
  async grant(
    userId: string,
    { noticeVersion, language, acceptedAt }: GrantConsentDto,
    now: Date = new Date(),
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('error.userNotFound');
    }

    const latest = await this.prisma.consentRecord.findFirst({
      where: { subjectId: userId },
      orderBy: { createdAt: 'desc' },
      select: { action: true, noticeVersion: true },
    });

    if (
      latest?.action === ConsentAction.GRANTED &&
      latest.noticeVersion === noticeVersion
    ) {
      return ok({ data: { recorded: false } });
    }

    // A phone's clock can run ahead; the record never claims a consent that
    // was given later than the moment the server heard about it.
    const given = new Date(acceptedAt);
    const occurredAt = given.getTime() > now.getTime() ? now : given;

    await this.prisma.consentRecord.create({
      data: {
        subjectId: userId,
        action: ConsentAction.GRANTED,
        noticeVersion,
        language,
        occurredAt,
      },
    });

    return ok({ data: { recorded: true } });
  }

  // Withdrawing consent erases the account and everything attached to it, in
  // one transaction with the two records that must outlive it: the withdrawal
  // itself and a log of what was deleted (Deletion Regulation, art. 7/3).
  //
  // Usage statistics are not deleted but anonymised — the foreign key sets
  // their user to NULL — so the person disappears from them while the counts
  // stay true.
  async withdraw(
    userId: string,
    { noticeVersion, language }: WithdrawConsentDto,
  ) {
    let photo: string | null;

    try {
      photo = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            photo: true,
            createdAt: true,
            _count: {
              select: {
                roads: true,
                favoriteRoads: true,
                favoriteStops: true,
                following: true,
                followers: true,
                sessions: true,
                notifications: true,
                usageEvents: true,
              },
            },
          },
        });

        if (!user) {
          throw new NotFoundException('error.userNotFound');
        }

        const stops = await tx.stop.count({ where: { road: { userId } } });

        await tx.consentRecord.create({
          data: {
            subjectId: userId,
            action: ConsentAction.WITHDRAWN,
            noticeVersion,
            language,
            occurredAt: new Date(),
          },
        });

        const counts = user._count;

        await tx.accountDeletion.create({
          data: {
            subjectId: userId,
            emailHash: hashEmail(user.email, this.hashKey),
            reason: DeletionReason.CONSENT_WITHDRAWN,
            noticeVersion,
            accountCreatedAt: user.createdAt,
            erased: {
              routes: counts.roads,
              stops,
              favoriteRoutes: counts.favoriteRoads,
              favoriteStops: counts.favoriteStops,
              follows: counts.following + counts.followers,
              sessions: counts.sessions,
              notifications: counts.notifications,
              usageEventsAnonymised: counts.usageEvents,
            },
          },
        });

        await tx.user.delete({ where: { id: userId } });

        return user.photo;
      });
    } catch (error) {
      // A withdrawal the client retried — because the first answer never
      // reached it, or because it was sent twice — finds the work done. That
      // is a success, not an error.
      if (
        (error instanceof NotFoundException || isUniqueViolation(error)) &&
        (await this.alreadyDeleted(userId))
      ) {
        return WITHDRAWN_RESPONSE;
      }
      throw error;
    }

    await removeAvatar(this.uploadDir, photo);

    this.logger.log(`Account ${userId} deleted after consent was withdrawn`);

    return WITHDRAWN_RESPONSE;
  }

  private async alreadyDeleted(userId: string): Promise<boolean> {
    const record = await this.prisma.accountDeletion.findUnique({
      where: { subjectId: userId },
      select: { id: true },
    });

    return record !== null;
  }
}
