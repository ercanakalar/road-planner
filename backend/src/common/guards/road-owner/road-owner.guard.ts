import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoadOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const roadId = req.params.id;

    if (!user || !roadId) {
      throw new ForbiddenException('Missing user or road ID');
    }

    const road = await this.prisma.road.findUnique({
      where: { id: roadId },
    });

    if (!road) {
      throw new NotFoundException('Road not found');
    }

    if (road.userId !== user.userId) {
      throw new ForbiddenException('You do not own this road');
    }

    return true;
  }
}
