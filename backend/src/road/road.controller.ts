import {
  Body,
  Controller,
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
import { CreateRoad, UpdateRoad } from './type/road.type';
import { RoadOwnerGuard } from 'src/common/guards/road-owner/road-owner.guard';

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
}
