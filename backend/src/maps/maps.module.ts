import { Module } from '@nestjs/common';

import { MapsController } from './maps.controller';
import { DirectionsService } from './services/directions.service';
import { GeocodingService } from './services/geocoding.service';
import { GoogleMapsClient } from './services/google-maps.client';
import { PlacesService } from './services/places.service';
import { RouteSearchService } from './services/route-search.service';

@Module({
  controllers: [MapsController],
  providers: [
    GoogleMapsClient,
    DirectionsService,
    GeocodingService,
    PlacesService,
    RouteSearchService,
  ],
  exports: [
    DirectionsService,
    GeocodingService,
    PlacesService,
    RouteSearchService,
  ],
})
export class MapsModule {}
