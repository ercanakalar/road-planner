import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SignUpData,
  SignInData,
  ResetPassword,
} from 'src/auth/type/auth.types';
import { EmailService } from 'src/notification/email/email.service';
import { HelperService } from 'src/auth/helper/helper.service';

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

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        manuelAuth: true,
      },
    });

    if (existingUser !== null && existingUser?.manuelAuth !== null) {
      throw new BadRequestException('User already exists');
    }

    const manuelAuth = await this.prisma.manuelAuth.create({
      data: {
        email,
        password: hashedPassword,
        confirmPassword: hashedConfirmPassword,
      },
    });

    if (!manuelAuth) {
      throw new InternalServerErrorException('Failed to create user');
    }
    const user = await this.prisma.user.upsert({
      where: {
        email,
      },
      update: {
        email,
        manuelAuth: {
          connect: {
            id: manuelAuth.id,
          },
        },
      },
      create: {
        email,
        manuelAuth: {
          connect: {
            id: manuelAuth.id,
          },
        },
      },
    });

    const { accessToken, refreshToken } =
      await this.helperService.generateTokens({
        accessTokenData: { email, userId: user.id },
        refreshTokenData: { email, userId: user.id },
      });

    const tokens = await this.prisma.tokens.upsert({
      where: {
        userId: user.id,
      },
      update: {
        accessToken,
        refreshToken,
        manuelAuth: {
          connect: {
            id: manuelAuth.id,
          },
        },
      },
      create: {
        userId: user.id,
        accessToken,
        refreshToken,
        manuelAuth: {
          connect: {
            id: manuelAuth.id,
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
        tokens: {
          select: {
            id: true,
            manuelAuth: {
              select: {
                password: true,
                tokenId: true,
              },
            },
          },
        },
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

    if (!user || !user.tokens?.id || !user.manuelAuth) {
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
        userId: user.id,
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
      userId: user.id,
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
        googleAuth: {
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
        id: user?.manuelAuth?.tokenId || '',
      },
      data: {
        accessToken: undefined,
        refreshToken: undefined,
      },
    });

    await this.prisma.tokens.update({
      where: {
        id: user?.googleAuth?.tokenId || '',
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

  async signInWithGoogle(
    email: string,
    accessToken: string,
    refreshToken: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        googleAuth: {
          include: {
            tokens: true,
          },
        },
      },
    });

    if (!existingUser) {
      const newUser = await this.prisma.user.create({
        data: {
          email,
        },
        include: {
          googleAuth: {
            include: {
              tokens: true,
            },
          },
        },
      });

      const newToken = await this.prisma.tokens.create({
        data: {
          userId: newUser.id,
          accessToken,
          refreshToken,
        },
      });

      await this.prisma.googleAuth.create({
        data: {
          email,
          userId: newUser.id,
          tokenId: newToken.id,
        },
      });

      return {
        message: 'New user created and signed in with Google',
        userId: newUser.id,
      };
    }

    const tokenId = existingUser.googleAuth?.tokens?.id;

    if (tokenId === undefined) {
      const newToken = await this.prisma.tokens.upsert({
        where: { userId: existingUser.id },
        update: {
          accessToken,
          refreshToken,
          updatedAt: new Date(),
        },
        create: {
          userId: existingUser.id,
          accessToken,
          refreshToken,
        },
      });

      await this.prisma.googleAuth.create({
        data: {
          tokenId: newToken.id,
          email,
          userId: existingUser.id,
        },
      });
    } else {
      await this.prisma.tokens.update({
        where: { userId: existingUser.id },
        data: {
          accessToken,
          refreshToken,
          updatedAt: new Date(),
        },
      });
    }

    return {
      message: 'User signed in with Google',
      userId: existingUser.id,
    };
  }
}
