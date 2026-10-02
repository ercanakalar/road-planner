import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsageRecorder } from 'src/statistics/usage.recorder';

const DAY_MS = 24 * 60 * 60 * 1000;

// The deletion log and the consent trail behind it are kept for the three
// years the Deletion Regulation asks for (art. 7/3), and no longer. The KVKK
// notice promises this number; change both together.
export const DELETION_LOG_RETENTION_YEARS = 3;

// A route its owner deleted stays recoverable by support for this long, then
// is erased with its stops and everything pointing at them.
export const DELETED_ROUTE_RETENTION_DAYS = 30;

// A session that was signed out is of no further use; one that was exchanged
// for a new one is kept until it expires, so a replay of it is recognised.
export const SIGNED_OUT_SESSION_RETENTION_DAYS = 1;

// A password reset that has run its course — used, superseded or expired —
// is kept a day for support, unless it is still holding a lockout.
export const PASSWORD_RESET_RETENTION_DAYS = 1;

export interface RetentionReport {
  usageEvents: number;
  sessions: number;
  passwordResets: number;
  deletedRoutes: number;
  deletionLogs: number;
  consentRecords: number;
}

const daysBefore = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * DAY_MS);

const yearsBefore = (now: Date, years: number): Date => {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return cutoff;
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Removes what the privacy notice says is not kept. Runs when an instance
// starts and daily after that; every step is idempotent, so instances running
// it side by side do no harm.
@Injectable()
export class RetentionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RetentionService.name);

  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageRecorder,
  ) {}

  onApplicationBootstrap(): void {
    void this.runQuietly();

    this.timer = setInterval(() => void this.runQuietly(), DAY_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  async run(now: Date = new Date()): Promise<RetentionReport> {
    const usageEvents = await this.usage.prune(now);
    const sessions = await this.pruneSessions(now);
    const passwordResets = await this.prunePasswordResets(now);
    const deletedRoutes = await this.purgeDeletedRoutes(now);
    const { deletionLogs, consentRecords } = await this.pruneDeletionLog(now);

    return {
      usageEvents,
      sessions,
      passwordResets,
      deletedRoutes,
      deletionLogs,
      consentRecords,
    };
  }

  private async pruneSessions(now: Date): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          {
            rotatedAt: null,
            revokedAt: {
              lt: daysBefore(now, SIGNED_OUT_SESSION_RETENTION_DAYS),
            },
          },
        ],
      },
    });

    return count;
  }

  private async prunePasswordResets(now: Date): Promise<number> {
    const { count } = await this.prisma.passwordReset.deleteMany({
      where: {
        expiresAt: { lt: daysBefore(now, PASSWORD_RESET_RETENTION_DAYS) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
    });

    return count;
  }

  private async purgeDeletedRoutes(now: Date): Promise<number> {
    const { count } = await this.prisma.road.deleteMany({
      where: {
        archivedAt: { lt: daysBefore(now, DELETED_ROUTE_RETENTION_DAYS) },
      },
    });

    return count;
  }

  private async pruneDeletionLog(
    now: Date,
  ): Promise<{ deletionLogs: number; consentRecords: number }> {
    const cutoff = yearsBefore(now, DELETION_LOG_RETENTION_YEARS);

    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.accountDeletion.findMany({
        where: { deletedAt: { lt: cutoff } },
        select: { subjectId: true },
      });

      if (expired.length === 0) return { deletionLogs: 0, consentRecords: 0 };

      const subjects = expired.map(({ subjectId }) => subjectId);

      const consent = await tx.consentRecord.deleteMany({
        where: { subjectId: { in: subjects } },
      });
      const deletions = await tx.accountDeletion.deleteMany({
        where: { subjectId: { in: subjects } },
      });

      return {
        deletionLogs: deletions.count,
        consentRecords: consent.count,
      };
    });
  }

  private async runQuietly(): Promise<void> {
    try {
      const report = await this.run();
      const removed = Object.entries(report).filter(([, count]) => count > 0);

      if (removed.length > 0) {
        this.logger.log(
          `Removed past retention: ${removed
            .map(([name, count]) => `${count} ${name}`)
            .join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Retention run failed: ${messageOf(error)}`);
    }
  }
}
