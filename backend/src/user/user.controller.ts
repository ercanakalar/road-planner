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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { Public } from 'src/common/decorators';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchQueryDto } from './dto/user-search.dto';
import { UserService } from './user.service';
import { AVATAR_MAX_BYTES } from './avatar.storage';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
    FileInterceptor('photo', { limits: { fileSize: AVATAR_MAX_BYTES } }),
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
  @Public()
  @Get('/search')
  @HttpCode(HttpStatus.OK)
  async searchAuthors(@Query() query: UserSearchQueryDto) {
    return this.userService.searchAuthors(query);
  }

  @Public()
  @Get('/author/:id')
  @HttpCode(HttpStatus.OK)
  async getAuthorById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getAuthorById(id);
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
