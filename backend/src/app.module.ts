import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './notification/notification.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './common/guards/access/access.guard';
import { UserModule } from './user/user.module';
import { RoadModule } from './road/road.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    AuthModule,
    UserModule,
    RoadModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
