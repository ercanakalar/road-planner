import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { AccessGuard } from './common/guards/access/access.guard';
import { ConfigModule } from './config/config.module';
import { throttlerOptions } from './config/throttle';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoadModule } from './road/road.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot(throttlerOptions),
    PrismaModule,
    HealthModule,
    NotificationModule,
    AuthModule,
    UserModule,
    RoadModule,
    PermissionsModule,
    FavoritesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
