import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  RefreshData,
  ResetPassword,
  SignInData,
  SignUpData,
} from './type/auth.types';
import { Public } from 'src/common/decorators';
import { UserExistsGuard } from 'src/common/guards/user-exists/user-exists.guard';
import { RefreshGuard } from 'src/common/guards/refresh/refresh.guard';
import { PermissionsGuard } from 'src/common/guards/permissions/permissions.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { GoogleService } from './service/google/google.service';
import { AuthService } from './service/auth/auth.service';
import { AccessGuard } from 'src/common/guards/access/access.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private googleService: GoogleService,
  ) {}

  @Public()
  @Post('sign-up')
  @UseGuards(UserExistsGuard)
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpData: SignUpData) {
    return this.authService.signUp(signUpData);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.CREATED)
  async signIn(@Body() signInData: SignInData) {
    return this.authService.signIn(signInData);
  }

  @UseGuards(AccessGuard)
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Req() req: Request) {
    if (!req.user || typeof (req.user as any).userId === 'undefined') {
      throw new Error('User not authenticated');
    }
    const userId = (req.user as { userId: string }).userId;
    return this.authService.signOut(userId);
  }

  @UseGuards(RefreshGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshBody: RefreshData) {
    return this.authService.refreshToken(refreshBody.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Patch('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPassword: ResetPassword,
    @Param('token') token: string,
  ) {
    return this.authService.resetPassword(resetPassword, token);
  }

  @Public()
  @Get('google')
  @HttpCode(HttpStatus.OK)
  async redirectToGoogle(@Res() res: Response) {
    const url = await this.googleService.getAuthClientUrl();
    res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(@Query('code') code: string) {
    const { email, accessToken, refreshToken } =
      await this.googleService.getAuthClientData(code);

    await this.authService.signInWithGoogle(email, accessToken, refreshToken);

    return {
      email,
      accessToken,
      refreshToken,
    };
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('ACCESS_DASHBOARD')
  @Get('dashboard')
  getDashboard() {
    return { message: 'Welcome to the admin dashboard' };
  }
}
