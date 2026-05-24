import { ToastType } from './../../../common/type/status.type';
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
import { Permit, Permission } from '@prisma/client';

const USER_AUTH_SELECT = {
  id: true,
  email: true,
  permit: {
    include: { permissions: true },
  },
  manuelAuth: {
    select: { id: true, password: true, tokenId: true },
  },
  googleAuth: {
    select: { id: true, tokenId: true },
  },
  tokens: {
    select: { id: true },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
    private readonly emailService: EmailService,
  ) {}

  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_AUTH_SELECT,
    });
  }

  private async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_AUTH_SELECT,
    });
  }

  private async getDefaultPermit() {
    const permit = await this.prisma.permit.findUnique({
      where: { name: 'USER' },
    });

    if (!permit) {
      throw new InternalServerErrorException(
        'Default USER permit not found. Please seed the database.',
      );
    }

    return permit;
  }

  private buildTokenPayload(user: {
    email: string;
    id: string;
    permit?: (Permit & { permissions: Permission[] }) | null;
  }) {
    return {
      accessTokenData: {
        email: user.email,
        userId: user.id,
        permissions: user.permit?.permissions ?? [],
      },
      refreshTokenData: {
        email: user.email,
        userId: user.id,
      },
    };
  }

  async signUp(signUpData: SignUpData) {
    const { email, password } = signUpData;

    const existingUser = await this.findUserByEmail(email);
    if (existingUser?.manuelAuth) {
      throw new BadRequestException('User already exists');
    }

    const [userPermit, hashedPassword] = await Promise.all([
      this.getDefaultPermit(),
      this.helperService.toHashPassword(password),
    ]);

    const { accessToken, refreshToken } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.upsert({
          where: { email },
          update: {
            permit: { connect: { id: userPermit.id } },
          },
          create: {
            email,
            permit: { connect: { id: userPermit.id } },
          },
          include: {
            permit: { include: { permissions: true } },
          },
        });

        const manuelAuth = await tx.manuelAuth.create({
          data: {
            email,
            password: hashedPassword,
            user: { connect: { id: user.id } },
          },
        });

        const tokens = await this.helperService.generateTokens(
          this.buildTokenPayload(user),
        );

        const savedTokens = await tx.tokens.upsert({
          where: { userId: user.id },
          update: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            manuelAuth: { connect: { id: manuelAuth.id } },
          },
          create: {
            user: { connect: { id: user.id } },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            manuelAuth: { connect: { id: manuelAuth.id } },
          },
        });

        await tx.manuelAuth.update({
          where: { id: manuelAuth.id },
          data: { tokens: { connect: { id: savedTokens.id } } },
        });

        return tokens;
      },
    );

    return {
      status: ToastType.Success,
      header: 'Signup successful',
      message: 'You signed up successfully',
      data: {
        userId: existingUser ? existingUser.id : null,
        accessToken,
        refreshToken,
      },
    };
  }

  async signIn(signInData: SignInData) {
    const { email, password } = signInData;

    const user = await this.findUserByEmail(email);

    if (!user || !user.manuelAuth) {
      throw new NotFoundException('User not found');
    }

    if (!user.tokens?.id) {
      throw new InternalServerErrorException('User token record is missing');
    }

    const isPasswordValid = await this.helperService.comparePassword(
      user.manuelAuth.password,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const { accessToken, refreshToken } =
      await this.helperService.generateTokens(this.buildTokenPayload(user));

    await this.prisma.tokens.update({
      where: { id: user.tokens.id },
      data: { accessToken, refreshToken },
    });

    return {
      status: ToastType.Success,
      header: 'Login successful',
      message: 'You signed in successfully',
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
      },
    };
  }

  async signOut(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.tokens?.id) {
      return {
        status: ToastType.Success,
        header: 'Logout successful',
        message: 'Successfully signed out',
      };
    }

    await this.prisma.tokens.update({
      where: { id: user.tokens.id },
      data: {
        accessToken: null,
        refreshToken: null,
      },
    });

    return {
      status: ToastType.Success,
      header: 'Logout successful',
      message: 'Successfully signed out',
    };
  }

  async refreshToken(refreshToken: string) {
    const decoded = await this.helperService.verifyRefreshToken(refreshToken);

    const user = await this.findUserByEmail(decoded.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tokenId = user.manuelAuth?.tokenId ?? user.googleAuth?.tokenId;

    if (!tokenId) {
      throw new NotFoundException('Token record not found');
    }

    const accessToken = await this.helperService.createAccessToken({
      email: user.email,
      userId: user.id,
      permissions: user.permit?.permissions ?? [],
    });

    await this.prisma.tokens.update({
      where: { id: tokenId },
      data: { accessToken, refreshToken },
    });

    return {
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.findUserByEmail(email);

    if (!user?.manuelAuth?.tokenId) {
      throw new NotFoundException('User not found');
    }

    const { passwordResetTokenExpiry, resetToken } =
      this.helperService.createPasswordResetToken();

    await this.prisma.tokens.update({
      where: { id: user.manuelAuth.tokenId },
      data: { resetToken, passwordResetTokenExpiry },
    });

    const resetTokenUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetTokenUrl}`,
      html: `<p>Click the link to reset your password: <a href="${resetTokenUrl}">${resetTokenUrl}</a></p>`,
    });

    return {
      status: ToastType.Success,
      header: 'Password Reset Token Created',
      message: 'Password reset token created successfully',
      resetToken,
      resetTokenUrl,
    };
  }

  async resetPassword(resetPasswordData: ResetPassword, token: string) {
    const tokenRecord = await this.prisma.tokens.findUnique({
      where: {
        resetToken: token,
        passwordResetTokenExpiry: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord) {
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
          update: { password: hashedPassword },
        },
      },
    });

    return {
      status: ToastType.Success,
      header: 'Password Reset Successful',
      message: 'Password has been reset successfully',
    };
  }

  async signInWithGoogle(
    email: string,
    accessToken: string,
    refreshToken: string,
  ) {
    const existingUser = await this.findUserByEmail(email);
    const userPermit = await this.getDefaultPermit();

    if (!existingUser) {
      const userId = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            permit: { connect: { id: userPermit.id } },
          },
        });

        const newToken = await tx.tokens.create({
          data: {
            user: { connect: { id: newUser.id } },
            accessToken,
            refreshToken,
          },
        });

        await tx.googleAuth.create({
          data: {
            email,
            user: { connect: { id: newUser.id } },
            tokens: { connect: { id: newToken.id } },
          },
        });

        return newUser.id;
      });

      return {
        status: ToastType.Success,
        header: 'Google Sign In Successful',
        message: 'New user created and signed in with Google',
        userId,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      const savedToken = await tx.tokens.upsert({
        where: { userId: existingUser.id },
        update: { accessToken, refreshToken },
        create: {
          user: { connect: { id: existingUser.id } },
          accessToken,
          refreshToken,
        },
      });

      if (!existingUser.googleAuth) {
        await tx.googleAuth.create({
          data: {
            email,
            user: { connect: { id: existingUser.id } },
            tokens: { connect: { id: savedToken.id } },
          },
        });
      } else {
        await tx.googleAuth.update({
          where: { id: existingUser.googleAuth.id },
          data: {
            tokens: { connect: { id: savedToken.id } },
          },
        });
      }
    });

    return {
      status: ToastType.Success,
      header: 'Google Sign In Successful',
      message: 'User signed in with Google',
      userId: existingUser.id,
    };
  }
}
