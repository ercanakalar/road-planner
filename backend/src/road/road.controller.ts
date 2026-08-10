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

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Public } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';
import {
  AddWaypointDto,
  CreateRoadDto,
  ReorderWaypointsDto,
  UpdateRoadDto,
  UpdateWaypointDto,
} from './dto/road.dto';
import { RoadService } from './services/road/road.service';
import { RoadSharingService } from './services/sharing/road-sharing.service';
import { WaypointService } from './services/waypoint/waypoint.service';

@Controller('road')
export class RoadController {
  constructor(
    private roadService: RoadService,
    private waypointService: WaypointService,
    private sharingService: RoadSharingService,
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

  @Get('/waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async getWaypointById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.waypointService.getWaypointById(id, userId);
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
  @Post('/add-waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async addWaypointToRoad(
    @Body() body: AddWaypointDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.waypointService.addWaypointToRoad(body, id);
  }

  @UseGuards(RoadOwnerGuard)
  @Delete('/delete-waypoint/:waypointId')
  @HttpCode(HttpStatus.OK)
  async deleteWaypointWithRoadId(
    @Param('waypointId', ParseUUIDPipe) waypointId: string,
  ) {
    return this.waypointService.deleteWaypointById(waypointId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update-waypoint/:waypointId')
  @HttpCode(HttpStatus.OK)
  async updateWaypointWithRoadId(
    @Body() body: UpdateWaypointDto,
    @Param('waypointId', ParseUUIDPipe) waypointId: string,
  ) {
    return this.waypointService.updateWaypointWithRoadId(body, waypointId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/reorder-waypoint/:roadId')
  @HttpCode(HttpStatus.OK)
  async reOrderWaypoints(
    @Body() body: ReorderWaypointsDto,
    @Param('roadId', ParseUUIDPipe) roadId: string,
  ) {
    return this.waypointService.reorderWaypoints(roadId, body);
  }
}
