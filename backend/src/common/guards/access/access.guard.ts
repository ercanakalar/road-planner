import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_METADATA_KEY } from 'src/common/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class AccessGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
