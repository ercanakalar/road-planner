import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalAccessGuard extends AuthGuard('jwt-access') {
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return Promise.resolve(super.canActivate(context))
      .then(() => true)
      .catch(() => true);
  }

  override handleRequest<TUser>(_error: unknown, user: TUser): TUser {
    return user ?? (undefined as TUser);
  }
}
