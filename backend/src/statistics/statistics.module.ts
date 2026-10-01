import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from 'src/prisma/prisma.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { UsageInterceptor } from './usage.interceptor';
import { UsageRecorder } from './usage.recorder';
import { ViewerResolver } from './viewer.resolver';

// Global so any feature module can count a use with UsageRecorder without
// importing this one; most never need to, because @TrackUsage on the
// endpoint is read by the interceptor registered here for the whole app.
@Global()
@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    UsageRecorder,
    ViewerResolver,
    { provide: APP_INTERCEPTOR, useClass: UsageInterceptor },
  ],
  exports: [UsageRecorder],
})
export class StatisticsModule {}
