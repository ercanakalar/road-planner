import AsyncStorage from '@react-native-async-storage/async-storage';

import localRouteStorage from './localRouteStorage';
import { LocalRoute } from 'types/local-route';

const STORAGE_KEY = 'local_roads_v1';

const route = (stops: unknown[]) => ({
  id: 'local-route-1',
  title: 'Trip',
  description: '',
  stops,
  createdAt: '',
  updatedAt: '',
});

const write = (routes: unknown[]) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routes));

describe('localRouteStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back the routes it stored', async () => {
    const saved: LocalRoute[] = [
      route([
        { id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: 'Konak' },
      ]) as LocalRoute,
    ];

    await localRouteStorage.save(saved);

    await expect(localRouteStorage.load()).resolves.toEqual(saved);
  });

  describe('routes saved before the address became a plain string', () => {
    it('flattens the old address object down to its address line', async () => {
      await write([
        route([
          {
            id: 'wp-1',
            latitude: 1,
            longitude: 2,
            order: 1,
            address: {
              address: 'Konak, İzmir',
              country: 'Türkiye',
              province: 'İzmir',
              district: 'Konak',
            },
          },
        ]),
      ]);

      const [loaded] = await localRouteStorage.load();

      // Left alone this renders as "[object Object]" on the card.
      expect(loaded.stops[0].address).toBe('Konak, İzmir');
    });

    it('treats an old pin with no address line as unnamed', async () => {
      await write([
        route([{ id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: {} }]),
      ]);

      const [loaded] = await localRouteStorage.load();

      expect(loaded.stops[0].address).toBe('');
    });

    it('survives a stop with no address at all', async () => {
      await write([
        route([{ id: 'wp-1', latitude: 1, longitude: 2, order: 1 }]),
      ]);

      const [loaded] = await localRouteStorage.load();

      expect(loaded.stops[0].address).toBe('');
    });

    it('leaves an already-flat address untouched', async () => {
      await write([
        route([
          { id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: 'Konak' },
        ]),
      ]);

      const [loaded] = await localRouteStorage.load();

      expect(loaded.stops[0].address).toBe('Konak');
    });
  });

  it('returns nothing when there is nothing stored', async () => {
    await expect(localRouteStorage.load()).resolves.toEqual([]);
  });

  it('ignores stored junk rather than throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');

    await expect(localRouteStorage.load()).resolves.toEqual([]);
  });
});
