import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Public } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';
import { MAPS_THROTTLE } from 'src/config/throttle';
import { DurationsQueryDto, RouteQueryDto } from 'src/maps/dto/maps.dto';
import { TRANSPORT_MODES } from 'src/maps/types/maps.types';
import {
  AddStopDto,
  CreateRoadDto,
  ReorderStopsDto,
  TerrainStopsDto,
  UpdateRoadDto,
  UpdateStopDto,
} from './dto/road.dto';
import { RoadSearchQueryDto } from './dto/road-search.dto';
import { RoadService } from './services/road/road.service';
import { RoadSearchService } from './services/search/road-search.service';
import { RoadRouteService } from './services/route/road-route.service';
import { RoadTerrainService } from './services/route/road-terrain.service';
import { RoadSharingService } from './services/sharing/road-sharing.service';
import { StopService } from './services/stop/stop.service';

@Controller('road')
export class RoadController {
  constructor(
    private roadService: RoadService,
    private stopService: StopService,
    private sharingService: RoadSharingService,
    private routeService: RoadRouteService,
    private terrainService: RoadTerrainService,
    private searchService: RoadSearchService,
  ) {}

  @Post('/create')
  @HttpCode(HttpStatus.OK)
  async createRoad(
    @Body() body: CreateRoadDto,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.createRoad(body, userId);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async searchRoads(
    @GetUser() user: { userId?: string } | undefined,
    @Query() query: RoadSearchQueryDto,
  ) {
    return this.searchService.searchRoads(query, user?.userId ?? null);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Get('/discover')
  @HttpCode(HttpStatus.OK)
  async getDiscoverRoads(
    @GetUser() user: { userId?: string } | undefined,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.roadService.getDiscoverRoads(
      user?.userId ?? null,
      pagination.limit,
    );
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getRoadById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { userId?: string } | undefined,
  ) {
    return this.roadService.getRoadById(id, user?.userId ?? null);
  }

  @Get('/stop/:id')
  @HttpCode(HttpStatus.OK)
  async getStopById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.stopService.getStopById(id, userId);
  }

  /**
   * The same reading as `GET /:id/terrain`, for a route still being built.
   *
   * The map lets you drop stops before anything is saved, and that route has
   * no id to look up — so the points come in the body. Public for the same
   * reason the map is: a signed-out visitor can plan a route, and measuring
   * one reveals nothing about anybody's saved roads.
   */
  @Public()
  @Throttle(MAPS_THROTTLE.directions)
  @Post('/terrain')
  @HttpCode(HttpStatus.OK)
  async getTerrainForStops(@Body() body: TerrainStopsDto) {
    return this.terrainService.measureStops(body.stops, body.mode);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Throttle(MAPS_THROTTLE.directions)
  @Get('/:id/terrain')
  @HttpCode(HttpStatus.OK)
  async getRoadTerrain(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { userId?: string } | undefined,
    @Query() query: RouteQueryDto,
  ) {
    return this.terrainService.getTerrain(id, user?.userId ?? null, query.mode);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Throttle(MAPS_THROTTLE.directions)
  @Get('/:id/route')
  @HttpCode(HttpStatus.OK)
  async getRoadRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { userId?: string } | undefined,
    @Query() query: RouteQueryDto,
  ) {
    return this.routeService.getRoute(id, user?.userId ?? null, query.mode);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Throttle(MAPS_THROTTLE.directions)
  @Get('/:id/durations')
  @HttpCode(HttpStatus.OK)
  async getRoadDurations(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { userId?: string } | undefined,
    @Query() query: DurationsQueryDto,
  ) {
    return this.routeService.getDurations(
      id,
      user?.userId ?? null,
      query.modes ?? TRANSPORT_MODES,
    );
  }

  @Post('/own-roads')
  @HttpCode(HttpStatus.OK)
  async getOwnRoads(
    @GetUser('userId') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.roadService.getOwnRoads(userId, pagination);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Post('/share/:token')
  @HttpCode(HttpStatus.OK)
  async routeToSharedRoad(
    @Param('token') token: string,
    @GetUser() user: { userId?: string } | undefined,
  ) {
    return this.sharingService.resolveLink(token, user?.userId ?? null);
  }

  @UseGuards(RoadOwnerGuard)
  @Get('/share/:id')
  @HttpCode(HttpStatus.OK)
  async shareRoadByIdWithToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.sharingService.createLink(id);
  }

  @Post('/clone/:id')
  @HttpCode(HttpStatus.OK)
  async cloneRoad(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.cloneRoad(id, userId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update/:id')
  @HttpCode(HttpStatus.OK)
  async updateRoadById(
    @Body() body: UpdateRoadDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roadService.updateRoadById(id, body);
  }

  @UseGuards(RoadOwnerGuard)
  @Post('/delete/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRoadById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.deleteRoadById(id, userId);
  }

  @UseGuards(RoadOwnerGuard)
  @Post('/add-stop/:id')
  @HttpCode(HttpStatus.OK)
  async addStopToRoad(
    @Body() body: AddStopDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stopService.addStopToRoad(body, id);
  }

  @UseGuards(RoadOwnerGuard)
  @Delete('/delete-stop/:stopId')
  @HttpCode(HttpStatus.OK)
  async deleteStopWithRoadId(@Param('stopId', ParseUUIDPipe) stopId: string) {
    return this.stopService.deleteStopById(stopId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update-stop/:stopId')
  @HttpCode(HttpStatus.OK)
  async updateStopWithRoadId(
    @Body() body: UpdateStopDto,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.stopService.updateStopWithRoadId(body, stopId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/reorder-stop/:roadId')
  @HttpCode(HttpStatus.OK)
  async reOrderStops(
    @Body() body: ReorderStopsDto,
    @Param('roadId', ParseUUIDPipe) roadId: string,
  ) {
    return this.stopService.reorderStops(roadId, body);
  }
}
