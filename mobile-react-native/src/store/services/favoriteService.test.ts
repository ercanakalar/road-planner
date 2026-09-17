import { configureStore } from '@reduxjs/toolkit';

import authReducer from 'store/slices/authSlice';
import { SearchRoutesArgs } from 'types/store/services/searchService-type';
import { favoriteService } from './favoriteService';
import { routeService } from './routeService';
import { searchService } from './searchService';

const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [favoriteService.reducerPath]: favoriteService.reducer,
      [routeService.reducerPath]: routeService.reducer,
      [searchService.reducerPath]: searchService.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        favoriteService.middleware,
        routeService.middleware,
        searchService.middleware,
      ),
  });

const hit = (id: string, isFavorite = false) => ({
  id,
  title: `Route ${id}`,
  description: '',
  createdAt: '2026-09-15T00:00:00.000Z',
  authorId: 'a1',
  author: 'ercan',
  authorPhoto: null,
  stopCount: 4,
  favoriteCount: isFavorite ? 3 : 2,
  isFavorite,
  stops: [],
});

const page = (items: ReturnType<typeof hit>[]) =>
  new Response(
    JSON.stringify({
      status: 'success',
      data: items,
      meta: { total: items.length, limit: 30, offset: 0, hasMore: false },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

const ok = (body: unknown) =>
  new Response(JSON.stringify({ status: 'success', data: body }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** The rows as the search screen would render them, for the given filters. */
const rows = (store: ReturnType<typeof makeStore>, args: SearchRoutesArgs) =>
  searchService.endpoints.searchRoutes.select(args)(store.getState() as never)
    .data?.items;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toggleFavoriteRoute', () => {
  it('flips the heart on a search row without re-reading the list', async () => {
    // Search lives in its own API slice: invalidating a Route tag never
    // reached it, so the heart stayed as it was until the entry expired.
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([hit('r1'), hit('r2')]))
      .mockResolvedValue(ok({ isFavorite: true })) as never;

    const store = makeStore();
    const args: SearchRoutesArgs = { q: 'coast', sort: 'recent', offset: 0 };

    const listing = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(args),
    );
    await listing;

    expect(rows(store, args)?.find((r) => r.id === 'r1')?.isFavorite).toBe(
      false,
    );

    await store.dispatch(
      favoriteService.endpoints.toggleFavoriteRoute.initiate({
        routeId: 'r1',
      }),
    );

    const after = rows(store, args);
    expect(after?.find((r) => r.id === 'r1')?.isFavorite).toBe(true);
    expect(after?.find((r) => r.id === 'r2')?.isFavorite).toBe(false);

    listing.unsubscribe();
  });

  it('reaches the same route in every list it is showing in', async () => {
    // A person's page is this query again with an authorId, so one route can
    // sit in two cache entries at once and both hearts have to move.
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([hit('r1')]))
      .mockResolvedValueOnce(page([hit('r1')]))
      .mockResolvedValue(ok({ isFavorite: true })) as never;

    const store = makeStore();
    const search: SearchRoutesArgs = { q: 'coast', sort: 'recent', offset: 0 };
    const authorPage: SearchRoutesArgs = {
      q: '',
      sort: 'recent',
      authorId: 'a1',
      offset: 0,
    };

    const a = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(search),
    );
    const b = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(authorPage),
    );
    await Promise.all([a, b]);

    await store.dispatch(
      favoriteService.endpoints.toggleFavoriteRoute.initiate({
        routeId: 'r1',
      }),
    );

    expect(rows(store, search)?.[0].isFavorite).toBe(true);
    expect(rows(store, authorPage)?.[0].isFavorite).toBe(true);

    a.unsubscribe();
    b.unsubscribe();
  });

  it('unfavourites an already saved route', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([hit('r1', true)]))
      .mockResolvedValue(ok({ isFavorite: false })) as never;

    const store = makeStore();
    const args: SearchRoutesArgs = { q: 'coast', sort: 'recent', offset: 0 };

    const listing = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(args),
    );
    await listing;

    await store.dispatch(
      favoriteService.endpoints.toggleFavoriteRoute.initiate({
        routeId: 'r1',
      }),
    );

    expect(rows(store, args)?.[0].isFavorite).toBe(false);
    expect(rows(store, args)?.[0].favoriteCount).toBe(2);

    listing.unsubscribe();
  });

  it('puts the heart back when the write does not land', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([hit('r1')]))
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'error' }), { status: 500 }),
      ) as never;

    const store = makeStore();
    const args: SearchRoutesArgs = { q: 'coast', sort: 'recent', offset: 0 };

    const listing = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(args),
    );
    await listing;

    await store.dispatch(
      favoriteService.endpoints.toggleFavoriteRoute.initiate({
        routeId: 'r1',
      }),
    );

    expect(rows(store, args)?.[0].isFavorite).toBe(false);
    expect(rows(store, args)?.[0].favoriteCount).toBe(2);

    listing.unsubscribe();
  });

  it('leaves a list that does not hold the route alone', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([hit('other')]))
      .mockResolvedValue(ok({ isFavorite: true })) as never;

    const store = makeStore();
    const args: SearchRoutesArgs = { q: 'coast', sort: 'recent', offset: 0 };

    const listing = store.dispatch(
      searchService.endpoints.searchRoutes.initiate(args),
    );
    await listing;

    await store.dispatch(
      favoriteService.endpoints.toggleFavoriteRoute.initiate({
        routeId: 'r1',
      }),
    );

    expect(rows(store, args)?.[0].isFavorite).toBe(false);

    listing.unsubscribe();
  });
});
