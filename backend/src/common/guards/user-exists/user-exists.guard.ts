import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email } = request.body;

    const userExists = await this.prismaService.manuelAuth.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('Bu kullanıcı zaten kayıtlı.');
    }

    return true;
  }
}
