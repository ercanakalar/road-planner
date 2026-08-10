/* eslint-env jest */

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
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'denied',
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 41, longitude: 29 },
  })),
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
      mapApiKey: 'test-key',
      shareLinkBaseUrl: '',
    },
  }),
  { virtual: true },
);
