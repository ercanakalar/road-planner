import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from './email/email.service';
import { NotificationController } from './inbox/notification.controller';
import { NotificationService } from './inbox/notification.service';
import { RoutePublishNotifier } from './publish/route-publish.notifier';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [EmailService, NotificationService, RoutePublishNotifier],
  exports: [EmailService, NotificationService, RoutePublishNotifier],
})
export class NotificationModule {}
