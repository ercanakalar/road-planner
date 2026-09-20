import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

import { GoogleAuthClient, GoogleProfile } from 'src/auth/type/auth.types';
import { EnvironmentVariables } from 'src/config/env.validation';

const DEFAULT_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleService implements OnModuleInit {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private config: ConfigService<EnvironmentVariables, true>) {}

  onModuleInit(): void {
    const audiences = this.acceptedAudiences();

    this.logger.log(
      `Google sign-in: browser flow ${
        this.isConfigured() ? 'enabled' : 'disabled (see GOOGLE_CLIENT_ID)'
      }, native id tokens ${
        audiences.length
          ? `enabled for ${audiences.length} client id(s)`
          : 'disabled (see GOOGLE_NATIVE_CLIENT_IDS)'
      }`,
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }) &&
      this.config.get('GOOGLE_REDIRECT_URL', { infer: true }) &&
      this.config.get('GOOGLE_SCOPES_API', { infer: true }),
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server',
      );
    }
  }

  private nativeClientIds(): string[] {
    return (this.config.get('GOOGLE_NATIVE_CLIENT_IDS', { infer: true }) ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  acceptedAudiences(): string[] {
    const webClientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });

    return [
      ...new Set([
        ...this.nativeClientIds(),
        ...(webClientId ? [webClientId] : []),
      ]),
    ];
  }

  isNativeConfigured(): boolean {
    return this.acceptedAudiences().length > 0;
  }

  async getProfileFromIdToken(idToken: string): Promise<GoogleProfile> {
    const audience = this.acceptedAudiences();

    if (!audience.length) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server',
      );
    }
    if (!idToken) {
      throw new BadRequestException('error.googleTokenMissing');
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await new OAuth2Client().verifyIdToken({
        idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.warn(
        `Rejected Google id token: ${String(error)}${this.audienceHint(idToken, audience)}`,
      );
      throw new UnauthorizedException('error.googleSignInFailed');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('error.googleNoEmail');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('error.googleEmailUnverified');
    }

    return this.toProfile({ ...payload, email: payload.email }, payload.sub);
  }

  private audienceHint(idToken: string, accepted: string[]): string {
    const claims = this.readUnverifiedClaims(idToken);
    if (!claims?.aud || accepted.includes(claims.aud)) return '';

    return (
      `. The token is addressed to ${claims.aud}, which is not among the ` +
      `accepted client ids (${accepted.join(', ')}) — add it to ` +
      'GOOGLE_NATIVE_CLIENT_IDS if it belongs to this project'
    );
  }

  private readUnverifiedClaims(idToken: string): { aud?: string } | null {
    const segment = idToken.split('.')[1];
    if (!segment) return null;

    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(segment, 'base64url').toString('utf8'),
      );

      if (!decoded || typeof decoded !== 'object') return null;

      const aud = (decoded as { aud?: unknown }).aud;
      return { aud: typeof aud === 'string' ? aud : undefined };
    } catch {
      return null;
    }
  }

  getAuthClient(): OAuth2Client {
    return new OAuth2Client(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      this.config.get('GOOGLE_REDIRECT_URL', { infer: true }),
    );
  }

  createState(): string {
    const nonce = randomBytes(16).toString('hex');
    const issuedAt = Date.now().toString();
    const payload = `${nonce}.${issuedAt}`;

    return `${payload}.${this.signState(payload)}`;
  }

  verifyState(state: string | undefined): void {
    if (!state) {
      throw new UnauthorizedException('error.googleStateMissing');
    }

    const parts = state.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('error.googleStateMalformed');
    }

    const [nonce, issuedAt, signature] = parts;
    const expected = this.signState(`${nonce}.${issuedAt}`);

    const provided = Buffer.from(signature, 'hex');
    const computed = Buffer.from(expected, 'hex');

    if (
      provided.length !== computed.length ||
      !timingSafeEqual(provided, computed)
    ) {
      throw new UnauthorizedException('error.googleStateInvalid');
    }

    const age = Date.now() - Number(issuedAt);
    if (!Number.isFinite(age) || age < 0 || age > STATE_TTL_MS) {
      throw new UnauthorizedException('error.googleStateExpired');
    }
  }

  private signState(payload: string): string {
    return createHmac('sha256', this.config.get('ACCESS_KEY', { infer: true }))
      .update(payload)
      .digest('hex');
  }

  async getAuthClientUrl(): Promise<{ url: string; state: string }> {
    this.assertConfigured();

    const authClient = this.getAuthClient();
    const state = this.createState();

    const url = authClient.generateAuthUrl({
      access_type:
        this.config.get('GOOGLE_OAUTH2_ACCESS_TYPE', { infer: true }) ||
        'offline',
      prompt:
        this.config.get('GOOGLE_OAUTH2_PROMPT', { infer: true }) || 'consent',
      scope: this.config
        .get('GOOGLE_SCOPES_API', { infer: true })!
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean),
      state,
    });

    return { url, state };
  }

  async getAuthClientData(code: string): Promise<GoogleProfile> {
    this.assertConfigured();

    if (!code) {
      throw new BadRequestException('error.googleCodeMissing');
    }

    const authClient = this.getAuthClient();
    const { tokens } = await authClient.getToken(code);

    authClient.setCredentials(tokens);

    const userInfoResponse = await authClient.request({
      url:
        this.config.get('GOOGLE_OAUTH2_USERINFO_URL', { infer: true }) ||
        DEFAULT_USERINFO_URL,
      method: 'GET',
    });

    const userInfo = userInfoResponse.data as GoogleAuthClient;

    if (!userInfo?.email) {
      throw new UnauthorizedException('error.googleNoEmail');
    }

    if (!this.isEmailVerified(userInfo)) {
      this.logger.warn(
        `Rejected Google sign-in for unverified address ${userInfo.email}`,
      );
      throw new UnauthorizedException('error.googleEmailUnverified');
    }

    return this.toProfile(userInfo, userInfo.id);
  }

  private isEmailVerified(userInfo: GoogleAuthClient): boolean {
    const verified = userInfo.verified_email ?? userInfo.email_verified;
    return verified === true || verified === 'true';
  }

  private toProfile(
    source: Pick<
      GoogleAuthClient,
      'email' | 'name' | 'given_name' | 'family_name' | 'picture'
    >,
    googleId?: string,
  ): GoogleProfile {
    return {
      email: source.email,
      ...(googleId ? { googleId } : {}),
      ...splitName(source),
      ...(isUsablePhoto(source.picture)
        ? { photo: source.picture.trim() }
        : {}),
    };
  }
}

export const splitName = (source: {
  name?: string;
  given_name?: string;
  family_name?: string;
}): { firstName?: string; lastName?: string } => {
  const given = source.given_name?.trim();
  const family = source.family_name?.trim();

  if (given || family) {
    return {
      ...(given ? { firstName: given } : {}),
      ...(family ? { lastName: family } : {}),
    };
  }

  const parts = source.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return {};

  return {
    firstName: parts[0],
    ...(parts.length > 1 ? { lastName: parts.slice(1).join(' ') } : {}),
  };
};

export const isUsablePhoto = (picture?: string): picture is string =>
  typeof picture === 'string' && /^https:\/\//i.test(picture.trim());
