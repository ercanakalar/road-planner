import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

import { GoogleAuthClient, GoogleProfile } from 'src/auth/type/auth.types';
import { EnvironmentVariables } from 'src/config/env.validation';

@Injectable()
export class GoogleService implements OnModuleInit {
  private readonly logger = new Logger(GoogleService.name);

  constructor(private config: ConfigService<EnvironmentVariables, true>) {}

  onModuleInit(): void {
    const audiences = this.acceptedAudiences();

    this.logger.log(
      `Google sign-in: ${
        audiences.length
          ? `enabled for ${audiences.length} client id(s)`
          : 'disabled (see GOOGLE_NATIVE_CLIENT_IDS)'
      }`,
    );
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
      throw new ServiceUnavailableException('error.googleNotConfigured');
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
    // Only an address Google says it has verified proves anything; a token
    // that leaves the claim out proves nothing.
    if (payload.email_verified !== true) {
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
