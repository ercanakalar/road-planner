import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { AssignPermitDto, UpdatePermitDto } from './dto/permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @UseGuards(AdminGuard)
  @Post('permit/assign')
  @HttpCode(HttpStatus.OK)
  async givePermit(@Body() givePermit: AssignPermitDto) {
    return this.permissionsService.givePermit(givePermit);
  }

  @UseGuards(AdminGuard)
  @Get('permit/get-all')
  @HttpCode(HttpStatus.OK)
  async getPermits(@Query() pagination: PaginationQueryDto) {
    return this.permissionsService.getPermits(pagination);
  }

  @UseGuards(AdminGuard)
  @Get('permit/get-id/:permitId')
  @HttpCode(HttpStatus.OK)
  async getPermitById(@Param('permitId', ParseUUIDPipe) permitId: string) {
    return this.permissionsService.getPermitById(permitId);
  }

  @UseGuards(AdminGuard)
  @Put('permit/:permitId')
  @HttpCode(HttpStatus.OK)
  async updatePermitById(
    @Param('permitId', ParseUUIDPipe) permitId: string,
    @Body() updatePermit: UpdatePermitDto,
  ) {
    return this.permissionsService.updatePermitById(permitId, updatePermit);
  }
}
