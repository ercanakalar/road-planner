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

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/update')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Body() body: UpdateUser) {
    return this.userService.updateUser(body);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
