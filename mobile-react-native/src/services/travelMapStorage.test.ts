import AsyncStorage from '@react-native-async-storage/async-storage';

import travelMapStorage from './travelMapStorage';
import { MarkedArea } from 'types/travel-map';

const STORAGE_KEY = 'travel_map_areas_v1';

const izmir: MarkedArea = {
  placeId: 'izmir',
  name: 'İzmir',
  address: 'İzmir, Türkiye',
  kind: 'city',
  latitude: 38.42,
  longitude: 27.14,
  bounds: { north: 38.6, south: 38.2, east: 27.4, west: 26.9 },
  markedAt: '2026-01-01T00:00:00.000Z',
};

describe('travelMapStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back the places it stored', async () => {
    await travelMapStorage.save([izmir]);

    await expect(travelMapStorage.load()).resolves.toEqual([izmir]);
  });

  it('reports nothing on a device that has marked nothing', async () => {
    await expect(travelMapStorage.load()).resolves.toEqual([]);
  });

  it('ignores a stored value that is not a list', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{"izmir":true}');

    await expect(travelMapStorage.load()).resolves.toEqual([]);
  });

  it('ignores a stored value that is not JSON at all', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');

    await expect(travelMapStorage.load()).resolves.toEqual([]);
  });

  it('drops a place with no box to shade, and keeps the rest', async () => {
    // A polygon with an undefined corner takes the map down with it.
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...izmir, placeId: 'broken', bounds: { north: 38.6, south: 38.2 } },
        izmir,
      ]),
    );

    await expect(travelMapStorage.load()).resolves.toEqual([izmir]);
  });

  it('drops a place stored under a kind the app no longer knows', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...izmir, kind: 'continent' }]),
    );

    await expect(travelMapStorage.load()).resolves.toEqual([]);
  });

  it('forgets everything when the map is cleared', async () => {
    await travelMapStorage.save([izmir]);
    await travelMapStorage.clear();

    await expect(travelMapStorage.load()).resolves.toEqual([]);
  });
});
