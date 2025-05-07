import { Module } from '@nestjs/common';
import { HelperService } from './helper/helper.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), JwtModule.register({})],
  controllers: [AuthController],
  providers: [HelperService, AuthService],
})
export class AuthModule {}
