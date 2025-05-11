import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { AccessStrategy } from 'src/auth/strategy/access.strategy';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), JwtModule.register({})],
  controllers: [UserController],
  providers: [UserService, AccessStrategy, AdminGuard],
})
export class UserModule {}
