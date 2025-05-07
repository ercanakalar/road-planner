import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HelperService } from 'src/auth/helper/helper.service';

@Injectable()
export class ResethGuard extends AuthGuard('jwt-reset') {
  constructor(private helperService: HelperService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const token = this.extractTokenFromHeader(
      context.getArgs()[0].headers['authorization'],
    );
    if (!token) return false;
    const decodedToken = await this.helperService.verifyAccessToken(token);
    const timeDiff = Date.now() - decodedToken.exp * 1000;
    if (timeDiff < 0) return true;
    if (timeDiff > 0) return false;

    return true;
  }

  private extractTokenFromHeader(authorization: string): string | undefined {
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
