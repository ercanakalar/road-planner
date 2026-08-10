import bundledNativeModules from 'expo/bundledNativeModules.json';

import packageJson from '../../package.json';

const pinned: Record<string, string> = bundledNativeModules;
const declared: Record<string, string> = packageJson.dependencies;

describe('Expo SDK package versions', () => {
  const managed = Object.keys(declared).filter((name) => name in pinned);

  it('covers a meaningful number of packages', () => {
    expect(managed.length).toBeGreaterThan(10);
  });

  it.each(managed)(
    '%s matches the range the installed Expo SDK ships',
    (name) => {
      expect(declared[name]).toBe(pinned[name]);
    },
  );
});

describe('native module peer dependencies', () => {
  const requiredDirectly = [
    'expo-constants',
    'expo-font',
    'expo-system-ui',
    'react-native-worklets',
  ];

  it.each(requiredDirectly)('%s is a direct dependency', (name) => {
    expect(declared[name]).toBeDefined();
  });
});
