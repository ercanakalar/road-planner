import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationModule } from './notification/notification.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './common/guards/access/access.guard';

@Module({
  imports: [PrismaModule, NotificationModule, AuthModule],
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
})
export class AppModule {}
