import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UserService } from './user.service';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { GivePermit } from './type/user.type';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AdminGuard)
  @Post('permit')
  @HttpCode(HttpStatus.OK)
  async signUp(@Body() givePermit: GivePermit) {
    return this.userService.givePermit(givePermit);
  }
}
