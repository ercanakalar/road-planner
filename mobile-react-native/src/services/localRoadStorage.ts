import localStorageService from './localStorageService';
import { LocalRoad } from 'types/local-road';

const STORAGE_KEY = 'local_roads_v1';

export const createLocalId = (prefix: 'road' | 'wp') =>
  `local-${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const isLocalRoad = (value: unknown): value is LocalRoad => {
  const road = value as LocalRoad | undefined;
  return (
    !!road &&
    typeof road.id === 'string' &&
    typeof road.title === 'string' &&
    Array.isArray(road.wayPoints)
  );
};

/**
 * Routes saved before the address became a plain string hold `{ address, country,
 * … }` under that key. Left alone they would render as "[object Object]", so the
 * shape is corrected on the way in rather than everywhere it is read.
 */
const withFlatAddresses = (road: LocalRoad): LocalRoad => ({
  ...road,
  wayPoints: road.wayPoints.map((waypoint) => {
    const address: unknown = waypoint.address;

    if (typeof address === 'string') return waypoint;

    const legacy = (address as { address?: unknown } | null)?.address;

    return { ...waypoint, address: typeof legacy === 'string' ? legacy : '' };
  }),
});

export const localRoadStorage = {
  async load(): Promise<LocalRoad[]> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(isLocalRoad).map(withFlatAddresses);
    } catch {
      return [];
    }
  },

  async save(roads: LocalRoad[]): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(roads));
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

export default localRoadStorage;
