import localStorageService from './localStorageService';
import { isMarkedArea, MarkedArea } from 'types/travel-map';

const STORAGE_KEY = 'travel_map_areas_v1';

/**
 * The places somebody has coloured in, kept on the device.
 *
 * They belong to the phone rather than to an account: the travel map is
 * usable signed out, and nothing on the server knows about it yet. Anything
 * that does not read back as a marked area is dropped rather than drawn — see
 * {@link isMarkedArea}.
 */
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
      // A place that failed to write is still on screen for this run, and
      // failing the tap that marked it would be worse than losing it.
    }
  },

  async clear(): Promise<void> {
    try {
      await localStorageService.removeItem(STORAGE_KEY);
    } catch {}
  },
};

export default travelMapStorage;
