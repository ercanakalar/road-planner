import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import { HelperService } from '../helper/helper.service';

@Injectable()
export class RoadSharingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private helperService: HelperService,
  ) {}

  private linkBase(): string {
    const base =
      this.config.get<string>('SHARE_LINK_BASE_URL') ??
      this.config.get<string>('FRONTEND_URL') ??
      '';

    return base.replace(/\/+$/, '');
  }

  async createLink(id: string) {
    const token = await this.helperService.generateTokenForShareRoad(id);

    return ok({
      data: {
        url: `${this.linkBase()}/share/${token}`,
        token,
      },
    });
  }

  async resolveLink(token: string, userId: string | null = null) {
    const payload = await this.helperService.decodeTokenForShareRoad(token);

    const road = await this.prisma.road.findUnique({
      where: { id: payload.id },
      omit: { userId: true },
      include: {
        user: { select: { nickName: true, firstName: true } },
        favoriteRoads: userId
          ? { where: { userId }, select: { id: true } }
          : false,
        wayPoints: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!road || road.archivedAt) {
      throw new NotFoundException('The shared route no longer exists');
    }

    const { user, favoriteRoads, ...rest } = road;

    return ok({
      data: {
        ...rest,
        author: user?.nickName ?? user?.firstName ?? 'A traveller',
        isFavorite: !!favoriteRoads?.length,
      },
    });
  }
}
