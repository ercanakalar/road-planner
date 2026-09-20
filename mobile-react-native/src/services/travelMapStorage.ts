import localStorageService from './localStorageService';
import { isMarkedArea, MarkedArea } from 'types/travel-map';

const STORAGE_KEY = 'travel_map_areas_v1';

export const travelMapStorage = {
  async load(): Promise<MarkedArea[]> {
    try {
      const raw = await localStorageService.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(isMarkedArea);
    } catch {
      return [];
    }
  },

  async save(areas: MarkedArea[]): Promise<void> {
    try {
      await localStorageService.setItem(STORAGE_KEY, JSON.stringify(areas));
    } catch {
    }
  },

  async clear(): Promise<void> {
    try {
      await localStorageService.removeItem(STORAGE_KEY);
    } catch {}
  },
};

export default travelMapStorage;
