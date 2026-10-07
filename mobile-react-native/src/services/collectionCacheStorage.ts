import localStorageService from './localStorageService';
import type { InfiniteData } from '@reduxjs/toolkit/query';
import type { GetAllFavoritesResponse } from 'types/store/services/favoriteService-type';
import type {
  GetOwnRoutesResponse,
  OwnRoutesSummary,
} from 'types/store/services/routeService-type';

// The last answers the Routes and Favourites screens got, kept on the phone so
// that at launch they show what was there last time while the server is
// asked again — instead of a spinner for as long as the server takes to wake.
// It belongs to one account: it is read back only for the same one, and it is
// removed when the session ends.
const STORAGE_KEY = 'collection_cache_v1';

export type CollectionSnapshot = {
  userId: string;
  favorites?: GetAllFavoritesResponse;
  ownRoutes?: InfiniteData<GetOwnRoutesResponse, number>;
  summary?: OwnRoutesSummary;
};

export type CollectionPart = Omit<CollectionSnapshot, 'userId'>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFavorites = (value: unknown): value is GetAllFavoritesResponse =>
  isObject(value) &&
  ['ownRoutes', 'ownStops', 'othersRoutes', 'othersStops'].every((key) =>
    Array.isArray(value[key]),
  );

const isOwnRoutes = (
  value: unknown,
): value is InfiniteData<GetOwnRoutesResponse, number> =>
  isObject(value) &&
  Array.isArray(value.pages) &&
  Array.isArray(value.pageParams) &&
  value.pages.length === value.pageParams.length &&
  value.pages.every((page) => isObject(page) && Array.isArray(page.items));

const isSummary = (value: unknown): value is OwnRoutesSummary =>
  isObject(value) &&
  ['routes', 'publicRoutes', 'stops', 'favorites'].every(
    (key) => typeof value[key] === 'number',
  );

// Whatever cannot be recognised is dropped rather than shown: an app update
// may have changed a shape, and a screen is better empty for a moment than
// broken.
const parse = (raw: string): CollectionSnapshot | null => {
  const value: unknown = JSON.parse(raw);
  if (!isObject(value) || typeof value.userId !== 'string') return null;

  return {
    userId: value.userId,
    favorites: isFavorites(value.favorites) ? value.favorites : undefined,
    ownRoutes: isOwnRoutes(value.ownRoutes) ? value.ownRoutes : undefined,
    summary: isSummary(value.summary) ? value.summary : undefined,
  };
};

// Saves are chained so that two answers arriving together cannot each read
// the old snapshot and the slower one write away the other's part.
let pending: Promise<unknown> = Promise.resolve();

const serially = <T>(task: () => Promise<T>): Promise<T> => {
  const run = pending.then(task, task);
  pending = run.catch(() => undefined);
  return run;
};

const read = async (): Promise<CollectionSnapshot | null> => {
  try {
    const raw = await localStorageService.getItem(STORAGE_KEY);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
};

export const collectionCacheStorage = {
  async load(userId: string): Promise<CollectionSnapshot | null> {
    const snapshot = await read();
    return snapshot?.userId === userId ? snapshot : null;
  },

  save(userId: string, part: CollectionPart): Promise<void> {
    return serially(async () => {
      try {
        const current = await read();
        const base = current?.userId === userId ? current : { userId };
        await localStorageService.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...base, ...part, userId }),
        );
      } catch {}
    });
  },

  clear(): Promise<void> {
    return serially(async () => {
      try {
        await localStorageService.removeItem(STORAGE_KEY);
      } catch {}
    });
  },
};

export default collectionCacheStorage;
