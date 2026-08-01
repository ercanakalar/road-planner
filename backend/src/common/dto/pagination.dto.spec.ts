import { collectDtoErrors, validateDto } from 'src/testing/validate-dto';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  pageMeta,
  PaginationQueryDto,
} from './pagination.dto';

describe('PaginationQueryDto', () => {
  it('defaults to the first page when nothing is supplied', async () => {
    const result = await validateDto(PaginationQueryDto, {});

    expect(result).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
  });

  it('coerces a query string to numbers', async () => {
    const result = await validateDto(PaginationQueryDto, {
      limit: '25',
      offset: '50',
    });

    expect(result).toEqual({ limit: 25, offset: 50 });
  });

  it('accepts an offset of zero', async () => {
    await expect(
      collectDtoErrors(PaginationQueryDto, { offset: '0' }),
    ).resolves.toEqual([]);
  });

  it('accepts the maximum page size', async () => {
    const result = await validateDto(PaginationQueryDto, {
      limit: String(MAX_PAGE_SIZE),
    });

    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it('rejects a page size above the ceiling', async () => {
    await expect(
      collectDtoErrors(PaginationQueryDto, {
        limit: String(MAX_PAGE_SIZE + 1),
      }),
    ).resolves.not.toEqual([]);
  });

  it.each(['0', '-1'])('rejects a limit of %s', async (limit) => {
    await expect(
      collectDtoErrors(PaginationQueryDto, { limit }),
    ).resolves.not.toEqual([]);
  });

  it('rejects a negative offset', async () => {
    await expect(
      collectDtoErrors(PaginationQueryDto, { offset: '-1' }),
    ).resolves.not.toEqual([]);
  });

  it.each(['abc', '1.5', 'Infinity', 'NaN', '1e3000'])(
    'rejects a non-integer limit %p',
    async (limit) => {
      await expect(
        collectDtoErrors(PaginationQueryDto, { limit }),
      ).resolves.not.toEqual([]);
    },
  );

  it.each([
    ['an object', {}],
    ['an array', []],
    ['a boolean', true],
  ])('rejects a limit that is %s', async (_label, limit) => {
    await expect(
      collectDtoErrors(PaginationQueryDto, { limit }),
    ).resolves.not.toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['blank', ''],
  ])(
    'falls back to the default page size for a %s limit',
    async (_l, limit) => {
      const result = await validateDto(PaginationQueryDto, { limit });

      expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
    },
  );

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['blank', ''],
  ])('falls back to offset 0 for a %s offset', async (_l, offset) => {
    const result = await validateDto(PaginationQueryDto, { offset });

    expect(result.offset).toBe(0);
  });

  it('never yields a nullish limit', async () => {
    for (const limit of [null, undefined, '', '10', 10]) {
      const result = await validateDto(PaginationQueryDto, { limit });
      expect(typeof result.limit).toBe('number');
    }
  });

  it('treats a blank limit as unset', async () => {
    const result = await validateDto(PaginationQueryDto, { limit: '' });

    expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('strips undeclared query parameters', async () => {
    const result = await validateDto(PaginationQueryDto, {
      limit: '10',
      sort: 'title',
    });

    expect(result).toEqual({ limit: 10, offset: 0 });
  });
});

describe('pageMeta', () => {
  const page = (limit: number, offset: number) =>
    Object.assign(new PaginationQueryDto(), { limit, offset });

  it('reports the window and the total', () => {
    expect(pageMeta(120, page(50, 0))).toEqual({
      total: 120,
      limit: 50,
      offset: 0,
      hasMore: true,
    });
  });

  it('reports no more when the page reaches the end exactly', () => {
    expect(pageMeta(100, page(50, 50)).hasMore).toBe(false);
  });

  it('reports no more when the page runs past the end', () => {
    expect(pageMeta(60, page(50, 50)).hasMore).toBe(false);
  });

  it('reports no more for an empty collection', () => {
    expect(pageMeta(0, page(50, 0)).hasMore).toBe(false);
  });

  it('reports more when a single row remains', () => {
    expect(pageMeta(51, page(50, 0)).hasMore).toBe(true);
  });
});
