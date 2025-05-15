import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GivePermit, UpdatePermit } from './type/permissions.type';

@Injectable()
export class PermissionsService {
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

  async getPermits() {
    const permits = await this.prisma.permit.findMany({
      include: {
        permissions: true,
      },
    });
    return permits;
  }

  async getPermitById(permitId: string) {
    return await this.prisma.permit.findUnique({
      where: {
        id: permitId,
      },
      include: {
        permissions: true,
      },
    });
  }

  async updatePermitById(updatePermit: UpdatePermit) {}
}
