/* eslint-env jest */

// expo-file-system's File is a native object. The stand-in reads the real file
// from disk and exposes the three members Expo's multipart encoder reads off a
// part — `bytes()`, `name` and `type` — so a test can encode a body for real.
jest.mock('expo-file-system', () => {
  const { readFileSync } = require('fs');
  const { basename, extname } = require('path');

  const MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  class File {
    constructor(uri) {
      this.uri = uri;
      const path = String(uri).replace(/^file:\/\//, '');
      this.name = basename(path);
      this.type = MIME[extname(path).toLowerCase()] ?? '';
      try {
        this._bytes = new Uint8Array(readFileSync(path));
      } catch {
        this._bytes = new Uint8Array();
      }
      this.size = this._bytes.length;
    }

    async bytes() {
      return this._bytes;
    }
  }

  return { File };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'denied',
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 41, longitude: 29 },
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

jest.mock(
  'constants/appConfig',
  () => ({
    __esModule: true,
    default: {
      baseUrl: 'http://api.test',
      shareLinkBaseUrl: '',
    },
  }),
  { virtual: true },
);
