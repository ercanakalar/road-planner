import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async givePermit(givePermit: any) {
    const { userId, permit } = givePermit;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { permit },
      include: {
        permit: true,
      },
    });
    return {
      message: `User ${user.firstName} permit to ${user.permit?.name} updated successfully`,
    };
  }
}
