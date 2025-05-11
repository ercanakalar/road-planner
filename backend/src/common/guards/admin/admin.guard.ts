import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminGuard extends AuthGuard('jwt-access') {
  constructor(private prisma: PrismaService) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    return ctx.getRequest();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { permit: true },
    });

    if (dbUser?.permit?.name !== 'ADMIN') {
      throw new ForbiddenException('Access denied: Admins only');
    }

    return true;
  }
}
