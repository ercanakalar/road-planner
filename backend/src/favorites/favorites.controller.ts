import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

import { FavoritesService } from './favorites.service';
import {
  ToggleFavoriteRoadDto,
  ToggleFavoriteWaypointDto,
  UpdateFavoriteAnnotationDto,
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

  @Patch('road/:favoriteId')
  @HttpCode(HttpStatus.OK)
  async updateFavoriteRoad(
    @Param('favoriteId', ParseUUIDPipe) favoriteId: string,
    @Body() body: UpdateFavoriteAnnotationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.updateFavoriteRoadAnnotation(
      favoriteId,
      userId,
      body,
    );
  }

  @Patch('waypoint/:favoriteId')
  @HttpCode(HttpStatus.OK)
  async updateFavoriteWaypoint(
    @Param('favoriteId', ParseUUIDPipe) favoriteId: string,
    @Body() body: UpdateFavoriteAnnotationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.updateFavoriteWaypointAnnotation(
      favoriteId,
      userId,
      body,
    );
  }
}
