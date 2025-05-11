import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RefreshRequest,
  ResetPassword,
  SignInData,
  SignUpData,
} from './type/auth.types';
import { Public } from 'src/common/decorators';
import { UserExistsGuard } from 'src/common/guards/user-exists/user-exists.guard';
import { RefreshGuard } from 'src/common/guards/refresh/refresh.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Public()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(@Body('refreshToken') refreshToken: string) {
    console.log(refreshToken);
    return this.authService.signOut(refreshToken);
  }

  @UseGuards(RefreshGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: RefreshRequest) {
    return this.authService.refreshToken(req.user.refreshToken);
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

  // @Public()
  // @Post('verify-email')
  // @HttpCode(HttpStatus.OK)
  // async verifyEmail(@Body('email') email: string) {
  //   return this.authService.verifyEmail(email);
  // }
  // @Public()
  // @Post('verify-email-token')
  // @HttpCode(HttpStatus.OK)
  // async verifyEmailToken(@Body('token') token: string) {
  //   return this.authService.verifyEmailToken(token);
  // }
  // @Public()
  // @Post('verify-email-otp')
  // @HttpCode(HttpStatus.OK)
  // async verifyEmailOtp(@Body('otp') otp: string) {
  //   return this.authService.verifyEmailOtp(otp);
  // }
  // @Public()
  // @Post('verify-email-otp-token')
  // @HttpCode(HttpStatus.OK)
  // async verifyEmailOtpToken(@Body('token') token: string) {
  //   return this.authService.verifyEmailOtpToken(token);
  // }
}
