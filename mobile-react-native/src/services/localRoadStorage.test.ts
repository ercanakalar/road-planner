import AsyncStorage from '@react-native-async-storage/async-storage';

import localRoadStorage from './localRoadStorage';
import { LocalRoad } from 'types/local-road';

const STORAGE_KEY = 'local_roads_v1';

const road = (wayPoints: unknown[]) => ({
  id: 'local-road-1',
  title: 'Trip',
  description: '',
  wayPoints,
  createdAt: '',
  updatedAt: '',
});

const write = (roads: unknown[]) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(roads));

describe('localRoadStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back the roads it stored', async () => {
    const saved: LocalRoad[] = [
      road([
        { id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: 'Konak' },
      ]) as LocalRoad,
    ];

    await localRoadStorage.save(saved);

    await expect(localRoadStorage.load()).resolves.toEqual(saved);
  });

  describe('roads saved before the address became a plain string', () => {
    it('flattens the old address object down to its address line', async () => {
      await write([
        road([
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

      const [loaded] = await localRoadStorage.load();

      // Left alone this renders as "[object Object]" on the card.
      expect(loaded.wayPoints[0].address).toBe('Konak, İzmir');
    });

    it('treats an old pin with no address line as unnamed', async () => {
      await write([
        road([{ id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: {} }]),
      ]);

      const [loaded] = await localRoadStorage.load();

      expect(loaded.wayPoints[0].address).toBe('');
    });

    it('survives a waypoint with no address at all', async () => {
      await write([
        road([{ id: 'wp-1', latitude: 1, longitude: 2, order: 1 }]),
      ]);

      const [loaded] = await localRoadStorage.load();

      expect(loaded.wayPoints[0].address).toBe('');
    });

    it('leaves an already-flat address untouched', async () => {
      await write([
        road([
          { id: 'wp-1', latitude: 1, longitude: 2, order: 1, address: 'Konak' },
        ]),
      ]);

      const [loaded] = await localRoadStorage.load();

      expect(loaded.wayPoints[0].address).toBe('Konak');
    });
  });

  it('returns nothing when there is nothing stored', async () => {
    await expect(localRoadStorage.load()).resolves.toEqual([]);
  });

  it('ignores stored junk rather than throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');

    await expect(localRoadStorage.load()).resolves.toEqual([]);
  });
});
