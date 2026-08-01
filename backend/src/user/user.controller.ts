import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { GetUser } from 'src/common/decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

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

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('userId') userId: string,
  ) {
    return this.userService.getUserById(id, userId);
  }
}
