import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { GivePermit, UpdatePermit } from './type/permissions.type';
import { PermissionsService } from './permissions.service';

@Controller('api/permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @UseGuards(AdminGuard)
  @Post('permit/assign')
  @HttpCode(HttpStatus.OK)
  async givePermit(@Body() givePermit: GivePermit) {
    return this.permissionsService.givePermit(givePermit);
  }

  @UseGuards(AdminGuard)
  @Get('permit/get-all')
  @HttpCode(HttpStatus.OK)
  async getPermits() {
    return this.permissionsService.getPermits();
  }

  @UseGuards(AdminGuard)
  @Get('permit/get-id/:permitId')
  @HttpCode(HttpStatus.OK)
  async getPermitById(@Param('permitId') permitId: string) {
    return this.permissionsService.getPermitById(permitId);
  }

  @UseGuards(AdminGuard)
  @Post('permit/update-id')
  @HttpCode(HttpStatus.OK)
  async updatePermitById(@Body() updatePermit: UpdatePermit) {
    return this.permissionsService.updatePermitById(updatePermit);
  }
}
