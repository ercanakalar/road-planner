import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        permit: { include: { permissions: true } },
      },
    });

    const hasPermission = dbUser?.permit?.permissions.some(
      (p) => p.name === requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
