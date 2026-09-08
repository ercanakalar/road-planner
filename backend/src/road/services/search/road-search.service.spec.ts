import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { createPrismaMock, PrismaMock } from 'src/testing/mocks';
import { RoadSearchQueryDto } from 'src/road/dto/road-search.dto';
import { RoadSearchService, searchTerm } from './road-search.service';

const AUTHOR_ID = 'b1e9c9a2-1f3d-4c8a-9f2b-0a1b2c3d4e5f';

const query = (overrides: Partial<RoadSearchQueryDto> = {}) =>
  Object.assign(new RoadSearchQueryDto(), { limit: 20, offset: 0 }, overrides);

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'road-1',
  title: 'Coastal ride',
  description: '',
  createdAt: new Date(0),
  userId: AUTHOR_ID,
  user: { nickName: 'ercan', firstName: 'Ercan', photo: null },
  favoriteRoads: [],
  _count: { stops: 4, favoriteRoads: 2 },
  stops: [],
  ...overrides,
});

const whereOf = (prisma: PrismaMock) =>
  prisma.road.findMany.mock.calls[0][0].where as {
    AND: Record<string, unknown>[];
  };

describe('searchTerm', () => {
  it('keeps a term long enough to exclude something', () => {
    expect(searchTerm('  coast ')).toBe('coast');
  });

  it.each([[undefined], [''], ['   '], ['a']])(
    'treats %p as no term at all',
    (value) => {
      // One character matches nearly every route, so it is the feed with extra
      // steps — and a table scan to produce it.
      expect(searchTerm(value)).toBeUndefined();
    },
  );
});

describe('RoadSearchService', () => {
  let service: RoadSearchService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadSearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RoadSearchService);
    prisma.road.count.mockResolvedValue(1);
    prisma.road.findMany.mockResolvedValue([row()]);
  });

  describe('visibility', () => {
    it('never reaches past public, live routes', async () => {
      await service.searchRoads(query({ q: 'coast' }), 'user-1');

      expect(whereOf(prisma).AND).toContainEqual({
        isPublic: true,
        archivedAt: null,
      });
    });

    it('keeps that clause even with no term and no filters', async () => {
      await service.searchRoads(query(), null);

      expect(whereOf(prisma).AND).toEqual([
        { isPublic: true, archivedAt: null },
      ]);
    });

    it('asks for the caller’s own favourite marks only when signed in', async () => {
      await service.searchRoads(query(), 'user-1');
      expect(
        prisma.road.findMany.mock.calls[0][0].select.favoriteRoads,
      ).toEqual({ where: { userId: 'user-1' }, select: { id: true } });

      prisma.road.findMany.mockClear();
      await service.searchRoads(query(), null);
      expect(prisma.road.findMany.mock.calls[0][0].select.favoriteRoads).toBe(
        false,
      );
    });
  });

  describe('the term', () => {
    it('matches the title, the description and the author', async () => {
      await service.searchRoads(query({ q: 'coast' }), null);

      expect(whereOf(prisma).AND).toContainEqual({
        OR: [
          { title: { contains: 'coast', mode: 'insensitive' } },
          { description: { contains: 'coast', mode: 'insensitive' } },
          { user: { nickName: { contains: 'coast', mode: 'insensitive' } } },
          { user: { firstName: { contains: 'coast', mode: 'insensitive' } } },
        ],
      });
    });

    it('adds no clause for a term too short to be worth one', async () => {
      await service.searchRoads(query({ q: 'c' }), null);

      expect(whereOf(prisma).AND).toHaveLength(1);
    });
  });

  describe('filters', () => {
    it('narrows to one author', async () => {
      await service.searchRoads(query({ authorId: AUTHOR_ID }), null);

      expect(whereOf(prisma).AND).toContainEqual({ userId: AUTHOR_ID });
    });

    it('reads a minimum stop count off the rank of the last stop', async () => {
      // order is a dense 1-based rank, so "has a stop ranked 5 or higher" is
      // the same question as "has at least 5 stops" — and unlike a count, it
      // is one the database can answer inside the same query.
      await service.searchRoads(query({ minStops: 5 }), null);

      expect(whereOf(prisma).AND).toContainEqual({
        stops: { some: { order: { gte: 5 } } },
      });
    });

    it('reads a maximum the same way, as the absence of a higher rank', async () => {
      await service.searchRoads(query({ maxStops: 3 }), null);

      expect(whereOf(prisma).AND).toContainEqual({
        stops: { none: { order: { gt: 3 } } },
      });
    });

    it('adds no minimum clause for zero, which excludes nothing', async () => {
      await service.searchRoads(query({ minStops: 0 }), null);

      expect(whereOf(prisma).AND).toHaveLength(1);
    });

    it('counts and pages against the same filtered set', async () => {
      await service.searchRoads(
        query({ minStops: 5, limit: 10, offset: 20 }),
        null,
      );

      expect(prisma.road.count.mock.calls[0][0].where).toEqual(whereOf(prisma));
      expect(prisma.road.findMany.mock.calls[0][0]).toMatchObject({
        skip: 20,
        take: 10,
      });
    });
  });

  describe('ordering', () => {
    it.each([
      ['recent', [{ createdAt: 'desc' }, { id: 'desc' }]],
      ['oldest', [{ createdAt: 'asc' }, { id: 'asc' }]],
      ['title', [{ title: 'asc' }, { id: 'asc' }]],
      [
        'popular',
        [{ favoriteRoads: { _count: 'desc' } }, { createdAt: 'desc' }],
      ],
      ['stops', [{ stops: { _count: 'desc' } }, { createdAt: 'desc' }]],
    ])('orders by %s', async (sort, expected) => {
      await service.searchRoads(query({ sort: sort as 'recent' }), null);

      expect(prisma.road.findMany.mock.calls[0][0].orderBy).toEqual(expected);
    });

    it('falls back to the newest first', async () => {
      await service.searchRoads(query(), null);

      expect(prisma.road.findMany.mock.calls[0][0].orderBy).toEqual([
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });
  });

  describe('the shape it returns', () => {
    it('names the author and counts what a card shows', async () => {
      const result = await service.searchRoads(query(), 'user-1');

      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'road-1',
          authorId: AUTHOR_ID,
          author: 'ercan',
          stopCount: 4,
          favoriteCount: 2,
          isFavorite: false,
        }),
      ]);
    });

    it('falls back through nickname, first name, then a stand-in', async () => {
      prisma.road.findMany.mockResolvedValue([
        row({ user: { nickName: null, firstName: 'Ercan', photo: null } }),
        row({ user: { nickName: null, firstName: null, photo: null } }),
      ]);

      const result = await service.searchRoads(query(), null);

      expect(
        (result.data as { author: string }[]).map((r) => r.author),
      ).toEqual(['Ercan', 'A traveller']);
    });

    it('marks a route the caller has already starred', async () => {
      prisma.road.findMany.mockResolvedValue([
        row({ favoriteRoads: [{ id: 'fav-1' }] }),
      ]);

      const result = await service.searchRoads(query(), 'user-1');

      expect((result.data as { isFavorite: boolean }[])[0].isFavorite).toBe(
        true,
      );
    });

    it('reports the unpaged total so the list can page', async () => {
      prisma.road.count.mockResolvedValue(97);

      const result = await service.searchRoads(query({ limit: 20 }), null);

      expect(result.meta).toEqual({
        total: 97,
        limit: 20,
        offset: 0,
        hasMore: true,
      });
    });
  });
});
