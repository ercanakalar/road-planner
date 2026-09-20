import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from 'src/common/decorators';
import { ok, Phrase, phrase } from 'src/common/http/api-response';
import { MAPS_THROTTLE } from 'src/config/throttle';
import {
  DirectionsDto,
  DurationsDto,
  PlaceDetailsQueryDto,
  PlaceSearchQueryDto,
  ReverseGeocodeQueryDto,
  ROUTE_SEARCH_LIMIT_DEFAULT,
  ROUTE_SEARCH_RADIUS_DEFAULT,
  ROUTE_SEARCH_SORT_DEFAULT,
  RouteSearchDto,
} from './dto/maps.dto';
import { DirectionsService } from './services/directions.service';
import { GeocodingService } from './services/geocoding.service';
import { PlacesService } from './services/places.service';
import { RouteSearchService } from './services/route-search.service';
import { RouteSearchResult, TRANSPORT_MODES } from './types/maps.types';

@Public()
@Controller('maps')
export class MapsController {
  constructor(
    private directions: DirectionsService,
    private geocoding: GeocodingService,
    private places: PlacesService,
    private routeSearch: RouteSearchService,
  ) {}

  @Throttle(MAPS_THROTTLE.directions)
  @Post('/directions')
  @HttpCode(HttpStatus.OK)
  async getDirections(@Body() body: DirectionsDto) {
    const route = await this.directions.route(body);

    return ok({
      header: 'route.header',
      message: route ? 'route.calculated' : 'route.none',
      data: route,
    });
  }

  @Throttle(MAPS_THROTTLE.directions)
  @Post('/durations')
  @HttpCode(HttpStatus.OK)
  async getDurations(@Body() body: DurationsDto) {
    const { modes, ...request } = body;

    const durations = await this.directions.durations(
      request,
      modes ?? TRANSPORT_MODES,
    );

    return ok({
      header: 'route.durationsHeader',
      message: 'route.durationsCalculated',
      data: durations,
    });
  }

  @Throttle(MAPS_THROTTLE.geocode)
  @Get('/geocode/reverse')
  @HttpCode(HttpStatus.OK)
  async reverseGeocode(@Query() query: ReverseGeocodeQueryDto) {
    return ok({
      header: 'maps.addressHeader',
      message: 'maps.addressMessage',
      data: await this.geocoding.reverseGeocode(query),
    });
  }

  @Throttle(MAPS_THROTTLE.geocode)
  @Get('/geocode/areas')
  @HttpCode(HttpStatus.OK)
  async areasAt(@Query() query: ReverseGeocodeQueryDto) {
    const areas = await this.geocoding.areasAt(query);

    return ok({
      header: 'maps.areasHeader',
      message: areas.length
        ? phrase('maps.areasFound', { count: areas.length })
        : 'maps.areasNone',
      data: areas,
    });
  }

  @Throttle(MAPS_THROTTLE.places)
  @Get('/places/search')
  @HttpCode(HttpStatus.OK)
  async searchPlaces(@Query() query: PlaceSearchQueryDto) {
    const predictions = await this.places.autocomplete(
      query.input,
      query.sessionToken,
    );

    return ok({
      header: 'maps.placesHeader',
      message: 'maps.placesMessage',
      data: predictions,
    });
  }

  @Throttle(MAPS_THROTTLE.places)
  @Get('/places/:placeId')
  @HttpCode(HttpStatus.OK)
  async getPlace(
    @Param('placeId') placeId: string,
    @Query() query: PlaceDetailsQueryDto,
  ) {
    const place = await this.places.placeDetails(placeId, query.sessionToken);

    return ok({
      header: 'maps.placeHeader',
      message: place ? 'maps.placeFound' : 'maps.placeNoLocation',
      data: place,
    });
  }

  @Throttle(MAPS_THROTTLE.routeSearch)
  @Post('/places/along-route')
  @HttpCode(HttpStatus.OK)
  async searchAlongRoute(@Body() body: RouteSearchDto) {
    const { query, radiusMeters, limit, sortBy, ...route } = body;

    const result = await this.routeSearch.search({
      ...route,
      ...(query ? { keyword: query } : {}),
      radiusMeters: radiusMeters ?? ROUTE_SEARCH_RADIUS_DEFAULT,
      limit: limit ?? ROUTE_SEARCH_LIMIT_DEFAULT,
      sortBy: sortBy ?? ROUTE_SEARCH_SORT_DEFAULT,
    });

    return ok({
      header: 'maps.alongHeader',
      message: this.describe(result),
      data: result,
    });
  }

  private describe(result: RouteSearchResult | null): Phrase {
    if (!result) return 'route.none';

    const { places, coversWholeRoute } = result;

    if (places.length === 0) return 'maps.alongNothing';

    return phrase(coversWholeRoute ? 'maps.alongFound' : 'maps.alongPartial', {
      count: places.length,
    });
  }
}
