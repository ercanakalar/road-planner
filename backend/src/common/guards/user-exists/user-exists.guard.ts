import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const email = (request.body as { email?: unknown } | undefined)?.email;

    if (typeof email !== 'string' || email.trim() === '') {
      return true;
    }

    const userExists = await this.prismaService.manuelAuth.findUnique({
      where: { email },
      select: { id: true },
    });

    if (userExists) {
      throw new ConflictException('An account with this email already exists');
    }

    return true;
  }
}
