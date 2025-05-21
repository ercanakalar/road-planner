import { Module } from '@nestjs/common';
import { HelperService } from './helper/helper.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from 'src/notification/email/email.service';
import { RefreshStrategy } from './strategy/refresh.strategy';
import { GoogleService } from './service/google/google.service';
import { AuthService } from './service/auth/auth.service';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    HelperService,
    EmailService,
    AuthService,
    RefreshStrategy,
    GoogleService,
  ],
})
export class AuthModule {}
