import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ResetPasswordDto, SignInDto, SignUpDto } from 'src/auth/dto/auth.dto';
import { HelperService } from 'src/auth/helper/helper.service';
import { ok } from 'src/common/http/api-response';
import { EnvironmentVariables } from 'src/config/env.validation';
import { EmailService } from 'src/notification/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

const USER_AUTH_SELECT = {
  id: true,
  email: true,
  manuelAuth: {
    select: { id: true, password: true },
  },
  googleAuth: {
    select: { id: true },
  },
} as const;

const DUMMY_PASSWORD_HASH =
  'scrypt$N=32768,r=8,p=1$00000000000000000000000000000000$' + '0'.repeat(128);

const FORGOT_PASSWORD_RESPONSE = ok({
  header: 'Password Reset Requested',
  message:
    'If an account exists for that address, a password reset link has been sent.',
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
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

  private buildTokenPayload(user: { id: string; email: string }) {
    return {
      accessTokenData: { userId: user.id, email: user.email },
      refreshTokenData: { userId: user.id, email: user.email },
    };
  }

  private refreshTokenExpiry(): Date {
    const configured = this.config.get('REFRESH_EXPIRES_IN', { infer: true });
    const match = /^(\d+)(ms|s|m|h|d|w|y)?$/.exec(configured);

    const unitMs: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
      y: 31_536_000_000,
    };

    const amount = match ? Number(match[1]) : 7;
    const multiplier = match ? (unitMs[match[2] ?? 's'] ?? 1000) : unitMs.d;

    return new Date(Date.now() + amount * multiplier);
  }

  private async createSession(
    user: { id: string; email: string },
    tx: Pick<PrismaService, 'session'> = this.prisma,
  ) {
    const { accessToken, refreshToken } =
      await this.helperService.generateTokens(this.buildTokenPayload(user));

    await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.helperService.hashToken(refreshToken),
        expiresAt: this.refreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  }

  private async revokeAllSessions(
    userId: string,
    tx: Pick<PrismaService, 'session'> = this.prisma,
  ) {
    return tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async signUp(signUpData: SignUpDto) {
    const { email, password } = signUpData;

    const existingUser = await this.findUserByEmail(email);
    if (existingUser?.manuelAuth) {
      throw new BadRequestException('User already exists');
    }

    const [userPermit, hashedPassword] = await Promise.all([
      this.getDefaultPermit(),
      this.helperService.toHashPassword(password),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {
          permit: { connect: { id: userPermit.id } },
        },
        create: {
          email,
          permit: { connect: { id: userPermit.id } },
        },
      });

      await tx.manuelAuth.create({
        data: {
          email,
          password: hashedPassword,
          user: { connect: { id: user.id } },
        },
      });

      const tokens = await this.createSession(user, tx);

      return { ...tokens, userId: user.id };
    });

    return ok({
      header: 'Signup successful',
      message: 'You signed up successfully',
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }

  async signIn(signInData: SignInDto) {
    const { email, password } = signInData;

    const user = await this.findUserByEmail(email);

    if (!user?.manuelAuth) {
      await this.helperService.comparePassword(DUMMY_PASSWORD_HASH, password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.helperService.comparePassword(
      user.manuelAuth.password,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (this.helperService.needsRehash(user.manuelAuth.password)) {
      await this.prisma.manuelAuth.update({
        where: { id: user.manuelAuth.id },
        data: { password: await this.helperService.toHashPassword(password) },
      });
    }

    const { accessToken, refreshToken } = await this.createSession(user);

    return ok({
      header: 'Login successful',
      message: 'You signed in successfully',
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
      },
    });
  }

  async signOut(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.revokeAllSessions(userId);

    return ok({
      header: 'Logout successful',
      message: 'Successfully signed out',
    });
  }

  async refreshToken(refreshToken: string) {
    let decoded: { userId?: string; email?: string };

    try {
      decoded = await this.helperService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!decoded?.userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.helperService.hashToken(refreshToken) },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!session) {
      this.logger.warn(
        `Refresh token replay detected for user ${decoded.userId}; sessions revoked`,
      );
      await this.revokeAllSessions(decoded.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.userId !== decoded.userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      await tx.session.delete({ where: { id: session.id } });
      return this.createSession(session.user, tx);
    });

    return ok({
      data: {
        userId: session.userId,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.findUserByEmail(email);

    if (!user?.manuelAuth) {
      return FORGOT_PASSWORD_RESPONSE;
    }

    const { token, tokenHash, expiresAt } =
      this.helperService.createPasswordResetToken();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordReset.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const resetTokenUrl = `${frontendUrl}/reset-password/${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `Click the link to reset your password: ${resetTokenUrl}`,
      html: `<p>Click the link to reset your password: <a href="${resetTokenUrl}">${resetTokenUrl}</a></p>`,
    });

    return FORGOT_PASSWORD_RESPONSE;
  }

  async resetPassword(resetPasswordData: ResetPasswordDto, token: string) {
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      throw new BadRequestException(
        'password and confirmPassword do not match',
      );
    }

    const tokenHash = this.helperService.hashToken(token);
    const hashedPassword = await this.helperService.toHashPassword(
      resetPasswordData.password,
    );

    await this.prisma.$transaction(async (tx) => {
      const grant = await tx.passwordReset.findUnique({
        where: { tokenHash },
        include: { user: { select: { manuelAuth: { select: { id: true } } } } },
      });

      if (
        !grant ||
        grant.usedAt !== null ||
        grant.expiresAt <= new Date() ||
        !grant.user.manuelAuth
      ) {
        throw new BadRequestException('Reset token is invalid or expired');
      }

      const consumed = await tx.passwordReset.updateMany({
        where: { id: grant.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw new BadRequestException('Reset token is invalid or expired');
      }

      await tx.manuelAuth.update({
        where: { id: grant.user.manuelAuth.id },
        data: { password: hashedPassword },
      });

      await this.revokeAllSessions(grant.userId, tx);
    });

    return ok({
      header: 'Password Reset Successful',
      message: 'Password has been reset successfully',
    });
  }

  async signInWithGoogle(email: string) {
    const existingUser = await this.findUserByEmail(email);
    const userPermit = await this.getDefaultPermit();

    if (!existingUser) {
      const created = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            permit: { connect: { id: userPermit.id } },
          },
        });

        await tx.googleAuth.create({
          data: { email, user: { connect: { id: newUser.id } } },
        });

        const tokens = await this.createSession(newUser, tx);

        return { userId: newUser.id, ...tokens };
      });

      return ok({
        header: 'Google Sign In Successful',
        message: 'New user created and signed in with Google',
        data: created,
      });
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      if (!existingUser.googleAuth) {
        await tx.googleAuth.create({
          data: { email, user: { connect: { id: existingUser.id } } },
        });
      }

      return this.createSession(existingUser, tx);
    });

    return ok({
      header: 'Google Sign In Successful',
      message: 'User signed in with Google',
      data: { userId: existingUser.id, ...issued },
    });
  }
}
