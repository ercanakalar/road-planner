import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Lets a route serve signed-in and anonymous callers from the same handler.
 *
 * Passport's guard turns away everyone it cannot identify. This one only
 * insists on an identity when the caller offered one: a request with no
 * Authorization header is anonymous and welcome. A request whose token is
 * expired or forged is not. Quietly demoting it to anonymous would answer the
 * caller's own private roads with "Route not found", and the app would never
 * see the 401 it refreshes its session on.
 */
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

/** The token the access strategy would have read, if the caller sent one. */
function bearerToken(context: ExecutionContext): string | undefined {
  const { headers } = context
    .switchToHttp()
    .getRequest<{ headers?: Record<string, unknown> }>();

  const header = headers?.authorization;
  if (typeof header !== 'string') return undefined;

  const [scheme, token] = header.split(' ');

  return scheme.toLowerCase() === 'bearer' && token ? token : undefined;
}
