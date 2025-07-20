import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RoadService } from './services/road/road.service';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import {
  AddWaypointToRoad,
  CreateRoad,
  DeleteWaypointWithRoadId,
  UpdateRoad,
  UpdateWaypointWithRoadId,
} from './type/road.type';
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';
import { Public } from 'src/common/decorators';

@Controller('api/road')
export class RoadController {
  constructor(private roadService: RoadService) {}

  @Post('/create')
  @HttpCode(HttpStatus.OK)
  async createRoad(
    @Body() body: CreateRoad,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.createRoad(body, userId);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getRoadById(@Param('id') id: string) {
    return this.roadService.getRoadById(id);
  }

  @Post('/own-roads')
  @HttpCode(HttpStatus.OK)
  async getOwnRoads(@GetUser('userId') userId: string) {
    return this.roadService.getOwnRoads(userId);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update/:id')
  @HttpCode(HttpStatus.OK)
  async updateRoadById(@Body() body: UpdateRoad, @Param('id') id: string) {
    return this.roadService.updateRoadById(id, body);
  }

  @UseGuards(RoadOwnerGuard)
  @Post('/delete/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRoadById(
    @Param('id') id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.roadService.deleteRoadById(id, userId);
  }

  @UseGuards(RoadOwnerGuard)
  @Get('/share/:id')
  @HttpCode(HttpStatus.OK)
  async shareRoadByIdWithToken(@Param('id') id: string) {
    return this.roadService.shareRoadByIdWithToken(id);
  }

  @Public()
  @Post('/share/:token')
  @HttpCode(HttpStatus.OK)
  async routeToSharedRoad(@Param('token') token: string) {
    return this.roadService.routeToSharedRoad(token);
  }

  @UseGuards(RoadOwnerGuard)
  @Post('/add-waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async addWaypointToRoad(
    @Body() body: AddWaypointToRoad,
    @Param('id') id: string,
  ) {
    return this.roadService.addWaypointToRoad(body, id);
  }

  @UseGuards(RoadOwnerGuard)
  @Delete('/delete-waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async deleteWaypointWithRoadId(
    @Body() body: DeleteWaypointWithRoadId,
    @Param('id') id: string,
  ) {
    return this.roadService.deleteWaypointWithRoadId(body, id);
  }

  @UseGuards(RoadOwnerGuard)
  @Put('/update-waypoint/:id')
  @HttpCode(HttpStatus.OK)
  async updateWaypointWithRoadId(@Body() body: UpdateWaypointWithRoadId) {
    return this.roadService.updateWaypointWithRoadId(body);
  }
}
