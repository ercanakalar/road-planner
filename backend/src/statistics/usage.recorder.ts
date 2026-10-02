import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import {
  USAGE_RETENTION_DAYS,
  UsageEventName,
  usageDetail,
} from './usage-events';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface UsageContext {
  userId?: string | null;
  detail?: string | null;
}

export interface ReportedUsage {
  name: UsageEventName;
  detail?: string | null;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Injectable()
export class UsageRecorder {
  private readonly logger = new Logger(UsageRecorder.name);

  constructor(private readonly prisma: PrismaService) {}

  // Fire and forget: counting a feature must never slow down or fail the
  // request that used it.
  record(event: UsageEventName, { userId, detail }: UsageContext = {}): void {
    void this.prisma.usageEvent
      .create({
        data: { event, userId: userId ?? null, detail: usageDetail(detail) },
      })
      .catch((error: unknown) =>
        this.logger.warn(`Could not record ${event}: ${messageOf(error)}`),
      );
  }

  async recordMany(
    events: readonly ReportedUsage[],
    userId: string | null,
  ): Promise<number> {
    if (events.length === 0) return 0;

    const { count } = await this.prisma.usageEvent.createMany({
      data: events.map(({ name, detail }) => ({
        event: name,
        userId,
        detail: usageDetail(detail),
      })),
    });

    return count;
  }

  async prune(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - USAGE_RETENTION_DAYS * DAY_MS);

    const { count } = await this.prisma.usageEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return count;
  }
}
