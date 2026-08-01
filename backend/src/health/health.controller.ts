import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from 'src/common/decorators';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<HealthReport> {
    const report = await this.health.check();

    if (report.status === 'down') {
      throw new ServiceUnavailableException(report);
    }

    return report;
  }
}
