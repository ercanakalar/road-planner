import { BadRequestException, Injectable } from '@nestjs/common';

import { pageMeta, PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignPermitDto, UpdatePermitDto } from './dto/permissions.dto';

const PERMIT_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async givePermit(givePermit: AssignPermitDto) {
    const { userId, permitId } = givePermit;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { permitId },
      select: {
        id: true,
        firstName: true,
        permit: { select: PERMIT_SELECT },
      },
    });

    return ok({
      header: 'Permit Assigned',
      message: `${user.firstName} now holds the ${user.permit?.name} permit`,
      data: user,
    });
  }

  async getPermits(pagination: PaginationQueryDto) {
    const [permits, total] = await this.prisma.$transaction([
      this.prisma.permit.findMany({
        select: PERMIT_SELECT,
        orderBy: { name: 'asc' },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.prisma.permit.count(),
    ]);

    return ok({ data: permits, meta: pageMeta(total, pagination) });
  }

  async getPermitById(permitId: string) {
    return ok({
      data: await this.prisma.permit.findUniqueOrThrow({
        where: { id: permitId },
        select: PERMIT_SELECT,
      }),
    });
  }

  async updatePermitById(permitId: string, updatePermit: UpdatePermitDto) {
    const { description, permissionIds } = updatePermit;

    if (description === undefined && permissionIds === undefined) {
      throw new BadRequestException('No updatable fields were supplied');
    }

    return this.prisma.$transaction(async (tx) => {
      if (permissionIds?.length) {
        const found = await tx.permission.count({
          where: { id: { in: permissionIds } },
        });

        if (found !== permissionIds.length) {
          throw new BadRequestException(
            'One or more permissionIds do not exist',
          );
        }
      }

      const permit = await tx.permit.update({
        where: { id: permitId },
        data: {
          ...(description !== undefined && { description }),
          ...(permissionIds !== undefined && {
            permissions: { set: permissionIds.map((id) => ({ id })) },
          }),
        },
        select: PERMIT_SELECT,
      });

      return ok({
        header: 'Permit Updated',
        message: `The ${permit.name} permit was updated`,
        data: permit,
      });
    });
  }
}
