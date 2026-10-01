import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public, RequirePermission } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { ok } from 'src/common/http/api-response';
import { PermissionsGuard } from 'src/common/guards/permissions/permissions.guard';
import { STATISTICS_THROTTLE } from 'src/config/throttle';
import { OverviewQueryDto, ReportUsageDto } from './dto/statistics.dto';
import { OVERVIEW_PERMISSION, StatisticsService } from './statistics.service';
import { UsageRecorder } from './usage.recorder';
import { ViewerRequest, ViewerResolver } from './viewer.resolver';

@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statistics: StatisticsService,
    private readonly recorder: UsageRecorder,
    private readonly viewers: ViewerResolver,
  ) {}

  // Features that run entirely on the phone report themselves here. Open to
  // signed-out use, where the events are simply anonymous.
  @Public()
  @Throttle(STATISTICS_THROTTLE.report)
  @Post('/events')
  @HttpCode(HttpStatus.OK)
  async report(@Body() body: ReportUsageDto, @Req() request: ViewerRequest) {
    const recorded = await this.recorder.recordMany(
      body.events,
      await this.viewers.userIdOf(request),
    );

    return ok({ data: { recorded } });
  }

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  async mine(@GetUser('userId') userId: string) {
    return this.statistics.mine(userId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission(OVERVIEW_PERMISSION)
  @Get('/overview')
  @HttpCode(HttpStatus.OK)
  async overview(@Query() query: OverviewQueryDto) {
    return this.statistics.overview(query.days);
  }
}
