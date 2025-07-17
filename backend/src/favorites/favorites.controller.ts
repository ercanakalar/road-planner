import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FavoritesService } from './favorites.service';
import { AccessGuard } from 'src/common/guards/access/access.guard';
import { AddFavoriteWaypoint } from './type/favorites.type';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('api/favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @UseGuards(AccessGuard)
  @Post('add')
  @HttpCode(HttpStatus.OK)
  async addFavoriteWaypoint(
    @Body() body: AddFavoriteWaypoint,
    @GetUser('userId') userId: string,
  ) {
    return this.favoritesService.addFavoriteWaypoint(body, userId);
  }
}
