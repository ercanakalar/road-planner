import { appendPage, pagedCacheKey, refetchOnNewPage } from './paging';
import { Page } from 'types/store/bases';

const page = (ids: string[], overrides: Partial<Page<{ id: string }>> = {}) => ({
  items: ids.map((id) => ({ id })),
  total: 100,
  hasMore: true,
  ...overrides,
});

const ids = (result: Page<{ id: string }>) => result.items.map((i) => i.id);

type SearchArgs = { q?: string; sort?: string; offset?: number };

const keyOf = (queryArgs: SearchArgs, endpointName = 'searchRoutes') =>
  pagedCacheKey({ endpointName, queryArgs });

describe('pagedCacheKey', () => {
  it('gives every page of one search the same key', () => {
    const args: SearchArgs = { q: 'coast', sort: 'recent' };

    expect(keyOf(args)).toBe(keyOf({ ...args, offset: 60 }));
  });

  it('gives a different question a key of its own', () => {
    expect(keyOf({ q: 'coast', sort: 'recent' })).not.toBe(
      keyOf({ q: 'coast', sort: 'popular' }),
    );
  });

  it('does not depend on the order the arguments were written in', () => {
    expect(keyOf({ q: 'coast', sort: 'recent' })).toBe(
      keyOf({ sort: 'recent', q: 'coast' }),
    );
  });

  it('keeps two endpoints apart', () => {
    expect(keyOf({ q: 'a' })).not.toBe(keyOf({ q: 'a' }, 'searchAuthors'));
  });
});

describe('appendPage', () => {
  it('adds the next page under what is already there', () => {
    const merged = appendPage(page(['a', 'b']), page(['c', 'd']), 30);

    expect(ids(merged)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('replaces rather than appends at the first page', () => {
    const merged = appendPage(page(['a', 'b']), page(['c']), 0);

    expect(ids(merged)).toEqual(['c']);
  });

  it('treats a missing offset as the first page', () => {
    expect(ids(appendPage(page(['a']), page(['c']), undefined))).toEqual(['c']);
  });

  it('drops a row that arrives twice', () => {
    const merged = appendPage(page(['a', 'b']), page(['b', 'c']), 30);

    expect(ids(merged)).toEqual(['a', 'b', 'c']);
  });

  it('takes the counts from the newest answer', () => {
    const merged = appendPage(
      page(['a'], { total: 100, hasMore: true }),
      page(['b'], { total: 98, hasMore: false }),
      30,
    );

    expect(merged.total).toBe(98);
    expect(merged.hasMore).toBe(false);
  });
});

describe('refetchOnNewPage', () => {
  it('asks again when the page moved', () => {
    expect(
      refetchOnNewPage({ currentArg: { offset: 30 }, previousArg: { offset: 0 } }),
    ).toBe(true);
  });

  it('does not ask again for the same page', () => {
    expect(
      refetchOnNewPage({ currentArg: { offset: 30 }, previousArg: { offset: 30 } }),
    ).toBe(false);
  });

  it('reads a missing offset as the first page', () => {
    expect(
      refetchOnNewPage({ currentArg: {}, previousArg: { offset: 0 } }),
    ).toBe(false);
  });
});
