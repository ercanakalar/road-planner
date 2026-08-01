import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

import { FavoritesService } from './favorites.service';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteWaypointDto,
} from './dto/favorites.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Post('toggle-waypoint')
  @HttpCode(HttpStatus.OK)
  async addFavoriteWaypoint(
    @Body() body: ToggleFavoriteWaypointDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.toggleFavoriteWaypoint(body, userId);
  }

  @Post('toggle-road')
  @HttpCode(HttpStatus.OK)
  async addFavoriteRoad(
    @Body() body: ToggleFavoriteRoadDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.toggleFavoriteRoad(body, userId);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllFavorites(
    @GetUser('userId') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.favoritesService.getAllFavorites(userId, pagination);
  }
}
