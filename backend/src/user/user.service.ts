import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUser } from './type/user.type';
import { ToastType } from 'src/common/type/status.type';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateUser(body: UpdateUser, userId: string) {
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const nickName = await tx.user.findUnique({
          where: {
            nickName: body.nickName,
            NOT: {
              id: userId,
            },
          },
        });

        if (nickName) {
          throw new ConflictException('This Nick Name in use!');
        }

        return tx.user.update({
          where: {
            id: userId,
          },
          data: {
            ...body,
          },
        });
      });

      return {
        status: ToastType.Success,
        header: 'User Updated',
        message: 'User updated successfully',
        data: updated,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw error;
    }
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    return {
      status: ToastType.Success,
      header: 'User Fetched',
      message: 'User fetched successfully',
      data: user,
    };
  }
}
