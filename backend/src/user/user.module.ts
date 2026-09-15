import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessStrategy } from 'src/auth/strategy/access.strategy';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { FollowService } from './follow.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [UserController],
  providers: [UserService, FollowService, AccessStrategy, AdminGuard],
})
export class UserModule {}
