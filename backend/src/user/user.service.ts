import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUser } from './type/user.type';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async updateUser(body: UpdateUser) {
    const existNickName = await this.prisma.user.findUnique({
      where: {
        nickName: body.nickName
      }
    })

    if (existNickName) throw new ConflictException("This Nick Name in use!")

    const updated = await this.prisma.user.update({
      where: {
        id: body.id
      },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        nickName: body.nickName,
        photo: body.photo
      }
    })
    return updated
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id
      },
    })

    return user
  }
}
