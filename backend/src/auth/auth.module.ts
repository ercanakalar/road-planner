import { Module } from '@nestjs/common';
import { HelperService } from './helper/helper.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from 'src/notification/email/email.service';
import { GoogleService } from './service/google/google.service';
import { AuthService } from './service/auth/auth.service';
import { AccessStrategy } from './strategy/access.strategy';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    HelperService,
    EmailService,
    AuthService,
    AccessStrategy,
    GoogleService,
  ],
})
export class AuthModule {}
