import AsyncStorage from '@react-native-async-storage/async-storage';

import kvkkStorage from './kvkkStorage';
import { KvkkConsentRecord } from 'types/kvkk';

const STORAGE_KEY = 'kvkk_consent_v1';

const record: KvkkConsentRecord = {
  version: '2026-08-24',
  acceptedAt: '2026-08-24T09:00:00.000Z',
  language: 'tr',
};

describe('kvkkStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back the consent it stored', async () => {
    await kvkkStorage.save(record);

    await expect(kvkkStorage.load()).resolves.toEqual(record);
  });

  it('reports no consent on a device that never gave one', async () => {
    await expect(kvkkStorage.load()).resolves.toBeNull();
  });

  it('ignores a stored value that is not a consent record', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{"version":"2026-08-24"}');

    await expect(kvkkStorage.load()).resolves.toBeNull();
  });

  it('ignores a record naming a language the app does not have', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...record, language: 'de' }),
    );

    await expect(kvkkStorage.load()).resolves.toBeNull();
  });

  it('ignores unparseable storage rather than throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json');

    await expect(kvkkStorage.load()).resolves.toBeNull();
  });

  it('leaves nothing behind when the consent is withdrawn', async () => {
    await kvkkStorage.save(record);

    await kvkkStorage.clear();

    await expect(AsyncStorage.getItem(STORAGE_KEY)).resolves.toBeNull();
    await expect(kvkkStorage.load()).resolves.toBeNull();
  });
});
