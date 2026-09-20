import localStorageService from './localStorageService';
import { LocalRoute } from 'types/local-route';

const STORAGE_KEY = 'local_roads_v1';

export const createLocalId = (prefix: 'road' | 'wp') =>
  `local-${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const isLocalRoute = (value: unknown): value is LocalRoute => {
  const route = value as LocalRoute | undefined;
  return (
    !!route &&
    typeof route.id === 'string' &&
    typeof route.title === 'string' &&
    Array.isArray(route.stops)
  );
};

const withFlatAddresses = (route: LocalRoute): LocalRoute => ({
  ...route,
  stops: route.stops.map((stop) => {
    const address: unknown = stop.address;

    if (typeof address === 'string') return stop;

    const legacy = (address as { address?: unknown } | null)?.address;

    return { ...stop, address: typeof legacy === 'string' ? legacy : '' };
  }),
});

export const localRouteStorage = {
  async load(): Promise<LocalRoute[]> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(isLocalRoute).map(withFlatAddresses);
    } catch {
      return [];
    }
  },

  async save(routes: LocalRoute[]): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch {
    }
  },

  async clear(): Promise<void> {
    try {
      await localStorageService.removeItem(STORAGE_KEY);
    } catch {
    }
  },
};

export default localRouteStorage;
