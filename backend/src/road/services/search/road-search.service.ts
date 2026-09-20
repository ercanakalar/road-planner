import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { pageMeta } from 'src/common/dto/pagination.dto';
import { ok } from 'src/common/http/api-response';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DEFAULT_ROAD_SEARCH_SORT,
  MIN_SEARCH_TERM_LENGTH,
  RoadSearchQueryDto,
  RoadSearchSort,
} from 'src/road/dto/road-search.dto';

const SORTS: Record<RoadSearchSort, Prisma.RoadOrderByWithRelationInput[]> = {
  recent: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  popular: [{ favoriteRoads: { _count: 'desc' } }, { createdAt: 'desc' }],
  stops: [{ stops: { _count: 'desc' } }, { createdAt: 'desc' }],
  title: [{ title: 'asc' }, { id: 'asc' }],
};

export function searchTerm(q: string | undefined): string | undefined {
  const trimmed = q?.trim();
  return trimmed && trimmed.length >= MIN_SEARCH_TERM_LENGTH
    ? trimmed
    : undefined;
}

@Injectable()
export class RoadSearchService {
  constructor(private prisma: PrismaService) {}

  private where(query: RoadSearchQueryDto): Prisma.RoadWhereInput {
    const term = searchTerm(query.q);

    const filters: Prisma.RoadWhereInput[] = [
      { isPublic: true, archivedAt: null },
    ];

    if (term) {
      filters.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { user: { nickName: { contains: term, mode: 'insensitive' } } },
          { user: { firstName: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.authorId) filters.push({ userId: query.authorId });

    if (query.minStops !== undefined && query.minStops > 0) {
      filters.push({ stops: { some: { order: { gte: query.minStops } } } });
    }

    if (query.maxStops !== undefined) {
      filters.push({ stops: { none: { order: { gt: query.maxStops } } } });
    }

    return { AND: filters };
  }

  async searchRoads(query: RoadSearchQueryDto, userId: string | null) {
    const where = this.where(query);
    const orderBy = SORTS[query.sort ?? DEFAULT_ROAD_SEARCH_SORT];

    const [total, roads] = await Promise.all([
      this.prisma.road.count({ where }),
      this.prisma.road.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          userId: true,
          user: { select: { nickName: true, firstName: true, photo: true } },
          favoriteRoads: userId
            ? { where: { userId }, select: { id: true } }
            : false,
          _count: { select: { stops: true, favoriteRoads: true } },
          stops: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
              order: true,
              address: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
    ]);

    const shaped = roads.map(
      ({ user, favoriteRoads, _count, userId: authorId, ...road }) => ({
        ...road,
        authorId,
        author: user.nickName ?? user.firstName ?? 'A traveller',
        authorPhoto: user.photo,
        stopCount: _count.stops,
        favoriteCount: _count.favoriteRoads,
        isFavorite: !!favoriteRoads?.length,
      }),
    );

    return ok({
      header: 'search.header',
      message: shaped.length ? 'search.found' : 'search.none',
      data: shaped,
      meta: pageMeta(total, query),
    });
  }
}
