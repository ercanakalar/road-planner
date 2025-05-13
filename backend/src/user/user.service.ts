import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GivePermit } from './type/user.type';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async givePermit(givePermit: GivePermit) {
    const { userId, permitId } = givePermit;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { permitId },
      include: {
        permit: {
          include: {
            permissions: true,
          },
        },
      },
    });

    return {
      message: `User ${user.firstName} permit to ${user.permit?.name} updated successfully`,
    };
  }
}
