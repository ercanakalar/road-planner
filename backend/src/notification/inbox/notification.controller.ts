import {
  Body,
  Controller,
  Delete,
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
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { NotificationSettingsDto } from './notification-settings.dto';
import { NotificationService } from './notification.service';

/**
 * Everything here is about the caller's own inbox, and every method takes the
 * id from the token rather than the path. There is no route that reads
 * somebody else's.
 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @GetUser('userId') userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.notifications.list(userId, pagination);
  }

  // Before '/:id/read', which would otherwise take 'unread-count' as an id.
  @Get('/unread-count')
  @HttpCode(HttpStatus.OK)
  async unreadCount(@GetUser('userId') userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Get('/settings')
  @HttpCode(HttpStatus.OK)
  async settings(@GetUser('userId') userId: string) {
    return this.notifications.settings(userId);
  }

  @Patch('/settings')
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @GetUser('userId') userId: string,
    @Body() body: NotificationSettingsDto,
  ) {
    return this.notifications.updateSettings(userId, body);
  }

  /** Opening the screen marks the lot; opening one line marks that one. */
  @Post('/read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@GetUser('userId') userId: string) {
    return this.notifications.markRead(userId);
  }

  @Post('/:id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.notifications.markRead(userId, id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async clear(@GetUser('userId') userId: string) {
    return this.notifications.clear(userId);
  }
}
