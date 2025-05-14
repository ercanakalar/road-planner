import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { RoadService } from './services/road/road.service';
import { RoadController } from './road.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), JwtModule.register({})],
  controllers: [RoadController],
  providers: [RoadService],
})
export class RoadModule {}
