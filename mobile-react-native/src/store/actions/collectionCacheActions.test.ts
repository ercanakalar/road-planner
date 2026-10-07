import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';

import collectionCacheStorage, {
  CollectionSnapshot,
} from 'services/collectionCacheStorage';
import authMiddleware from 'store/middlewares/auth-middleware';
import persistenceMiddleware from 'store/middlewares/persistence-middleware';
import { favoriteService } from 'store/services/favoriteService';
import { routeService } from 'store/services/routeService';
import authReducer, { logout, sessionRestored } from 'store/slices/authSlice';
import type { AppDispatch } from 'store';
import { hydrateCollections } from './collectionCacheActions';

const SESSION = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  userId: 'user-1',
};

const stores: ReturnType<typeof configureStoreForTest>[] = [];

const makeStore = () => {
  const store = configureStoreForTest();
  stores.push(store);
  return store;
};

const configureStoreForTest = () =>
  configureStore({
    reducer: combineReducers({
      auth: authReducer,
      [routeService.reducerPath]: routeService.reducer,
      [favoriteService.reducerPath]: favoriteService.reducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false, immutableCheck: false })
        .prepend(authMiddleware.middleware, persistenceMiddleware.middleware)
        .concat(routeService.middleware, favoriteService.middleware),
    // Batched notifications wait for an animation frame, which the React
    // Native preset fakes with a timer that would outlive the test.
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers({ autoBatch: false }),
  });

type Store = ReturnType<typeof makeStore>;

const route = (id: string) => ({
  id,
  userId: 'user-1',
  title: `Route ${id}`,
  description: '',
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  _count: { stops: 2 },
  isFavorite: false,
});

const favoriteRow = (id: string) => ({
  id: `fav-${id}`,
  title: null,
  description: null,
  road: {
    id,
    title: `Route ${id}`,
    description: 'D',
    userId: 'user-1',
    archivedAt: null,
  },
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// The server as it answers right now: one route, one favourite, totals of 1.
const serverAnswers = (request: Request) => {
  const { pathname } = new URL(request.url);
  if (pathname.endsWith('/road/own-roads/summary')) {
    return json({
      data: { routes: 1, publicRoutes: 0, stops: 2, favorites: 1 },
    });
  }
  if (pathname.endsWith('/road/own-roads')) {
    return json({
      data: [route('fresh')],
      meta: { total: 1, limit: 5, offset: 0, hasMore: false },
    });
  }
  if (pathname.endsWith('/favorites')) {
    return json({
      data: {
        ownRoads: [favoriteRow('fresh')],
        ownStops: [],
        othersRoads: [],
        othersStops: [],
      },
    });
  }
  return json({ data: null });
};

// What the last session left behind: different from the server's answers,
// so it is plain which of the two the cache holds.
const SNAPSHOT: CollectionSnapshot = {
  userId: 'user-1',
  favorites: {
    ownRoutes: [
      {
        favoriteId: 'fav-saved',
        targetId: 'saved',
        kind: 'route',
        title: 'Route saved',
        defaultTitle: 'Route saved',
        isOwn: true,
        isWithdrawn: false,
      },
    ],
    ownStops: [],
    othersRoutes: [],
    othersStops: [],
  },
  ownRoutes: {
    pages: [{ items: [route('saved')], total: 9, hasMore: true }],
    pageParams: [0],
  },
  summary: { routes: 9, publicRoutes: 4, stops: 30, favorites: 5 },
};

const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const cached = (store: Store) => {
  const state = store.getState();
  return {
    favorites:
      favoriteService.endpoints.getFavorites.select(undefined)(state).data,
    ownRoutes:
      routeService.endpoints.getOwnRoutes.select(undefined)(state).data,
    summary:
      routeService.endpoints.getOwnRoutesSummary.select(undefined)(state).data,
  };
};

const requestedPaths = () =>
  (global.fetch as jest.Mock).mock.calls.map(
    ([request]) => new URL((request as Request).url).pathname,
  );

// The cache keeps unused answers on a timer; resetting it clears the timers,
// so none of them fires after the test has finished.
afterEach(async () => {
  for (const store of stores.splice(0)) {
    store.dispatch(routeService.util.resetApiState());
    store.dispatch(favoriteService.util.resetApiState());
  }
  await settle();
});

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest
    .fn()
    .mockImplementation(async (request: Request) =>
      serverAnswers(request),
    ) as never;
});

describe('collections kept between launches', () => {
  it('opens the screens on what the last session saved, before any request', async () => {
    const store = makeStore();

    await (store.dispatch as AppDispatch)(hydrateCollections(SNAPSHOT));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(cached(store)).toEqual({
      favorites: SNAPSHOT.favorites,
      ownRoutes: SNAPSHOT.ownRoutes,
      summary: SNAPSHOT.summary,
    });
  });

  it('asks the server again once the session is restored, and its answer wins', async () => {
    const store = makeStore();
    await (store.dispatch as AppDispatch)(hydrateCollections(SNAPSHOT));

    store.dispatch(sessionRestored(SESSION));
    await settle();

    expect(requestedPaths()).toEqual(
      expect.arrayContaining([
        '/api/road/own-roads',
        '/api/road/own-roads/summary',
        '/api/favorites',
      ]),
    );
    const now = cached(store);
    expect(now.ownRoutes?.pages).toHaveLength(1);
    expect(now.ownRoutes?.pages[0].items.map((r) => r.id)).toEqual(['fresh']);
    expect(now.summary).toEqual({
      routes: 1,
      publicRoutes: 0,
      stops: 2,
      favorites: 1,
    });
    expect(now.favorites?.ownRoutes.map((f) => f.targetId)).toEqual(['fresh']);
  });

  it('does not fetch at launch for someone signed out', async () => {
    const store = makeStore();

    store.dispatch(sessionRestored(null));
    await settle();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('saves the server’s answers for the next launch, the first page only', async () => {
    const store = makeStore();

    store.dispatch(sessionRestored(SESSION));
    await settle();

    const saved = await collectionCacheStorage.load('user-1');
    expect(saved?.summary).toEqual({
      routes: 1,
      publicRoutes: 0,
      stops: 2,
      favorites: 1,
    });
    expect(saved?.ownRoutes).toEqual({
      pages: [{ items: [route('fresh')], total: 1, hasMore: false }],
      pageParams: [0],
    });
    expect(saved?.favorites).toEqual(cached(store).favorites);
  });

  it('saves nothing once nobody is signed in', async () => {
    const store = makeStore();

    await store.dispatch(
      routeService.endpoints.getOwnRoutesSummary.initiate(undefined),
    );
    await settle();

    await expect(AsyncStorage.getItem('collection_cache_v1')).resolves.toBe(
      null,
    );
  });

  it('forgets the saved answers when the person signs out', async () => {
    const store = makeStore();
    store.dispatch(sessionRestored(SESSION));
    await settle();
    expect(await collectionCacheStorage.load('user-1')).not.toBeNull();

    store.dispatch(logout());
    await settle();

    await expect(collectionCacheStorage.load('user-1')).resolves.toBeNull();
  });
});
