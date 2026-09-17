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
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

import { Public } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { OptionalAccessGuard } from 'src/common/guards/optional-access/optional-access.guard';
import { FollowAuthorDto } from './dto/follow-author.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchQueryDto } from './dto/user-search.dto';
import { FollowService } from './follow.service';
import { UserService } from './user.service';
import { AVATAR_UPLOAD_CEILING_BYTES } from './avatar.storage';
import { translatePhrase } from 'src/common/interceptors/response-envelope.interceptor';
import { resolveAcceptLanguage } from 'src/i18n/languages';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly followService: FollowService,
    private readonly i18n: I18nService,
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
    @Req() request: Request,
    @Res() res: Response,
  ): Promise<void> {
    const path = this.userService.resolveAvatarPath(filename);
    if (!path) throw new NotFoundException('user.photoNotFound');

    res.sendFile(path, (error) => {
      if (error && !res.headersSent) {
        // Written straight to the socket, so this is past the interceptor that
        // would otherwise turn the key into words.
        res.status(HttpStatus.NOT_FOUND).json({
          message: translatePhrase(
            'user.photoNotFound',
            resolveAcceptLanguage(request.headers['accept-language']),
            this.i18n,
          ),
        });
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
