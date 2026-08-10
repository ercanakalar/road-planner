import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RoadService } from './services/road/road.service';
import { RoadController } from './road.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessStrategy } from 'src/auth/strategy/access.strategy';
import { HelperService } from './services/helper/helper.service';
import { RoadSharingService } from './services/sharing/road-sharing.service';
import { RoadVisibility } from './services/visibility/road-visibility';
import { WaypointService } from './services/waypoint/waypoint.service';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [RoadController],
  providers: [
    RoadService,
    WaypointService,
    RoadSharingService,
    RoadVisibility,
    AccessStrategy,
    HelperService,
  ],
})
export class RoadModule {}
