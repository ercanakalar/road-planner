import AsyncStorage from '@react-native-async-storage/async-storage';

import collectionCacheStorage from './collectionCacheStorage';

const STORAGE_KEY = 'collection_cache_v1';

const favorites = {
  ownRoutes: [],
  ownStops: [],
  othersRoutes: [],
  othersStops: [],
};

const ownRoutes = {
  pages: [{ items: [], total: 0, hasMore: false }],
  pageParams: [0],
};

const summary = { routes: 3, publicRoutes: 1, stops: 9, favorites: 2 };

describe('collectionCacheStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back what was saved for the same account', async () => {
    await collectionCacheStorage.save('user-1', { favorites });
    await collectionCacheStorage.save('user-1', { ownRoutes });
    await collectionCacheStorage.save('user-1', { summary });

    await expect(collectionCacheStorage.load('user-1')).resolves.toEqual({
      userId: 'user-1',
      favorites,
      ownRoutes,
      summary,
    });
  });

  it('never hands one account another account’s data', async () => {
    await collectionCacheStorage.save('user-1', { favorites, summary });

    await expect(collectionCacheStorage.load('user-2')).resolves.toBeNull();
  });

  it('starts afresh when another account saves', async () => {
    await collectionCacheStorage.save('user-1', { favorites, summary });
    await collectionCacheStorage.save('user-2', { ownRoutes });

    await expect(collectionCacheStorage.load('user-2')).resolves.toEqual({
      userId: 'user-2',
      ownRoutes,
    });
  });

  it('keeps every part when answers are saved at the same moment', async () => {
    await Promise.all([
      collectionCacheStorage.save('user-1', { favorites }),
      collectionCacheStorage.save('user-1', { ownRoutes }),
      collectionCacheStorage.save('user-1', { summary }),
    ]);

    await expect(collectionCacheStorage.load('user-1')).resolves.toEqual({
      userId: 'user-1',
      favorites,
      ownRoutes,
      summary,
    });
  });

  it('forgets everything when cleared', async () => {
    await collectionCacheStorage.save('user-1', { favorites });
    await collectionCacheStorage.clear();

    await expect(collectionCacheStorage.load('user-1')).resolves.toBeNull();
    await expect(AsyncStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
  });

  it('drops a part whose shape it does not recognise', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: 'user-1',
        favorites: { ownRoutes: 'not a list' },
        ownRoutes: { pages: [{ items: [] }], pageParams: [] },
        summary,
      }),
    );

    await expect(collectionCacheStorage.load('user-1')).resolves.toEqual({
      userId: 'user-1',
      favorites: undefined,
      ownRoutes: undefined,
      summary,
    });
  });

  it('treats unreadable storage as nothing saved', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not json');

    await expect(collectionCacheStorage.load('user-1')).resolves.toBeNull();
  });
});
