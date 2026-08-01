import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { GoogleAuthClient } from 'src/auth/type/auth.types';
import { EnvironmentVariables } from 'src/config/env.validation';

const DEFAULT_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private config: ConfigService<EnvironmentVariables, true>) {}

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
      throw new UnauthorizedException('Missing OAuth state parameter');
    }

    const parts = state.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed OAuth state parameter');
    }

    const [nonce, issuedAt, signature] = parts;
    const expected = this.signState(`${nonce}.${issuedAt}`);

    const provided = Buffer.from(signature, 'hex');
    const computed = Buffer.from(expected, 'hex');

    if (
      provided.length !== computed.length ||
      !timingSafeEqual(provided, computed)
    ) {
      throw new UnauthorizedException('Invalid OAuth state parameter');
    }

    const age = Date.now() - Number(issuedAt);
    if (!Number.isFinite(age) || age < 0 || age > STATE_TTL_MS) {
      throw new UnauthorizedException('Expired OAuth state parameter');
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

  async getAuthClientData(code: string): Promise<{ email: string }> {
    this.assertConfigured();

    if (!code) {
      throw new BadRequestException('Missing authorization code');
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
      throw new UnauthorizedException('Google did not return an email address');
    }

    if (!this.isEmailVerified(userInfo)) {
      this.logger.warn(
        `Rejected Google sign-in for unverified address ${userInfo.email}`,
      );
      throw new UnauthorizedException(
        'Your Google email address is not verified',
      );
    }

    return { email: userInfo.email };
  }

  private isEmailVerified(userInfo: GoogleAuthClient): boolean {
    const verified = userInfo.verified_email ?? userInfo.email_verified;
    return verified === true || verified === 'true';
  }
}
