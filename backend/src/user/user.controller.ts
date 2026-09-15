import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { Public } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { FollowAuthorDto } from './dto/follow-author.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchQueryDto } from './dto/user-search.dto';
import { FollowService } from './follow.service';
import { UserService } from './user.service';
import { AVATAR_UPLOAD_CEILING_BYTES } from './avatar.storage';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly followService: FollowService,
  ) {}

  @Post('/update')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Body() body: UpdateUserDto,
    @GetUser('userId') userId: string,
  ) {
    return this.userService.updateUser(body, userId);
  }

  @Post('/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: AVATAR_UPLOAD_CEILING_BYTES, files: 1 },
    }),
  )
  async updatePhoto(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @GetUser('userId') userId: string,
  ) {
    return this.userService.updatePhoto(
      userId,
      file?.buffer ?? Buffer.alloc(0),
    );
  }

  @Public()
  @Get('/photo/:filename')
  async getPhoto(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const path = this.userService.resolveAvatarPath(filename);
    if (!path) throw new NotFoundException('Photo not found');

    res.sendFile(path, (error) => {
      if (error && !res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).json({ message: 'Photo not found' });
      }
    });
  }

  // Both of these are declared before '/:id', which would otherwise swallow
  // '/search' and fail its UUID pipe.
  //
  // Open to anonymous callers, and told who is asking when somebody is: the
  // rows are the same either way, but a signed-in caller also gets back whether
  // they already follow each person, so the button starts in the right state.
  @Public()
  @UseGuards(OptionalAccessGuard)
  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async searchAuthors(
    @Query() query: UserSearchQueryDto,
    @GetUser() user: { userId?: string } | undefined,
  ) {
    return this.userService.searchAuthors(query, user?.userId ?? null);
  }

  @Public()
  @UseGuards(OptionalAccessGuard)
  @Get('/author/:id')
  @HttpCode(HttpStatus.OK)
  async getAuthorById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { userId?: string } | undefined,
  ) {
    return this.userService.getAuthorById(id, user?.userId ?? null);
  }

  /** Ask to be emailed when this person publishes their next route. */
  @Post('/author/:id/follow')
  @HttpCode(HttpStatus.OK)
  async followAuthor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FollowAuthorDto,
    @GetUser('userId') userId: string,
  ) {
    return this.followService.setFollowing(id, userId, body.follow);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.userService.getUserById(id, userId);
  }
}
