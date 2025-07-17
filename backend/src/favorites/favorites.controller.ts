import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FavoritesService } from './favorites.service';
import { AccessGuard } from 'src/common/guards/access/access.guard';
import { AddFavoriteRoad, AddFavoriteWaypoint } from './type/favorites.type';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('api/favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @UseGuards(AccessGuard)
  @Post('add-waypoint')
  @HttpCode(HttpStatus.OK)
  async addFavoriteWaypoint(
    @Body() body: AddFavoriteWaypoint,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.addFavoriteWaypoint(body, userId);
  }

  @UseGuards(AccessGuard)
  @Post('add-road')
  @HttpCode(HttpStatus.OK)
  async addFavoriteRoad(
    @Body() body: AddFavoriteRoad,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.addFavoriteRoad(body, userId);
  }

  @UseGuards(AccessGuard)
  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllFavorites(@GetUser('userId') userId: string) {
    return this.favoritesService.getAllFavorites(userId);
  }
}
