import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';

import { AuthModule } from './auth/auth.module';
import { AccessGuard } from './common/guards/access/access.guard';
import { ConfigModule } from './config/config.module';
import { throttlerOptions } from './config/throttle';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { FALLBACK_LANGUAGE } from './i18n/languages';
import { MemoryLoader } from './i18n/memory.loader';
import { interpolate } from './i18n/interpolate';
import { MapsModule } from './maps/maps.module';
import { NotificationModule } from './notification/notification.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoadModule } from './road/road.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule,
    I18nModule.forRoot({
      fallbackLanguage: FALLBACK_LANGUAGE,
      // The strings live in TypeScript, so nothing has to be copied into
      // `dist` for the container to be able to speak.
      loader: MemoryLoader,
      loaderOptions: {},
      formatter: interpolate,
      resolvers: [AcceptLanguageResolver],
    }),
    ThrottlerModule.forRoot(throttlerOptions),
    PrismaModule,
    HealthModule,
    NotificationModule,
    AuthModule,
    UserModule,
    MapsModule,
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
