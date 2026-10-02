import {
  BadRequestException,
  ConflictException,
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
  emailVerifiedAt: true,
  firstName: true,
  lastName: true,
  photo: true,
  nickName: true,
  manuelAuth: {
    select: { id: true },
  },
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
  message: 'auth.resetRequestedMessage',
});

const INVALID_CODE_MESSAGE = 'error.resetCodeInvalid';

// How long a refresh token that has just been exchanged is still honoured.
// A phone that sent the refresh but lost the answer — a timeout, the app
// killed mid-request — comes back with the old token; inside this window that
// is an interrupted exchange, after it a replayed token.
export const REFRESH_REUSE_GRACE_MS = 60_000;

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

  // Ends every session, including the grace period of any token exchanged a
  // moment ago: after this, no refresh token issued so far opens anything.
  private async revokeAllSessions(
    userId: string,
    tx: Pick<PrismaService, 'session'> = this.prisma,
  ) {
    return tx.session.updateMany({
      where: {
        userId,
        OR: [{ revokedAt: null }, { rotatedAt: { not: null } }],
      },
      data: { revokedAt: new Date(), rotatedAt: null },
    });
  }

  private sessionIssued(
    userId: string,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    return {
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async signUp(signUpData: SignUpDto, language?: AppLanguage) {
    const { email, password } = signUpData;

    // Sign-up only ever creates an account. Giving an existing one — a Google
    // account, say — this caller's password would let anyone who knows an
    // address into the account behind it.
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        existingUser.manuelAuth ? 'error.emailTaken' : 'error.emailUsesGoogle',
      );
    }

    const [userPermit, hashedPassword] = await Promise.all([
      this.getDefaultPermit(),
      this.helperService.toHashPassword(password),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
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

  // Signs out the device that holds this refresh token. Without one — an app
  // version that did not send it — every session ends, as it always did.
  async signOut(userId: string, refreshToken?: string) {
    if (!userId) {
      throw new BadRequestException('error.userIdRequired');
    }

    const user = await this.findUserById(userId);

    if (!user) {
      throw new NotFoundException('error.userNotFound');
    }

    if (refreshToken) {
      await this.prisma.session.updateMany({
        where: {
          userId,
          refreshTokenHash: this.helperService.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.revokeAllSessions(userId);
    }

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

    const now = new Date();

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.helperService.hashToken(refreshToken) },
      include: { user: { select: { id: true, email: true } } },
    });

    if (
      !session ||
      session.userId !== decoded.userId ||
      session.expiresAt <= now
    ) {
      throw new UnauthorizedException('error.sessionExpired');
    }

    if (session.revokedAt) {
      // Signed out, or ended by a password change or reset.
      if (!session.rotatedAt) {
        throw new UnauthorizedException('error.sessionExpired');
      }

      if (
        now.getTime() - session.rotatedAt.getTime() >
        REFRESH_REUSE_GRACE_MS
      ) {
        this.logger.warn(
          `Refresh token replay detected for user ${session.userId}; sessions revoked`,
        );
        await this.revokeAllSessions(session.userId);
        throw new UnauthorizedException('error.sessionExpired');
      }

      // Exchanged a moment ago and presented again: the answer to that
      // exchange never reached the phone.
      const reissued = await this.createSession(session.user);

      return ok({ data: this.sessionIssued(session.userId, reissued) });
    }

    const issued = await this.prisma.$transaction(async (tx) => {
      const rotated = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now, rotatedAt: now, lastUsedAt: now },
      });

      // Ended between the lookup and here, by a sign-out or a reset.
      if (rotated.count === 0) {
        throw new UnauthorizedException('error.sessionExpired');
      }

      return this.createSession(session.user, tx);
    });

    return ok({ data: this.sessionIssued(session.userId, issued) });
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

      // The reset code reached this address, so its owner holds the account.
      await tx.user.updateMany({
        where: { id: grant.userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
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
        email: true,
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

    const manuelAuthId = user.manuelAuth.id;

    // Whoever else was signed in with the old password is signed out; this
    // device carries on with the session issued here.
    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.manuelAuth.update({
        where: { id: manuelAuthId },
        data: { password: hashedPassword },
      });

      await this.revokeAllSessions(user.id, tx);

      return this.createSession(user, tx);
    });

    return ok({
      header: 'auth.changedHeader',
      message: 'auth.changedMessage',
      data: this.sessionIssued(user.id, tokens),
    });
  }

  async signInWithGoogle(profile: GoogleProfile, language?: AppLanguage) {
    const { email } = profile;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: USER_GOOGLE_SELECT,
    });

    if (!existingUser) {
      const userPermit = await this.getDefaultPermit();

      const created = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            emailVerifiedAt: new Date(),
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
      let passwordRemoved = false;

      if (!existingUser.googleAuth) {
        // Google has just proved that this person receives mail at the
        // address. A password set before anyone proved that may belong to
        // someone who registered a stranger's address and waited for them to
        // arrive, so it does not survive the link — nor does any session it
        // opened.
        if (existingUser.manuelAuth && !existingUser.emailVerifiedAt) {
          await tx.manuelAuth.delete({
            where: { id: existingUser.manuelAuth.id },
          });
          await this.revokeAllSessions(existingUser.id, tx);
          passwordRemoved = true;
        }

        await tx.googleAuth.create({
          data: { email, user: { connect: { id: existingUser.id } } },
        });
      }

      const patch = googleProfilePatch(existingUser, profile);

      if (!existingUser.emailVerifiedAt) patch.emailVerifiedAt = new Date();

      const user = Object.keys(patch).length
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: patch,
            select: USER_GOOGLE_SELECT,
          })
        : existingUser;

      return {
        user,
        passwordRemoved,
        ...(await this.createSession(user, tx)),
      };
    });

    await this.rememberLanguage(issued.user.id, language);

    return ok({
      header: 'auth.googleHeader',
      message: issued.passwordRemoved
        ? 'auth.googlePasswordRemoved'
        : 'auth.googleSignedIn',
      data: {
        userId: issued.user.id,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        user: toGoogleUserView(issued.user),
      },
    });
  }
}
