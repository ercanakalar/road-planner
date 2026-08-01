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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { Public, RequirePermission } from 'src/common/decorators';
import { PermissionsGuard } from 'src/common/guards/permissions/permissions.guard';
import { UserExistsGuard } from 'src/common/guards/user-exists/user-exists.guard';
import { AUTH_THROTTLE } from 'src/config/throttle';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
} from './dto/auth.dto';
import { AuthService } from './service/auth/auth.service';
import { GoogleService } from './service/google/google.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private googleService: GoogleService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE.signUp)
  @Post('sign-up')
  @UseGuards(UserExistsGuard)
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpData: SignUpDto) {
    return this.authService.signUp(signUpData);
  }

  @Public()
  @Throttle(AUTH_THROTTLE.signIn)
  @Post('sign-in')
  @HttpCode(HttpStatus.CREATED)
  async signIn(@Body() signInData: SignInDto) {
    return this.authService.signIn(signInData);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Req() req: Request) {
    const userId = (req.user as { userId?: string } | undefined)?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.authService.signOut(userId);
  }

  @Public()
  @Throttle(AUTH_THROTTLE.refreshToken)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshBody: RefreshTokenDto) {
    return this.authService.refreshToken(refreshBody.refreshToken);
  }

  @Public()
  @Throttle(AUTH_THROTTLE.forgotPassword)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE.resetPassword)
  @Patch('reset-password/:token')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPassword: ResetPasswordDto,
    @Param('token') token: string,
  ) {
    return this.authService.resetPassword(resetPassword, token);
  }

  @Public()
  @Get('google')
  @HttpCode(HttpStatus.OK)
  async redirectToGoogle(@Res() res: Response) {
    const { url } = await this.googleService.getAuthClientUrl();
    res.redirect(url);
  }

  @Public()
  @Throttle(AUTH_THROTTLE.signIn)
  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    this.googleService.verifyState(state);

    const { email } = await this.googleService.getAuthClientData(code);

    return this.authService.signInWithGoogle(email);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermission('ACCESS_DASHBOARD')
  @Get('dashboard')
  getDashboard() {
    return { message: 'Welcome to the admin dashboard' };
  }
}
