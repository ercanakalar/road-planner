import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PERMISSION_METADATA_KEY } from 'src/common/decorators/require-permission.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<
      string | undefined
    >(PERMISSION_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      throw new InternalServerErrorException(
        'PermissionsGuard is applied to a route with no @RequirePermission',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request.user as { userId?: string } | undefined)?.userId;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        permit: { include: { permissions: true } },
      },
    });

    const hasPermission = user?.permit?.permissions.some(
      (permission) => permission.name === requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
