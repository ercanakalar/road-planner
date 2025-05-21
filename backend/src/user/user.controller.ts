import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';

import { UserService } from './user.service';
import { AccessGuard } from 'src/common/guards/access/access.guard';
import { UpdateUser } from './type/user.type';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @UseGuards(AccessGuard)
  @Post('/update')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Body() body: UpdateUser) {
    return this.userService.updateUser(body);
  }

  @UseGuards(AccessGuard)
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
