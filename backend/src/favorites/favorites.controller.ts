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
  ToggleFavoriteStopDto,
  UpdateFavoriteAnnotationDto,
} from './dto/favorites.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Post('toggle-stop')
  @HttpCode(HttpStatus.OK)
  async addFavoriteStop(
    @Body() body: ToggleFavoriteStopDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.toggleFavoriteStop(body, userId);
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

  @Patch('stop/:favoriteId')
  @HttpCode(HttpStatus.OK)
  async updateFavoriteStop(
    @Param('favoriteId', ParseUUIDPipe) favoriteId: string,
    @Body() body: UpdateFavoriteAnnotationDto,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.updateFavoriteStopAnnotation(
      favoriteId,
      userId,
      body,
    );
  }
}
