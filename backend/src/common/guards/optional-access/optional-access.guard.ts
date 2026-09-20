import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAccessGuard extends AuthGuard('jwt-access') {
  override handleRequest<TUser>(
    _error: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (user) return user;
    if (bearerToken(context)) throw new UnauthorizedException();

    return undefined as TUser;
  }
}

function bearerToken(context: ExecutionContext): string | undefined {
  const { headers } = context
    .switchToHttp()
    .getRequest<{ headers?: Record<string, unknown> }>();

  const header = headers?.authorization;
  if (typeof header !== 'string') return undefined;

  const [scheme, token] = header.split(' ');

  return scheme.toLowerCase() === 'bearer' && token ? token : undefined;
}
