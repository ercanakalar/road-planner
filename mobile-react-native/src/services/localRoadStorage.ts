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

export const localRoadStorage = {
  async load(): Promise<LocalRoad[]> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isLocalRoad) : [];
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
