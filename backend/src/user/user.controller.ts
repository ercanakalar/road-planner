import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UpdateUser } from './type/user.type';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/update')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Body() body: UpdateUser,
    @GetUser('userId') userId: string,
  ) {
    return this.userService.updateUser(body, userId);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
