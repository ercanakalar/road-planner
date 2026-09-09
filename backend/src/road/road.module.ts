import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RoadService } from './services/road/road.service';
import { RoadController } from './road.controller';
import { MapsModule } from 'src/maps/maps.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessStrategy } from 'src/auth/strategy/access.strategy';
import { HelperService } from './services/helper/helper.service';
import { RoadRouteService } from './services/route/road-route.service';
import { RoadTerrainService } from './services/route/road-terrain.service';
import { RoadSearchService } from './services/search/road-search.service';
import { RoadSharingService } from './services/sharing/road-sharing.service';
import { RoadVisibility } from './services/visibility/road-visibility';
import { StopService } from './services/stop/stop.service';

@Module({
  imports: [PrismaModule, MapsModule, JwtModule.register({})],
  controllers: [RoadController],
  providers: [
    RoadService,
    StopService,
    RoadSharingService,
    RoadRouteService,
    RoadTerrainService,
    RoadSearchService,
    RoadVisibility,
    AccessStrategy,
    HelperService,
  ],
})
export class RoadModule {}
