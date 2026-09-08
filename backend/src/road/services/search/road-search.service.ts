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
  stops: [{ wayPoints: { _count: 'desc' } }, { createdAt: 'desc' }],
  title: [{ title: 'asc' }, { id: 'asc' }],
};

/**
 * A term is worth searching only once it is long enough to exclude anything.
 * Anything shorter is treated as no term at all, so the caller gets the newest
 * public routes rather than an arbitrary slice of all of them.
 */
export function searchTerm(q: string | undefined): string | undefined {
  const trimmed = q?.trim();
  return trimmed && trimmed.length >= MIN_SEARCH_TERM_LENGTH
    ? trimmed
    : undefined;
}

@Injectable()
export class RoadSearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public routes only. Search is the front door to other people's routes, so
   * it never reaches past `isPublic` — a private route stays invisible to
   * everyone but its owner, who reaches it through their own list.
   */
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

    // Stop counts are filtered through `order` rather than by counting rows,
    // because Prisma cannot put a relation count in a `where` and doing it in
    // application code after paging would return short pages and a wrong total.
    //
    // This leans on `order` being a dense 1-based rank per road, which is what
    // every writer produces — `positionByRank` on create, `index + 1` on
    // reorder, and `compactWaypointOrder` after a delete — and what the
    // `@@unique([roadId, order])` constraint keeps unique. A road therefore has
    // at least N stops exactly when one of them is ranked N or higher.
    if (query.minStops !== undefined && query.minStops > 0) {
      filters.push({ wayPoints: { some: { order: { gte: query.minStops } } } });
    }

    if (query.maxStops !== undefined) {
      filters.push({ wayPoints: { none: { order: { gt: query.maxStops } } } });
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
          _count: { select: { wayPoints: true, favoriteRoads: true } },
          wayPoints: {
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
        stopCount: _count.wayPoints,
        favoriteCount: _count.favoriteRoads,
        isFavorite: !!favoriteRoads?.length,
      }),
    );

    return ok({
      header: 'Route Search',
      message: shaped.length
        ? 'Routes found'
        : 'No routes match that search yet',
      data: shaped,
      meta: pageMeta(total, query),
    });
  }
}
