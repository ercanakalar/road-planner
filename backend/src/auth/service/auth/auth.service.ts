import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ChangePasswordDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  VerifyResetCodeDto,
} from 'src/auth/dto/auth.dto';
import { HelperService } from 'src/auth/helper/helper.service';
import { GoogleProfile } from 'src/auth/type/auth.types';
import { I18nService } from 'nestjs-i18n';

import { ok } from 'src/common/http/api-response';
import {
  AppLanguage,
  FALLBACK_LANGUAGE,
  isAppLanguage,
} from 'src/i18n/languages';
import {
  RESET_CODE_LOCKOUT_HOURS,
  RESET_CODE_MAX_ATTEMPTS,
  RESET_CODE_TTL_MINUTES,
} from 'src/auth/constants/password-reset';
import { PasswordResetLockedException } from 'src/auth/exception/password-reset-locked.exception';
import { PasswordResetChannel, Prisma } from '../../../generated/prisma/client';
import { EnvironmentVariables } from 'src/config/env.validation';
import { EmailService } from 'src/notification/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';

const USER_AUTH_SELECT = {
  id: true,
  email: true,
  language: true,
  manuelAuth: {
    select: { id: true, password: true },
  },
  googleAuth: {
    select: { id: true },
  },
} as const;

const USER_GOOGLE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  photo: true,
  nickName: true,
  googleAuth: {
    select: { id: true },
  },
} as const;

type GoogleUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
  nickName: string | null;
};

const GOOGLE_PHOTO_HOST = /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i;

const isBlank = (value: string | null): boolean => !value?.trim();

const googleProfileFields = (profile: GoogleProfile) => ({
  ...(profile.firstName ? { firstName: profile.firstName } : {}),
  ...(profile.lastName ? { lastName: profile.lastName } : {}),
  ...(profile.photo ? { photo: profile.photo } : {}),
});

const googleProfilePatch = (
  existing: GoogleUserRow,
  profile: GoogleProfile,
): Prisma.UserUpdateInput => {
  const patch: Prisma.UserUpdateInput = {};

  if (profile.firstName && isBlank(existing.firstName)) {
    patch.firstName = profile.firstName;
  }
  if (profile.lastName && isBlank(existing.lastName)) {
    patch.lastName = profile.lastName;
  }

  const photoIsGoogles =
    isBlank(existing.photo) || GOOGLE_PHOTO_HOST.test(existing.photo ?? '');

  if (profile.photo && photoIsGoogles && profile.photo !== existing.photo) {
    patch.photo = profile.photo;
  }

  return patch;
};

const toGoogleUserView = ({
  id,
  email,
  firstName,
  lastName,
  photo,
  nickName,
}: GoogleUserRow) => ({ id, email, firstName, lastName, photo, nickName });

const DUMMY_PASSWORD_HASH =
  'scrypt$N=32768,r=8,p=1$00000000000000000000000000000000$' + '0'.repeat(128);

const FORGOT_PASSWORD_RESPONSE = ok({
  header: 'auth.resetRequestedHeader',
  message:
    'If an account exists for that address, a reset code has been sent to it.',
});

const INVALID_CODE_MESSAGE = 'That code is incorrect or has expired';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly helperService: HelperService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly i18n: I18nService,
  ) {}

  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_AUTH_SELECT,
    });
  }

  private async rememberLanguage(
    userId: string,
    language: AppLanguage | undefined,
  ): Promise<void> {
    if (!language) return;

    try {
      await this.prisma.user.updateMany({
        where: { id: userId, language: { not: language } },
        data: { language },
      });
    } catch (error) {
      this.logger.warn(`Could not note the language for ${userId}`, error);
    }
  }

  private sayTo(stored: string | null | undefined, asked?: AppLanguage) {
    const lang = isAppLanguage(stored) ? stored : (asked ?? FALLBACK_LANGUAGE);

    return (key: string, args: Record<string, unknown> = {}): string =>
      this.i18n.translate(key, { lang, args }) as string;
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

  async signUp(signUpData: SignUpDto, language?: AppLanguage) {
    const { email, password } = signUpData;

    const existingUser = await this.findUserByEmail(email);
    if (existingUser?.manuelAuth) {
      throw new BadRequestException('error.userExists');
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
          ...(language ? { language } : {}),
        },
        create: {
          email,
          ...(language ? { language } : {}),
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
      header: 'auth.signupHeader',
      message: 'auth.signupMessage',
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }

  async signIn(signInData: SignInDto, language?: AppLanguage) {
    const { email, password } = signInData;

    const user = await this.findUserByEmail(email);

    if (!user?.manuelAuth) {
      await this.helperService.comparePassword(DUMMY_PASSWORD_HASH, password);
      throw new UnauthorizedException('error.badCredentials');
    }

    const isPasswordValid = await this.helperService.comparePassword(
      user.manuelAuth.password,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('error.badCredentials');
    }

    if (this.helperService.needsRehash(user.manuelAuth.password)) {
      await this.prisma.manuelAuth.update({
        where: { id: user.manuelAuth.id },
        data: { password: await this.helperService.toHashPassword(password) },
      });
    }

    const { accessToken, refreshToken } = await this.createSession(user);

    await this.rememberLanguage(user.id, language);

    return ok({
      header: 'auth.loginHeader',
      message: 'auth.loginMessage',
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
      },
    });
  }

  async signOut(userId: string) {
    if (!userId) {
      throw new BadRequestException('error.userIdRequired');
    }

    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('error.userNotFound');
    }

    await this.revokeAllSessions(userId);

    return ok({
      header: 'auth.logoutHeader',
      message: 'auth.logoutMessage',
    });
  }

  async refreshToken(refreshToken: string) {
    let decoded: { userId?: string; email?: string };

    try {
      decoded = await this.helperService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('error.sessionExpired');
    }

    if (!decoded?.userId) {
      throw new UnauthorizedException('error.sessionExpired');
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
      throw new UnauthorizedException('error.sessionExpired');
    }

    if (session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('error.sessionExpired');
    }

    if (session.userId !== decoded.userId) {
      throw new UnauthorizedException('error.sessionExpired');
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

  async forgotPassword(email: string, language?: AppLanguage) {
    const user = await this.findUserByEmail(email);
    if (!user?.manuelAuth) {
      return FORGOT_PASSWORD_RESPONSE;
    }

    const { token, tokenHash, expiresAt } =
      this.helperService.createPasswordResetToken();

    await this.supersedeAndCreate(user.id, {
      channel: PasswordResetChannel.LINK,
      tokenHash,
      expiresAt,
      verifiedAt: new Date(),
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const resetTokenUrl = `${frontendUrl}/reset-password/${token}`;

    const say = this.sayTo(user.language, language);

    await this.emailService.sendEmail({
      to: email,
      subject: say('email.resetSubject'),
      text: say('email.resetBody', { link: resetTokenUrl }),
      html: `<p>${say('email.resetBody', {
        link: `<a href="${resetTokenUrl}">${resetTokenUrl}</a>`,
      })}</p>`,
    });

    return FORGOT_PASSWORD_RESPONSE;
  }

  async requestPasswordResetCode(email: string, language?: AppLanguage) {
    const user = await this.findUserByEmail(email);
    if (!user?.manuelAuth) return FORGOT_PASSWORD_RESPONSE;

    const locked = await this.findActiveLockout(user.id);
    if (locked) return FORGOT_PASSWORD_RESPONSE;

    const { code, codeHash, expiresAt } =
      await this.helperService.createPasswordResetCode();

    await this.supersedeAndCreate(user.id, {
      channel: PasswordResetChannel.CODE,
      codeHash,
      expiresAt,
    });

    const say = this.sayTo(user.language, language);
    const body = (shown: string) =>
      say('email.resetCodeBody', {
        code: shown,
        minutes: RESET_CODE_TTL_MINUTES,
      });

    await this.emailService.sendEmail({
      to: email,
      subject: say('email.resetCodeSubject'),
      text: `${body(code)} ${say('email.resetCodeIgnore')}`,
      html:
        `<p>${body(`<strong>${code}</strong>`)}</p>` +
        `<p>${say('email.resetCodeIgnore')}</p>`,
    });

    return FORGOT_PASSWORD_RESPONSE;
  }

  private async supersedeAndCreate(
    userId: string,
    data: Omit<Prisma.PasswordResetUncheckedCreateInput, 'userId'>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordReset.create({ data: { userId, ...data } });
    });
  }

  private async findActiveLockout(userId: string) {
    return this.prisma.passwordReset.findFirst({
      where: {
        userId,
        usedAt: null,
        channel: PasswordResetChannel.CODE,
        lockedUntil: { gt: new Date() },
      },
      select: { lockedUntil: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyResetCode({ email, code }: VerifyResetCodeDto) {
    const user = await this.findUserByEmail(email);

    if (!user?.manuelAuth) {
      await this.helperService.comparePassword(DUMMY_PASSWORD_HASH, code);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const grant = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        channel: PasswordResetChannel.CODE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!grant) {
      await this.helperService.comparePassword(DUMMY_PASSWORD_HASH, code);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const now = new Date();

    if (grant.lockedUntil && grant.lockedUntil > now) {
      throw new PasswordResetLockedException(grant.lockedUntil);
    }

    if (grant.expiresAt <= now) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const isValid =
      grant.codeHash !== null &&
      (await this.helperService.isResetCodeValid(grant.codeHash, code));

    if (!isValid) {
      const attempts = grant.attempts + 1;
      const lockedUntil =
        attempts >= RESET_CODE_MAX_ATTEMPTS
          ? new Date(now.getTime() + RESET_CODE_LOCKOUT_HOURS * 60 * 60 * 1000)
          : null;

      await this.prisma.passwordReset.update({
        where: { id: grant.id },
        data: { attempts, ...(lockedUntil ? { lockedUntil } : {}) },
      });

      if (lockedUntil) throw new PasswordResetLockedException(lockedUntil);

      throw new BadRequestException({
        message: INVALID_CODE_MESSAGE,
        attemptsRemaining: RESET_CODE_MAX_ATTEMPTS - attempts,
      });
    }

    const { token, tokenHash, expiresAt } =
      this.helperService.createPasswordResetToken();

    const verified = await this.prisma.passwordReset.updateMany({
      where: { id: grant.id, usedAt: null, verifiedAt: null },
      data: { verifiedAt: now, tokenHash, expiresAt, attempts: 0 },
    });

    if (verified.count === 0) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    return ok({
      header: 'auth.codeVerifiedHeader',
      message: 'auth.codeVerifiedMessage',
      data: { resetToken: token, expiresAt: expiresAt.toISOString() },
    });
  }

  async resetPassword(resetPasswordData: ResetPasswordDto, token: string) {
    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      throw new BadRequestException('error.passwordsDoNotMatch');
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
        grant.verifiedAt === null ||
        grant.expiresAt <= new Date() ||
        !grant.user.manuelAuth
      ) {
        throw new BadRequestException('error.resetTokenInvalid');
      }

      const consumed = await tx.passwordReset.updateMany({
        where: { id: grant.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw new BadRequestException('error.resetTokenInvalid');
      }

      await tx.manuelAuth.update({
        where: { id: grant.user.manuelAuth.id },
        data: { password: hashedPassword },
      });

      await this.revokeAllSessions(grant.userId, tx);
    });

    return ok({
      header: 'auth.resetDoneHeader',
      message: 'auth.resetDoneMessage',
    });
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    if (body.newPassword !== body.confirmPassword) {
      throw new BadRequestException('error.passwordsDoNotMatch');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        manuelAuth: { select: { id: true, password: true } },
      },
    });

    if (!user?.manuelAuth) {
      throw new BadRequestException('error.noPasswordLogin');
    }

    const isCurrentValid = await this.helperService.comparePassword(
      user.manuelAuth.password,
      body.currentPassword,
    );

    if (!isCurrentValid) {
      throw new UnauthorizedException('error.currentPasswordWrong');
    }

    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException('error.passwordUnchanged');
    }

    const hashedPassword = await this.helperService.toHashPassword(
      body.newPassword,
    );

    await this.prisma.manuelAuth.update({
      where: { id: user.manuelAuth.id },
      data: { password: hashedPassword },
    });

    return ok({
      header: 'auth.changedHeader',
      message: 'auth.changedMessage',
    });
  }

  async signInWithGoogle(profile: GoogleProfile, language?: AppLanguage) {
    const { email } = profile;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: USER_GOOGLE_SELECT,
    });
    const userPermit = await this.getDefaultPermit();

    if (!existingUser) {
      const created = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            ...googleProfileFields(profile),
            ...(language ? { language } : {}),
            permit: { connect: { id: userPermit.id } },
          },
          select: USER_GOOGLE_SELECT,
        });

        await tx.googleAuth.create({
          data: { email, user: { connect: { id: newUser.id } } },
        });

        const tokens = await this.createSession(newUser, tx);

        return { user: newUser, ...tokens };
      });

      return ok({
        header: 'auth.googleHeader',
        message: 'auth.googleCreated',
        data: {
          userId: created.user.id,
          accessToken: created.accessToken,
          refreshToken: created.refreshToken,
          user: toGoogleUserView(created.user),
        },
      });
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      if (!existingUser.googleAuth) {
        await tx.googleAuth.create({
          data: { email, user: { connect: { id: existingUser.id } } },
        });
      }

      const patch = googleProfilePatch(existingUser, profile);

      const user = Object.keys(patch).length
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: patch,
            select: USER_GOOGLE_SELECT,
          })
        : existingUser;

      return { user, ...(await this.createSession(user, tx)) };
    });

    await this.rememberLanguage(issued.user.id, language);

    return ok({
      header: 'auth.googleHeader',
      message: 'auth.googleSignedIn',
      data: {
        userId: issued.user.id,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        user: toGoogleUserView(issued.user),
      },
    });
  }
}
