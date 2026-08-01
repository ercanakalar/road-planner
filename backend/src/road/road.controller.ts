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
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';
import {
  AddWaypointDto,
  CreateRoadDto,
  ReorderWaypointsDto,
  UpdateRoadDto,
  UpdateWaypointDto,
} from './dto/road.dto';
import { RoadService } from './services/road/road.service';

@Controller('road')
export class RoadController {
  constructor(private roadService: RoadService) {}

  @Post('/create')
  @HttpCode(HttpStatus.OK)
  async createRoad(
    @Body() body: CreateRoadDto,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.createRoad(body, userId);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getRoadById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.getRoadById(id, userId);
  }

  @Get('/waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async getWaypointById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.getWaypointById(id, userId);
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
  @Post('/share/:token')
  @HttpCode(HttpStatus.OK)
  async routeToSharedRoad(@Param('token') token: string) {
    return this.roadService.routeToSharedRoad(token);
  }

  @UseGuards(RoadOwnerGuard)
  @Get('/share/:id')
  @HttpCode(HttpStatus.OK)
  async shareRoadByIdWithToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.roadService.shareRoadByIdWithToken(id);
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
    return this.roadService.addWaypointToRoad(body, id);
  }

  @UseGuards(RoadOwnerGuard)
  @Delete('/delete-waypoint/:waypointId')
  @HttpCode(HttpStatus.OK)
  async deleteWaypointWithRoadId(
    @Param('waypointId', ParseUUIDPipe) waypointId: string,
  ) {
    return this.roadService.deleteWaypointById(waypointId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update-waypoint/:waypointId')
  @HttpCode(HttpStatus.OK)
  async updateWaypointWithRoadId(
    @Body() body: UpdateWaypointDto,
    @Param('waypointId', ParseUUIDPipe) waypointId: string,
  ) {
    return this.roadService.updateWaypointWithRoadId(body, waypointId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/reorder-waypoint/:roadId')
  @HttpCode(HttpStatus.OK)
  async reOrderWaypoints(
    @Body() body: ReorderWaypointsDto,
    @Param('roadId', ParseUUIDPipe) roadId: string,
  ) {
    return this.roadService.reorderWaypoints(roadId, body);
  }
}
