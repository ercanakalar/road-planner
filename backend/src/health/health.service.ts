import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

export type DependencyState = 'up' | 'down';

export interface HealthReport {
  status: DependencyState;
  uptime: number;
  database: DependencyState;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const database: DependencyState = (await this.isDatabaseReachable())
      ? 'up'
      : 'down';

    return {
      status: database,
      uptime: Math.round(process.uptime()),
      database,
    };
  }

  private async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
