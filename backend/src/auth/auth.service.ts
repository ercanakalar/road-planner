import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HelperService } from './helper/helper.service';
import { SignUpData, SignInData, ResetPassword } from './type/auth.types';
import { EmailService } from 'src/notification/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private helperService: HelperService,
    private emailService: EmailService,
  ) {}
  async signUp(signUpData: SignUpData) {
    const { email, password, confirmPassword } = signUpData;
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await this.helperService.toHashPassword(password);
    const hashedConfirmPassword =
      await this.helperService.toHashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        manuelAuth: {
          create: {
            email,
            password: hashedPassword,
            confirmPassword: hashedConfirmPassword,
          },
        },
      },
    });

    if (!user) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const { accessToken, refreshToken } =
      await this.helperService.generateTokens({
        accessTokenData: { email, userId: user.id },
        refreshTokenData: { email, userId: user.id },
      });

    const tokens = await this.prisma.tokens.create({
      data: {
        accessToken,
        refreshToken,
        user: {
          connect: {
            email,
          },
        },
        manuelAuth: {
          connect: {
            email,
          },
        },
      },
    });

    if (!tokens) {
      throw new InternalServerErrorException('Failed to create user token');
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async signIn(signInData: SignInData) {
    const { email, password } = signInData;

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        manuelAuth: {
          select: {
            password: true,
            tokenId: true,
          },
        },
        email: true,
        id: true,
      },
    });

    if (!user || !user.manuelAuth || !user.manuelAuth.tokenId) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.helperService.comparePassword(
      user.manuelAuth.password,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = await this.prisma.tokens.findUnique({
      where: {
        id: user.manuelAuth.tokenId,
      },
      select: {
        id: true,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const { accessToken, refreshToken } =
      await this.helperService.generateTokens({
        accessTokenData: { email: user.email, userId: user.id },
        refreshTokenData: { email: user.email, userId: user.id },
      });

    await this.prisma.tokens.update({
      where: {
        id: token.id,
      },
      data: {
        accessToken,
        refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async signOut(refreshToken: string) {
    const decoded = await this.helperService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: decoded.email,
      },
      select: {
        manuelAuth: {
          select: {
            tokenId: true,
          },
        },
        email: true,
        id: true,
      },
    });

    if (!user?.manuelAuth?.tokenId) {
      throw new NotFoundException('Token not found');
    }

    await this.prisma.tokens.update({
      where: {
        id: user.manuelAuth.tokenId,
      },
      data: {
        accessToken: undefined,
        refreshToken: undefined,
      },
    });

    return {
      message: 'Successfully signed out',
    };
  }

  async refreshToken(refreshToken: string) {
    const decoded = await this.helperService.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: {
        email: decoded.email,
      },
      select: {
        manuelAuth: {
          select: {
            tokenId: true,
          },
        },
        email: true,
        id: true,
      },
    });

    if (!user?.manuelAuth?.tokenId) {
      throw new NotFoundException('Token not found');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.helperService.generateTokens({
        accessTokenData: { email: user.email, userId: user.id },
        refreshTokenData: { email: user.email, userId: user.id },
      });

    await this.prisma.tokens.update({
      where: {
        id: user.manuelAuth.tokenId,
      },
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        manuelAuth: {
          select: {
            tokenId: true,
            password: true,
          },
        },
        email: true,
        id: true,
      },
    });

    if (!user?.manuelAuth?.tokenId) {
      throw new NotFoundException('User not found');
    }

    const { passwordResetTokenExpiry, resetToken } =
      await this.helperService.createPasswordResetToken(email);

    await this.prisma.tokens.update({
      where: { id: user.manuelAuth.tokenId },
      data: {
        resetToken,
        passwordResetTokenExpiry,
      },
    });

    const resetTokenUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const emailData = {
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetTokenUrl}`,
      html: `<p>Click the link to reset your password: <a href="${resetTokenUrl}">${resetTokenUrl}</a></p>`,
    };
    const emailSent = await this.emailService.sendEmail(emailData);
    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send email');
    }

    return {
      message: 'Password reset token created successfully',
      token: resetToken,
    };
  }

  async resetPassword(resetPasswordData: ResetPassword, token: string) {
    const user = await this.prisma.tokens.findUnique({
      where: {
        resetToken: token,
        passwordResetTokenExpiry: {
          gte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const hashedPassword = await this.helperService.toHashPassword(
      resetPasswordData.password,
    );

    await this.prisma.tokens.update({
      where: { resetToken: token },
      data: {
        resetToken: null,
        passwordResetTokenExpiry: null,
        manuelAuth: {
          update: {
            password: hashedPassword,
          },
        },
      },
    });

    return { message: 'Password has been reset successfully' };
  }
}
