import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { bearerTokenIn } from 'src/common/guards/optional-access/optional-access.guard';
import { EnvironmentVariables } from 'src/config/env.validation';

export interface ViewerRequest {
  user?: { userId?: unknown };
  headers?: Record<string, unknown>;
}

// Works out who is calling an endpoint that does not require it to be known.
//
// The maps endpoints are public and run no guard, so a signed-in person's
// token is never read there. Attributing their usage only needs to know whose
// token it is; a token that is missing, expired or forged simply makes the
// call anonymous, and never makes it fail.
@Injectable()
export class ViewerResolver {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async userIdOf(request: ViewerRequest): Promise<string | null> {
    const known = request.user?.userId;
    if (typeof known === 'string' && known) return known;

    const token = bearerTokenIn(request.headers?.authorization);
    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync<{ userId?: unknown }>(token, {
        secret: this.config.get('ACCESS_KEY', { infer: true }),
      });

      return typeof payload?.userId === 'string' && payload.userId
        ? payload.userId
        : null;
    } catch {
      return null;
    }
  }
}
