import { configureStore } from '@reduxjs/toolkit';

import { ROUTES_PAGE_SIZE } from 'constants/pagination';
import authReducer from 'store/slices/authSlice';
import { OwnRouteSummary } from 'types/map-screen-type';
import {
  flattenOwnRoutes,
  nextOwnRoutesOffset,
  routeService,
} from './routeService';

const route = (id: string, stops = 1): OwnRouteSummary => ({
  id,
  title: id,
  description: '',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  _count: { stops },
  isFavorite: false,
});

const page = (ids: string[], hasMore: boolean, total = 45) => ({
  items: ids.map((id) => route(id)),
  total,
  hasMore,
});

describe('nextOwnRoutesOffset', () => {
  it('asks for the next page while the server says there is more', () => {
    expect(nextOwnRoutesOffset(page(['a'], true), 0)).toBe(ROUTES_PAGE_SIZE);
    expect(nextOwnRoutesOffset(page(['a'], true), ROUTES_PAGE_SIZE)).toBe(
      2 * ROUTES_PAGE_SIZE,
    );
  });

  it('stops asking once the last page has arrived', () => {
    expect(nextOwnRoutesOffset(page(['a'], false), 40)).toBeUndefined();
  });
});

describe('flattenOwnRoutes', () => {
  it('joins the loaded pages in order', () => {
    expect(
      flattenOwnRoutes([page(['a', 'b'], true), page(['c'], false)]).map(
        ({ id }) => id,
      ),
    ).toEqual(['a', 'b', 'c']);
  });

  it('shows a route once when a deletion shifted it onto the next page too', () => {
    expect(
      flattenOwnRoutes([page(['a', 'b'], true), page(['b', 'c'], false)]).map(
        ({ id }) => id,
      ),
    ).toEqual(['a', 'b', 'c']);
  });

  it('is empty before anything has loaded', () => {
    expect(flattenOwnRoutes(undefined)).toEqual([]);
  });
});

describe('own routes over the network', () => {
  const makeStore = () =>
    configureStore({
      reducer: {
        auth: authReducer,
        [routeService.reducerPath]: routeService.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(routeService.middleware),
    });

  const envelope = (data: unknown, meta?: unknown) =>
    new Response(JSON.stringify({ status: 'success', data, meta }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  const requests = () =>
    (global.fetch as jest.Mock).mock.calls.map(
      ([request]) => new URL((request as Request).url),
    );

  beforeEach(() => {
    global.fetch = jest.fn(async (request: Request) => {
      const url = new URL(request.url);

      if (url.pathname.endsWith('/own-roads/summary')) {
        return envelope({ routes: 45, publicRoutes: 4, stops: 312, favorites: 6 });
      }

      const offset = Number(url.searchParams.get('offset') ?? 0);
      const ids = Array.from(
        { length: Math.min(ROUTES_PAGE_SIZE, 45 - offset) },
        (_, index) => `route-${offset + index}`,
      );

      return envelope(
        ids.map((id) => route(id)),
        { total: 45, hasMore: offset + ids.length < 45 },
      );
    }) as never;
  });

  it('loads a page at a time as the list asks for more, then stops', async () => {
    const store = makeStore();
    const { getOwnRoutes } = routeService.endpoints;

    const first = store.dispatch(getOwnRoutes.initiate(undefined));
    await first;
    await store.dispatch(
      getOwnRoutes.initiate(undefined, { direction: 'forward' }),
    );
    await store.dispatch(
      getOwnRoutes.initiate(undefined, { direction: 'forward' }),
    );

    const offsets = requests().map((url) => url.searchParams.get('offset'));
    expect(offsets).toEqual([null, String(ROUTES_PAGE_SIZE), String(2 * ROUTES_PAGE_SIZE)]);
    expect(
      requests().every(
        (url) => url.searchParams.get('limit') === String(ROUTES_PAGE_SIZE),
      ),
    ).toBe(true);

    const state = getOwnRoutes.select(undefined)(store.getState());
    expect(flattenOwnRoutes(state.data?.pages)).toHaveLength(45);
    expect(state.hasNextPage).toBe(false);

    first.unsubscribe();
  });

  it('gets the totals from their own endpoint, whatever has been loaded', async () => {
    const store = makeStore();

    const result = await store.dispatch(
      routeService.endpoints.getOwnRoutesSummary.initiate(undefined),
    );

    expect(result.data).toEqual({
      routes: 45,
      publicRoutes: 4,
      stops: 312,
      favorites: 6,
    });
    expect(requests()[0].pathname).toBe('/api/road/own-roads/summary');
  });
});
