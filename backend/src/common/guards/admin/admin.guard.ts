import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma.service';

export const ADMIN_PERMIT = 'ADMIN';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req.user as { userId?: string } | undefined)?.userId;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { permit: true },
    });

    if (user?.permit?.name !== ADMIN_PERMIT) {
      throw new ForbiddenException('Access denied: Admins only');
    }

    return true;
  }
}
